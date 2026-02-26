# Supabase Auth Integration

Complete integration guide for Supabase Auth as a **Medusa Auth Module Provider**.

## Overview

This implementation integrates Supabase Auth as a **custom Auth Module Provider** for Medusa, following the official Medusa architecture. This provides:

- **Native Medusa integration**: Uses built-in auth system, not custom API routes
- **Standard SDK usage**: Storefront uses `sdk.auth.login()` / `sdk.auth.register()` like any other provider
- **Single API entry point**: Storefront only communicates with Medusa
- **Automatic user sync**: Users authenticated via Supabase are automatically synced to Medusa
- **Secure architecture**: Supabase credentials only in backend
- **Migration ready**: Foundation for migrating coin data to Supabase in the future

## Architecture Flow

```
┌────────────────────────────────────────────┐
│         Next.js Storefront                 │
│   sdk.auth.login("customer", "supabase")   │
└───────────────────┬────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│          Medusa Auth Module                │
│  ┌──────────────────────────────────────┐  │
│  │   Supabase Auth Provider Service     │  │
│  │   (extends AbstractAuthModuleProvider) │  │
│  │                                        │  │
│  │   1. Authenticate with Supabase      │  │
│  │   2. Auto-create/link customer       │  │
│  │   3. Return auth token               │  │
│  └──────────────────────────────────────┘  │
└───────────────────┬────────────────────┬───┘
                    │                    │
            ┌───────▼─────┐      ┌──────▼───────┐
            │   Medusa    │      │   Supabase   │
            │  Postgres   │      │     Auth     │
            │ - customers │      │   - users    │
            │ - orders    │      │              │
            │ - carts     │      │              │
            └─────────────┘      └──────────────┘
```

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (anon key is NOT enough - you need service_role)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**IMPORTANT**: Use the **service_role** key, not the anon key. The service_role key allows admin operations like user creation.

### 3. Verify Auth Provider Registration

The Supabase Auth Provider should be registered in `medusa-config.ts`:

```typescript
import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

module.exports = defineConfig({
  projectConfig: {
    http: {
      authMethodsPerActor: {
        customer: ["supabase"],  // Customers use Supabase
        user: ["emailpass"],      // Admin users use email/password
      },
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          {
            resolve: "./src/modules/auth-supabase",
            id: "supabase",
            options: {
              supabase_url: process.env.SUPABASE_URL,
              supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
          },
        ],
      },
    },
    // Supporting module for customer-Supabase linking
    {
      resolve: "./src/modules/supabaseAuth",
      options: {
        supabase_url: process.env.SUPABASE_URL,
        supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  ],
})
```

**Key configurations:**
- `authMethodsPerActor`: Restricts which auth providers can be used by which actor types
- `customer`: Only "supabase" provider allowed for storefront users
- `user`: Only "emailpass" provider allowed for admin users
- Two modules: Auth provider (`auth-supabase`) + supporting module (`supabaseAuth`) for linking

### 4. Run Database Migrations

The migrations have been generated. Make sure they're applied:

