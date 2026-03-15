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

  constructor() {
    super('TokoTaniDB');

    // Schema definition
    // Note: ++id means auto-incrementing primary key
    this.version(1).stores({
      products: '++id, code, name, category_id, is_active, sync_status',
      product_units: '++id, product_id, is_base_unit, barcode',
      product_stocks: '++id, product_id, unit_id, expire_date, received_date, [product_id+unit_id]',
      categories: '++id, name, parent_id',
      suppliers: '++id, code, name, is_active',
      customers: '++id, code, name, phone, nik, is_active',
      sales_transactions: '++id, invoice_number, customer_id, transaction_date, status',
      sales_transaction_items: '++id, transaction_id, product_id',
      users: '++id, username, role_id, is_active',
      roles: '++id, name',
      purchase_orders: '++id, po_number, supplier_id, status, order_date',
      purchase_order_items: '++id, po_id, product_id',
      goods_receipts: '++id, gr_number, po_id, received_date, status',
      goods_receipt_items: '++id, gr_id, po_item_id, product_id',
      stock_movements: '++id, product_id, movement_type, reference_id, created_at',
      app_settings: '++key', // key is unique
    });
  }
}

export const db = new TokoTaniDB();
