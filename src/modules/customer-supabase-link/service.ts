import { MedusaService } from "@medusajs/framework/utils"
import CustomerSupabase from "./models/customer-supabase"
import { SupabaseAuthClient } from "./client"
import { RegisterUserInput, LoginUserInput } from "./types"

type InjectedDependencies = {
  supabaseAuthClient: SupabaseAuthClient
}

/**
 * CustomerSupabaseLinkModuleService
 * Service to manage customer-supabase link operations
 */
class CustomerSupabaseLinkModuleService extends MedusaService({
  CustomerSupabase,
}) {
  private supabaseClient: SupabaseAuthClient

  constructor({ supabaseAuthClient }: InjectedDependencies) {
    super(...arguments)
    this.supabaseClient = supabaseAuthClient
  }

  /**
   * Register a new user in Supabase
   */
  async registerSupabaseUser(input: RegisterUserInput) {
    return await this.supabaseClient.registerUser(input)
  }

  /**
   * Login user via Supabase
   */
  async loginSupabaseUser(input: LoginUserInput) {
    return await this.supabaseClient.loginUser(input)
  }

  /**
   * Get user by Supabase token
   */
  async getSupabaseUserByToken(token: string) {
    return await this.supabaseClient.getUserByToken(token)
  }

  /**
   * Link Medusa customer with Supabase user
   */
  async linkCustomerToSupabase(data: {
    customer_id: string
    supabase_id: string
    email: string
  }) {
    return await this.createCustomerSupabases(data)
  }

  /**
   * Get customer-supabase link by customer_id
   */
  async getCustomerSupabaseLinkByCustomerId(customerId: string) {
    const [link] = await this.listCustomerSupabases({
      customer_id: customerId,
    })
    return link || null
  }

  /**
   * Get customer-supabase link by supabase_id
   */
  async getCustomerSupabaseLinkBySupabaseId(supabaseId: string) {
    const [link] = await this.listCustomerSupabases({
      supabase_id: supabaseId,
    })
    return link || null
  }

  /**
   * Get customer-supabase link by email
   */
  async getCustomerSupabaseLinkByEmail(email: string) {
    const [link] = await this.listCustomerSupabases({
      email,
    })
    return link || null
  }

  /**
   * Update customer-supabase link
   */
  async updateCustomerSupabaseLink(id: string, data: { email?: string }) {
    return await this.updateCustomerSupabases({ id, ...data })
  }

  /**
   * Delete customer-supabase link
   */
  async deleteCustomerSupabaseLink(id: string) {
    return await this.deleteCustomerSupabases(id)
  }
}

export default CustomerSupabaseLinkModuleService
