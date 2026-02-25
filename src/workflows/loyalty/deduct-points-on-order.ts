import {
  createWorkflow,
  WorkflowResponse,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { deductBalanceStep } from "./steps/deduct-balance"

type DeductPointsOnOrderWorkflowInput = {
  order_id: string
}

export const deductPointsOnOrderWorkflow = createWorkflow(
  "deduct-points-on-order",
  function (input: DeductPointsOnOrderWorkflowInput) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "customer.*",
        "cart.*",
        "cart.metadata",
      ],
      filters: {
        id: input.order_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const orderData = transform({ orders }, (data) => {
      const order = data.orders[0] as any
      const pointsCost = order.cart?.metadata?.points_cost
      const customerId = order.customer?.id
      const cartId = order.cart?.id

      return {
        has_points: !!pointsCost && !!customerId,
        points_cost: pointsCost || 0,
        customer_id: customerId || "",
        cart_id: cartId || "",
      }
    })

    when(orderData, (data) => data.has_points).then(function () {
      deductBalanceStep({
        customer_id: orderData.customer_id,
        points: orderData.points_cost,
        reason: "Coin redemption for order",
        reference_id: orderData.cart_id,
        reference_type: "cart",
      })
    })

    return new WorkflowResponse({ success: true })
  }
)
