# 📋 Product Requirements Document (PRD)
## Aplikasi POS — Toko Tani Makmur
**Versi:** 1.0.0  
**Tanggal:** 2025-03-15  
**Disusun oleh:** Tim Pengembangan  
**Status:** Draft Final

---

## 1. RINGKASAN EKSEKUTIF

**Toko Tani Makmur** adalah toko pertanian yang menjual pupuk, obat-obatan sawah, benih, peralatan berkebun, dan alat kebun lainnya. Aplikasi POS ini dirancang untuk menggantikan proses manual dengan sistem digital yang handal, dapat bekerja secara offline (Local-First), dan mendukung sinkronisasi cloud secara opsional.

### Masalah yang Diselesaikan
- Pencatatan stok manual yang rawan kesalahan
- Tidak ada kontrol FIFO/FEFO untuk produk yang mudah kedaluwarsa
- Tidak ada histori transaksi pelanggan yang terpusat
- Tidak ada laporan komprehensif untuk pengambilan keputusan bisnis
- Ketergantungan terhadap koneksi internet

---

## 2. VISI & TUJUAN PRODUK

### Visi
"Menjadi sistem manajemen toko pertanian terdepan yang memastikan setiap transaksi tercatat akurat, stok terpantau real-time, dan bisnis dapat berjalan tanpa gangguan meskipun tanpa internet."

### Tujuan Utama (OKR)
| Objective | Key Result |
|-----------|------------|
| Efisiensi transaksi | Waktu transaksi < 2 menit per pelanggan |
| Akurasi stok | Zero selisih stok (FIFO/FEFO enforcement) |
| Aksesibilitas | 100% fungsional tanpa internet |
| Keamanan data | Backup cloud otomatis setiap 24 jam |

---

## 3. PENGGUNA & PERAN (USER PERSONAS)

### 3.1 Kasir (Cashier)
- **Kebutuhan:** Proses transaksi cepat, tampilan jelas, tidak perlu training teknis mendalam
- **Fitur Utama:** POS transaksi, lihat stok, cetak struk
- **Batasan:** Tidak dapat menghapus transaksi, tidak akses ke laporan keuangan

### 3.2 Admin / Manajer Toko
- **Kebutuhan:** Pantau semua aktivitas, kelola produk & pelanggan, akses laporan penuh
- **Fitur Utama:** Semua fitur + manajemen pengguna + laporan lengkap

### 3.3 Gudang / Stok Keeper
- **Kebutuhan:** Kelola penerimaan barang, update stok, catat PO
- **Fitur Utama:** Kelola pembelian PO, penerimaan barang, laporan stok

### 3.4 Owner / Pemilik
- **Kebutuhan:** Dashboard overview, laporan profit/loss, analisis tren
- **Fitur Utama:** Dashboard, semua laporan, manajemen hak akses

---

## 4. TECH STACK & ARSITEKTUR

### 4.1 Frontend
```
Framework     : React 18 + Vite 5
Language      : TypeScript 5.x
UI Components : shadcn/ui + Radix UI
Styling       : Tailwind CSS 3.x
Icons         : Lucide React
State Mgmt    : Zustand 4.x
Forms         : React Hook Form + Zod
Router        : React Router v6
Tables        : TanStack Table v8
Charts        : Recharts 2.x
Date          : date-fns 3.x
```

### 4.2 Local-First Layer (Offline Priority)
```
Local DB      : Dexie.js (IndexedDB wrapper)
Sync Engine   : Custom sync adapter
Cache         : Service Worker (Workbox)
PWA           : vite-plugin-pwa
```

### 4.3 Cloud Sync (Opsional)
```
Backend       : Supabase (PostgreSQL + Auth + Storage + Realtime)
ORM (cloud)   : Supabase JS Client v2
File Storage  : Supabase Storage (gambar produk, bukti terima)
Auth          : Supabase Auth (JWT + Row Level Security)
```

### 4.4 Desktop Wrapper (Opsional)
```
Desktop App   : Tauri 2.x (Rust-based, lebih ringan dari Electron)
```

### 4.5 Utilities
```
Excel Import  : SheetJS (xlsx) 0.18+
PDF/Print     : @react-pdf/renderer + react-to-print
Barcode       : @zxing/library
QR Code       : qrcode.react
Notifications : react-hot-toast
```

