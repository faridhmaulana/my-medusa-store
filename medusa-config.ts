import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      authMethodsPerActor: {
        customer: ["supabase"],
        user: ["emailpass"],
      },
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      dependencies: [
        Modules.CUSTOMER,
        "customerSupabaseLink",
      ],
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          {
            resolve: "./src/modules/supabase-auth-provider",
            id: "supabase",
            options: {
              supabase_url: process.env.SUPABASE_URL,
              supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "./src/modules/shipstation",
            id: "shipstation",
            options: {
              api_key: process.env.SHIPSTATION_API_KEY,
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/pointBalance",
    },
    {
      resolve: "./src/modules/customer-supabase-link",
      options: {
        supabase_url: process.env.SUPABASE_URL,
        supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  ],
})
