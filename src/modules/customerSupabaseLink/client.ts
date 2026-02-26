import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { SupabaseAuthResponse, RegisterUserInput, LoginUserInput } from "./types"

/**
 * Supabase client wrapper for authentication operations
 */
export class SupabaseAuthClient {
  private client: SupabaseClient

  constructor(supabaseUrl: string, supabaseKey: string) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL and Key are required")
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  /**
   * Register a new user in Supabase Auth
   */
  async registerUser(input: RegisterUserInput): Promise<SupabaseAuthResponse> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            first_name: input.first_name,
            last_name: input.last_name,
            phone: input.phone,
          },
        },
      })

      if (error) {
        return {
          user: null,
          session: null,
          error: {
            message: error.message,
            status: error.status,
          },
        }
      }

      return {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          user_metadata: data.user.user_metadata,
          created_at: data.user.created_at,
        } : null,
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
        } : null,
      }
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: {
          message: error.message || "Failed to register user",
        },
      }
    }
  }

  /**
   * Login user with email and password
   */
  async loginUser(input: LoginUserInput): Promise<SupabaseAuthResponse> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })

      if (error) {
        return {
          user: null,
          session: null,
          error: {
            message: error.message,
            status: error.status,
          },
        }
      }

      return {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          user_metadata: data.user.user_metadata,
          created_at: data.user.created_at,
        } : null,
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
        } : null,
      }
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: {
          message: error.message || "Failed to login",
        },
      }
    }
  }

  /**
   * Get user by access token
   */
  async getUserByToken(token: string): Promise<SupabaseAuthResponse> {
    try {
      const { data, error } = await this.client.auth.getUser(token)

      if (error) {
        return {
          user: null,
          session: null,
          error: {
            message: error.message,
            status: error.status,
          },
        }
      }

      return {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          user_metadata: data.user.user_metadata,
          created_at: data.user.created_at,
        } : null,
        session: null,
      }
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: {
          message: error.message || "Failed to get user",
        },
      }
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<{ error?: { message: string } }> {
    try {
      const { error } = await this.client.auth.admin.updateUserById(userId, {
        password: newPassword,
      })

      if (error) {
        return { error: { message: error.message } }
      }

      return {}
    } catch (error: any) {
      return { error: { message: error.message || "Failed to update password" } }
    }
  }

  /**
   * Delete user from Supabase Auth
   */
  async deleteUser(userId: string): Promise<{ error?: { message: string } }> {
    try {
      const { error } = await this.client.auth.admin.deleteUser(userId)

      if (error) {
        return { error: { message: error.message } }
      }

      return {}
    } catch (error: any) {
      return { error: { message: error.message || "Failed to delete user" } }
    }
  }
}
