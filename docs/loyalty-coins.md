# Loyalty Coins System

Sistem loyalty coins untuk Medusa v2 yang memungkinkan customer mengumpulkan dan menukarkan coins untuk pembelian produk.

## Daftar Isi

- [Arsitektur](#arsitektur)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Workflows](#workflows)
- [Admin Dashboard](#admin-dashboard)
- [Alur Bisnis](#alur-bisnis)
- [File Structure](#file-structure)
- [Mengapa Tidak Menggunakan Custom Currency](#mengapa-tidak-menggunakan-custom-currency)

---

## Arsitektur

Sistem ini mengikuti arsitektur Medusa v2 yang berlapis:

```
Module (data models + CRUD) → Workflow (business logic + rollback) → API Route (HTTP + validation) → Admin UI / Storefront
```

### Komponen Utama

| Komponen | Lokasi | Fungsi |
|----------|--------|--------|
| Module `pointBalance` | `src/modules/pointBalance/` | Data models dan CRUD service |
| Workflows | `src/workflows/loyalty/` | Business logic dengan compensation/rollback |
| Admin API | `src/api/admin/` | Endpoint untuk admin dashboard |
| Store API | `src/api/store/` | Endpoint untuk storefront/customer |
| Admin Widgets | `src/admin/widgets/` | UI di admin dashboard |
| Links | `src/links/` | Asosiasi antar module |
| Cart Hook | `src/workflows/hooks/complete-cart.ts` | Deduct coins saat checkout selesai |

---

## Data Model

### point_balance

Menyimpan saldo coins per customer.

| Column | Type | Keterangan |
|--------|------|------------|
| `id` | text (PK) | Auto-generated ID |
| `customer_id` | text | Reference ke customer |
| `balance` | integer | Jumlah coins saat ini (default: 0) |
| `created_at` | timestamptz | Waktu dibuat |
| `updated_at` | timestamptz | Waktu terakhir diupdate |
| `deleted_at` | timestamptz | Soft delete |

### point_transaction

Audit log semua aktivitas coins (earn, spend, adjust).

| Column | Type | Keterangan |
|--------|------|------------|
| `id` | text (PK) | Auto-generated ID |
| `customer_id` | text | Reference ke customer |
| `type` | enum | `earn`, `spend`, atau `adjust` |
| `points` | integer | Jumlah coins dalam transaksi |
| `reason` | text (nullable) | Alasan transaksi |
| `reference_id` | text (nullable) | ID entitas terkait (misal: cart_id) |
| `reference_type` | text (nullable) | Tipe referensi (misal: `cart`, `admin_adjustment`) |
| `created_at` | timestamptz | Waktu transaksi |
| `updated_at` | timestamptz | Waktu terakhir diupdate |
| `deleted_at` | timestamptz | Soft delete |

### variant_point_config

Konfigurasi harga coin per product variant.

| Column | Type | Keterangan |
|--------|------|------------|
| `id` | text (PK) | Auto-generated ID |
| `variant_id` | text | Reference ke product variant |
| `payment_type` | enum | `currency` (default), `points`, atau `both` |
| `point_price` | integer (nullable) | Harga dalam coins |
| `created_at` | timestamptz | Waktu dibuat |
| `updated_at` | timestamptz | Waktu terakhir diupdate |
| `deleted_at` | timestamptz | Soft delete |

### Payment Type

| Value | Keterangan |
|-------|------------|
| `currency` | Hanya bisa dibeli dengan uang (EUR/USD). Default |
| `points` | Hanya bisa dibeli dengan coins |
| `both` | Customer bisa pilih bayar pakai uang atau coins |

### Module Links

| Link | Dari | Ke |
|------|------|----|
| `point-balance-customer` | `PointBalance.customer_id` | `Customer.id` |
| `variant-point-config-variant` | `VariantPointConfig.variant_id` | `ProductVariant.id` |

---

## API Reference

### Admin Endpoints

#### GET `/admin/customers/:id/points`

Mengambil saldo coins dan riwayat transaksi customer.

**Response:**
```json
{
  "balance": 1500,
  "transactions": [
    {
      "id": "ptxn_01...",
      "type": "earn",
      "points": 500,
      "reason": "Admin adjustment (add)",
      "created_at": "2026-02-18T08:00:00Z"
    }
  ]
}
```

#### POST `/admin/customers/:id/points`

Menambah atau mengurangi coins customer.

**Request Body:**
```json
{
  "action": "add",
  "points": 500,
  "reason": "Reward for first purchase"
}
```

| Field | Type | Required | Keterangan |
|-------|------|----------|------------|
| `action` | `"add"` \| `"deduct"` | Ya | Aksi yang dilakukan |
| `points` | number (positive) | Ya | Jumlah coins |
| `reason` | string | Tidak | Alasan transaksi |

**Response:**
```json
{
  "balance": 2000
}
```

#### GET `/admin/variants/:id/point-config`

Mengambil konfigurasi coin pricing untuk variant.

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

#### POST `/admin/variants/:id/point-config`

Mengatur konfigurasi coin pricing untuk variant.

**Request Body:**
```json
{
  "payment_type": "both",
  "point_price": 500
}
```

| Field | Type | Required | Keterangan |
|-------|------|----------|------------|
| `payment_type` | `"currency"` \| `"points"` \| `"both"` | Ya | Tipe pembayaran |
| `point_price` | number \| null | Ya | Harga dalam coins |

### Store Endpoints

#### GET `/store/customers/me/points`

Mengambil saldo coins dan riwayat transaksi customer yang sedang login.

**Auth:** Required (session/bearer)

**Response:**
```json
{
  "coins": 1500,
  "transactions": [
    {
      "id": "ptxn_01...",
      "type": "earn",
      "points": 500,
      "reason": "Reward for first purchase",
      "created_at": "2026-02-18T08:00:00Z"
    }
  ]
}
```

#### POST `/store/customers/me/points/redeem`

Menukarkan coins untuk membayar cart.

**Auth:** Required (session/bearer)

**Request Body:**
```json
{
  "cart_id": "cart_01..."
}
```

**Response:**
```json
{
  "cart": { ... }
}
```

**Validasi yang dilakukan:**
1. Semua item di cart harus punya coin config (`payment_type` bukan `currency`)
2. Semua variant harus punya `point_price` yang diset
3. Customer harus punya cukup coins untuk total harga coin semua item

#### GET `/store/variants/:id/point-config`

Mengambil konfigurasi coin pricing untuk variant (public, tanpa auth).

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

---

## Workflows

### add-points

Menambah coins ke saldo customer.

```
Input: { customer_id, points, reason? }
  → getOrCreateBalanceStep
    → Get/create balance record
    → Increment balance
    → Create "earn" transaction
  → Compensation: revert balance ke nilai sebelumnya
```

### deduct-points

Mengurangi coins dari saldo customer.

```
Input: { customer_id, points, reason? }
  → deductBalanceStep
    → Validate saldo cukup
    → Decrement balance
    → Create "spend" transaction
  → Compensation: revert balance ke nilai sebelumnya
```

### redeem-points-on-cart

Menukarkan coins untuk membayar cart. Workflow paling kompleks.

```
Input: { cart_id, customer_id }
  → useQueryGraphStep (fetch cart + items + promotions)
  → calculateCartPointTotalStep (hitung total coin cost)
  → validateCartPointsOnlyStep (validasi semua item & saldo)
  → acquireLockStep (lock cart untuk prevent race condition)
  → createPromotionsStep (buat promo COINS-xxxx = 100% discount)
  → updateCartPromotionsWorkflow (apply promo ke cart)
  → updateCartsStep (simpan metadata: points_promo_id, points_cost)
  → useQueryGraphStep (fetch updated cart)
  → releaseLockStep (release lock)
```

### update-variant-point-config

Mengatur konfigurasi coin pricing per variant.

```
Input: { variant_id, payment_type, point_price }
  → upsertVariantPointConfigStep
    → Create atau update config
  → Compensation: revert ke config sebelumnya atau delete jika baru
```

### Cart Completion Hook

Hook ke `completeCartWorkflow` yang berjalan saat checkout selesai:

```
On cart completion:
  → Cek apakah cart punya metadata.points_cost
  → Jika ya: validasi saldo masih cukup
  → Deduct coins dari balance
  → Create "spend" transaction (reference_type: "cart")
```

---

## Admin Dashboard

### Widget: Coin Pricing (Product Detail)

**Lokasi:** Product detail page, di bawah variant table (`product.details.after`)

**Fitur:**
- View mode: menampilkan payment type (badge) dan coin price per variant
- Edit mode: tabel dengan kolom Variant, Payment Type (Select), dan Coin Price (Input)
- Tombol Save menyimpan semua variant sekaligus
- Toast notification saat berhasil/gagal

**Alur penggunaan:**
1. Buka Products → pilih product
2. Scroll ke bawah → widget "Coin Pricing"
3. Klik "Edit" → ubah payment type dan coin price per variant
4. Klik "Save"

### Widget: Loyalty Coins (Customer Detail)

**Lokasi:** Customer detail page (`customer.details.after`)

**Fitur:**
- Menampilkan saldo coins saat ini (badge)
- Form untuk Add/Deduct coins dengan reason
- Daftar 10 transaksi terakhir (color-coded: hijau = earn, merah = spend)

---

## Alur Bisnis

### 1. Admin Menambah Coins ke Customer

```
Admin → Customer detail → Widget "Loyalty Coins"
  → Pilih "Add", masukkan jumlah dan alasan
  → Submit
  → POST /admin/customers/:id/points { action: "add", points: 500 }
  → addPointsWorkflow
  → Balance bertambah, transaction "earn" tercatat
```

### 2. Admin Mengatur Coin Price Product

```
Admin → Product detail → Widget "Coin Pricing"
  → Klik "Edit"
  → Set payment type = "Coins Only" atau "Both"
  → Masukkan coin price (misal: 500)
  → Klik "Save"
  → POST /admin/variants/:id/point-config
  → updateVariantPointConfigWorkflow
```

### 3. Customer Redeem Coins di Cart

```
Customer → Tambah item ke cart
  → POST /store/customers/me/points/redeem { cart_id: "..." }
  → redeemPointsOnCartWorkflow:
    1. Hitung total coin cost (coin_price × quantity per item)
    2. Validasi semua item punya coin config
    3. Validasi saldo customer cukup
    4. Buat promotion code (COINS-XXXXXX) senilai 100% cart total
    5. Apply promotion ke cart → cart total jadi 0
    6. Simpan metadata: points_cost = total coins yang dibutuhkan
  → Customer proceed checkout (total = 0, karena sudah di-discount)
  → completeCartWorkflow hook:
    1. Cek metadata.points_cost ada
    2. Validasi saldo masih cukup
    3. Deduct coins dari balance
    4. Catat "spend" transaction
```

### 4. Alur Lengkap (End-to-End)

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN                                                       │
│                                                             │
│  1. Set coin price pada product variant                     │
│     (payment_type: "points" atau "both", point_price: 500) │
│                                                             │
│  2. Tambah coins ke customer                                │
│     (action: "add", points: 1000)                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STOREFRONT                                                  │
│                                                             │
│  3. Customer cek saldo coins                                │
│     GET /store/customers/me/points → { coins: 1000 }       │
│                                                             │
│  4. Customer cek coin price product                         │
│     GET /store/variants/:id/point-config                    │
│     → { point_config: { payment_type: "points",             │
│                         point_price: 500 } }                │
│                                                             │
│  5. Customer tambah item ke cart (via Medusa standard API)  │
│                                                             │
│  6. Customer redeem coins                                   │
│     POST /store/customers/me/points/redeem { cart_id }      │
│     → Cart total jadi 0 (auto-promotion applied)            │
│                                                             │
│  7. Customer complete checkout                              │
│     → Hook: coins di-deduct dari balance                    │
│     → Transaction "spend" tercatat                          │
│     → Order dibuat                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── modules/pointBalance/
│   ├── models/
│   │   ├── point-balance.ts          # Model saldo coins
│   │   ├── point-transaction.ts      # Model audit log transaksi
│   │   └── variant-point-config.ts   # Model konfigurasi coin per variant
│   ├── types/index.ts                # Enum TransactionType & PaymentType
│   ├── service.ts                    # Service dengan custom methods
│   ├── index.ts                      # Module export (POINT_BALANCE_MODULE)
│   └── migrations/
│       └── Migration20260218082322.ts
│
├── workflows/loyalty/
│   ├── add-points.ts                 # Workflow tambah coins
│   ├── deduct-points.ts             # Workflow kurangi coins
│   ├── redeem-points-on-cart.ts     # Workflow redeem coins di cart
│   ├── update-product-point-config.ts # Workflow update coin config
│   └── steps/
│       ├── get-or-create-balance.ts  # Step: get/create + increment balance
│       ├── deduct-balance.ts         # Step: validate + decrement balance
│       ├── calculate-cart-point-total.ts # Step: hitung total coin cost
│       ├── validate-cart-points-only.ts  # Step: validasi cart items & saldo
│       └── upsert-product-point-config.ts # Step: create/update variant config
│
├── workflows/hooks/
│   └── complete-cart.ts              # Hook: deduct coins saat checkout
│
├── api/
│   ├── middlewares.ts                # Validation & auth middleware
│   ├── admin/
│   │   ├── validators.ts            # Zod schemas untuk admin endpoints
│   │   ├── customers/[id]/points/route.ts    # GET & POST coins customer
│   │   └── variants/[id]/point-config/route.ts # GET & POST coin config
│   └── store/
│       ├── validators.ts            # Zod schemas untuk store endpoints
│       ├── customers/me/points/route.ts       # GET saldo coins
│       ├── customers/me/points/redeem/route.ts # POST redeem coins
│       └── variants/[id]/point-config/route.ts # GET coin config (public)
│
├── links/
│   ├── point-balance-customer.ts     # Link: PointBalance ↔ Customer
│   └── variant-point-config-variant.ts # Link: VariantPointConfig ↔ ProductVariant
│
└── admin/
    ├── lib/client.ts                 # Medusa JS SDK instance
    └── widgets/
        ├── product-point-config.tsx  # Widget coin pricing di product detail
        └── customer-points.tsx       # Widget loyalty coins di customer detail
```

---

## Mengapa Tidak Menggunakan Custom Currency

Pertanyaan yang sering muncul: mengapa tidak membuat "Coin" sebagai custom currency di Medusa, sehingga coin price muncul langsung di halaman prices bawaan (bersama EUR, USD)?

### Bagaimana Currency Bekerja di Medusa

Medusa menggunakan **ISO 4217 currency codes** (EUR, USD, GBP, dll) yang terikat ke **Region** dan **Store**. Halaman edit prices di admin menampilkan kolom per currency berdasarkan region yang dikonfigurasi. Secara teori, jika kita bisa menambahkan currency code `COIN`, maka kolom "Price COIN" akan muncul otomatis di form harga.

### Hambatan Teknis

#### 1. Validasi ISO 4217

Medusa **memvalidasi currency codes** terhadap daftar standar ISO 4217. Currency code custom seperti `COIN` akan **ditolak** oleh validator karena bukan kode ISO yang diakui. Setiap currency di Medusa memiliki properti bawaan (`decimal_digits`, `symbol`, `symbol_native`, `rounding`) yang di-hardcode berdasarkan standar internasional.

#### 2. Payment Gateway Tidak Mengenal Custom Currency

Payment provider seperti Stripe hanya mendukung real currencies. Jika customer checkout dengan currency `COIN`, Stripe akan **menolak transaksi** karena tidak bisa memproses pembayaran dalam mata uang yang tidak ada.

#### 3. Cart Hanya Mendukung Satu Currency

Setiap cart di Medusa hanya bisa memiliki **satu `currency_code`**. Artinya customer tidak bisa mixed payment — bayar sebagian dengan USD dan sebagian dengan COIN dalam satu transaksi. Ini bertentangan dengan kebutuhan `payment_type: "both"` di mana customer bisa memilih antara uang atau coins.

#### 4. Kalkulasi Tax, Shipping, dan Promotions Menjadi Tidak Valid

Jika coin masuk sebagai currency, seluruh engine kalkulasi Medusa akan mencoba menghitung:
- **Tax**: Pajak atas transaksi "COIN" — tidak masuk akal
- **Shipping cost**: Ongkir dalam denominasi "COIN" — tidak ada rate-nya
- **Promotions**: Diskon percentage/fixed terhadap harga "COIN" — hasilnya salah

Semua kalkulasi ini didesain untuk real monetary currencies, bukan reward points.

#### 5. Reporting dan Analytics Kacau

Jika ada order dengan currency `COIN`, data revenue akan bercampur antara real money dan virtual currency. Admin tidak bisa membedakan mana revenue sebenarnya dan mana yang merupakan coin redemption.

### Perbandingan Pendekatan

| Aspek | Custom Currency | Custom Module (saat ini) |
|-------|----------------|--------------------------|
| Muncul di halaman prices | Ya | Tidak (widget terpisah) |
| Validasi ISO currency | Ditolak | Tidak relevan |
| Payment gateway (Stripe) | Error saat checkout | Bekerja normal |
| Tax & shipping calculation | Salah hitung | Tidak terpengaruh |
| Mixed payment (uang + coins) | Tidak bisa | Didukung (`payment_type: "both"`) |
| Audit trail transaksi coins | Tidak ada | Lengkap (earn/spend/adjust) |
| Customer balance tracking | Tidak ada | Ada (real-time balance) |
| Compensation/rollback | Tidak ada | Ada di setiap workflow step |
| Coin earning system | Tidak mungkin | Fully supported |
| Muncul di create product | Ya | Tidak (set setelah create) |
| Cart locking (race condition) | Tidak ada | Ada |

### Kesimpulan

Coins **bukan currency** — coins adalah **reward system** dengan logika bisnis tersendiri:
- Customer **earn** coins dari aktivitas (purchase, promo, admin manual)
- Customer **spend** coins untuk redeem produk
- Ada **balance tracking** per customer
- Ada **audit trail** setiap transaksi
- Ada **validasi bisnis** (saldo cukup, variant mendukung coins, dll)
- Ada **compensation/rollback** jika proses gagal

Semua ini tidak bisa dilakukan dengan fitur currency bawaan Medusa. Custom module adalah pendekatan yang tepat karena memberikan kontrol penuh atas business logic tanpa mengganggu core e-commerce flow (payment, tax, shipping).

Satu-satunya kekurangan dari pendekatan custom module adalah coin price **tidak muncul di halaman create product dan edit prices bawaan**. Ini karena Medusa tidak menyediakan widget injection zone untuk halaman-halaman tersebut. Sebagai gantinya, admin mengatur coin price melalui widget "Coin Pricing" di halaman product detail setelah product dibuat.
