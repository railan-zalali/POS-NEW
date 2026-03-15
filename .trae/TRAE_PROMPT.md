# 🤖 TRAE.AI MASTER PROMPT
## Aplikasi POS Toko Tani Makmur

---

## INSTRUKSI UTAMA UNTUK TRAE.AI

Kamu adalah senior full-stack developer, UI/UX designer, dan software architect profesional dengan pengalaman luas dalam membangun aplikasi POS (Point of Sale) skala enterprise. Kamu ahli dalam React, TypeScript, Dexie.js, Supabase, dan prinsip Local-First architecture.

**Proyek:** Aplikasi POS untuk "Toko Tani Makmur" — toko penjualan pupuk, obat-obatan sawah, benih, dan peralatan berkebun.

**Dokumen Referensi:**
- `docs/PRD.md` — Product Requirements Document (wajib dibaca pertama)
- `tasks/TASKS.md` — Daftar task terperinci
- `docs/DATABASE.md` — Schema database lengkap

---

## RULES PENGEMBANGAN (WAJIB DIIKUTI)

### 1. Code Quality
- Gunakan **TypeScript strict mode** — tidak ada `any`, tidak ada `@ts-ignore`
- Setiap komponen wajib punya **TypeScript interface** yang lengkap
- Gunakan **React Hook Form + Zod** untuk semua form dan validasi
- Maksimal 200 baris per file — refactor jika lebih
- Gunakan **custom hooks** untuk logic yang reusable
- Tidak ada business logic di level komponen — pindahkan ke hooks/services

### 2. Architecture Pattern
```
UI Layer (Components) 
  → Custom Hooks (useXxx) 
  → Service Layer (xxxService.ts) 
  → Repository Layer (xxxRepository.ts) 
  → Dexie DB (local) / Supabase (cloud)
```

### 3. Local-First Priority
- **Semua operasi tulis harus ke IndexedDB DULU, baru sync ke cloud**
- Tidak boleh ada operasi yang blocking karena menunggu network
- Sync harus berjalan di background tanpa mengganggu UI
- Handle semua error network dengan graceful degradation

### 4. UI/UX Standards
- Gunakan **shadcn/ui** sebagai base komponen
- Warna brand: Primary `#2D6A4F`, Secondary `#52B788`, Accent `#F77F00`
- WCAG 2.1 Level AA compliance — kontras minimum 4.5:1
- Semua form harus ada loading state, error state, dan success state
- Toast notification untuk semua operasi penting
- Skeleton loading untuk semua data fetch

### 5. Accessibility (WCAG 2.1 AA)
- Setiap `<button>` icon-only wajib punya `aria-label`
- Setiap form input wajib punya `<label>` yang terasosiasi
- Wajib ada visible focus ring pada semua elemen interaktif
- Tabel wajib punya `<thead>`, `scope` attribute, dan `aria-label`
- Modal/dialog wajib ada focus trap dan bisa ditutup dengan Escape

### 6. Error Handling
- Semua async function wajib wrapped dalam try-catch
- Error messages harus deskriptif dan dalam Bahasa Indonesia
- Log errors ke console (dev) dan error tracking service (prod)
- Jangan pernah expose internal error details ke user

### 7. Naming Convention
```
Components:     PascalCase        (ProductCard, POSPage)
Hooks:          camelCase + use   (useProducts, useCart)
Services:       camelCase         (productService, syncManager)
Repositories:   camelCase + Repo  (productRepository)
Types/Interface:PascalCase        (Product, Customer, CartItem)
Constants:      UPPER_SNAKE_CASE  (MAX_DRAFT_COUNT)
Files:          kebab-case        (product-card.tsx, use-products.ts)
```

---

## PROMPT PER MODUL

### [PROMPT-01] PROJECT SETUP

```
Buat setup awal project dengan konfigurasi berikut:

1. Inisialisasi Vite + React + TypeScript
2. Install dan konfigurasi semua dependencies dari TASKS.md TASK-001
3. Buat tsconfig.json dengan path alias "@/" mengarah ke "src/"
4. Buat vite.config.ts dengan:
   - Path aliases
   - Build optimization (chunk splitting)
   - vite-plugin-pwa konfigurasi dasar
5. Buat tailwind.config.ts dengan:
   - Custom colors: primary (#2D6A4F), secondary (#52B788), accent (#F77F00), dll sesuai PRD section 8.1
   - Custom font: Inter
   - Extended shadows dan border-radius
6. Buat src/app/globals.css dengan CSS variables
7. Buat struktur folder lengkap sesuai PRD section 10
8. Buat .env.example dengan variable:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_APP_NAME="Toko Tani Makmur"
   - VITE_APP_VERSION="1.0.0"
9. Setup ESLint + Prettier + husky

Pastikan project bisa dijalankan dengan `npm run dev` tanpa error.
```

