# ✅ TASK LIST — Toko Tani Makmur POS
**Project:** Aplikasi POS Toko Tani Makmur  
**Total Tasks:** 120  
**Updated:** 2025-03-15

---

## 🏗️ PHASE 1: PROJECT FOUNDATION

### TASK-001 | Setup Project Base
**Priority:** Critical | **Estimate:** 4 jam
- [ ] Inisialisasi project: `npm create vite@latest toko-tani-makmur -- --template react-ts`
- [ ] Install dependencies utama (lihat package list di bawah)
- [ ] Konfigurasi `tsconfig.json` dengan path aliases (`@/` → `src/`)
- [ ] Konfigurasi `vite.config.ts` (aliases, build, PWA plugin)
- [ ] Setup Tailwind CSS 3 + konfigurasi tema kustom (warna, font)
- [ ] Setup `prettier` + `eslint` + `husky` pre-commit hooks
- [ ] Buat struktur folder sesuai PRD
- [ ] Setup `.env.example` dengan semua variable yang dibutuhkan

**Dependencies yang wajib diinstall:**
```bash
# Core
npm install react-router-dom zustand react-hook-form zod

# UI
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react class-variance-authority clsx tailwind-merge

# Shadcn/ui (via CLI)
npx shadcn@latest init

# Local DB
npm install dexie dexie-react-hooks

# Cloud
npm install @supabase/supabase-js

# Table
npm install @tanstack/react-table

# Date
npm install date-fns

# Excel
npm install xlsx

# Charts
npm install recharts

# Print
npm install react-to-print @react-pdf/renderer

# Toast
npm install react-hot-toast

# Images
npm install react-dropzone browser-image-compression

# Barcode
npm install @zxing/library

# PWA
npm install -D vite-plugin-pwa workbox-window
```

---

### TASK-002 | Design System Setup
**Priority:** Critical | **Estimate:** 6 jam
- [ ] Definisikan CSS variables untuk color palette di `globals.css`
- [ ] Konfigurasi `tailwind.config.ts` dengan:
  - Warna brand (primary, secondary, accent)
  - Custom font (Inter)
  - Custom shadows, border-radius
- [ ] Buat komponen dasar menggunakan shadcn/ui:
  - `Button` (variants: primary, secondary, outline, danger, ghost)
  - `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`
  - `Card`, `Badge`, `Alert`
  - `Dialog/Modal`, `Sheet` (side panel)
  - `Table`, `Pagination`
  - `Tabs`, `Accordion`
  - `Skeleton` (loading state)
  - `Tooltip`, `Popover`
- [ ] Buat komponen layout:
  - `AppLayout` (sidebar + header + main content)
  - `Sidebar` dengan navigasi dan icon
  - `Header` (search global, notifikasi, user menu, sync status)
  - `BottomNav` (untuk mobile)
- [ ] Buat `SyncStatusBadge` component (🟢/🟡/🔴)

**Accessibility (WCAG 2.1 AA):**
- [ ] Semua komponen form harus punya `aria-label` atau `label` yang associated
- [ ] Semua button icon harus punya `aria-label`
- [ ] Implementasi focus trap pada modal/dialog
- [ ] Pastikan kontras warna minimum 4.5:1

---

### TASK-003 | Local Database (Dexie.js) Setup
**Priority:** Critical | **Estimate:** 5 jam
- [ ] Buat file `src/lib/db/dexie.ts` dengan definisi schema lengkap
- [ ] Definisikan semua tabel sesuai PRD (products, product_units, dll.)
- [ ] Setup Dexie version dan migrations
- [ ] Buat indexes yang dibutuhkan untuk performa query
- [ ] Buat `src/lib/db/schema.ts` dengan TypeScript interfaces
- [ ] Buat repository pattern untuk setiap entitas:
  - `productRepository.ts`
  - `customerRepository.ts`
  - `supplierRepository.ts`
  - `transactionRepository.ts`
  - `purchaseOrderRepository.ts`
  - `stockRepository.ts`

