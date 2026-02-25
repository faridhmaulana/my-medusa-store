import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { refundPointsOnOrderCancelWorkflow } from "../workflows/loyalty/refund-points-on-order-cancel"

export default async function orderCanceledHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await refundPointsOnOrderCancelWorkflow(container).run({
    input: { order_id: data.id },
  })
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
