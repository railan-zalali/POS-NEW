# 🗄️ DATABASE SCHEMA REFERENCE
## Toko Tani Makmur POS

---

## IndexedDB (Dexie.js) + PostgreSQL (Supabase)

Semua tabel ada di IndexedDB lokal DAN PostgreSQL cloud.
Primary key menggunakan UUID (crypto.randomUUID() di lokal).

---

## TABEL LENGKAP

### products
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| code | string | Unique, auto-generate PRD-XXXX |
| name | string | Nama produk |
| description | string? | Deskripsi |
| category_id | string | FK → categories |
| image_url | string? | URL di Supabase Storage |
| image_local | Blob? | Gambar di IndexedDB |
| is_active | boolean | Default true |
| created_at | Date | |
| updated_at | Date | Untuk conflict resolution |
| sync_status | string | 'synced' \| 'pending' \| 'conflict' |

**Dexie indexes:** `code, name, category_id, is_active, sync_status`

---

### product_units
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| product_id | string | FK → products |
| unit_name | string | "Karung", "Kg", "Liter", "Botol" |
| conversion_factor | number | 1 jika base unit |
| is_base_unit | boolean | Hanya 1 per produk |
| purchase_price | number | Harga beli |
| selling_price | number | Harga jual |
| barcode | string? | Barcode/QR per satuan |

**Dexie indexes:** `product_id, is_base_unit`

---

### product_stocks (FIFO/FEFO batches)
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| product_id | string | FK → products |
| unit_id | string | FK → product_units (base unit) |
| batch_number | string? | Nomor batch/lot dari supplier |
| expire_date | Date? | Tanggal kedaluwarsa (untuk FEFO) |
| quantity | number | Qty tersisa dalam batch ini |
| purchase_price | number | Harga beli batch ini (untuk COGS) |
| received_date | Date | Tanggal diterima (untuk FIFO) |
| gr_item_id | string? | FK → goods_receipt_items |
| location | string? | Lokasi rak/gudang |

**Dexie indexes:** `product_id, unit_id, expire_date, received_date`

> ⚠️ Sorting FEFO: `expire_date ASC, received_date ASC` (NULL expire_date = FIFO only)
> ⚠️ Sorting FIFO: `received_date ASC`

---

### categories
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| name | string | Nama kategori |
| code | string | Kode unik |
| description | string? | |
| parent_id | string? | FK → categories (sub-kategori) |
| icon | string? | Nama ikon Lucide |
| color | string? | Hex color |
| sort_order | number | Urutan tampil |
| created_at | Date | |

**Dexie indexes:** `name, parent_id`

---

### suppliers
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| code | string | Unique, auto-generate SUP-XXXX |
| name | string | |
| contact_person | string? | |
| phone | string? | |
| email | string? | |
| address | string? | |
| city | string? | |
| bank_name | string? | |
| bank_account | string? | |
| payment_terms | number? | Hari term pembayaran |
| notes | string? | |
| is_active | boolean | Default true |
| created_at | Date | |
| updated_at | Date | |

**Dexie indexes:** `code, name, is_active`

---

### customers
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| nik | string? | Nomor Induk Kependudukan |
| code | string | Unique, auto-generate CUS-XXXX |
| name | string | Nama pelanggan |
| phone | string? | |
| email | string? | |
| address | string? | Alamat lengkap |
| village | string? | Desa |
| district | string? | Kecamatan |
| regency | string? | Kabupaten |
| province | string? | Provinsi |
| credit_limit | number | Default 0 (tidak ada kredit) |
| outstanding_credit | number | Total kredit belum terbayar |
| loyalty_points | number | Poin loyalitas |
| is_active | boolean | Default true |
| notes | string? | |
| created_at | Date | |
| updated_at | Date | |

**Dexie indexes:** `nik, code, name, phone, district, regency`

---

### sales_transactions
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| invoice_number | string | Unique, format INV-YYYYMMDD-XXXX |
| customer_id | string? | FK → customers (null = pelanggan umum) |
| cashier_id | string | FK → users |
| transaction_date | Date | |
| due_date | Date? | Jatuh tempo kredit |
| subtotal | number | Sebelum diskon |
| discount_amount | number | Total diskon |
| tax_amount | number | PPN jika aktif |
| total_amount | number | Grand total |
| paid_amount | number | Jumlah dibayar |
| change_amount | number | Kembalian |
| payment_method | string | 'cash' \| 'transfer' \| 'credit' |
| payment_reference | string? | No. bukti transfer |
| status | string | 'draft' \| 'completed' \| 'cancelled' \| 'partial_paid' |
| notes | string? | |
| created_at | Date | |
| updated_at | Date | |
| sync_status | string | |

