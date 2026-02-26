export interface SupabaseUser {
  id: string
  email: string
  user_metadata?: {
    first_name?: string
    last_name?: string
    phone?: string
  }
  created_at: string
}

export interface SupabaseAuthResponse {
  user: SupabaseUser | null
  session: {
    access_token: string
    refresh_token: string
    expires_in: number
  } | null
  error?: {
    message: string
    status?: number
  }
}

export interface RegisterUserInput {
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone?: string
}

export interface LoginUserInput {
  email: string
  password: string
}

export interface CustomerSupabaseLink {
  id: string
  customer_id: string
  supabase_id: string
  email: string
  created_at: Date
  updated_at: Date
}
