import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import SupabaseAuthProviderService from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [SupabaseAuthProviderService],
})