```bash
npx medusa db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

## API Endpoints

### Register User

**POST** `/store/auth/register`

Creates a new user in Supabase Auth and Medusa customer database.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

**Response** (201 Created):
```json
{
  "customer": {
    "id": "cus_01JKH...",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "has_account": true,
    "created_at": "2026-02-25T14:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `409 Conflict`: User with this email already exists
- `400 Bad Request`: Invalid data (validation error)

### Login User

**POST** `/store/auth/login`

Authenticates user via Supabase and creates/syncs Medusa customer.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "customer": {
    "id": "cus_01JKH...",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "has_account": true,
    "created_at": "2026-02-25T14:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid email or password
- `400 Bad Request`: Invalid data

## Storefront Integration

### Using Medusa SDK (Recommended)

**IMPORTANT**: Always use the Medusa SDK for authentication. Never use regular fetch() as it won't include required headers.

```typescript
import { sdk } from "@lib/config"

// Register
const register = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone?: string
) => {
  try {
    // Register with Supabase Auth Provider
    const token = await sdk.auth.register("customer", "supabase", {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone,
    })

    // Store token in cookies (recommended) or localStorage
    await setAuthToken(token as string)

    return token
  } catch (error) {
    throw new Error(error.message || "Registration failed")
  }
}

// Login
const login = async (email: string, password: string) => {
  try {
    // Login with Supabase Auth Provider
    const token = await sdk.auth.login("customer", "supabase", {
      email,
      password,
    })

    // Store token in cookies (recommended) or localStorage
    await setAuthToken(token as string)

    return token
  } catch (error) {
    throw new Error(error.message || "Login failed")
  }
}

// Make authenticated requests
const getCustomerPoints = async () => {
  const token = localStorage.getItem('medusa_auth_token')

  const response = await fetch('http://localhost:9000/store/customers/me/points', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  return await response.json()
}
```

### Using Next.js with Server Actions

```typescript
// app/actions/auth.ts
'use server'

import { cookies } from 'next/headers'

export async function registerAction(formData: FormData) {
  const response = await fetch('http://localhost:9000/store/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.get('email'),
      password: formData.get('password'),
      first_name: formData.get('firstName'),
      last_name: formData.get('lastName'),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    return { error: error.message }
  }

  const data = await response.json()

  // Store token in HTTP-only cookie
  cookies().set('medusa_auth_token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return { success: true, customer: data.customer }
}

export async function loginAction(formData: FormData) {
  const response = await fetch('http://localhost:9000/store/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.get('email'),
      password: formData.get('password'),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    return { error: error.message }
  }

  const data = await response.json()

  cookies().set('medusa_auth_token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })

  return { success: true, customer: data.customer }
}

export async function logoutAction() {
  cookies().delete('medusa_auth_token')
  return { success: true }
}
```

### React Component Example

```tsx
// components/LoginForm.tsx
'use client'

import { useState } from 'react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:9000/store/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message)
      }

      const data = await response.json()
      localStorage.setItem('medusa_auth_token', data.token)

      // Redirect to dashboard or home
      window.location.href = '/account'
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```

## Module Structure

```
src/modules/supabaseAuth/
├── index.ts                    # Module definition and loader
├── service.ts                  # Service for auth operations
├── client.ts                   # Supabase client wrapper
├── types.ts                    # TypeScript type definitions
└── models/
    └── customer-supabase.ts    # Link model between Customer and Supabase

src/workflows/auth/
├── register-with-supabase.ts   # Registration workflow
├── login-with-supabase.ts      # Login workflow
└── steps/
    ├── create-supabase-user.ts
    ├── verify-supabase-credentials.ts
    ├── create-or-get-medusa-customer.ts
    └── generate-actor-token.ts

src/api/store/auth/
├── validators.ts               # Zod validation schemas
├── register/route.ts           # POST /store/auth/register
└── login/route.ts              # POST /store/auth/login

src/links/
└── customer-supabase-customer.ts  # Link definition
```

## Database Schema

The `customer_supabase` table stores the link between Medusa customers and Supabase users:

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (auto-generated) |
| customer_id | text | Medusa customer ID |
| supabase_id | text | Supabase user ID (unique) |
| email | text | User email |
| created_at | timestamp | Record creation time |
| updated_at | timestamp | Record update time |

## Workflow Details

### Register Workflow

1. **Create Supabase User** - Creates user in Supabase Auth
2. **Create/Get Medusa Customer** - Creates new customer or links existing one
3. **Generate Actor Token** - Creates JWT for authenticated requests
4. **Compensation**: If any step fails, rolls back (deletes Supabase user, removes link)

### Login Workflow

1. **Verify Credentials** - Validates email/password with Supabase
2. **Sync Customer** - Creates or syncs Medusa customer
3. **Generate Actor Token** - Creates JWT for authenticated requests
4. **No compensation needed** (read-only operations)

## Security Considerations

### Backend

- ✅ Service role key stored in backend only (never exposed to client)
- ✅ API routes validate input with Zod schemas
- ✅ Workflows handle errors and rollback on failure
- ✅ Actor tokens use JWT with customer metadata

### Storefront

- ⚠️ Store tokens securely (HTTP-only cookies preferred over localStorage)
- ⚠️ Use HTTPS in production
- ⚠️ Implement token refresh if needed
- ⚠️ Clear tokens on logout

### Production Checklist

- [ ] Use strong `JWT_SECRET` and `COOKIE_SECRET`
- [ ] Enable HTTPS
- [ ] Configure CORS properly (`STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`)
- [ ] Use HTTP-only cookies for token storage
- [ ] Implement rate limiting on auth endpoints
- [ ] Enable Supabase email verification (disable auto-confirm)
- [ ] Set up Supabase Row Level Security (RLS) policies
- [ ] Monitor Supabase usage and set up alerts

## Future Migration to Supabase (Phase 2-4)

This implementation provides the foundation for migrating coin data to Supabase:

### Phase 2: Dual-Write
- Write coin transactions to both Medusa and Supabase
- Read from Medusa (source of truth)
- Validate data consistency

### Phase 3: Dual-Read
- Write to Supabase only
- Read from Supabase (new source of truth)
- Keep Medusa data for rollback

### Phase 4: Full Migration
- Deprecate Medusa `pointBalance` module
- All coin operations via Supabase
- Medusa workflows call Supabase services

## Troubleshooting

### Error: "Supabase configuration is missing"

**Solution**: Make sure `.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set.

### Error: "User already exists"

**Solution**: This is expected if user tries to register with existing email. Show appropriate error message to user.

### Error: "Invalid credentials"

**Solution**: Email or password is incorrect. Verify input and check Supabase dashboard for user status.

### Error: "Module supabaseAuth not found"

**Solution**: Run `npx medusa db:generate supabaseAuth && npx medusa db:migrate` to ensure module is registered.

### Token not working for authenticated requests

**Solution**:
1. Verify token is being sent in `Authorization: Bearer <token>` header
2. Check token expiration
3. Ensure customer exists in Medusa database

## Testing

### Manual Testing

```bash
# Register new user
curl -X POST http://localhost:9000/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'

# Login
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get customer data (use token from login response)
curl http://localhost:9000/store/customers/me \
  -H "Authorization: Bearer <your_token>"
```

## Support

For issues or questions:
1. Check Supabase dashboard for user creation
2. Check Medusa logs for workflow errors
3. Verify database migrations are applied
4. Review this documentation

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Medusa Workflows Documentation](https://docs.medusajs.com/resources/architectural-modules/workflow)
- [Medusa Custom Modules](https://docs.medusajs.com/resources/architectural-modules/module)
