import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { deductPointsOnOrderWorkflow } from "../workflows/loyalty/deduct-points-on-order"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await deductPointsOnOrderWorkflow(container).run({
    input: {
      order_id: data.id,
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
