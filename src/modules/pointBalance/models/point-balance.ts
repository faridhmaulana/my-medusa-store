import { model } from "@medusajs/framework/utils"

const PointBalance = model.define("point_balance", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  balance: model.number().default(0),
})

export default PointBalance