**Contoh schema Dexie:**
```typescript
// src/lib/db/dexie.ts
class TakoTaniDB extends Dexie {
  products!: Table<Product>;
  product_units!: Table<ProductUnit>;
  product_stocks!: Table<ProductStock>;
  categories!: Table<Category>;
  suppliers!: Table<Supplier>;
  customers!: Table<Customer>;
  sales_transactions!: Table<SalesTransaction>;
  sales_transaction_items!: Table<SalesTransactionItem>;
  purchase_orders!: Table<PurchaseOrder>;
  purchase_order_items!: Table<PurchaseOrderItem>;
  goods_receipts!: Table<GoodsReceipt>;
  goods_receipt_items!: Table<GoodsReceiptItem>;
  stock_movements!: Table<StockMovement>;
  users!: Table<User>;
  roles!: Table<Role>;
  app_settings!: Table<AppSetting>;
  
  constructor() {
    super('TakoTaniDB');
    this.version(1).stores({
      products: '++id, code, name, category_id, is_active, sync_status',
      product_units: '++id, product_id, is_base_unit',
      product_stocks: '++id, product_id, unit_id, expire_date, received_date',
      categories: '++id, name, parent_id',
      suppliers: '++id, code, name, is_active',
      customers: '++id, code, name, phone, nik',
      sales_transactions: '++id, invoice_number, customer_id, transaction_date, status',
      sales_transaction_items: '++id, transaction_id, product_id',
      purchase_orders: '++id, po_number, supplier_id, order_date, status',
      purchase_order_items: '++id, po_id, product_id',
      goods_receipts: '++id, gr_number, po_id, received_date',
      goods_receipt_items: '++id, gr_id, po_item_id, product_id',
      stock_movements: '++id, product_id, movement_type, created_at',
      users: '++id, username, role_id, is_active',
      roles: '++id, name',
      app_settings: 'key',
    });
  }
}
```

---

### TASK-004 | Authentication & Session
**Priority:** Critical | **Estimate:** 4 jam
- [ ] Buat halaman Login (username + PIN atau password)
- [ ] Implementasi PIN-based login untuk kasir (6 digit)
- [ ] Session management menggunakan `localStorage` + Zustand
- [ ] Auto-logout setelah idle X menit (configurable di settings)
- [ ] Guard routes berdasarkan role dan permission
- [ ] Buat hook `useAuth()` dan `usePermission()`
- [ ] Seed default admin user saat pertama kali install

**Contoh permission hook:**
```typescript
// usePermission.ts
const usePermission = (permission: PermissionKey) => {
  const { user } = useAuth();
  return user?.role?.permissions.includes(permission) ?? false;
};
```

---

## 🛍️ PHASE 2: MASTER DATA

### TASK-005 | Modul Kategori
**Priority:** High | **Estimate:** 3 jam
- [ ] Halaman daftar kategori (tabel + hierarki tree view)
- [ ] Form tambah/edit kategori (nama, kode, parent, warna, ikon)
- [ ] Delete kategori (dengan validasi: tidak bisa hapus jika ada produk)
- [ ] Sub-kategori support (1 level)
- [ ] Tampilkan jumlah produk per kategori

---

### TASK-006 | Modul Supplier
**Priority:** High | **Estimate:** 4 jam
- [ ] Halaman daftar supplier dengan filter dan search
- [ ] Form tambah/edit supplier (semua field dari schema)
- [ ] Tab: Info Supplier | Produk Terkait | Histori PO
- [ ] Delete supplier (validasi: tidak bisa hapus jika ada transaksi)
- [ ] Export data supplier ke Excel

---

### TASK-007 | Modul Pelanggan
**Priority:** High | **Estimate:** 6 jam
- [ ] Halaman daftar pelanggan dengan filter (kecamatan, kabupaten)
- [ ] Form tambah/edit pelanggan (semua field dari template Excel)
- [ ] Tab: Info | Histori Transaksi | Info Kredit
- [ ] **Import Excel drag & drop:**
  - [ ] Komponen `ExcelImport` yang reusable
  - [ ] Validasi kolom sesuai template (NIK, Nama, Alamat, Desa, Kecamatan, Kabupaten, Provinsi)
  - [ ] Preview data dalam tabel sebelum import
  - [ ] Highlight baris dengan error
  - [ ] Opsi: import semua valid / skip error
  - [ ] Progress bar selama import
  - [ ] Laporan hasil import (berhasil/gagal)