**Dexie indexes:** `invoice_number, customer_id, cashier_id, transaction_date, status, payment_method`

---

### sales_transaction_items
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| transaction_id | string | FK → sales_transactions |
| product_id | string | FK → products |
| product_unit_id | string | FK → product_units |
| batch_ids | string[] | Array UUID dari product_stocks yang dikonsumsi |
| quantity | number | |
| unit_price | number | Harga jual saat transaksi |
| discount_percent | number | % diskon per item |
| discount_amount | number | Nominal diskon per item |
| subtotal | number | (unit_price - discount) × quantity |
| cogs | number | Total COGS dari batch FIFO/FEFO |

**Dexie indexes:** `transaction_id, product_id`

---

### purchase_orders
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| po_number | string | Unique, format PO-SUP-YYYYMMDD-XXXX |
| supplier_id | string | FK → suppliers |
| ordered_by | string | FK → users |
| order_date | Date | |
| expected_date | Date? | Estimasi tiba |
| status | string | 'draft' \| 'sent' \| 'partial_received' \| 'received' \| 'cancelled' |
| notes | string? | |
| total_amount | number | |
| created_at | Date | |
| updated_at | Date | |

**Dexie indexes:** `po_number, supplier_id, order_date, status`

---

### purchase_order_items
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| po_id | string | FK → purchase_orders |
| product_id | string | FK → products |
| product_unit_id | string | FK → product_units |
| quantity_ordered | number | |
| quantity_received | number | Default 0 |
| unit_price | number | Harga beli yang disepakati |
| subtotal | number | quantity_ordered × unit_price |
| expire_date | Date? | Tanggal kedaluwarsa yang diminta |
| notes | string? | |

**Dexie indexes:** `po_id, product_id`

---

### goods_receipts
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| gr_number | string | Unique, format GR-YYYYMMDD-XXXX |
| po_id | string | FK → purchase_orders |
| received_by | string | FK → users |
| received_date | Date | |
| status | string | 'complete' \| 'partial' |
| notes | string? | |
| proof_image_url | string? | URL Supabase Storage |
| proof_image_local | Blob? | Local IndexedDB |
| created_at | Date | |

**Dexie indexes:** `gr_number, po_id, received_date`

---

### goods_receipt_items
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| gr_id | string | FK → goods_receipts |
| po_item_id | string | FK → purchase_order_items |
| product_id | string | FK → products |
| quantity_received | number | Qty yang benar-benar diterima |
| batch_number | string? | Nomor batch dari supplier |
| expire_date | Date? | Tanggal kedaluwarsa aktual |
| condition | string | 'good' \| 'damaged' \| 'rejected' |
| notes | string? | |

**Dexie indexes:** `gr_id, po_item_id, product_id`

---

### stock_movements
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| product_id | string | FK → products |
| product_unit_id | string | FK → product_units |
| movement_type | string | 'purchase' \| 'sale' \| 'adjustment' \| 'return' \| 'expired' \| 'void' |
| reference_id | string | ID transaksi terkait |
| reference_type | string | 'sale' \| 'purchase' \| 'adjustment' \| 'gr' |
| batch_number | string? | |
| quantity_before | number | Stok sebelum |
| quantity_change | number | + masuk, - keluar |
| quantity_after | number | Stok sesudah |
| expire_date | Date? | |
| notes | string? | |
| created_by | string | FK → users |
| created_at | Date | |

**Dexie indexes:** `product_id, product_unit_id, movement_type, created_at, reference_id`

---

### users
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| username | string | Unique |
| full_name | string | |
| email | string? | |
| phone | string? | |
| role_id | string | FK → roles |
| password_hash | string? | Bcrypt hash |
| pin_hash | string? | 6-digit PIN hash |
| is_active | boolean | |
| last_login | Date? | |
| created_at | Date | |
| updated_at | Date | |

**Dexie indexes:** `username, role_id, is_active`

---