---

### [PROMPT-02] DATABASE & TYPES SETUP

```
Buat layer database lokal menggunakan Dexie.js:

1. Buat src/types/index.ts dengan semua TypeScript interfaces:
   - Product, ProductUnit, ProductStock
   - Category, Supplier, Customer
   - SalesTransaction, SalesTransactionItem
   - PurchaseOrder, PurchaseOrderItem
   - GoodsReceipt, GoodsReceiptItem
   - StockMovement, User, Role, AppSetting
   (Lihat schema lengkap di PRD section 5)

2. Buat src/lib/db/dexie.ts:
   - Class TakoTaniDB extends Dexie
   - Definisi semua tabel dengan indexes yang tepat
   - Version dan migrations setup

3. Buat src/lib/db/ repository untuk setiap entitas:
   - Setiap repository punya: findAll, findById, create, update, delete, search
   - Gunakan TypeScript generics untuk type safety
   - Handle concurrent writes dengan Dexie transactions

4. Buat src/lib/db/seed.ts:
   - Data default: kategori dasar (Pupuk, Obat, Benih, Peralatan)
   - User default: admin/admin123
   - App settings default

5. Buat src/store/ dengan Zustand stores:
   - authStore.ts (user, role, permissions)
   - appStore.ts (settings, sync status, online status)
   - posStore.ts (cart, customer, payment, drafts)
   - notificationStore.ts (alerts: stok kritis, kedaluwarsa)
```

---

### [PROMPT-03] DESIGN SYSTEM & LAYOUT

```
Buat design system dan layout komponen:

1. Install dan konfigurasi shadcn/ui components:
   npx shadcn@latest add button input label select textarea checkbox
   npx shadcn@latest add card badge alert dialog sheet tabs
   npx shadcn@latest add table dropdown-menu popover tooltip
   npx shadcn@latest add toast skeleton progress separator

2. Buat src/components/layout/AppLayout.tsx:
   - Sidebar navigation (collapsible di tablet)
   - Header dengan: search global, notification bell, sync status, user menu
   - Main content area dengan padding yang tepat
   - Responsive breakpoints sesuai PRD section 8.4

3. Buat src/components/layout/Sidebar.tsx:
   - Logo Toko Tani Makmur
   - Navigation items dengan ikon Lucide:
     • Dashboard (LayoutDashboard)
     • Transaksi Penjualan (ShoppingCart)
     • Pembelian PO (Package)
     • Produk (Box)
     • Pelanggan (Users)
     • Supplier (Truck)
     • Kategori (Tag)
     • Stok (BarChart2)
     • Laporan (FileText)
     • Pengguna (UserCog)
     • Hak Akses (Shield)
     • Pengaturan (Settings)
   - Badge notifikasi merah untuk menu dengan alert
   - Collapse/expand dengan animasi smooth

4. Buat src/components/common/SyncStatus.tsx:
   - Icon hijau/kuning/merah berdasarkan status
   - Tooltip dengan info last sync + pending changes
   - Klik untuk force sync

5. Buat src/components/common/DataTable.tsx:
   - Wrapper TanStack Table yang reusable
   - Built-in: sorting, filtering, pagination, row selection
   - Export button (Excel, PDF)
   - Loading skeleton state
   - Empty state dengan ilustrasi

6. Pastikan semua komponen WCAG 2.1 AA compliant
```

---

### [PROMPT-04] AUTENTIKASI

```
Buat sistem autentikasi:

1. Buat src/features/auth/pages/LoginPage.tsx:
   - Form login dengan username + password
   - Mode alternatif: PIN login (6 digit numpad untuk kasir)
   - Toggle antara mode password dan PIN
   - "Remember device" checkbox
   - Logo dan branding Toko Tani Makmur
   - Validasi dengan Zod
   - Loading state saat login

2. Buat src/lib/auth/authService.ts:
   - login(username, credential): Promise<User>
   - loginWithPIN(userId, pin): Promise<User>
   - logout(): void
   - getCurrentUser(): User | null
   - refreshSession(): void
   - Hash PIN menggunakan bcrypt atau crypto API

3. Buat src/hooks/useAuth.ts:
   - Expose: user, role, isAuthenticated, login, logout
   - Auto-logout setelah idle 30 menit (configurable)

4. Buat src/hooks/usePermission.ts:
   - hasPermission(key: PermissionKey): boolean
   - hasAnyPermission(keys: PermissionKey[]): boolean

5. Buat src/components/common/ProtectedRoute.tsx:
   - Redirect ke login jika tidak authenticated
   - Tampilkan "Akses Ditolak" jika tidak punya permission
   - Loading state saat cek auth

6. Inisialisasi default admin user di src/lib/db/seed.ts jika belum ada user
```

---

### [PROMPT-05] MODUL KATEGORI & SUPPLIER