- [ ] Download template Excel pelanggan
- [ ] Export data pelanggan

---

### TASK-008 | Modul Produk — Form Single
**Priority:** Critical | **Estimate:** 8 jam
- [ ] Halaman daftar produk (grid view + list view toggle)
- [ ] Filter: kategori, supplier, stok, status
- [ ] Search real-time (nama + kode)
- [ ] Form tambah/edit produk:
  - [ ] Section: Info Dasar (nama, kode, kategori, supplier, deskripsi)
  - [ ] Section: Upload Gambar (drag & drop, preview, resize)
  - [ ] Section: Satuan Produk (multi-unit tabel dinamis):
    - Tambah baris satuan baru
    - Field: nama satuan, konversi, harga beli, harga jual, barcode, is_base_unit
    - Minimal 1 satuan wajib
  - [ ] Section: Stok & Harga (stok awal, min stok per satuan)
  - [ ] Section: Supplier (multi-select supplier untuk produk ini)
- [ ] Tampil badge "Stok Rendah" jika stok < min_stok
- [ ] Tampil badge "Kadaluwarsa Segera" jika ada batch < 30 hari
- [ ] Soft delete (nonaktifkan produk)

---

### TASK-009 | Modul Produk — Batch Input
**Priority:** High | **Estimate:** 4 jam
- [ ] Halaman batch input produk (tabel editable inline)
- [ ] Bisa tambah baris baru secara dinamis
- [ ] Field per baris: nama, kode, kategori, supplier, satuan, harga beli, harga jual, stok, min stok
- [ ] Validasi real-time per baris
- [ ] Submit semua baris sekaligus
- [ ] Preview sebelum simpan
- [ ] Error handling per baris

---

### TASK-010 | Modul Produk — Import Excel
**Priority:** High | **Estimate:** 5 jam
- [ ] Drag & drop area untuk file .xlsx
- [ ] Parse Excel menggunakan SheetJS
- [ ] Mapping kolom: nama, kode, deskripsi, category_id, supplier_id, unit_id, unit_nama, purchase_price, selling_price, stock, min_stock, expire_date
- [ ] Validasi:
  - [ ] Kolom wajib tidak boleh kosong (nama)
  - [ ] category_id dan supplier_id harus ada di database
  - [ ] Harga harus angka positif
  - [ ] expire_date harus format yang valid
- [ ] Preview tabel dengan highlight baris error + tooltip pesan error
- [ ] Import berjalan per batch (100 rows per batch) dengan progress bar
- [ ] Log hasil import
- [ ] Tombol download template Excel
- [ ] Tombol download template dengan data contoh

---

## 🛒 PHASE 3: TRANSAKSI PENJUALAN

### TASK-011 | POS — Struktur Halaman
**Priority:** Critical | **Estimate:** 6 jam
- [ ] Layout dua panel (produk kiri, keranjang kanan) — responsive
- [ ] Header POS: nomor invoice auto, tanggal, nama kasir, status draft
- [ ] Keyboard shortcuts implementation (F1-F5, Esc, Enter)
- [ ] Panel produk dapat toggle antara grid dan list view
- [ ] State management POS menggunakan Zustand store

**POS Store State:**
```typescript
interface POSStore {
  invoice: string;
  transactionDate: Date;
  customer: Customer | null;
  cartItems: CartItem[];
  draftList: Draft[];
  paymentMethod: 'cash' | 'transfer' | 'credit';
  paidAmount: number;
  discount: number;
  notes: string;
  // Actions
  addToCart: (product, unit, qty) => void;
  removeFromCart: (itemId) => void;
  updateQty: (itemId, qty) => void;
  setCustomer: (customer) => void;
  setPaymentMethod: (method) => void;
  saveDraft: () => void;
  loadDraft: (draftId) => void;
  processPayment: () => Promise<void>;
  clearCart: () => void;
}
```

---

