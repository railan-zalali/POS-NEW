import Dexie, { type Table } from 'dexie';
import type {
  Product,
  ProductUnit,
  ProductStock,
  Category,
  Supplier,
  Customer,
  SalesTransaction,
  SalesTransactionItem,
  User,
  Role,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  StockMovement,
  AppSetting,
  POSDraft,
} from './schema';

export class TokoTaniDB extends Dexie {
  products!: Table<Product>;
  product_units!: Table<ProductUnit>;
  product_stocks!: Table<ProductStock>;
  categories!: Table<Category>;
  suppliers!: Table<Supplier>;
  customers!: Table<Customer>;
  sales_transactions!: Table<SalesTransaction>;
  sales_transaction_items!: Table<SalesTransactionItem>;
  users!: Table<User>;
  roles!: Table<Role>;
  purchase_orders!: Table<PurchaseOrder>;
  purchase_order_items!: Table<PurchaseOrderItem>;
  goods_receipts!: Table<GoodsReceipt>;
  goods_receipt_items!: Table<GoodsReceiptItem>;
  stock_movements!: Table<StockMovement>;
  app_settings!: Table<AppSetting>;
  pos_drafts!: Table<POSDraft>;

  constructor() {
    super('TokoTaniDB');

    // Schema definition
    // Schema definition
    // Version 2: Added sync_status and updated_at indices
    this.version(2).stores({
      products: '++id, code, name, category_id, is_active, sync_status, updated_at',
      product_units: '++id, product_id, is_base_unit, barcode, sync_status',
      product_stocks:
        '++id, product_id, unit_id, expire_date, received_date, [product_id+unit_id], sync_status',
      categories: '++id, name, parent_id, sync_status',
      suppliers: '++id, code, name, is_active, sync_status',
      customers: '++id, code, name, phone, nik, is_active, sync_status',
      sales_transactions:
        '++id, invoice_number, customer_id, transaction_date, status, sync_status, updated_at',
      sales_transaction_items: '++id, transaction_id, product_id, sync_status',
      users: '++id, username, role_id, is_active, sync_status',
      roles: '++id, name, sync_status',
      purchase_orders: '++id, po_number, supplier_id, status, order_date, sync_status',
      purchase_order_items: '++id, po_id, product_id, sync_status',
      goods_receipts: '++id, gr_number, po_id, received_date, status, sync_status',
      goods_receipt_items: '++id, gr_id, po_item_id, product_id, sync_status',
      stock_movements: '++id, product_id, movement_type, reference_id, created_at, sync_status',
      app_settings: '++key, sync_status',
      pos_drafts: '++id, customer_id, name, created_at',
    });
  }
}

export const db = new TokoTaniDB();
