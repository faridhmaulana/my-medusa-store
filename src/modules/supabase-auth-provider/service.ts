import { AbstractAuthModuleProvider, MedusaError } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import CustomerSupabaseLinkModuleService from "../customer-supabase-link/service"
import { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type InjectedDependencies = {
  logger: Logger
  [Modules.CUSTOMER]: ICustomerModuleService
  customerSupabaseLink: CustomerSupabaseLinkModuleService
}

type Options = {
  supabase_url: string
  supabase_service_role_key: string
}

interface SupabaseAuthInput {
  body: {
    email: string
    password: string
    first_name?: string
    last_name?: string
    phone?: string
  }
}

/**
 * Supabase Auth Module Provider
 * Integrates Supabase Auth with Medusa's authentication system
 */
class SupabaseAuthProviderService extends AbstractAuthModuleProvider {
  static identifier = "supabase"
  static DISPLAY_NAME = "Supabase Auth"

  protected logger_: Logger
  protected options_: Options
  protected supabaseClient_: SupabaseClient
  protected customerService_: ICustomerModuleService
  protected supabaseLinkService_: CustomerSupabaseLinkModuleService

  constructor(
    container: InjectedDependencies,
    options: Options
  ) {
    // @ts-ignore
    super(...arguments)

    this.logger_ = container.logger
    this.options_ = options
    this.customerService_ = container[Modules.CUSTOMER]
    this.supabaseLinkService_ = container.customerSupabaseLink

    // Initialize Supabase client
    this.supabaseClient_ = createClient(
      options.supabase_url,
      options.supabase_service_role_key,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  /**
   * Register new user
   * Called by sdk.auth.register()
   */
  async register(
    data: SupabaseAuthInput,
    context: Record<string, any>
  ): Promise<{
    success: boolean
    authIdentity?: {
      id: string
      app_metadata?: any
      provider_metadata?: any
      user_metadata?: any
    }
    error?: string
  }> {
    const { email, password, first_name, last_name, phone } = data.body

    try {
      // Register new user in Supabase
      const { data: signUpData, error: signUpError } =
        await this.supabaseClient_.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name,
              last_name,
              phone,
            },
          },
        })

      if (signUpError || !signUpData.user) {
        return {
          success: false,
          error: signUpError?.message || "Registration failed",
        }
      }

      // Create/link Medusa customer
      const medusaCustomerId = await this.createOrLinkMedusaCustomer(
        signUpData.user.id,
        email,
        first_name,
        last_name,
        phone
      )

      this.logger_.info(`[Supabase Auth] Register - Medusa customer ID: ${medusaCustomerId}`)

      return {
        success: true,
        authIdentity: {
          id: signUpData.user.id, // Auth identity ID (Supabase user ID)
          app_metadata: {
            customer_id: medusaCustomerId, // THIS is what becomes actor_id in JWT
          },
          provider_metadata: {
            email: signUpData.user.email,
            supabase_id: signUpData.user.id,
          },
          user_metadata: {
            email,
            first_name,
            last_name,
            phone,
          },
        },
      }
    } catch (error: any) {
      this.logger_.error(`Supabase registration error: ${error.message}`)
      return {
        success: false,
        error: error.message || "Registration failed",
      }
    }
  }

  /**
   * Authenticate user with email and password
   * Called by sdk.auth.login()
   */
  async authenticate(
    data: SupabaseAuthInput,
    context: Record<string, any>
  ): Promise<{
    success: boolean
    authIdentity?: {
      id: string
      app_metadata?: any
      provider_metadata?: any
      user_metadata?: any
    }
    error?: string
  }> {
    const { email, password } = data.body

    try {
      // Login existing user
      const { data: signInData, error: signInError } =
        await this.supabaseClient_.auth.signInWithPassword({
          email,
          password,
        })

      if (signInError || !signInData.user) {
        return {
          success: false,
          error: signInError?.message || "Invalid credentials",
        }
      }

      // Sync/link Medusa customer on login
      const medusaCustomerId = await this.createOrLinkMedusaCustomer(
        signInData.user.id,
        signInData.user.email!,
        signInData.user.user_metadata?.first_name,
        signInData.user.user_metadata?.last_name,
        signInData.user.user_metadata?.phone
      )

      this.logger_.info(`[Supabase Auth] Login - Medusa customer ID: ${medusaCustomerId}`)

      return {
        success: true,
        authIdentity: {
          id: signInData.user.id, // Auth identity ID (Supabase user ID)
          app_metadata: {
            customer_id: medusaCustomerId, // THIS is what becomes actor_id in JWT
          },
          provider_metadata: {
            email: signInData.user.email,
            supabase_id: signInData.user.id,
          },
          user_metadata: signInData.user.user_metadata,
        },
      }
    } catch (error: any) {
      this.logger_.error(`Supabase authentication error: ${error.message}`)
      return {
        success: false,
        error: error.message || "Authentication failed",
      }
    }
  }

  /**
   * Validate callback - not used for email/password auth
   */
  async validateCallback(
    data: Record<string, unknown>,
    context: Record<string, any>
  ): Promise<{
    success: boolean
    authIdentity?: { id: string; provider_metadata?: any; user_metadata?: any }
    error?: string
  }> {
    return {
      success: false,
      error: "Callback validation not supported for email/password authentication",
    }
  }

  /**
   * Helper method to create or link Medusa customer
   * Returns the Medusa customer ID
   */
  private async createOrLinkMedusaCustomer(
    supabaseId: string,
    email: string,
    firstName?: string,
    lastName?: string,
    phone?: string
  ): Promise<string> {
    const customerService = this.customerService_
    const supabaseAuthService = this.supabaseLinkService_

    this.logger_.info(`[createOrLinkMedusaCustomer] Looking for link with supabase_id: ${supabaseId}`)

    // Check if customer already linked
    const existingLink =
      await supabaseAuthService.getCustomerSupabaseLinkBySupabaseId(supabaseId)

    if (existingLink) {
      // Already linked, return existing customer ID
      this.logger_.info(`[createOrLinkMedusaCustomer] Found existing link, customer_id: ${existingLink.customer_id}`)
      return existingLink.customer_id
    }

    this.logger_.info(`[createOrLinkMedusaCustomer] No link found, checking for existing customer with email: ${email}`)

    // Check if customer with this email exists
    const [existingCustomer] = await customerService.listCustomers({
      email,
    })

    if (existingCustomer) {
      // Link existing customer to Supabase
      this.logger_.info(`[createOrLinkMedusaCustomer] Found existing customer, linking: ${existingCustomer.id}`)
      await supabaseAuthService.linkCustomerToSupabase({
        customer_id: existingCustomer.id,
        supabase_id: supabaseId,
        email,
      })
      return existingCustomer.id
    } else {
      // Create new customer
      this.logger_.info(`[createOrLinkMedusaCustomer] Creating new customer for email: ${email}`)
      const customer = await customerService.createCustomers({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
      })

      this.logger_.info(`[createOrLinkMedusaCustomer] Created new customer: ${customer.id}`)

      // Link new customer to Supabase
      await supabaseAuthService.linkCustomerToSupabase({
        customer_id: customer.id,
        supabase_id: supabaseId,
        email,
      })
      return customer.id
    }
  }
}

export default SupabaseAuthProviderService