### TASK-012 | POS — Panel Produk
**Priority:** Critical | **Estimate:** 5 jam
- [ ] Searchbar dengan debounce (cari nama, kode, barcode)
- [ ] Filter kategori (chip/tab horizontal scrollable)
- [ ] Grid produk: gambar, nama, harga, stok, badge kategori
- [ ] Klik produk → pilih satuan (jika multi-unit) → masuk ke keranjang
- [ ] Highlight produk stok 0 (disabled, warna abu-abu)
- [ ] Badge "Stok Rendah" jika stok ≤ min_stok
- [ ] Infinite scroll atau pagination (50 produk per halaman)
- [ ] Loading skeleton saat fetch

---

### TASK-013 | POS — Panel Keranjang
**Priority:** Critical | **Estimate:** 6 jam
- [ ] Pilih pelanggan (searchable dropdown):
  - [ ] Tampilkan nama, kode, info kredit
  - [ ] Bisa tambah pelanggan baru langsung dari sini
- [ ] Daftar item keranjang:
  - [ ] Nama produk, satuan, qty (editable), harga, diskon, subtotal
  - [ ] Tombol hapus per item
  - [ ] Diskon per item (persen atau nominal)
- [ ] Summary: subtotal, diskon total, pajak, **total**
- [ ] Tombol diskon total transaksi
- [ ] Section pembayaran:
  - [ ] Tab: Tunai | Transfer | Kredit
  - [ ] Input jumlah bayar dengan format currency
  - [ ] Tombol **"Uang Pas"** (set bayar = total)
  - [ ] Tombol pecahan cepat: +50rb, +100rb, +200rb, +500rb
  - [ ] Kembalian otomatis
  - [ ] Transfer: input referensi/nomor rekening
  - [ ] Kredit: tampilkan limit tersisa, pilih jatuh tempo
- [ ] Tombol **"Simpan Draft"** + **"Proses Bayar"**
- [ ] Validasi: stok cukup, limit kredit tidak terlampaui

---

### TASK-014 | POS — Histori Pelanggan
**Priority:** High | **Estimate:** 4 jam
- [ ] Panel collapsible "Histori Pembelian" di keranjang
- [ ] Tampilkan 10 transaksi terakhir pelanggan yang dipilih
- [ ] Per transaksi: tanggal, no. invoice, total, status
- [ ] Expandable per transaksi → tampilkan detail item
- [ ] Checkbox per item → klik "Tambah ke Keranjang"
- [ ] Bisa pilih multiple item dari histori sekaligus

---

### TASK-015 | POS — Draft Transaksi
**Priority:** High | **Estimate:** 3 jam
- [ ] Simpan state keranjang sebagai draft ke IndexedDB
- [ ] List draft di sidebar/panel dengan badge jumlah draft aktif
- [ ] Load draft → lanjutkan transaksi
- [ ] Hapus draft
- [ ] Nama draft auto (pelanggan + waktu) atau bisa custom
- [ ] Max 10 draft aktif per kasir

---

### TASK-016 | POS — Proses Pembayaran & Struk
**Priority:** Critical | **Estimate:** 5 jam
- [ ] Konfirmasi dialog sebelum proses
- [ ] Jalankan FIFO/FEFO engine saat checkout
- [ ] Simpan transaksi ke IndexedDB
- [ ] Update stok otomatis
- [ ] Catat stock movement
- [ ] Tampilan struk digital (preview)
- [ ] Cetak struk:
  - [ ] Format thermal 58mm (untuk printer kasir)
  - [ ] Format A4 (fallback)
  - [ ] Include: logo toko, nama kasir, tanggal/jam, detail item, total, bayar, kembalian, QR code invoice
- [ ] WhatsApp share struk (opsional, via Web API)
- [ ] Reset form untuk transaksi berikutnya

---

## 📦 PHASE 4: PEMBELIAN & STOK

### TASK-017 | Purchase Order — Buat PO
**Priority:** High | **Estimate:** 8 jam
- [ ] Halaman buat PO baru
- [ ] Panel pilih produk (urutkan dari stok terendah PALING ATAS):
  - [ ] Tampilkan: nama, stok saat ini, min stok, supplier default, indikator kritis
  - [ ] Multi-select produk (checkbox)
  - [ ] Search dan filter kategori
  - [ ] Badge merah jika stok di bawah minimum
