# Supabase Auth: Custom API Routes → Auth Module Provider Migration

This document explains the migration from custom API routes to a proper Medusa Auth Module Provider implementation.

## What Changed?

### Before: Custom API Routes (❌ Not Proper)

Previously, Supabase Auth was implemented using custom API routes:

```typescript
// Backend: Custom routes
POST /store/auth/register
POST /store/auth/login

// Storefront: Custom SDK calls
await sdk.client.fetch("/store/auth/register", {...})
await sdk.client.fetch("/store/auth/login", {...})
```

**Problems:**
- Not following Medusa architecture patterns
- Custom endpoints separate from built-in auth system
- Can't leverage Auth Module features (refresh tokens, callbacks, etc.)
- Harder to maintain and extend

### After: Auth Module Provider (✅ Proper)

Now implemented as a **Custom Auth Module Provider**:

```typescript
// Backend: Registered auth provider
{
  resolve: "./src/modules/auth-supabase",
  id: "supabase"
}

// Storefront: Standard SDK methods
await sdk.auth.register("customer", "supabase", {...})
await sdk.auth.login("customer", "supabase", {...})
```

**Benefits:**
- ✅ Follows official Medusa architecture
- ✅ Uses standard auth system and endpoints
- ✅ Storefront code looks like any other auth provider
- ✅ Can restrict providers per actor type
- ✅ Easier to maintain and extend

## Architecture Changes

### Module Structure

**Auth Provider Module:** `src/modules/supabaseAuthProvider/`
```
supabaseAuthProvider/
├── index.ts           # Module provider export (ModuleProvider)
└── service.ts         # SupabaseAuthProviderService extends AbstractAuthModuleProvider
```

**index.ts:**
```typescript
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import SupabaseAuthProviderService from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [SupabaseAuthProviderService],
})
```

**IMPORTANT:** Auth providers must be exported using `ModuleProvider()`, not as a raw service class.

**Customer-Supabase Link Module:** `src/modules/customerSupabaseLink/`
```
customerSupabaseLink/
├── index.ts           # Module definition
├── service.ts         # Customer-Supabase linking operations
├── client.ts          # Supabase client wrapper
└── models/
    └── customer-supabase.ts  # Link model
```

### Configuration Changes

**medusa-config.ts**:

```typescript
module.exports = defineConfig({
  projectConfig: {
    http: {
      // NEW: Restrict auth methods per actor type
      authMethodsPerActor: {
        customer: ["supabase"],  // Only Supabase for customers
        user: ["emailpass"],      // Only emailpass for admin
      },
    }
  },
  modules: [
    // NEW: Auth Module with providers
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          {
            resolve: "./src/modules/supabaseAuthProvider",
            id: "supabase",
            options: {
              supabase_url: process.env.SUPABASE_URL,
              supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
          },
        ],
      },
    },
    // Customer-Supabase link module
    {
      resolve: "./src/modules/customerSupabaseLink",
      options: {
        supabase_url: process.env.SUPABASE_URL,
        supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  ],
})
```

### Storefront Changes

**src/lib/data/customer.ts**:

```typescript
// BEFORE (Custom API routes)
export async function signup(_currentState: unknown, formData: FormData) {
  const token = await sdk.auth.register("customer", "emailpass", {
    email: customerForm.email,
    password: password,
  })

  await setAuthToken(token as string)

  // Had to create customer separately
  const { customer: createdCustomer } = await sdk.store.customer.create(
    customerForm,
    {},
    headers
  )

  // Had to login again after registration
  const loginToken = await sdk.auth.login("customer", "emailpass", {
    email: customerForm.email,
    password,
  })
}

// AFTER (Auth Provider)
export async function signup(_currentState: unknown, formData: FormData) {
  // Register with Supabase Auth Provider
  // Customer creation and linking handled automatically
  await sdk.auth.register("customer", "supabase", {
    email: customerForm.email,
    password: password,
    first_name: customerForm.first_name,
    last_name: customerForm.last_name,
    phone: customerForm.phone,
  })

  // Login to get proper session token
  const loginToken = await sdk.auth.login("customer", "supabase", {
    email: customerForm.email,
    password: password,
  })

  await setAuthToken(loginToken as string)

  // That's it! Much cleaner.
}
```

## Implementation Details

### Auth Provider Service

The `SupabaseAuthProviderService` extends `AbstractAuthModuleProvider`:

