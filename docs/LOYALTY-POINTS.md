# Sistem Loyalty Points

Dokumentasi implementasi fitur loyalty points untuk Medusa v2 store.

## Gambaran Umum

Sistem ini memungkinkan:
- **Admin** menambah/mengurangi poin customer secara manual dari dashboard
- **Admin** mengatur setiap **variant** produk apakah bisa dibeli dengan uang saja, poin saja, atau keduanya
- **Customer** membeli produk menggunakan poin (harga poin terpisah per variant)
- **Aturan checkout**: satu cart hanya bisa **poin ATAU uang**, tidak bisa dicampur

---

## Arsitektur

```
Module (pointBalance)
  ├── models: PointBalance, PointTransaction, VariantPointConfig
  └── service: CRUD + custom methods
          ↓
Workflows
  ├── add-points         (admin tambah poin)
  ├── deduct-points      (admin kurangi poin)
  ├── update-variant-point-config  (admin set harga poin variant)
  ├── redeem-points-on-cart        (customer tebus poin)
  └── hooks/complete-cart          (validasi & deduct poin saat order)
          ↓
API Routes
  ├── /admin/customers/:id/points
  ├── /admin/variants/:id/point-config
  ├── /store/customers/me/points
  ├── /store/variants/:id/point-config
  └── /store/customers/me/points/redeem
          ↓
Admin Widgets + Storefront API
```

---

## Data Models

### PointBalance
Menyimpan saldo poin per customer. Satu customer = satu record.

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | string | Primary key |
| `customer_id` | string | ID customer (unique) |
| `balance` | number | Saldo poin saat ini (default: 0) |

### PointTransaction
Audit trail setiap perubahan poin.

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | string | Primary key |
| `customer_id` | string | ID customer |
| `type` | enum | `"earn"` / `"spend"` / `"adjust"` |
| `points` | number | Jumlah poin |
| `reason` | string? | Alasan perubahan (opsional) |
| `reference_id` | string? | ID referensi (cart_id, dll) |
| `reference_type` | string? | Tipe referensi (`"admin_adjustment"`, `"cart"`) |

### VariantPointConfig
Konfigurasi pembayaran per **variant** (level yang sama dengan harga/price di Medusa).

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | string | Primary key |
| `variant_id` | string | ID variant produk (unique) |
| `payment_type` | enum | `"currency"` / `"points"` / `"both"` (default: `"currency"`) |
| `point_price` | number? | Harga dalam poin (misal: 500 = 500 poin) |

**Arti `payment_type`:**
- `"currency"` — Variant hanya bisa dibeli dengan uang (default, perilaku normal)
- `"points"` — Variant hanya bisa dibeli dengan poin
- `"both"` — Variant bisa dibeli dengan uang ATAU poin (dipilih per checkout, tidak dicampur)

**Kenapa di level variant?** Karena di Medusa, harga (price) sudah ada di level variant. Misal: Kaos (S) = Rp 100.000 / 500 poin, Kaos (M) = Rp 120.000 / 600 poin.

---

## API Endpoints

### Admin Routes

Semua admin routes memerlukan autentikasi admin (session/bearer).

#### GET `/admin/customers/:id/points`

Melihat saldo poin dan riwayat transaksi customer.

**Response:**
```json
{
  "balance": 1500,
  "transactions": [
    {
      "id": "ptx_01...",
      "customer_id": "cus_01...",
      "type": "earn",
      "points": 500,
      "reason": "Reward pembelian pertama",
      "reference_id": null,
      "reference_type": "admin_adjustment",
      "created_at": "2026-02-18T07:30:00Z"
    }
  ]
}
```

#### POST `/admin/customers/:id/points`

Menambah atau mengurangi poin customer.

**Request Body:**
```json
{
  "action": "add",
  "points": 500,
  "reason": "Reward pembelian pertama"
}
```

| Field | Type | Required | Keterangan |
|-------|------|----------|------------|
| `action` | `"add"` \| `"deduct"` | Ya | Aksi yang dilakukan |
| `points` | number (positif) | Ya | Jumlah poin |
| `reason` | string | Tidak | Alasan adjustment |

**Response:**
```json
{
  "balance": {
    "id": "pb_01...",
    "customer_id": "cus_01...",
    "balance": 1500
  }
}
```

**Error (deduct, poin tidak cukup):**
```json
{
  "type": "not_allowed",
  "message": "Insufficient points. Required: 2000, Available: 500"
}
```

#### GET `/admin/variants/:id/point-config`

Melihat konfigurasi poin untuk variant.

**Response:**
```json
{
  "point_config": {
    "variant_id": "variant_01...",
    "payment_type": "points",
    "point_price": 500
  }
}
```

Jika variant belum dikonfigurasi, mengembalikan default:
```json
{
  "point_config": {
    "variant_id": "variant_01...",
    "payment_type": "currency",
    "point_price": null
  }
}
```