- [ ] Setelah pilih produk → form detail per item:
  - [ ] Nama produk, supplier (dropdown sesuai supplier produk)
  - [ ] Satuan, jumlah, harga beli, subtotal
  - [ ] Tanggal kedaluwarsa (opsional)
  - [ ] Catatan per item
- [ ] Otomatis kelompokkan berdasarkan supplier
- [ ] Generate PO terpisah per supplier (jika produk dari beda supplier)
- [ ] Format PO Number: `PO-{KODE_SUPPLIER}-{YYYYMMDD}-{XXXX}`
- [ ] Preview semua PO sebelum submit
- [ ] Submit → status "Sent" / simpan sebagai "Draft"

---

### TASK-018 | Purchase Order — Daftar & Detail PO
**Priority:** High | **Estimate:** 3 jam
- [ ] Halaman daftar PO dengan filter (status, supplier, tanggal)
- [ ] Status badge: Draft | Sent | Partial | Received | Cancelled
- [ ] Detail PO: header (no PO, supplier, tanggal, status) + tabel item
- [ ] Tombol aksi: Edit (jika Draft) | Terima Barang | Batalkan
- [ ] Print PO (format A4 atau PDF)

---

### TASK-019 | Catatan Penerimaan Barang (Goods Receipt)
**Priority:** High | **Estimate:** 7 jam
- [ ] Buat GR dari PO terkait (atau langsung tanpa PO)
- [ ] Header GR: nomor GR, link PO, tanggal terima, penerima
- [ ] Tabel item:
  - [ ] Nama produk, qty dipesan, qty diterima (editable)
  - [ ] Nomor batch/lot (opsional)
  - [ ] Tanggal kedaluwarsa (opsional per item)
  - [ ] Kondisi: Baik / Rusak / Ditolak
  - [ ] Catatan per item
- [ ] **Upload bukti penerimaan:**
  - [ ] Drag & drop area (gambar atau PDF)
  - [ ] Preview thumbnail
  - [ ] Simpan ke IndexedDB (local) + Supabase Storage (cloud)
- [ ] Qty diterima bisa partial (sebagian) → PO status jadi "Partial"
- [ ] Simpan → auto update stok + buat stock movement + update FIFO batch
- [ ] Generate GR Number: `GR-{YYYYMMDD}-{XXXX}`
- [ ] Print GR / PDF

---

### TASK-020 | FIFO/FEFO Engine
**Priority:** Critical | **Estimate:** 8 jam
- [ ] Buat `src/lib/fifo-fefo/stockEngine.ts`
- [ ] Fungsi `getAvailableBatches(productId, unitId, qty)`:
  - Sort berdasarkan expire_date ASC (jika ada), lalu received_date ASC
  - Return list batch yang akan dikurangi beserta qty dari masing-masing
- [ ] Fungsi `consumeStock(batches, transactionItemId)`:
  - Update qty di `product_stocks`
  - Catat batch_ids di transaction item
  - Throw error jika stok tidak mencukupi
- [ ] Fungsi `calculateCOGS(batches)`:
  - Weighted average harga beli dari batch yang digunakan
- [ ] Fungsi `addStock(productId, unitId, qty, purchasePrice, expireDate, batchNumber)`:
  - Tambah entry baru di `product_stocks`
  - Catat stock movement type "purchase"
- [ ] Unit tests untuk semua fungsi
- [ ] Fungsi `getStockByProduct(productId)`:
  - Aggregate qty dari semua batch aktif
  - Return total stok per satuan

---

### TASK-021 | Laporan Stok
**Priority:** High | **Estimate:** 6 jam
- [ ] Halaman stok saat ini:
  - [ ] Filter: kategori, supplier, status stok (kritis/normal/berlebih)
  - [ ] Tabel: produk, kategori, satuan, stok saat ini, min stok, nilai stok
  - [ ] Badge merah jika stok kritis
  - [ ] Export ke Excel
- [ ] Pergerakan stok (stock movement):
  - [ ] Filter: produk, periode, tipe gerakan
  - [ ] Tabel: tanggal, produk, tipe, qty masuk, qty keluar, saldo, referensi
  - [ ] Grafik pergerakan stok per produk