```typescript
class SupabaseAuthProviderService extends AbstractAuthModuleProvider {
  static identifier = "supabase"
  static DISPLAY_NAME = "Supabase Auth"

  async authenticate(
    data: SupabaseAuthInput,
    context: Record<string, any>
  ): Promise<{
    success: boolean
    authIdentity?: { id: string; provider_metadata?: any; user_metadata?: any }
    error?: string
  }> {
    // 1. Check if registration or login based on presence of first_name
    const isRegistration = !!data.body.first_name

    if (isRegistration) {
      // 2. Register user in Supabase
      const { data: signUpData, error } = await this.supabaseClient_.auth.signUp({
        email: data.body.email,
        password: data.body.password,
        options: {
          data: {
            first_name: data.body.first_name,
            last_name: data.body.last_name,
            phone: data.body.phone,
          },
        },
      })

      // 3. Auto-create/link Medusa customer
      await this.createOrLinkMedusaCustomer(
        context.container,
        signUpData.user.id,
        email,
        first_name,
        last_name,
        phone
      )

      return { success: true, authIdentity: {...} }
    } else {
      // Similar flow for login
    }
  }

  async validateCallback(...) {
    // Not used for email/password auth
  }
}
```

### Key Features

1. **Single registration flow**: No need to register → create customer → login separately
2. **Auto-linking**: Customers are automatically created/linked in Medusa
3. **Existing customer support**: If email exists in Medusa, automatically links to Supabase
4. **Type safety**: Full TypeScript support with proper interfaces
5. **Error handling**: Consistent error responses

## Migration Checklist

If you're migrating from custom API routes to Auth Provider:

- [x] Create `src/modules/supabaseAuthProvider/` directory
- [x] Implement `service.ts` extending `AbstractAuthModuleProvider`
- [x] Register provider in `medusa-config.ts` under Auth Module
- [x] Add `authMethodsPerActor` configuration
- [x] Update storefront to use `sdk.auth.register("customer", "supabase", {...})`
- [x] Update storefront to use `sdk.auth.login("customer", "supabase", {...})`
- [x] Remove custom API routes (if desired, or keep for backward compatibility)
- [x] Test registration flow
- [x] Test login flow
- [x] Test existing customer linking
- [x] Update documentation

## Testing

### Backend
```bash
npm run build  # Should complete successfully
npm run dev    # Start development server
```

### Storefront
```typescript
// Test registration
await sdk.auth.register("customer", "supabase", {
  email: "test@example.com",
  password: "password123",
  first_name: "Test",
  last_name: "User",
  phone: "+1234567890"
})

// Test login
await sdk.auth.login("customer", "supabase", {
  email: "test@example.com",
  password: "password123"
})
```

## Backward Compatibility

The custom API routes (`/store/auth/register`, `/store/auth/login`) can be kept for backward compatibility if needed. However, new implementations should use the standard Auth Module Provider pattern.

## Next Steps

This Auth Provider implementation provides a solid foundation for:

1. **Phase 2-4**: Migrating coin/loyalty data from Postgres to Supabase
2. **Social auth**: Adding Google/GitHub OAuth providers alongside Supabase
3. **Admin auth**: Potentially using Supabase for admin users too
4. **Multi-tenant**: Supporting multiple Supabase projects for different regions

## Troubleshooting

### Error: "moduleProviderServices is not iterable"

**Problem:** Server fails to start with error:
```
TypeError: moduleProviderServices is not iterable
    at loadInternalModule
```

**Cause:** Auth provider module is exported incorrectly (as raw service class instead of ModuleProvider).

**Solution:** Update `src/modules/supabaseAuthProvider/index.ts`:

```typescript
// ❌ WRONG
import SupabaseAuthProviderService from "./service"
export default SupabaseAuthProviderService

// ✅ CORRECT
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import SupabaseAuthProviderService from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [SupabaseAuthProviderService],
})
```

Auth providers **must** be wrapped in `ModuleProvider()` with a `services` array.

### Error: "Method 'register' not implemented for provider supabase"

**Problem:** Registration fails with error:
```
Error: Method 'register' not implemented for provider supabase
```

**Cause:** Auth provider only implements `authenticate()` method, but Medusa SDK calls `register()` separately for registration flow.

**Solution:** Implement both `register()` and `authenticate()` methods:

```typescript
class SupabaseAuthProviderService extends AbstractAuthModuleProvider {
  // For sdk.auth.register()
  async register(data, context) {
    // Handle Supabase signUp
  }

  // For sdk.auth.login()
  async authenticate(data, context) {
    // Handle Supabase signInWithPassword
  }
}
```

### Error: "Cannot read properties of undefined (reading 'resolve')"

**Problem:** Registration/login fails with container error:
```
Supabase registration error: Cannot read properties of undefined (reading 'resolve')
```

**Cause:** Trying to inject module services in constructor, but they're not available in Auth Module's container by default.

**Solution:** Add required modules as dependencies to Auth Module in `medusa-config.ts`:

