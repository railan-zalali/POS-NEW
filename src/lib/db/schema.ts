export interface BaseEntity {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  sync_status?: SyncStatus;
  synced_at?: Date;
}

export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface Product extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  category_id: string;
  supplier_ids: string[]; // Array of supplier IDs
  image_url?: string;
  is_active: boolean;
}

export interface CartItem {
  id: string; // Unique ID for cart item (not product ID)
  product_id: string;
  product_name: string;
  unit_id: string;
  unit_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  notes?: string;
}

export interface POSDraft extends BaseEntity {
  name?: string;
  customer_id?: string;
  customer_name?: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  notes?: string;
  created_at: Date;
}

export interface ProductUnit extends BaseEntity {
  product_id: string;
  unit_name: string;
  conversion_factor: number;
  is_base_unit: boolean;
  purchase_price: number;
  selling_price: number;
  barcode?: string;
}

export interface ProductStock extends BaseEntity {
  product_id: string;
  unit_id: string;
  batch_number?: string;
  expire_date?: Date;
  quantity: number;
  purchase_price: number;
  received_date: Date;
  purchase_order_item_id?: string;
  location?: string;
}

export interface Category extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  icon?: string;
  color?: string;
}

export interface Supplier extends BaseEntity {
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  bank_name?: string;
  bank_account?: string;
  payment_terms?: number;
  notes?: string;
  is_active: boolean;
}

export interface Customer extends BaseEntity {
  nik?: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  village?: string;
  district?: string;
  regency?: string;
  province?: string;
  credit_limit: number;
  outstanding_credit: number;
  loyalty_points: number;
  is_active: boolean;
}

export type TransactionStatus = 'draft' | 'completed' | 'cancelled' | 'partial_paid';
export type PaymentMethod = 'cash' | 'transfer' | 'credit';

export interface SalesTransaction extends BaseEntity {
  invoice_number: string;
  customer_id?: string;
  cashier_id: string;
  transaction_date: Date;
  due_date?: Date;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  status: TransactionStatus;
  notes?: string;
}

export interface SalesTransactionItem extends BaseEntity {
  transaction_id: string;
  product_id: string;
  product_unit_id: string;
  batch_ids: string[];
  batch_allocations: BatchAllocation[];
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  cogs: number;
}

export interface BatchAllocation {
  batch_id: string;
  quantity: number;
  purchase_price: number;
}

export type PermissionKey =
  | 'pos:read'
  | 'pos:create'
  | 'pos:edit'
  | 'pos:delete'
  | 'pos:void'
  | 'purchase:read'
  | 'purchase:create'
  | 'purchase:edit'
  | 'purchase:approve'
  | 'product:read'
  | 'product:create'
  | 'product:edit'
  | 'product:delete'
  | 'customer:read'
  | 'customer:create'
  | 'customer:edit'
  | 'supplier:read'
  | 'supplier:create'
  | 'supplier:edit'
  | 'report:view'
  | 'report:export'
  | 'user:read'
  | 'user:create'
  | 'user:edit'
  | 'user:delete'
  | 'settings:read'
  | 'settings:edit'
  | 'stock:read'
  | 'stock:adjust';

export interface Role extends BaseEntity {
  name: string;
  permissions: PermissionKey[];
}

export interface User extends BaseEntity {
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  role_id: string;
  pin?: string; // 6 digit PIN (hashed)
  is_active: boolean;
  last_login?: Date;
}

// Purchase Order Interfaces
export interface PurchaseOrder extends BaseEntity {
  po_number: string;
  supplier_id: string;
  ordered_by: string;
  order_date: Date;
  due_date?: Date;
  status: 'draft' | 'sent' | 'partial_received' | 'received' | 'cancelled';
  total_amount: number;
  notes?: string;
}

export interface PurchaseOrderItem extends BaseEntity {
  po_id: string;
  product_id: string;
  product_unit_id: string;
  quantity_ordered: number;
  quantity_received?: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

// Goods Receipt Interfaces
export interface GoodsReceipt extends BaseEntity {
  gr_number: string;
  po_id: string;
  received_by: string;
  received_date: Date;
  status: 'complete' | 'partial' | 'cancelled';
  notes?: string;
  proof_image_local?: Blob | null; // For Dexie storage
  proof_image_url?: string | null;
}

export interface GoodsReceiptItem extends BaseEntity {
  gr_id: string;
  po_item_id: string;
  product_id: string;
  quantity_received: number;
  batch_number?: string | null;
  expire_date?: Date | null;
  condition: 'good' | 'damaged' | 'rejected';
  notes?: string;
}

// Stock Movement
export interface StockMovement extends BaseEntity {
  product_id: string;
  product_unit_id: string;
  movement_type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer';
  reference_id: string;
  reference_type: 'transaction' | 'goods_receipt' | 'adjustment';
  batch_number?: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  expire_date?: Date;
  created_by: string;
}

// App Settings
export interface AppSetting extends BaseEntity {
  key: string;
  value: unknown;
  description?: string;
}

// Expense Module
export type ExpenseCategory =
  | 'operational'
  | 'electricity'
  | 'water'
  | 'internet'
  | 'rent'
  | 'salary'
  | 'marketing'
  | 'maintenance'
  | 'supplies'
  | 'transportation'
  | 'tax'
  | 'insurance'
  | 'other';

export interface Expense extends BaseEntity {
  date: Date;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  receipt_number?: string;
  created_by: string;
  notes?: string;
}

// Customer Payment (AR Settlement)
export interface CustomerPayment extends BaseEntity {
  payment_number: string;
  customer_id: string;
  payment_date: Date;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  created_by: string;
}

// Purchase Return
export type ReturnReason =
  | 'defective'
  | 'wrong_item'
  | 'expired'
  | 'damaged'
  | 'excess_order'
  | 'customer_return'
  | 'other';

export interface PurchaseReturn extends BaseEntity {
  return_number: string;
  goods_receipt_id?: string;
  supplier_id: string;
  return_date: Date;
  total_amount: number;
  reason: ReturnReason;
  notes?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed';
  created_by: string;
}

export interface PurchaseReturnItem extends BaseEntity {
  return_id: string;
  product_id: string;
  product_unit_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  reason: ReturnReason;
  notes?: string;
}

export interface TransactionSnapshot extends BaseEntity {
  transaction_id: string;
  snapshot: string;
  stockBefore: Record<string, number>;
  timestamp: number;
}
