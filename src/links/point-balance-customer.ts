import PointBalanceModule from "../modules/pointBalance"
import CustomerModule from "@medusajs/medusa/customer"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  {
    linkable: PointBalanceModule.linkable.pointBalance,
    field: "customer_id",
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
)