### 4.6 Arsitektur Local-First
```
┌─────────────────────────────────────────────┐
│              REACT UI LAYER                  │
│   (Components, Pages, Hooks, State)          │
└───────────────┬─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│           SERVICE LAYER                      │
│  (Business Logic, FIFO/FEFO Engine,          │
│   Sync Manager, Conflict Resolution)         │
└───────────────┬─────────────────────────────┘
                │
       ┌────────┴────────┐
       │                 │
┌──────▼──────┐   ┌──────▼──────────────────┐
│  LOCAL DB   │   │   CLOUD SYNC (optional)  │
│  IndexedDB  │◄──┤   Supabase PostgreSQL    │
│  (Dexie.js) │   │   (when online)          │
└─────────────┘   └──────────────────────────┘
```

---

## 5. DATABASE SCHEMA

### 5.1 Tabel Utama (IndexedDB Local + PostgreSQL Cloud)

#### `products`
```typescript
{
  id: string (UUID),
  code: string (unique, auto-generate),
  name: string,
  description: string | null,
  category_id: string,
  image_url: string | null,
  image_local: Blob | null,         // Local storage
  is_active: boolean,
  created_at: timestamp,
  updated_at: timestamp,
  synced_at: timestamp | null,
  sync_status: 'synced' | 'pending' | 'conflict'
}
```

#### `product_units`
```typescript
{
  id: string (UUID),
  product_id: string,
  unit_name: string,                // "Karung", "Kg", "Liter", "Botol", "Sachet"
  conversion_factor: number,        // Misal: 1 karung = 50 kg → factor = 50
  is_base_unit: boolean,
  purchase_price: number,
  selling_price: number,
  barcode: string | null
}
```

#### `product_stocks`
```typescript
{
  id: string (UUID),
  product_id: string,
  unit_id: string,
  batch_number: string | null,
  expire_date: date | null,         // Untuk FEFO
  quantity: number,
  purchase_price: number,           // Untuk FIFO costing
  received_date: date,              // Untuk FIFO ordering
  purchase_order_item_id: string | null,
  location: string | null,          // Lokasi rak/gudang
}
```

#### `categories`
```typescript
{
  id: string (UUID),
  name: string,
  code: string,
  description: string | null,
  parent_id: string | null,         // Untuk sub-kategori
  icon: string | null,
  color: string | null,
  created_at: timestamp
}
```

#### `suppliers`
```typescript
{
  id: string (UUID),
  code: string,
  name: string,
  contact_person: string | null,
  phone: string | null,
  email: string | null,
  address: string | null,
  city: string | null,
  bank_name: string | null,
  bank_account: string | null,
  payment_terms: number | null,     // Hari
  notes: string | null,
  is_active: boolean
}
```

#### `customers`
```typescript
{
  id: string (UUID),
  nik: string | null,               // Dari template import
  code: string,
  name: string,
  phone: string | null,
  email: string | null,
  address: string | null,
  village: string | null,           // Desa
  district: string | null,          // Kecamatan
  regency: string | null,           // Kabupaten
  province: string | null,          // Provinsi
  credit_limit: number,
  outstanding_credit: number,
  loyalty_points: number,
  is_active: boolean,
  created_at: timestamp
}
```

#### `sales_transactions`
```typescript
{
  id: string (UUID),
  invoice_number: string (unique),  // Format: INV-YYYYMMDD-XXXX
  customer_id: string | null,
  cashier_id: string,
  transaction_date: date,
  due_date: date | null,            // Untuk kredit
  subtotal: number,
  discount_amount: number,
  tax_amount: number,
  total_amount: number,
  paid_amount: number,
  change_amount: number,
  payment_method: 'cash' | 'transfer' | 'credit',
  payment_reference: string | null, // No. rekening/bukti transfer
  status: 'draft' | 'completed' | 'cancelled' | 'partial_paid',
  notes: string | null,
  created_at: timestamp
}
```

#### `sales_transaction_items`
```typescript
{
  id: string (UUID),
  transaction_id: string,
  product_id: string,
  product_unit_id: string,
  batch_ids: string[],              // FIFO/FEFO tracking
  quantity: number,
  unit_price: number,
  discount_percent: number,
  discount_amount: number,
  subtotal: number,
  cogs: number,                     // Cost of Goods Sold (FIFO/FEFO)
}
```