```
Buat modul Kategori dan Supplier:

KATEGORI:
1. Halaman: src/features/categories/pages/CategoriesPage.tsx
   - Tabel kategori dengan kolom: Nama, Kode, Parent, Jumlah Produk, Aksi
   - Tombol tambah kategori
   - Inline search/filter
   
2. Dialog form kategori (tambah/edit):
   - Nama kategori (wajib)
   - Kode kategori (auto-generate atau manual)
   - Parent kategori (dropdown, opsional)
   - Warna (color picker)
   - Ikon (pilih dari set ikon yang tersedia)
   - Deskripsi

3. Konfirmasi hapus dengan info jumlah produk terdampak

SUPPLIER:
1. Halaman: src/features/suppliers/pages/SuppliersPage.tsx
   - Tabel dengan filter dan search
   - Status badge (Aktif/Nonaktif)
   
2. Halaman detail supplier dengan tabs:
   - Tab "Info": semua field supplier
   - Tab "Produk": daftar produk dari supplier ini
   - Tab "Histori PO": tabel PO pernah dikirim ke supplier ini
   
3. Form supplier (tambah/edit):
   - Kode supplier (auto-generate)
   - Nama, contact person, telepon, email
   - Alamat, kota
   - Info bank: nama bank, nomor rekening
   - Terms pembayaran (hari)
   - Catatan
   - Toggle aktif/nonaktif

4. Validasi: tidak bisa nonaktifkan supplier jika ada PO "Pending"
5. Export data supplier ke Excel
```

---

### [PROMPT-06] MODUL PELANGGAN

```
Buat modul Pelanggan yang lengkap:

1. Halaman daftar pelanggan: src/features/customers/pages/CustomersPage.tsx
   - Tabel dengan kolom: NIK, Kode, Nama, Telepon, Kecamatan, Kabupaten, Limit Kredit, Status
   - Filter: kecamatan, kabupaten, status aktif
   - Search: nama, NIK, kode, telepon
   - Tombol: Tambah, Import Excel, Export Excel

2. Halaman detail pelanggan (tabs):
   - Tab "Info Dasar": semua field pelanggan
   - Tab "Histori Transaksi": tabel transaksi dengan total dan status
   - Tab "Info Kredit": limit kredit, outstanding, aging piutang

3. Form pelanggan (tambah/edit) dengan validasi Zod:
   - NIK (16 digit, opsional)
   - Nama (wajib)
   - Telepon, email
   - Alamat lengkap (alamat, desa, kecamatan, kabupaten, provinsi)
   - Limit kredit (default 0 = tidak ada kredit)
   - Status aktif/nonaktif

4. Komponen Import Excel: src/components/common/ExcelImport/ExcelImport.tsx
   - Drag & drop area dengan preview thumbnail
   - Parse Excel menggunakan SheetJS
   - Validasi mapping kolom (NIK, Nama, Alamat, Desa, Kecamatan, Kabupaten, Provinsi)
   - Tabel preview dengan baris error di-highlight merah
   - Tooltip pesan error per baris/kolom
   - Opsi: "Import Semua Valid" atau "Import Semua (skip error)"
   - Progress bar dengan jumlah berhasil/gagal
   - Laporan ringkasan hasil import
   - Tombol download template Excel

5. Export pelanggan ke Excel (format sesuai template import)

Template Excel pelanggan kolom wajib:
NIK | Nama | Alamat | Desa | Kecamatan | Kabupaten | Provinsi
```

---

### [PROMPT-07] MODUL PRODUK

