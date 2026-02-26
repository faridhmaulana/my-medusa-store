import { Module } from "@medusajs/framework/utils"
import CustomerSupabaseLinkModuleService from "./service"
import { SupabaseAuthClient } from "./client"

export const CUSTOMER_SUPABASE_LINK_MODULE = "customerSupabaseLink"

export default Module(CUSTOMER_SUPABASE_LINK_MODULE, {
  service: CustomerSupabaseLinkModuleService,
  loaders: [
    async ({ container, options }: any) => {
      const supabaseUrl = options.supabase_url || process.env.SUPABASE_URL
      const supabaseKey = options.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
        )
      }

      const supabaseAuthClient = new SupabaseAuthClient(supabaseUrl, supabaseKey)

      container.register({
        supabaseAuthClient: {
          resolve: () => supabaseAuthClient,
        },
      })
    },
  ],
})