#### `purchase_orders`
```typescript
{
  id: string (UUID),
  po_number: string (unique),       // Format: PO-YYYYMMDD-XXXX
  supplier_id: string,
  ordered_by: string,               // user_id
  order_date: date,
  expected_date: date | null,
  status: 'draft' | 'sent' | 'partial_received' | 'received' | 'cancelled',
  notes: string | null,
  total_amount: number,
  created_at: timestamp
}
```

#### `purchase_order_items`
```typescript
{
  id: string (UUID),
  po_id: string,
  product_id: string,
  product_unit_id: string,
  quantity_ordered: number,
  quantity_received: number,
  unit_price: number,
  subtotal: number,
  expire_date: date | null,
  notes: string | null
}
```

#### `goods_receipts`
```typescript
{
  id: string (UUID),
  gr_number: string,                // Format: GR-YYYYMMDD-XXXX
  po_id: string,
  received_by: string,
  received_date: date,
  status: 'complete' | 'partial',
  notes: string | null,
  proof_image_url: string | null,
  proof_image_local: Blob | null
}
```

#### `goods_receipt_items`
```typescript
{
  id: string (UUID),
  gr_id: string,
  po_item_id: string,
  product_id: string,
  quantity_received: number,
  batch_number: string | null,
  expire_date: date | null,
  condition: 'good' | 'damaged' | 'rejected',
  notes: string | null
}
```

#### `stock_movements`
```typescript
{
  id: string (UUID),
  product_id: string,
  product_unit_id: string,
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'expired',
  reference_id: string,             // ID transaksi terkait
  reference_type: 'sale' | 'purchase' | 'adjustment',
  batch_number: string | null,
  quantity_before: number,
  quantity_change: number,          // + masuk, - keluar
  quantity_after: number,
  expire_date: date | null,
  notes: string | null,
  created_by: string,
  created_at: timestamp
}
```

#### `users`
```typescript
{
  id: string (UUID),
  username: string (unique),
  full_name: string,
  email: string | null,
  phone: string | null,
  role_id: string,
  pin: string | null,               // PIN untuk kasir (6 digit, hashed)
  is_active: boolean,
  last_login: timestamp | null,
  created_at: timestamp
}
```

#### `roles`
```typescript
{
  id: string (UUID),
  name: string,
  permissions: Permission[],        // Array of permission keys
  created_at: timestamp
}
```

#### `app_settings`
```typescript
{
  key: string (PK),
  value: string | number | boolean | object,
  description: string | null
}
```

---

## 6. FITUR DETAIL PER MODUL

### 6.1 Dashboard
- **Overview Cards:** Total penjualan hari ini, minggu ini, bulan ini
- **Alert Stok Kritis:** Produk di bawah minimum stok
- **Alert Kedaluwarsa:** Produk expired dalam 30/60/90 hari
- **Grafik Penjualan:** Trend harian/mingguan/bulanan
- **Top Produk:** 5 produk terlaris
- **Transaksi Terakhir:** 10 transaksi terbaru
- **Hutang Pelanggan:** Summary kredit outstanding

### 6.2 Transaksi Penjualan (POS)
#### Layout POS
```
┌──────────────────────────────────────────────────────────┐
│  HEADER: Invoice No | Tanggal | Kasir | [DRAFT] badge    │
├───────────────────────────┬──────────────────────────────┤
│   PANEL KIRI: Produk      │   PANEL KANAN: Keranjang     │
│                           │                              │
│  [Search + Scan Barcode]  │  Pelanggan: [Pilih ▼]        │
│  [Filter Kategori]        │  ─────────────────────       │
│  ┌─────────────────────┐  │  Item 1: Curacron 500ml x2   │
│  │ GRID/LIST PRODUK    │  │  Item 2: Pupuk Urea 50kg x1  │
│  │ (bisa toggle)       │  │  ...                         │
│  │                     │  │  ─────────────────────       │
│  │ [Produk Card]       │  │  Subtotal: Rp 150.000        │
│  │ nama, harga, stok   │  │  Diskon:   Rp   5.000        │
│  │                     │  │  Total:    Rp 145.000        │
│  └─────────────────────┘  │  ─────────────────────       │
│                           │  [HISTORI PELANGGAN ▼]       │
│                           │  Pembayaran: [Cash][TF][Krd] │
│                           │  Bayar: [_______] [Uang Pas] │
│                           │  Kembalian: Rp 55.000        │
│                           │  [SIMPAN DRAFT] [BAYAR]      │
└───────────────────────────┴──────────────────────────────┘
```

