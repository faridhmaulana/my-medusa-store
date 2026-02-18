import { model } from "@medusajs/framework/utils"

const VariantPointConfig = model.define("variant_point_config", {
  id: model.id().primaryKey(),
  variant_id: model.text(),
  payment_type: model.enum(["currency", "points", "both"]).default("currency"),
  point_price: model.number().nullable(),
})

export default VariantPointConfig