```
Buat modul Produk yang lengkap dengan 3 mode input:

1. Halaman daftar produk: src/features/products/pages/ProductsPage.tsx
   - Toggle: Grid View (card dengan gambar) / List View (tabel)
   - Filter: kategori (chip), supplier, status stok, status aktif
   - Search: nama, kode, barcode
   - Badge: "Stok Rendah" (kuning), "Kedaluwarsa Segera" (merah), "Stok Habis" (abu)
   - Tombol: Tambah Produk, Batch Input, Import Excel

2. Form Produk Single: src/features/products/pages/ProductFormPage.tsx
   
   Section A — Info Dasar:
   - Kode produk (auto-generate: PRD-XXXX atau input manual)
   - Nama produk (wajib)
   - Kategori (searchable select)
   - Supplier (multi-select — produk bisa dari banyak supplier)
   - Deskripsi (textarea)
   - Status aktif (toggle)
   
   Section B — Upload Gambar:
   - Komponen drag & drop image upload
   - Preview gambar yang diupload
   - Compress otomatis menggunakan browser-image-compression
   - Simpan ke IndexedDB sebagai Blob (local) + Supabase Storage (cloud)
   - Hapus gambar
   
   Section C — Satuan Produk (DYNAMIC TABLE):
   - Tabel dengan baris yang bisa ditambah/hapus
   - Kolom: Nama Satuan | Konversi | Harga Beli | Harga Jual | Barcode | Base Unit
   - Minimal 1 satuan wajib ada
   - Hanya 1 satuan yang bisa jadi Base Unit (radio)
   - Konversi auto-set ke 1 jika Base Unit
   - Validasi: harga jual harus >= harga beli
   
   Section D — Stok Awal (per satuan):
   - Input stok awal
   - Input minimum stok
   - Input tanggal kedaluwarsa (opsional, untuk batch pertama)

3. Batch Input: src/features/products/pages/BatchProductPage.tsx
   - Tabel inline editable
   - Tombol "+ Tambah Baris"
   - Kolom: Nama, Kode, Kategori, Supplier, Satuan, Harga Beli, Harga Jual, Stok, Min Stok
   - Validasi real-time per baris
   - Tombol "Preview" dan "Simpan Semua"
   
4. Import Excel Produk:
   - Mapping kolom: nama, kode, deskripsi, category_id, supplier_id, unit_id, unit_nama, 
     purchase_price, selling_price, stock, min_stock, expire_date
   - Validasi: nama wajib, harga positif, category/supplier harus ada di DB
   - Gunakan komponen ExcelImport yang reusable
   - Tombol download template produk

5. Halaman detail produk (tabs):
   - Tab "Info Produk"
   - Tab "Satuan & Harga"  
   - Tab "Stok per Batch" (list batch FIFO/FEFO)
   - Tab "Histori Pergerakan Stok"
```

---

### [PROMPT-08] POS — TRANSAKSI PENJUALAN

```
Buat halaman POS utama yang lengkap dan optimal untuk kasir:

Layout: src/features/pos/pages/POSPage.tsx
- Split panel: KIRI (panel produk) | KANAN (panel keranjang)
- Ratio: 60% kiri, 40% kanan (di desktop ≥1280px)
- Full height, minimal padding untuk maksimalkan tampilan produk
- Implementasi keyboard shortcuts: F1-F5, Esc, Enter

PANEL KIRI — Produk:
1. Komponen: src/features/pos/components/POSProductSearch.tsx
   - Input search dengan ikon (nama, kode, barcode)
   - Autofocus saat halaman dimuat
   - Debounce 200ms
   - Tombol scan barcode (optional, jika kamera tersedia)

2. Komponen: src/features/pos/components/POSCategoryFilter.tsx
   - Chip/tab filter kategori horizontal scrollable
   - "Semua" sebagai default
   - Highlight kategori yang dipilih

3. Komponen: src/features/pos/components/POSProductGrid.tsx
   - Grid 4 kolom (desktop), 3 kolom (tablet), 2 kolom (mobile)
   - Product card: gambar (atau ikon default), nama, harga terkecil, stok
   - Badge stok: hijau (cukup), kuning (rendah), merah (habis)
   - Disabled state jika stok 0
   - Klik produk:
     • Jika 1 satuan: langsung tambah ke keranjang
     • Jika multi-satuan: tampilkan dialog pilih satuan
   - Infinite scroll (virtual list untuk performa)

PANEL KANAN — Keranjang:
4. Komponen: src/features/pos/components/POSCustomerSelect.tsx
   - Searchable dropdown pelanggan
   - Info: nama, kode, limit kredit tersisa, outstanding
   - Tombol "+Pelanggan Baru" (buka mini form)
   - Tampilkan "Umum" jika tidak ada pelanggan dipilih

5. Komponen: src/features/pos/components/POSCart.tsx
   - List item keranjang
   - Per item: nama produk, satuan, qty (input editable), harga, diskon, subtotal, tombol hapus
   - Input diskon per item (toggle: persen atau nominal)
   - Qty +/- buttons atau input langsung
   - Validasi qty tidak melebihi stok tersedia
   - Scroll jika item banyak (max height dengan overflow)

6. Komponen: src/features/pos/components/POSOrderSummary.tsx
   - Subtotal
   - Diskon total transaksi (input opsional)
   - Pajak (jika diaktifkan di settings)
   - TOTAL (font besar, tebal)

7. Komponen: src/features/pos/components/POSPayment.tsx
   - Tabs: TUNAI | TRANSFER | KREDIT
   
   Tunai:
   - Input jumlah bayar (currency format)
   - Tombol "Uang Pas" (set = total)
   - Tombol pecahan cepat: Rp 50.000 | Rp 100.000 | Rp 200.000 | Rp 500.000
   - Kembalian (otomatis, berwarna hijau jika positif, merah jika kurang)
   
   Transfer:
   - Input referensi/nomor bukti transfer
   - Info rekening toko (dari settings)
   
   Kredit:
   - Tampilkan limit kredit tersisa pelanggan
   - Validasi: tidak boleh melebihi limit
   - Input tanggal jatuh tempo
   - Warning jika limit hampir habis

8. Komponen: src/features/pos/components/POSPurchaseHistory.tsx
   - Collapsible panel "Histori Belanja Pelanggan"
   - List 10 transaksi terakhir pelanggan yang dipilih
   - Per transaksi: tanggal, invoice, total
   - Expand per transaksi → tampilkan item detail
   - Checkbox per item → tombol "Tambah ke Keranjang"

9. Action Buttons:
   - Tombol "SIMPAN DRAFT" (secondary)
   - Tombol "PROSES BAYAR" (primary, ukuran besar)
   - Tombol "BATAL" (danger, dengan konfirmasi)
   - Badge jumlah draft aktif di tombol draft

10. Draft Manager: src/features/pos/components/POSDraftManager.tsx
    - Slide-over panel (Sheet) berisi daftar draft
    - Per draft: nama, pelanggan, jumlah item, total, waktu simpan
    - Tombol load draft, hapus draft

11. Receipt/Struk Modal:
    - Preview struk digital setelah transaksi berhasil
    - Info: logo toko, alamat, kasir, tanggal/jam, detail item, total, bayar, kembalian
    - QR code nomor invoice
    - Tombol: Cetak (thermal/A4) | Share WhatsApp | Tutup

Zustand POS Store — implementasi sesuai TASKS.md TASK-011
FIFO/FEFO engine dipanggil saat processPayment()
```