#### POST `/admin/variants/:id/point-config`

Mengatur tipe pembayaran dan harga poin untuk variant.

**Request Body:**
```json
{
  "payment_type": "points",
  "point_price": 500
}
```

| Field | Type | Required | Keterangan |
|-------|------|----------|------------|
| `payment_type` | `"currency"` \| `"points"` \| `"both"` | Ya | Tipe pembayaran |
| `point_price` | number \| null | Ya | Harga dalam poin (`null` jika currency only) |

---

### Store Routes

#### GET `/store/customers/me/points`

Customer melihat saldo dan riwayat poin mereka. Memerlukan autentikasi customer.

**Response:**
```json
{
  "points": 1500,
  "transactions": [
    {
      "id": "ptx_01...",
      "type": "earn",
      "points": 500,
      "reason": "Reward pembelian pertama",
      "created_at": "2026-02-18T07:30:00Z"
    }
  ]
}
```

#### GET `/store/variants/:id/point-config`

Melihat konfigurasi poin variant (publik, tidak perlu auth). Digunakan storefront untuk menampilkan harga poin.

**Response:**
```json
{
  "point_config": {
    "variant_id": "variant_01...",
    "payment_type": "both",
    "point_price": 500
  }
}
```

#### POST `/store/customers/me/points/redeem`

Customer menebus poin untuk membayar seluruh cart. Memerlukan autentikasi customer.

**Request Body:**
```json
{
  "cart_id": "cart_01..."
}
```

**Apa yang terjadi:**
1. Mengambil data cart beserta semua item
2. Menghitung total harga poin (point_price × quantity per variant)
3. Memvalidasi semua variant di cart mendukung pembayaran poin (`payment_type` = `"points"` atau `"both"`)
4. Memvalidasi customer punya cukup poin
5. Membuat promotion otomatis yang me-nol-kan total cart
6. Menyimpan `points_cost` di metadata cart untuk divalidasi saat checkout

**Response (sukses):**
```json
{
  "cart": { ... }
}
```

**Error cases:**
```json
// Variant tidak support poin
{ "type": "invalid_data", "message": "Variant variant_01... can only be purchased with currency, not points" }

// Variant belum punya harga poin
{ "type": "invalid_data", "message": "Variant variant_01... does not have a point price set" }

// Poin tidak cukup
{ "type": "not_allowed", "message": "Insufficient points. Required: 2000, Available: 500" }
```

---

## Alur "Beli dengan Poin"

```
1. Admin set variant → POST /admin/variants/:id/point-config
   { payment_type: "points", point_price: 500 }

2. Admin tambah poin ke customer → POST /admin/customers/:id/points
   { action: "add", points: 2000, reason: "Welcome bonus" }

3. Customer add produk ke cart (via storefront, flow normal)

4. Customer tebus poin → POST /store/customers/me/points/redeem
   { cart_id: "cart_01..." }

   Sistem:
   ├── Validasi semua variant item support poin ✓
   ├── Hitung total: 500 × 2 = 1000 poin ✓
   ├── Cek saldo: 2000 >= 1000 ✓
   ├── Buat promotion $0 → apply ke cart
   └── Simpan points_cost di metadata cart

5. Customer checkout (flow normal, cart total = $0)

   Hook completeCartWorkflow.hooks.validate:
   ├── Cek metadata.points_cost ada → ini pembelian poin
   ├── Validasi ulang saldo cukup ✓
   ├── Kurangi saldo: 2000 - 1000 = 1000 poin
   └── Buat transaksi "spend" di riwayat

6. Order dibuat → inventory dikurangi → fulfillment dimulai
```

---

## Admin Dashboard Widgets

### Widget "Loyalty Points" (Halaman Customer)

Muncul di bagian bawah halaman detail customer (`customer.details.after`).

**Fitur:**
- Menampilkan saldo poin saat ini (badge hijau/abu-abu)
- Form untuk menambah/mengurangi poin dengan dropdown aksi dan alasan
- Tabel 10 transaksi terakhir dengan badge warna (hijau = earn, merah = spend)

**File:** `src/admin/widgets/customer-points.tsx`

### Widget "Point Pricing" (Halaman Produk)

Muncul di sidebar kanan halaman detail produk (`product.details.side.after`).

**Fitur:**
- Menampilkan daftar semua variant produk
- Per variant: badge status (Currency/Points Only/Both), harga poin, tombol Edit
- Form edit per variant: dropdown tipe pembayaran + input harga poin
- Masing-masing variant bisa dikonfigurasi secara independen

**File:** `src/admin/widgets/product-point-config.tsx`

---

## Struktur File

