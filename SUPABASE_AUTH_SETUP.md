# Supabase Auth Setup - Quick Start

## ✅ Implementation Complete

Supabase Auth has been successfully integrated into your Medusa backend!

## 🚀 Next Steps

### 1. Configure Supabase

**Create a Supabase Project:**
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Wait for database provisioning
4. Go to **Settings** → **API**
5. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Service Role Key** (NOT the anon key!)

### 2. Update Environment Variables

Open your `.env` file and replace the placeholder values:

```bash
SUPABASE_URL=https://your-actual-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

**⚠️ IMPORTANT**: You must use the **service_role** key, not the anon key!

### 3. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:9000`

### 4. Test the Integration

Run the automated test script:

```bash
./test-supabase-auth.sh
```

Or test manually with curl:

**Register:**
```bash
curl -X POST http://localhost:9000/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 📚 What Was Implemented

### Backend Components

- ✅ **Supabase Auth Module** (`src/modules/supabaseAuth/`)
  - Service for auth operations
  - Supabase client wrapper
  - Customer-Supabase link model

- ✅ **Workflows** (`src/workflows/auth/`)
  - `register-with-supabase` - Create user + sync customer
  - `login-with-supabase` - Verify credentials + sync customer
  - All steps with rollback compensation

- ✅ **API Routes** (`src/api/store/auth/`)
  - `POST /store/auth/register`
  - `POST /store/auth/login`
  - Zod validation schemas

- ✅ **Database**
  - `customer_supabase` table created
  - Link to customer table established
  - Migrations applied

- ✅ **Configuration**
  - Module registered in `medusa-config.ts`
  - Environment variables configured
  - Middleware validation added

### Documentation

- 📖 `docs/supabase-auth.md` - Complete integration guide
- 📖 `CLAUDE.md` - Updated with Supabase Auth section
- 📖 `.env.example` - Environment variable template
- 🧪 `test-supabase-auth.sh` - Automated test script

## 🏗️ Architecture

```
Storefront → Medusa API → Supabase Auth
                ↓
          Sync Customer
                ↓
         Return JWT Token
```

**Key Benefits:**
- Storefront never calls Supabase directly
- Credentials secure in backend only
- Automatic user sync
- Standard Medusa actor tokens for auth
- Ready for Phase 2-4 migration (coins to Supabase)

## 🔗 API Endpoints

### Register
- **Endpoint**: `POST /store/auth/register`
- **Body**: `{ email, password, first_name?, last_name?, phone? }`
- **Response**: `{ customer, token }`

### Login
- **Endpoint**: `POST /store/auth/login`
- **Body**: `{ email, password }`
- **Response**: `{ customer, token }`

### Use Token
```bash
curl http://localhost:9000/store/customers/me \
  -H "Authorization: Bearer <your_token>"
```

## 🎯 Storefront Integration

See `docs/supabase-auth.md` for:
- Fetch API examples
- Next.js Server Actions
- React component examples
- Token storage best practices

## 🔒 Security Notes

**Production Checklist:**
- [ ] Update `SUPABASE_URL` with production project
- [ ] Update `SUPABASE_SERVICE_ROLE_KEY` with production key
- [ ] Use strong `JWT_SECRET` and `COOKIE_SECRET`
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Use HTTP-only cookies for tokens
- [ ] Enable Supabase email verification
- [ ] Set up Row Level Security (RLS) in Supabase

## 📊 Database Tables

### customer_supabase
Links Medusa customers to Supabase users:

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key |
| customer_id | text | Medusa customer ID |
| supabase_id | text | Supabase user ID (unique) |
| email | text | User email |
| created_at | timestamp | Auto-managed |
| updated_at | timestamp | Auto-managed |

## 🧪 Testing

### Automated Test
```bash
./test-supabase-auth.sh
```

Tests:
- ✅ User registration
- ✅ User login
- ✅ Token authentication
- ✅ Duplicate prevention
- ✅ Password validation

### Manual Testing

1. Register a user via API
2. Check Supabase dashboard → Authentication → Users
3. Check Medusa database → `customer` and `customer_supabase` tables
4. Login with credentials
5. Use token for authenticated requests

## 🚧 Future Phases

### Phase 2: Dual-Write (Coins)
- Write coin data to both Medusa and Supabase
- Validate consistency

### Phase 3: Dual-Read
- Switch read source to Supabase
- Keep Medusa as backup

### Phase 4: Full Migration
- All coin operations via Supabase
- Deprecate Medusa `pointBalance` module

## 📖 Full Documentation

For complete details, see:
- **Integration Guide**: `docs/supabase-auth.md`
- **Project Overview**: `CLAUDE.md`
- **Loyalty Coins**: `docs/loyalty-coins.md`

## ❓ Troubleshooting

### "Supabase configuration is missing"
- Check `.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### "User already exists"
- Expected for duplicate registrations
- Show appropriate error to user

### "Invalid credentials"
- Check email/password
- Verify user exists in Supabase dashboard

### Module not loading
- Run `npx medusa db:migrate`
- Restart server

## 🎉 You're Ready!

Once you've configured Supabase credentials in `.env`, you can:
1. Start building the storefront auth UI
2. Test user registration and login
3. Integrate with existing coin redemption system
4. Plan Phase 2 migration to Supabase

Happy coding! 🚀