---

### [PROMPT-09] PEMBELIAN (PURCHASE ORDER)

```
Buat modul Pembelian PO lengkap:

1. Halaman daftar PO: src/features/purchase/pages/PurchaseListPage.tsx
   - Tabel: No PO, Supplier, Tanggal, Status, Total, Aksi
   - Filter: status, supplier, range tanggal
   - Status badges: Draft (abu), Sent (biru), Partial (kuning), Received (hijau), Cancelled (merah)

2. Halaman buat PO baru: src/features/purchase/pages/CreatePOPage.tsx

   Step 1 — Pilih Produk:
   - Daftar SEMUA produk aktif diurutkan dari stok terendah terlebih dahulu
   - Tampilkan per produk: nama, stok saat ini, min stok, gap (selisih), supplier default
   - Badge kritis: merah jika stok ≤ min stok, kuning jika stok ≤ 2x min stok
   - Multi-select dengan checkbox
   - Input qty yang akan dipesan per produk langsung di tabel
   - Search dan filter kategori
   - Tombol "Lanjut ke Detail PO"

   Step 2 — Detail PO per Supplier:
   - Produk yang dipilih dikelompokkan berdasarkan supplier
   - Jika produk punya multiple supplier → dropdown pilih supplier untuk produk tersebut
   - Per kelompok supplier akan jadi 1 PO terpisah
   - Per item: nama produk, satuan, qty, harga beli, subtotal (editable)
   - Input tanggal kedaluwarsa (opsional per item)
   - Catatan per item dan per PO
   - Tanggal PO dan estimasi tanggal tiba

   Step 3 — Preview & Submit:
   - Preview semua PO yang akan dibuat (per supplier)
   - Format PO Number: PO-{KODE_SUPPLIER}-{YYYYMMDD}-{XXXX}
   - Total per PO dan grand total
   - Tombol: "Simpan sebagai Draft" | "Submit PO"

3. Halaman detail PO: src/features/purchase/pages/PODetailPage.tsx
   - Header: No PO, supplier, tanggal, status, created by
   - Tabel item detail
   - Tombol aksi berdasarkan status:
     • Draft → "Edit" | "Submit" | "Batalkan"
     • Sent → "Terima Barang" | "Batalkan"
     • Partial → "Terima Barang Lagi" | "Tandai Selesai"
   - Print PO (PDF)

4. Halaman Penerimaan Barang: src/features/purchase/pages/GoodsReceiptPage.tsx
   - Form GR terhubung ke PO
   - Header: No GR (auto), No PO, supplier, tanggal terima, penerima
   - Tabel item penerimaan:
     • Nama produk, qty dipesan, input qty diterima
     • Input nomor batch/lot
     • Input tanggal kedaluwarsa (opsional)
     • Select kondisi: Baik | Rusak | Ditolak
     • Catatan per item
   - Upload bukti penerimaan (drag & drop, gambar atau PDF)
   - Tombol "Simpan Penerimaan"
   - Setelah simpan: auto update stok, create stock movements, update PO status

5. Daftar GR: src/features/purchase/pages/GoodsReceiptListPage.tsx
   - Tabel GR dengan link ke PO dan detail
```

---

### [PROMPT-10] FIFO/FEFO ENGINE