```
src/
├── modules/pointBalance/
│   ├── types/index.ts              # Enum types
│   ├── models/
│   │   ├── point-balance.ts        # Saldo poin per customer
│   │   ├── point-transaction.ts    # Riwayat transaksi
│   │   └── variant-point-config.ts # Konfigurasi poin per variant
│   ├── service.ts                  # CRUD + custom methods
│   ├── index.ts                    # Module definition
│   └── migrations/                 # Auto-generated migration files
│
├── links/
│   ├── point-balance-customer.ts        # PointBalance ↔ Customer
│   └── variant-point-config-variant.ts  # VariantPointConfig ↔ ProductVariant
│
├── workflows/
│   ├── loyalty/
│   │   ├── steps/
│   │   │   ├── get-or-create-balance.ts       # Cari/buat balance + tambah poin
│   │   │   ├── deduct-balance.ts              # Kurangi poin (validasi)
│   │   │   ├── upsert-product-point-config.ts # Upsert config variant
│   │   │   ├── validate-cart-points-only.ts   # Validasi cart untuk poin
│   │   │   └── calculate-cart-point-total.ts  # Hitung total poin cart
│   │   ├── add-points.ts                 # Workflow: admin tambah poin
│   │   ├── deduct-points.ts              # Workflow: admin kurangi poin
│   │   ├── update-product-point-config.ts # Workflow: set config variant
│   │   └── redeem-points-on-cart.ts      # Workflow: tebus poin di cart
│   └── hooks/
│       └── complete-cart.ts              # Hook: validasi & deduct saat order
│
├── api/
│   ├── middlewares.ts              # Validasi & auth middleware
│   ├── admin/
│   │   ├── validators.ts          # Zod schemas (admin)
│   │   ├── customers/[id]/points/route.ts       # GET + POST poin customer
│   │   └── variants/[id]/point-config/route.ts  # GET + POST config variant
│   └── store/
│       ├── validators.ts          # Zod schemas (store)
│       ├── customers/me/points/
│       │   ├── route.ts           # GET poin customer
│       │   └── redeem/route.ts    # POST tebus poin
│       └── variants/[id]/point-config/route.ts  # GET config variant
│
└── admin/widgets/
    ├── customer-points.tsx         # Widget poin di halaman customer
    └── product-point-config.tsx    # Widget config di halaman produk (per variant)
```

---

## Contoh Penggunaan (cURL)

### Admin: Tambah Poin ke Customer

```bash
curl -X POST http://localhost:9000/admin/customers/cus_01EXAMPLE/points \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"action": "add", "points": 1000, "reason": "Welcome bonus"}'
```

### Admin: Set Variant Bisa Dibeli dengan Poin

```bash
curl -X POST http://localhost:9000/admin/variants/variant_01EXAMPLE/point-config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"payment_type": "points", "point_price": 500}'
```

### Customer: Lihat Saldo Poin

```bash
curl http://localhost:9000/store/customers/me/points \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### Customer: Tebus Poin untuk Cart

```bash
curl -X POST http://localhost:9000/store/customers/me/points/redeem \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{"cart_id": "cart_01EXAMPLE"}'
```

### Storefront: Cek Apakah Variant Bisa Dibeli dengan Poin

```bash
curl http://localhost:9000/store/variants/variant_01EXAMPLE/point-config
```

---

## Integrasi Storefront (Next.js)

Untuk mengintegrasikan dengan storefront Next.js, gunakan Medusa JS SDK:

```typescript
import Medusa from "@medusajs/js-sdk"

const sdk = new Medusa({
  baseUrl: "http://localhost:9000",
  auth: { type: "session" },
})

// Lihat saldo poin customer
const { points, transactions } = await sdk.client.fetch(
  "/store/customers/me/points"
)

// Lihat config poin variant
const { point_config } = await sdk.client.fetch(
  `/store/variants/${variantId}/point-config`
)

// Tebus poin
const { cart } = await sdk.client.fetch(
  "/store/customers/me/points/redeem",
  { method: "POST", body: { cart_id: cartId } }
)
```

**Penting:** Selalu gunakan `sdk.client.fetch()`, jangan `fetch()` biasa — SDK otomatis menambahkan header autentikasi dan publishable API key.

---

## Catatan Teknis

- **Konfigurasi di level variant**: Point pricing disimpan per variant (bukan per produk), sesuai dengan cara Medusa menyimpan harga. Satu produk bisa punya variant dengan pengaturan poin yang berbeda.
- **Mekanisme diskon poin**: Menggunakan Promotion System Medusa (membuat promotion otomatis `type: "fixed"`, `target_type: "order"` yang me-nol-kan cart total). Pendekatan ini mengikuti [tutorial resmi Medusa](https://docs.medusajs.com/resources/how-to-tutorials/tutorials/loyalty-points).
- **Double validation**: Poin divalidasi dua kali — saat `redeem` dan saat `completeCart` (via hook) — untuk mencegah race condition.
- **Rollback**: Semua workflow steps memiliki compensation function untuk rollback jika workflow gagal.
- **Module name**: `"pointBalance"` (camelCase, sesuai aturan Medusa v2).
- **Harga poin**: Disimpan as-is (500 = 500 poin), tidak ada konversi ke mata uang.
