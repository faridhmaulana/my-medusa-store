import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createOrderShipmentWorkflow } from "@medusajs/medusa/core-flows"
import { markOrderFulfillmentAsDeliveredWorkflow } from "@medusajs/medusa/core-flows"
import { TrackingWebhookPayload } from "../../../modules/shipstation/types"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = req.body as TrackingWebhookPayload

  if (!payload?.data?.tracking_number) {
    res.status(200).json({ message: "No tracking data" })
    return
  }

  const { tracking_number, status_code } = payload.data

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Find fulfillment labels matching this tracking number
  const { data: labels } = await query.graph({
    entity: "fulfillment_label",
    fields: ["id", "tracking_number", "fulfillment.id", "fulfillment.shipped_at", "fulfillment.delivered_at"],
    filters: {
      tracking_number,
    },
  })

  if (!labels?.length) {
    res.status(200).json({ message: "No matching fulfillment found" })
    return
  }

  const fulfillmentLabel = labels[0]
  const fulfillment = (fulfillmentLabel as any).fulfillment

  if (!fulfillment?.id) {
    res.status(200).json({ message: "No fulfillment linked" })
    return
  }

  // Find the order linked to this fulfillment
  const { data: orderFulfillments } = await query.graph({
    entity: "order_fulfillment",
    fields: ["order_id"],
    filters: {
      fulfillment_id: fulfillment.id,
    },
  })

  const orderId = (orderFulfillments as any)?.[0]?.order_id

  if (!orderId) {
    res.status(200).json({ message: "No order linked to fulfillment" })
    return
  }

  try {
    // IT = In Transit → Mark as shipped (if not already)
    if (status_code === "IT" && !fulfillment.shipped_at) {
      await createOrderShipmentWorkflow(req.scope).run({
        input: {
          order_id: orderId,
          fulfillment_id: fulfillment.id,
          items: [],
        },
      })
    }

    // DE = Delivered → Mark as delivered (if not already)
    if (status_code === "DE" && !fulfillment.delivered_at) {
      await markOrderFulfillmentAsDeliveredWorkflow(req.scope).run({
        input: {
          orderId,
          fulfillmentId: fulfillment.id,
        },
      })
    }
  } catch (error: any) {
    console.error("[ShipStation Webhook] Error processing event:", error.message)
  }

  res.status(200).json({ message: "Webhook processed" })
}