```
Buat FIFO/FEFO engine lengkap di src/lib/fifo-fefo/stockEngine.ts:

Implementasi fungsi-fungsi berikut:

1. getAvailableBatches(productId: string, unitId: string): Promise<ProductStock[]>
   - Query product_stocks dimana product_id = productId AND unit_id = unitId AND quantity > 0
   - Sort: 
     • Jika ada expire_date → sort by expire_date ASC, received_date ASC (FEFO)
     • Jika tidak ada expire_date → sort by received_date ASC (FIFO)
   - Return list batch yang tersedia

2. validateStock(productId: string, unitId: string, qty: number): Promise<boolean>
   - Hitung total stok tersedia dari semua batch
   - Return true jika total >= qty

3. allocateBatches(productId: string, unitId: string, qty: number): Promise<BatchAllocation[]>
   - interface BatchAllocation { batchId: string, qty: number, purchasePrice: number }
   - Distribusikan qty dari batch-batch sesuai FIFO/FEFO
   - Contoh: qty = 150, batch[0] = 100, batch[1] = 80 → [{batch[0], 100}, {batch[1], 50}]
   - Throw InsufficientStockError jika total stok < qty

4. consumeStock(allocations: BatchAllocation[], reference: StockMovementReference): Promise<void>
   - Update quantity di masing-masing product_stocks
   - Hapus batch jika qty menjadi 0
   - Catat stock_movement untuk setiap batch yang dikurangi
   - Gunakan Dexie transaction untuk atomicity

5. addStock(params: AddStockParams): Promise<ProductStock>
   - interface AddStockParams { productId, unitId, qty, purchasePrice, expireDate?, batchNumber?, grItemId? }
   - Tambah record baru di product_stocks
   - Catat stock_movement type "purchase"

6. getCurrentStock(productId: string, unitId: string): Promise<number>
   - Aggregate total quantity dari semua batch aktif

7. calculateWeightedCOGS(allocations: BatchAllocation[]): number
   - Hitung COGS weighted average dari batch yang digunakan

8. getExpiringSoon(daysAhead: number): Promise<ProductStock[]>
   - Return batch yang akan expired dalam X hari ke depan
   - Join dengan products untuk nama produk

Tambahkan unit tests di src/lib/fifo-fefo/__tests__/stockEngine.test.ts:
- Test FIFO ordering
- Test FEFO ordering (expired first)
- Test partial batch split
- Test insufficient stock error
- Test COGS calculation
```

---

### [PROMPT-11] LAPORAN STOK & PERGERAKAN

```
Buat modul laporan stok:

1. Halaman Stok Saat Ini: src/features/stock/pages/CurrentStockPage.tsx
   - Header dengan summary card: Total Produk Aktif, Total Nilai Stok, Stok Kritis, Akan Expired
   - Filter: kategori, supplier, status (kritis/normal)
   - Search: nama produk, kode
   - Tabel: Kode, Nama Produk, Kategori, Satuan, Stok Saat Ini, Min Stok, Status, Nilai Stok
   - Row styling: merah jika stok kritis, kuning jika mendekati min stok
   - Expand row → tampilkan detail per batch (batch number, qty, expire date, harga beli)
   - Export ke Excel

2. Halaman Pergerakan Stok: src/features/stock/pages/StockMovementPage.tsx
   - Filter: produk, tipe gerakan, periode tanggal
   - Tabel: Tanggal, Produk, Satuan, Tipe, Qty Masuk (+), Qty Keluar (-), Saldo, Referensi
   - Link referensi ke transaksi terkait (invoice/PO/GR)
   - Grafik stok produk tertentu jika dipilih (line chart, Recharts)
   - Export ke Excel

3. Halaman Produk Mendekati Kedaluwarsa: src/features/stock/pages/ExpiringProductsPage.tsx
   - Filter periode: expired dalam 30 / 60 / 90 / 180 hari
   - Tabel: Produk, Batch Number, Qty, Expire Date, Sisa Hari, Supplier, Lokasi
   - Row merah jika expired, orange jika < 30 hari
   - Action: "Tandai untuk Clearance" | "Return ke Supplier"

4. Halaman Stok Opname: src/features/stock/pages/StockOpnamePage.tsx
   - Input tanggal opname
   - Tabel editable: Produk, Stok Sistem, Input Stok Fisik, Selisih (auto)
   - Filter kategori untuk opname per kategori
   - Simpan → buat stock adjustment + stock movement type "adjustment"
   - History opname sebelumnya
```

---

### [PROMPT-12] SEMUA LAPORAN