- [ ] Produk mendekati kedaluwarsa:
  - [ ] Filter: expired dalam 30/60/90 hari
  - [ ] Tampilkan batch number, qty, supplier
- [ ] Stok opname:
  - [ ] Input qty fisik vs qty sistem
  - [ ] Selisih otomatis terkalkulasi
  - [ ] Simpan sebagai adjustment + stock movement

---

## 📊 PHASE 5: LAPORAN & SETTING

### TASK-022 | Laporan Penjualan
**Priority:** High | **Estimate:** 6 jam
- [ ] Laporan penjualan harian (per tanggal)
- [ ] Laporan penjualan periodik (range tanggal custom)
- [ ] Filter: kasir, pelanggan, metode pembayaran, kategori, produk
- [ ] Tampilan: grafik bar + tabel detail
- [ ] Summary: total transaksi, total revenue, total COGS, gross profit
- [ ] Export Excel + PDF

---

### TASK-023 | Laporan Laba Rugi & Keuangan
**Priority:** High | **Estimate:** 5 jam
- [ ] Laporan P&L: Revenue - COGS = Gross Profit
- [ ] Laporan piutang pelanggan (outstanding kredit)
- [ ] Laporan aging piutang (0-30, 31-60, 61-90, >90 hari)
- [ ] Laporan metode pembayaran (pie chart)
- [ ] Laporan diskon yang diberikan

---

### TASK-024 | Laporan Pembelian
**Priority:** Medium | **Estimate:** 4 jam
- [ ] Rekapitulasi PO per periode
- [ ] Laporan penerimaan barang per periode
- [ ] Laporan pembelian per supplier
- [ ] Laporan produk yang sering dibeli

---

### TASK-025 | Laporan Produk & Pelanggan
**Priority:** Medium | **Estimate:** 4 jam
- [ ] Laporan produk terlaris (by qty dan by revenue)
- [ ] Laporan produk tidak bergerak (slow moving)
- [ ] Laporan pelanggan aktif / top pelanggan
- [ ] Laporan kinerja kasir (transaksi per kasir per periode)
- [ ] Laporan HPP (COGS) detail per produk

---

### TASK-026 | Dashboard
**Priority:** High | **Estimate:** 5 jam
- [ ] Card: Penjualan hari ini / minggu ini / bulan ini
- [ ] Card: Total pelanggan, total produk aktif
- [ ] Alert widget: Stok kritis (daftar produk)
- [ ] Alert widget: Kedaluwarsa dalam 30 hari
- [ ] Alert widget: Kredit pelanggan jatuh tempo
- [ ] Grafik penjualan 30 hari (line chart)
- [ ] Tabel top 5 produk terlaris
- [ ] Feed transaksi terbaru (10 terakhir)

---

### TASK-027 | Manajemen Pengguna
**Priority:** High | **Estimate:** 4 jam
- [ ] Daftar pengguna dengan filter role dan status
- [ ] Form tambah/edit pengguna
- [ ] Set/reset PIN untuk kasir
- [ ] Aktifkan / nonaktifkan pengguna
- [ ] Log aktivitas per pengguna
- [ ] Tidak bisa hapus diri sendiri atau admin terakhir

---

### TASK-028 | Manajemen Hak Akses (RBAC)
**Priority:** High | **Estimate:** 5 jam
- [ ] Daftar role yang ada
- [ ] Form buat/edit role dengan checklist permission
- [ ] Permission dibagi per modul dan per aksi (read/create/edit/delete)
- [ ] Preview akses yang dimiliki role
- [ ] Tidak bisa edit atau hapus role "Owner" (locked)
- [ ] Assign role ke pengguna

---

### TASK-029 | Pengaturan Aplikasi
**Priority:** Medium | **Estimate:** 5 jam
- [ ] Tab: Info Toko (nama, alamat, telepon, upload logo)
- [ ] Tab: Format Struk (header, footer, tampilkan/sembunyikan elemen)
- [ ] Tab: Penomoran (format invoice, PO, GR)
- [ ] Tab: Stok (threshold alert, satuan default)
- [ ] Tab: Pajak (PPN on/off, persentase)
- [ ] Tab: Sinkronisasi (Supabase URL, API Key, test connection)
- [ ] Tab: Backup & Restore (backup manual, jadwal, restore)
- [ ] Tab: Tema (light/dark mode, ukuran font)
- [ ] Tab: Printer (printer default, ukuran kertas)

