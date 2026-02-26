import { model } from "@medusajs/framework/utils"

/**
 * CustomerSupabase model to link Medusa customers with Supabase Auth users
 */
const CustomerSupabase = model.define("customer_supabase", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  supabase_id: model.text().unique(),
  email: model.text(),
})

export default CustomerSupabase