```
Buat semua halaman laporan di src/features/reports/:

1. LaporanPenjualanPage.tsx — Laporan Penjualan
   - Range date picker
   - Filter: kasir, pelanggan, kategori, metode bayar
   - Summary cards: Total Transaksi, Total Revenue, Avg per Transaksi
   - Grafik bar penjualan harian (Recharts)
   - Tabel detail transaksi
   - Export Excel + Print PDF

2. LaporanLabaRugiPage.tsx — Laporan Profit & Loss
   - Periode: harian, mingguan, bulanan, custom
   - Revenue, COGS, Gross Profit, Gross Margin %
   - Grafik trend profit margin
   - Breakdown per kategori

3. LaporanPiutangPage.tsx — Laporan Piutang
   - Tabel per pelanggan: nama, total piutang, jatuh tempo terdekat
   - Aging analysis: 0-30, 31-60, 61-90, >90 hari
   - Total outstanding kredit
   - Alert pelanggan overdue
   - Export + Print

4. LaporanPembelianPage.tsx — Laporan Pembelian
   - Filter: supplier, periode, status PO
   - Tabel PO: no PO, supplier, tanggal, total, status
   - Summary: total pembelian per supplier

5. LaporanProdukPage.tsx — Laporan Produk
   - Tab: Produk Terlaris | Slow Moving | Analisis Kategori
   - Ranking produk by qty sold dan by revenue
   - Produk tidak bergerak > 30/60/90 hari
   - Pie chart penjualan per kategori

6. LaporanKasirPage.tsx — Laporan Kinerja Kasir
   - Per kasir: jumlah transaksi, total revenue, total diskon, avg per transaksi
   - Filter periode

7. LaporanHPPPage.tsx — Laporan HPP/COGS
   - HPP per produk dari FIFO/FEFO
   - Gross profit per produk
   - Margin analysis

8. Komponen reusable: src/components/reports/
   - ReportHeader.tsx (judul, periode, print button)
   - ReportSummaryCards.tsx
   - ExportButton.tsx (Excel + PDF)
   - DateRangePicker.tsx

Format Export:
- Excel: header toko, tanggal export, filter yang digunakan, data tabel
- PDF: menggunakan @react-pdf/renderer
- Print: react-to-print dengan print stylesheet
```

---

### [PROMPT-13] PENGGUNA & HAK AKSES

```
Buat modul Manajemen Pengguna dan Hak Akses:

1. Halaman Pengguna: src/features/users/pages/UsersPage.tsx
   - Tabel: Foto/Inisial, Nama, Username, Role, Telepon, Status, Last Login, Aksi
   - Filter: role, status aktif
   - Form tambah/edit pengguna:
     • Full name, username (unique)
     • Email, telepon
     • Pilih role
     • Password (tambah) / Reset Password (edit)
     • Atur PIN (6 digit, untuk kasir)
     • Status aktif
   - Konfirmasi sebelum nonaktifkan
   - Tidak bisa hapus user yang punya transaksi
   - Tidak bisa edit/hapus diri sendiri (atau tampilkan warning)

2. Halaman Hak Akses: src/features/access/pages/AccessPage.tsx
   - Daftar roles dengan jumlah pengguna per role
   - Form buat/edit role:
     • Nama role
     • Deskripsi
     • Checklist permissions per modul:
       - POS: [View] [Create] [Edit] [Delete] [Void]
       - Pembelian: [View] [Create] [Edit] [Approve]
       - Produk: [View] [Create] [Edit] [Delete]
       - Pelanggan: [View] [Create] [Edit]
       - Supplier: [View] [Create] [Edit]
       - Stok: [View] [Adjust]
       - Laporan: [View] [Export]
       - Pengguna: [View] [Create] [Edit] [Delete]
       - Pengaturan: [View] [Edit]
   - Role "Owner" tidak bisa diedit atau dihapus (locked indicator)
   - Preview matrix hak akses (tabel role vs permission)

3. Default roles (seed data):
   - Owner: semua permission
   - Admin: semua kecuali delete user dan edit settings
   - Kasir: pos:create, product:read, customer:read, customer:create
   - Gudang: purchase semua, stock semua, product:read, report:view
```

---

### [PROMPT-14] PENGATURAN & SINKRONISASI