#### Fitur Wajib POS
- Auto-generate nomor invoice (INV-YYYYMMDD-XXXX)
- Pencarian produk real-time (nama + kode + barcode)
- Filter kategori produk
- Tampilan stok tersedia per produk
- Quantity adjuster (+/-) di keranjang
- Diskon per item dan diskon total
- Histori pembelian pelanggan (collapsible panel) → klik item untuk tambah ke keranjang
- Tombol "Uang Pas" otomatis set bayar = total
- Nomor pecahan uang cepat (50k, 100k, 200k)
- Pilihan metode pembayaran: Tunai, Transfer, Kredit
- Input referensi transfer (nomor rekening/bukti)
- Validasi limit kredit pelanggan
- Simpan sebagai Draft (bisa multi-draft)
- Cetak struk (58mm thermal / A4)
- FIFO/FEFO otomatis saat checkout

### 6.3 Pembelian (Purchase Order)
#### Fitur PO
- Tampilkan produk urutkan dari stok terendah (critical first)
- Multi-select produk dalam satu sesi
- Otomatis deteksi supplier dari produk yang dipilih
- Pengelompokan item per supplier → generate multiple PO numbers
- Format PO Number: PO-{SUPPLIER_CODE}-{YYYYMMDD}-{XXXX}
- Preview PO sebelum submit
- Status tracking: Draft → Sent → Partial Received → Received

#### Catatan Penerimaan Barang (Goods Receipt)
- Link ke PO terkait
- Input qty diterima per item (bisa sebagian/partial)
- Input nomor batch/lot produk
- Input tanggal kedaluwarsa (opsional per item)
- Kondisi barang (Baik/Rusak/Ditolak)
- Upload bukti penerimaan (foto/PDF) - drag & drop
- Auto-update stok + stock movements setelah simpan
- Generate GR Number: GR-YYYYMMDD-XXXX

### 6.4 Kelola Produk
#### Form Produk
- Kode produk (auto-generate atau manual)
- Nama produk
- Kategori (dengan sub-kategori)
- Supplier (bisa multiple supplier)
- Deskripsi
- Upload gambar (drag & drop, preview, crop)
- Status aktif/nonaktif

#### Satuan Produk (Multi-Unit)
```
Contoh: Pupuk Urea
┌────────────────────────────────────────────────────────┐
│ Satuan  │ Konversi │ Harga Beli │ Harga Jual │ Expired │
├─────────┼──────────┼────────────┼────────────┼─────────┤
│ Karung  │ 1 (base) │ 150.000    │ 170.000    │ -       │
│ Kg      │ 50       │ 3.000      │ 3.500      │ -       │
│ Kg 25   │ 25       │ 75.000     │ 85.000     │ -       │
└─────────┴──────────┴────────────┴────────────┴─────────┘
```

#### Input Mode
1. **Single Input:** Form tunggal dengan semua field
2. **Batch Input:** Tabel editable untuk input banyak produk sekaligus
3. **Import Excel:** Drag & drop file .xlsx sesuai template
   - Preview data sebelum import
   - Validasi error per baris
   - Import partial (skip baris error)
   - Download template

### 6.5 Kelola Pelanggan
- CRUD pelanggan
- Import Excel drag & drop (sesuai template yang ada: NIK, Nama, Alamat, Desa, Kecamatan, Kabupaten, Provinsi)
- Preview + validasi sebelum import
- Histori transaksi per pelanggan
- Info limit kredit dan outstanding
- Export data pelanggan
- Filter berdasarkan kecamatan/kabupaten

### 6.6 Supplier
- CRUD supplier
- Produk terkait supplier
- Histori PO per supplier
- Info pembayaran dan terms

### 6.7 Kategori
- CRUD kategori
- Sub-kategori support
- Warna dan ikon per kategori
- Jumlah produk per kategori