### roles
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | string (UUID) | PK |
| name | string | Unique |
| description | string? | |
| permissions | string[] | Array of PermissionKey |
| is_system | boolean | True = tidak bisa dihapus |
| created_at | Date | |

**Dexie indexes:** `name`

---

### app_settings
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| key | string | PK (e.g., "store.name", "sync.url") |
| value | any | JSON value |
| description | string? | |
| updated_at | Date | |

---

## PERMISSION KEYS

```typescript
type PermissionKey = 
  // POS
  | 'pos:read' | 'pos:create' | 'pos:edit' | 'pos:delete' | 'pos:void'
  // Purchase
  | 'purchase:read' | 'purchase:create' | 'purchase:edit' | 'purchase:approve'
  // Product
  | 'product:read' | 'product:create' | 'product:edit' | 'product:delete'
  // Customer
  | 'customer:read' | 'customer:create' | 'customer:edit' | 'customer:delete'
  // Supplier
  | 'supplier:read' | 'supplier:create' | 'supplier:edit'
  // Stock
  | 'stock:read' | 'stock:adjust'
  // Report
  | 'report:view' | 'report:export'
  // User
  | 'user:read' | 'user:create' | 'user:edit' | 'user:delete'
  // Settings
  | 'settings:read' | 'settings:edit'
  // Access
  | 'access:read' | 'access:edit';
```

---

## DEFAULT SEED DATA

### Kategori Default
```
1. Pupuk (pupuk urea, NPK, organik, dll)
2. Obat-obatan Sawah (insektisida, fungisida, herbisida)
3. Benih (padi, jagung, sayuran, dll)
4. Peralatan Tangan (cangkul, sabit, dll)
5. Peralatan Mesin (pompa, sprayer, dll)
6. Lain-lain
```

### Roles Default
```
Owner    → semua permission
Admin    → semua kecuali user:delete, access:edit
Kasir    → pos:*, product:read, customer:read, customer:create
Gudang   → purchase:*, stock:*, product:read, report:view
```

### App Settings Default
```
store.name          = "Toko Tani Makmur"
store.address       = ""
store.phone         = ""
invoice.format      = "INV-{YYYYMMDD}-{SEQ4}"
po.format           = "PO-{SUPPLIER}-{YYYYMMDD}-{SEQ4}"
gr.format           = "GR-{YYYYMMDD}-{SEQ4}"
stock.alert_days    = 30  (hari sebelum expired untuk alert)
tax.enabled         = false
tax.rate            = 11  (%)
sync.enabled        = false
sync.frequency      = "manual"
theme               = "light"
```

---

## QUERY PATTERNS PENTING

### Hitung stok produk saat ini
```javascript
const totalStock = await db.product_stocks
  .where('product_id').equals(productId)
  .and(batch => batch.unit_id === unitId)
  .toArray()
  .then(batches => batches.reduce((sum, b) => sum + b.quantity, 0));
```

### FEFO: ambil batch untuk penjualan
```javascript
const batches = await db.product_stocks
  .where('product_id').equals(productId)
  .and(b => b.unit_id === unitId && b.quantity > 0)
  .toArray()
  .then(all => all.sort((a, b) => {
    if (a.expire_date && b.expire_date) {
      return a.expire_date.getTime() - b.expire_date.getTime();
    }
    if (a.expire_date) return -1;
    if (b.expire_date) return 1;
    return a.received_date.getTime() - b.received_date.getTime();
  }));
```

### Produk mendekati expired
```javascript
const thirtyDaysLater = new Date();
thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

const expiring = await db.product_stocks
  .where('expire_date').belowOrEqual(thirtyDaysLater)
  .and(b => b.quantity > 0 && b.expire_date !== null)
  .toArray();
```

### Stok kritis (di bawah minimum)
```javascript
// Perlu join manual di Dexie
const allUnits = await db.product_units.toArray();
const stockByUnit = await Promise.all(
  allUnits.map(async unit => {
    const total = await db.product_stocks
      .where('[product_id+unit_id]').equals([unit.product_id, unit.id])
      .toArray()
      .then(b => b.reduce((s, b) => s + b.quantity, 0));
    return { ...unit, current_stock: total };
  })
);
const critical = stockByUnit.filter(u => u.current_stock <= u.min_stock);
```

---

*Schema ini adalah referensi utama untuk implementasi. Semua perubahan harus diupdate di sini.*