```
Buat halaman Pengaturan: src/features/settings/pages/SettingsPage.tsx

Layout: Sidebar tabs kiri + konten kanan

Tab 1 — Info Toko:
- Nama toko, slogan
- Alamat, kota, provinsi
- Telepon, email, website
- Upload logo (drag & drop, preview)
- Jam operasional

Tab 2 — Format Struk:
- Preview struk di sisi kanan (live preview)
- Toggle: tampilkan logo / alamat / telepon / kasir
- Header struk (custom text)
- Footer struk (custom text, max 3 baris)
- Pesan terima kasih
- Tampilkan QR code invoice: ya/tidak

Tab 3 — Penomoran:
- Format nomor invoice: INV-{DATE}-{SEQ} (kustomisasi format)
- Format nomor PO: PO-{SUPPLIER}-{DATE}-{SEQ}
- Format nomor GR: GR-{DATE}-{SEQ}
- Reset nomor urut (dengan konfirmasi)
- Preview format saat ini

Tab 4 — Stok & Produk:
- Alert stok kritis: threshold (default: stok = min stok)
- Alert kedaluwarsa: berapa hari sebelum expired (default: 30 hari)
- Satuan default

Tab 5 — Pajak:
- Toggle PPN on/off
- Persentase PPN (default: 11%)
- Keterangan pajak di struk

Tab 6 — Sinkronisasi (Cloud Sync):
- Input Supabase URL + API Key
- Tombol "Test Koneksi" (ping Supabase)
- Status koneksi (hijau/merah)
- Frekuensi sync otomatis (realtime / setiap 5 menit / manual)
- Last sync timestamp
- Tombol "Sync Sekarang"
- Log sinkronisasi (sukses/gagal per tabel)

Tab 7 — Backup & Restore:
- Backup manual: tombol "Download Backup" (JSON terenkripsi)
- Info: ukuran backup, tanggal terakhir backup
- Restore: upload file backup + konfirmasi
- Backup ke cloud (jika sync aktif)
- Jadwal backup otomatis: harian / mingguan

Tab 8 — Tampilan:
- Toggle dark/light mode
- Ukuran font (normal / besar)
- Bahasa (Indonesia — default)

Tab 9 — Printer:
- Pilih printer default (dari browser print API)
- Ukuran kertas: 58mm thermal / 80mm thermal / A4
- Preview ukuran struk

Simpan semua settings ke app_settings di IndexedDB
Sync settings ke cloud jika online
```

---

### [PROMPT-15] CLOUD SYNC & PWA

```
Implementasi Cloud Sync dan PWA:

1. Setup Supabase: src/lib/supabase.ts
   - Inisialisasi Supabase client dari env vars
   - Handle connection errors gracefully
   - Fungsi untuk test koneksi

2. Sync Manager: src/lib/sync/syncManager.ts
   
   class SyncManager:
   - isOnline: boolean (dari navigator.onLine + event listener)
   - syncQueue: SyncQueueItem[] (perubahan yang menunggu di-sync)
   - isSyncing: boolean
   
   Fungsi:
   - startSync(): mulai background sync
   - stopSync(): hentikan
   - syncAll(): sync semua tabel
   - syncTable(tableName): sync tabel tertentu
   - pushLocal(record, operation): push perubahan lokal ke cloud
   - pullRemote(): pull perubahan dari cloud ke lokal
   - resolveConflict(local, remote): Last-Write-Wins berdasarkan updated_at
   - queueChange(record, operation): tambah ke queue jika offline
   - processQueue(): proses queue saat kembali online
   
   Event listeners:
   - window.addEventListener('online') → trigger processQueue()
   - window.addEventListener('offline') → set isOnline = false

3. Sync Status Store (Zustand): src/store/syncStore.ts
   - status: 'synced' | 'syncing' | 'offline' | 'error'
   - pendingCount: number
   - lastSyncAt: Date | null
   - errors: SyncError[]

4. Komponen SyncStatusBadge:
   - 🟢 Synced (semua data synced)
   - 🟡 Syncing... (dengan spinner)
   - 🔴 Offline (X perubahan menunggu)
   - 🔴 Error (dengan pesan error)
   - Klik → buka detail panel

5. PWA Configuration: vite.config.ts
   - Plugin vite-plugin-pwa
   - manifest.json: nama, short_name, ikon 192+512, theme_color (#2D6A4F)
   - Workbox strategies:
     • assets (js, css, img): CacheFirst
     • API calls: NetworkFirst dengan fallback offline
   - Offline fallback page
   - Update prompt: "Versi baru tersedia. Muat ulang?"

6. Backup/Restore: src/lib/sync/backupService.ts
   - exportAllData(): export semua IndexedDB ke JSON
   - importData(json): restore dari JSON + validasi
   - encryptData(data, password): enkripsi AES-256
   - decryptData(encrypted, password): dekripsi
   - uploadToCloud(data): upload ke Supabase Storage
   - downloadFromCloud(): download dari Supabase Storage
```

---

## CATATAN TAMBAHAN

### Testing setelah setiap prompt:
1. Jalankan `npm run dev` — pastikan tidak ada error compile
2. Test fungsionalitas utama secara manual
3. Cek console browser untuk errors
4. Test responsiveness di 3 breakpoint (mobile, tablet, desktop)
5. Test keyboard navigation

### Commit convention:
```
feat: add POS product search panel
fix: FIFO engine batch allocation bug
refactor: extract cart logic to custom hook
test: add unit tests for stock engine
docs: update API documentation
```

### Environment Variables yang dibutuhkan:
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_APP_NAME=Toko Tani Makmur
VITE_APP_VERSION=1.0.0
VITE_ENABLE_SYNC=true
VITE_DEBUG=false
```
