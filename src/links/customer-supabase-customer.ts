import { defineLink } from "@medusajs/framework/utils"
import CustomerSupabaseLinkModule from "../modules/customer-supabase-link"
import CustomerModule from "@medusajs/medusa/customer"

/**
 * Link between CustomerSupabase and Customer
 * Establishes a one-to-one relationship
 */
export default defineLink(
  {
    linkable: CustomerSupabaseLinkModule.linkable.customerSupabase,
    field: "customer_id",
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
)
