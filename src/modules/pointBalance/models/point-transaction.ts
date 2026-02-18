import { model } from "@medusajs/framework/utils"

const PointTransaction = model.define("point_transaction", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  type: model.enum(["earn", "spend", "adjust"]),
  points: model.number(),
  reason: model.text().nullable(),
  reference_id: model.text().nullable(),
  reference_type: model.text().nullable(),
})

export default PointTransaction
