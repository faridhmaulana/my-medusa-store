import PointBalanceModule from "../modules/pointBalance"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  {
    linkable: PointBalanceModule.linkable.variantPointConfig,
    field: "variant_id",
  },
  ProductModule.linkable.productVariant,
  {
    readOnly: true,
  }
)