---

## ☁️ PHASE 6: SYNC & PWA

### TASK-030 | Cloud Sync Engine
**Priority:** High | **Estimate:** 10 jam
- [ ] Setup Supabase project + konfigurasi tabel PostgreSQL
- [ ] Buat `src/lib/sync/syncManager.ts`:
  - [ ] Detect online/offline status
  - [ ] Queue perubahan lokal saat offline
  - [ ] Sync otomatis saat kembali online
  - [ ] Conflict resolution (Last-Write-Wins berdasarkan `updated_at`)
- [ ] Sync indicator di header UI
- [ ] Manual trigger sync dari pengaturan
- [ ] Log sync history (sukses/gagal)
- [ ] Setup Supabase Row Level Security (RLS) per toko

---

### TASK-031 | PWA & Service Worker
**Priority:** Medium | **Estimate:** 4 jam
- [ ] Konfigurasi `vite-plugin-pwa`
- [ ] Manifest.json (nama, ikon, theme color, display standalone)
- [ ] Service Worker dengan Workbox:
  - [ ] Cache-first untuk assets statik
  - [ ] Network-first untuk API calls
  - [ ] Offline fallback page
- [ ] Prompt "Install App" pada browser yang support
- [ ] Update notification saat ada versi baru

---

### TASK-032 | Backup & Restore
**Priority:** Medium | **Estimate:** 4 jam
- [ ] Export semua data lokal ke file JSON terenkripsi
- [ ] Export ke format Excel (multiple sheets)
- [ ] Import dari file backup (validasi format + versi)
- [ ] Backup otomatis ke Supabase Storage (jika online)
- [ ] Restore dari Supabase Storage
- [ ] Enkripsi backup dengan password

---

## 🧪 PHASE 7: TESTING & QA

### TASK-033 | Unit Tests
**Priority:** High | **Estimate:** 6 jam
- [ ] Test FIFO/FEFO engine (kritis)
- [ ] Test perhitungan transaksi (subtotal, diskon, pajak, kembalian)
- [ ] Test validasi import Excel
- [ ] Test sync manager
- [ ] Test permission/RBAC logic

---

### TASK-034 | Integration Tests
**Priority:** Medium | **Estimate:** 4 jam
- [ ] Test alur transaksi penjualan end-to-end
- [ ] Test alur PO → GR → update stok
- [ ] Test import pelanggan dan produk

---

### TASK-035 | WCAG Audit
**Priority:** High | **Estimate:** 3 jam
- [ ] Audit kontras warna semua komponen (target 4.5:1)
- [ ] Audit keyboard navigation (semua flow)
- [ ] Audit screen reader compatibility (ARIA)
- [ ] Audit focus indicator visibility
- [ ] Perbaiki semua temuan

---

### TASK-036 | Performance Optimization
**Priority:** Medium | **Estimate:** 4 jam
- [ ] Lazy loading semua halaman/route
- [ ] Code splitting per feature
- [ ] Memoization komponen yang heavy
- [ ] Virtualized list untuk tabel data besar
- [ ] Image compression sebelum simpan
- [ ] Bundle size analysis + optimization

---

## 📋 TASK SUMMARY

| Phase | Tasks | Estimasi Total |
|-------|-------|----------------|
| Phase 1: Foundation | 4 tasks | 19 jam |
| Phase 2: Master Data | 6 tasks | 30 jam |
| Phase 3: Penjualan | 6 tasks | 29 jam |
| Phase 4: Pembelian & Stok | 5 tasks | 32 jam |
| Phase 5: Laporan & Setting | 8 tasks | 34 jam |
| Phase 6: Sync & PWA | 3 tasks | 18 jam |
| Phase 7: Testing | 4 tasks | 17 jam |
| **TOTAL** | **36 tasks** | **~179 jam** |

---

*Last updated: 2025-03-15*