### 6.8 Manajemen Pengguna
- CRUD pengguna
- Reset password/PIN
- Log aktivitas per pengguna
- Status aktif/nonaktif
- Filter berdasarkan role

### 6.9 Manajemen Hak Akses (RBAC)
#### Default Roles
| Role | Dashboard | POS | Pembelian | Produk | Laporan | Pengguna |
|------|-----------|-----|-----------|--------|---------|----------|
| Owner | Full | Full | Full | Full | Full | Full |
| Admin | Full | Full | Full | Full | Full | Partial |
| Kasir | View | Full | - | View | - | - |
| Gudang | View | View | Full | Edit | Stock | - |

#### Permission Keys
```
pos:read, pos:create, pos:edit, pos:delete, pos:void
purchase:read, purchase:create, purchase:edit, purchase:approve
product:read, product:create, product:edit, product:delete
customer:read, customer:create, customer:edit
supplier:read, supplier:create, supplier:edit
report:view, report:export
user:read, user:create, user:edit, user:delete
settings:read, settings:edit
stock:read, stock:adjust
```

### 6.10 Laporan Stok
- Laporan stok saat ini (per produk, per kategori, per lokasi)
- Laporan pergerakan stok (masuk/keluar per periode)
- Laporan FIFO/FEFO (batch tracking)
- Laporan stok kritis (di bawah minimum)
- Laporan produk mendekati kedaluwarsa
- Laporan nilai stok (COGS)
- Export ke Excel/PDF

### 6.11 Laporan Lengkap
| No | Nama Laporan | Deskripsi |
|----|--------------|-----------|
| 1 | Laporan Penjualan Harian | Ringkasan penjualan per hari |
| 2 | Laporan Penjualan Periodik | Filter tanggal, by produk/kategori |
| 3 | Laporan Laba Rugi | Revenue - COGS - Expenses |
| 4 | Laporan Piutang Pelanggan | Outstanding kredit per pelanggan |
| 5 | Laporan Pembelian | Rekapitulasi PO per periode |
| 6 | Laporan Penerimaan Barang | Detail GR per periode |
| 7 | Laporan Stok Opname | Perbandingan stok sistem vs fisik |
| 8 | Laporan Produk Terlaris | Ranking produk by qty/revenue |
| 9 | Laporan Pelanggan Aktif | Aktivitas pembelian pelanggan |
| 10 | Laporan Kinerja Kasir | Transaksi per kasir |
| 11 | Laporan Kedaluwarsa | Produk expired/akan expired |
| 12 | Laporan Pergerakan Stok | Stock movement history |
| 13 | Laporan Metode Pembayaran | Cash vs transfer vs kredit |
| 14 | Laporan Diskon | Analisis diskon yang diberikan |
| 15 | Laporan HPP (COGS) | Harga Pokok Penjualan detail |

### 6.12 Pengaturan Aplikasi
- **Info Toko:** Nama, alamat, nomor telepon, logo
- **Struk:** Format struk thermal, header/footer struk
- **Penomoran:** Format invoice, PO, GR number
- **Pajak:** PPN setting (default off untuk toko kecil)
- **Stok:** Default satuan, alert threshold
- **Sinkronisasi:** Konfigurasi Supabase (URL, API Key)
- **Backup:** Manual backup + jadwal backup
- **Tema:** Mode terang/gelap
- **Printer:** Pilih printer default, ukuran kertas

---

## 7. FIFO / FEFO ENGINE

### 7.1 Konsep
- **FIFO (First In, First Out):** Produk yang masuk pertama harus keluar pertama. Diterapkan untuk semua produk.
- **FEFO (First Expired, First Out):** Produk dengan tanggal kedaluwarsa lebih dekat harus keluar lebih dulu. Diterapkan untuk produk dengan tanggal expired.

### 7.2 Logic Prioritas
```
IF produk memiliki expire_date:
  Urutkan batch berdasarkan expire_date ASC, received_date ASC → FEFO
ELSE:
  Urutkan batch berdasarkan received_date ASC → FIFO

Saat penjualan:
  1. Ambil batch dengan prioritas tertinggi
  2. Jika qty batch pertama cukup → ambil semua dari batch ini
  3. Jika tidak cukup → ambil sisa dari batch berikutnya (split)
  4. Catat batch_ids[] di transaction item
  5. Update quantity di product_stocks
  6. Catat stock_movement dengan reference
```