```typescript
// ❌ WRONG - Without dependencies in medusa-config.ts
// medusa-config.ts
{
  resolve: "@medusajs/medusa/auth",
  // Missing dependencies!
  options: {
    providers: [...]
  }
}

// service.ts - Will fail with "Could not resolve 'customer'"
constructor(container: InjectedDependencies, options: Options) {
  this.customerService_ = container[Modules.CUSTOMER]  // ❌ Not in container
}

// ✅ CORRECT - Add dependencies to Auth Module
// medusa-config.ts
{
  resolve: "@medusajs/medusa/auth",
  dependencies: [
    Modules.CUSTOMER,                    // Make Customer Module available
    "customerSupabaseLink",              // Make our custom module available
  ],
  options: {
    providers: [...]
  }
}

// service.ts - Now works!
type InjectedDependencies = {
  logger: Logger
  [Modules.CUSTOMER]: ICustomerModuleService
  customerSupabaseLink: CustomerSupabaseLinkModuleService
}

constructor(container: InjectedDependencies, options: Options) {
  super(...arguments)
  this.logger_ = container.logger
  this.customerService_ = container[Modules.CUSTOMER]  // ✅ Available
  this.supabaseLinkService_ = container.customerSupabaseLink  // ✅ Available
}

// Use injected services directly
private async createOrLinkMedusaCustomer(...) {
  const customerService = this.customerService_
  const supabaseLinkService = this.supabaseLinkService_
}
```

### Error: "Unauthorized (401)" after successful registration/login

**Problem:** User successfully registers and logs in, but receives "Unauthorized" error when accessing protected endpoints like `/store/customers/me/points`.

**Symptoms:**
- Registration and login appear successful
- JWT token is set in cookie
- Decoded token shows `"actor_id": ""` (empty string)
- All authenticated requests return 401 Unauthorized

**Cause:** Auth provider returns Supabase user ID instead of Medusa customer ID in `authIdentity.id`. The `actor_id` in JWT must be the **Medusa customer ID**, not Supabase user ID.

**Solution:** Modify `register()` and `authenticate()` methods to return Medusa customer ID:

```typescript
// ❌ WRONG - Returns Supabase user ID
async authenticate(data, context) {
  const { data: signInData } = await this.supabaseClient_.auth.signInWithPassword({...})

  await this.createOrLinkMedusaCustomer(...)  // Returns void

  return {
    success: true,
    authIdentity: {
      id: signInData.user.id,  // ❌ Supabase ID, not Medusa ID
      provider_metadata: {...}
    }
  }
}

// ✅ CORRECT - Returns app_metadata with customer_id
async authenticate(
  data: SupabaseAuthInput,
  context: Record<string, any>
): Promise<{
  success: boolean
  authIdentity?: {
    id: string
    app_metadata?: any  // Add this to return type
    provider_metadata?: any
    user_metadata?: any
  }
  error?: string
}> {
  const { data: signInData } = await this.supabaseClient_.auth.signInWithPassword({...})

  // createOrLinkMedusaCustomer now returns customer ID
  const medusaCustomerId = await this.createOrLinkMedusaCustomer(...)

  return {
    success: true,
    authIdentity: {
      id: signInData.user.id,  // Auth identity ID (Supabase user ID)
      app_metadata: {
        customer_id: medusaCustomerId,  // ✅ THIS becomes actor_id in JWT
      },
      provider_metadata: {
        email: signInData.user.email,
        supabase_id: signInData.user.id,
      },
      user_metadata: signInData.user.user_metadata,
    }
  }
}

// Update helper method to return customer ID
private async createOrLinkMedusaCustomer(...): Promise<string> {  // Changed from Promise<void>
  const existingLink = await supabaseAuthService.getCustomerSupabaseLinkBySupabaseId(supabaseId)

  if (existingLink) {
    return existingLink.customer_id  // Return existing customer ID
  }

  const [existingCustomer] = await customerService.listCustomers({ email })

  if (existingCustomer) {
    await supabaseAuthService.linkCustomerToSupabase({...})
    return existingCustomer.id  // Return customer ID
  } else {
    const customer = await customerService.createCustomers({...})
    await supabaseAuthService.linkCustomerToSupabase({...})
    return customer.id  // Return new customer ID
  }
}
```

**Key points:**
- `authIdentity.id` should be the auth identity ID (e.g., Supabase user ID)
- `authIdentity.app_metadata.customer_id` MUST contain the Medusa customer ID
- The JWT `actor_id` is populated from `app_metadata.customer_id`, NOT from `authIdentity.id`
- Empty `actor_id` causes all authenticated requests to fail with 401
- You must add `app_metadata?: any` to the return type definition

---

## References

- [Medusa Auth Module Providers](https://docs.medusajs.com/resources/commerce-modules/auth/auth-providers)
- [How to Create Auth Module Provider](https://docs.medusajs.com/resources/references/auth/provider)
- [Google Auth Provider Example](https://github.com/medusajs/medusa/tree/develop/packages/modules/providers/auth-google)
- [Custom Admin Authentication Guide](https://docs.medusajs.com/resources/how-to-tutorials/how-to/admin/auth)
