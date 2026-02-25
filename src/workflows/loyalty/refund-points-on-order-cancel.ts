import {
  createWorkflow,
  WorkflowResponse,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { addBalanceStep } from "./steps/add-balance"

type RefundPointsOnOrderCancelWorkflowInput = {
  order_id: string
}

export const refundPointsOnOrderCancelWorkflow = createWorkflow(
  "refund-points-on-order-cancel",
  function (input: RefundPointsOnOrderCancelWorkflowInput) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["id", "customer.*", "cart.*", "cart.metadata", "status"],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true },
    })

    const orderData = transform({ orders }, (data) => {
      const order = data.orders[0] as any
      const pointsCost = order.cart?.metadata?.points_cost
      const customerId = order.customer?.id
      const cartId = order.cart?.id

      return {
        should_refund: !!pointsCost && !!customerId && pointsCost > 0,
        points_cost: pointsCost || 0,
        customer_id: customerId || "",
        cart_id: cartId || "",
        order_id: order.id,
      }
    })

    when(orderData, (data) => data.should_refund).then(function () {
      const refundData = transform({ orderData }, (data) => ({
        customer_id: data.orderData.customer_id,
        points: data.orderData.points_cost,
        reason: "Refund for cancelled order",
        reference_id: data.orderData.order_id,
        reference_type: "order",
      }))

      addBalanceStep(refundData)
    })

    return new WorkflowResponse({ success: true })
  }
)