### 7.3 COGS Calculation
```
COGS per unit = purchase_price dari batch yang digunakan (weighted average jika split batch)
Total COGS transaksi = Σ (qty_used × purchase_price) per batch
Gross Profit = selling_price - COGS
```

---

## 8. UI/UX DESIGN PRINCIPLES

### 8.1 Design System
- **Design Language:** Clean & Modern Agricultural Theme
- **Primary Color:** `#2D6A4F` (Forest Green - identitas pertanian)
- **Secondary Color:** `#52B788` (Medium Green)
- **Accent:** `#F77F00` (Orange - untuk CTA utama)
- **Warning:** `#FFB703` (Yellow)
- **Danger:** `#D62828` (Red)
- **Background:** `#F8F9FA` (Light Gray)
- **Surface:** `#FFFFFF`
- **Text Primary:** `#1A1A2E`
- **Text Secondary:** `#6C757D`

### 8.2 Typography
- **Font Family:** Inter (sistem) + Noto Sans (multilingual support)
- **Heading:** 24px / 20px / 18px
- **Body:** 14px (Regular)
- **Small:** 12px
- **Line Height:** 1.5

### 8.3 WCAG 2.1 Compliance (Level AA)
- **Kontras Warna:** Minimum 4.5:1 untuk teks normal, 3:1 untuk teks besar
- **Focus Indicator:** Visible focus ring pada semua elemen interaktif
- **Keyboard Navigation:** Semua fungsi dapat diakses via keyboard
- **ARIA Labels:** Semua komponen form, icon button, dan tabel
- **Error Messages:** Teks deskriptif, bukan hanya warna
- **Responsive:** Support 768px hingga 1920px
- **Touch Targets:** Minimum 44x44px untuk elemen tap

### 8.4 Layout Responsif
- **Desktop (≥1280px):** Sidebar navigasi fixed, konten penuh
- **Tablet (768px-1279px):** Sidebar collapsible
- **Mobile (≤767px):** Bottom navigation, panel collapsed
- **POS Cashier Mode:** Optimized full-screen untuk kasir dengan keyboard shortcuts

### 8.5 Keyboard Shortcuts (POS)
- `F1` - Fokus ke pencarian produk
- `F2` - Fokus ke input jumlah bayar
- `F3` - Pilih pembayaran tunai
- `F4` - Simpan draft
- `F5` - Proses pembayaran / konfirmasi
- `Esc` - Batal / tutup modal
- `Enter` - Konfirmasi pilihan

---

## 9. LOCAL-FIRST ARCHITECTURE

### 9.1 Strategi Data
```
Priority 1: Data selalu ditulis ke IndexedDB lokal terlebih dahulu
Priority 2: UI langsung merespons dari local DB (no loading delay)
Priority 3: Sync ke cloud berjalan di background
Priority 4: Conflict resolution menggunakan Last-Write-Wins + timestamp
```

### 9.2 Sync States
- `synced` - Data sama antara lokal dan cloud
- `pending` - Ada perubahan lokal yang belum tersync
- `conflict` - Konflik antara lokal dan cloud (butuh resolve manual)
- `offline` - Mode offline aktif

### 9.3 Indikator Sinkronisasi
- Icon di status bar: 🟢 Synced | 🟡 Syncing | 🔴 Offline
- Badge notifikasi jika ada konflik
- Last sync timestamp ditampilkan di pengaturan

### 9.4 Backup
- Manual backup ke file JSON / SQLite
- Jadwal backup otomatis (jika online) ke Supabase Storage
- Restore dari file backup
- Export full data ke Excel

---

## 10. STRUKTUR FOLDER PROYEK

```
toko-tani-makmur/
├── public/
│   ├── icons/
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── app/                         # App config, providers
│   ├── assets/                      # Images, fonts
│   ├── components/
│   │   ├── ui/                      # shadcn/ui base components
│   │   ├── common/                  # Shared components
│   │   │   ├── DataTable/
│   │   │   ├── ImageUpload/
│   │   │   ├── ExcelImport/
│   │   │   ├── PrintPreview/
│   │   │   └── SyncStatus/
│   │   └── layout/
│   │       ├── Sidebar/
│   │       ├── Header/
│   │       └── BottomNav/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── pos/                     # Halaman POS utama
│   │   │   ├── components/
│   │   │   │   ├── ProductGrid/
│   │   │   │   ├── Cart/
│   │   │   │   ├── CustomerPanel/
│   │   │   │   ├── PaymentPanel/
│   │   │   │   └── PurchaseHistory/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── purchase/                # Pembelian PO
│   │   ├── products/                # Kelola produk
│   │   ├── customers/               # Kelola pelanggan
│   │   ├── suppliers/               # Kelola supplier
│   │   ├── categories/              # Kelola kategori
│   │   ├── stock/                   # Laporan stok
│   │   ├── reports/                 # Semua laporan
│   │   ├── users/                   # Manajemen pengguna
│   │   ├── access/                  # Hak akses
│   │   └── settings/                # Pengaturan
│   ├── hooks/                       # Custom React hooks
│   ├── lib/
│   │   ├── db/                      # Dexie.js database setup
│   │   │   ├── schema.ts
│   │   │   ├── migrations.ts
│   │   │   └── dexie.ts
│   │   ├── sync/                    # Sync engine
│   │   │   ├── syncManager.ts
│   │   │   └── conflictResolver.ts
│   │   ├── fifo-fefo/               # FIFO/FEFO engine
│   │   │   └── stockEngine.ts
│   │   ├── print/                   # Print utilities
│   │   ├── excel/                   # Import/export Excel
│   │   └── supabase.ts              # Supabase client
│   ├── store/                       # Zustand stores
│   ├── types/                       # TypeScript types/interfaces
│   └── utils/                       # Utility functions
├── docs/
│   ├── PRD.md                       # (file ini)
│   ├── DATABASE.md
│   └── API.md
├── tasks/
│   └── TASKS.md
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

---

## 11. REKOMENDASI TAMBAHAN

### 11.1 Fitur Tambahan yang Disarankan
1. **Stok Opname:** Fitur rekonsiliasi stok fisik vs sistem
2. **Retur Penjualan:** Proses pengembalian barang dari pelanggan
3. **Retur Pembelian:** Pengembalian barang ke supplier
4. **Loyalty Program:** Poin reward untuk pelanggan setia
5. **Notifikasi WhatsApp:** Kirim struk digital via WhatsApp Web API
6. **Barcode Scanner:** Support USB barcode scanner dan kamera HP
7. **Multi-Cabang (Future):** Arsitektur siap untuk multi-toko
8. **Laporan Komisi:** Jika ada sistem komisi penjual

### 11.2 Security Considerations
- PIN login untuk kasir (tidak perlu password panjang)
- Session timeout otomatis setelah idle
- Log audit semua transaksi dan perubahan data
- Enkripsi data sensitif di IndexedDB
- Row Level Security di Supabase

### 11.3 Performance Target
- First Load: < 3 detik
- Page Navigation: < 300ms
- Search Response: < 200ms (local DB)
- Print Receipt: < 2 detik
- Excel Import 1000 rows: < 10 detik

---

## 12. TIMELINE DEVELOPMENT

### Phase 1 — Core Foundation (4 minggu)
- Setup project (Vite + React + TypeScript + Tailwind + Dexie)
- Design system & komponen dasar
- Autentikasi + manajemen pengguna
- Modul produk + kategori + satuan

### Phase 2 — Core Business (4 minggu)
- Modul pelanggan + supplier
- POS transaksi penjualan
- Import Excel (produk + pelanggan)
- Print struk

### Phase 3 — Advanced Features (4 minggu)
- Modul pembelian PO + penerimaan barang
- FIFO/FEFO engine
- Laporan stok + pergerakan

### Phase 4 — Reports & Sync (3 minggu)
- Semua laporan
- Cloud sync (Supabase)
- PWA + Service Worker
- WCAG compliance audit

### Phase 5 — Testing & Polish (2 minggu)
- UAT bersama owner toko
- Bug fixing
- Performance optimization
- Training & deployment

---

*PRD ini adalah dokumen hidup dan akan diperbarui seiring perkembangan proyek.*
