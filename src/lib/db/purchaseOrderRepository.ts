import { db } from './dexie';
import type { PurchaseOrder, PurchaseOrderItem } from './schema';

export const purchaseOrderRepository = {
  async getAll() {
    return await db.purchase_orders.reverse().toArray();
  },

  async getById(id: string) {
    return await db.purchase_orders.get(id);
  },

  async getItemsByPoId(poId: string) {
    return await db.purchase_order_items.where('po_id').equals(poId).toArray();
  },

  async create(po: Omit<PurchaseOrder, 'id'>, items: Omit<PurchaseOrderItem, 'id' | 'po_id'>[]) {
    return await db.transaction('rw', db.purchase_orders, db.purchase_order_items, async () => {
      const poId = await db.purchase_orders.add({
        ...po,
        created_at: new Date(),
        updated_at: new Date(),
      } as PurchaseOrder);

      const poItems = items.map(
        (item) =>
          ({
            ...item,
            po_id: poId,
            created_at: new Date(),
            updated_at: new Date(),
          }) as PurchaseOrderItem,
      );

      await db.purchase_order_items.bulkAdd(poItems);

      return poId;
    });
  },

  async updateStatus(id: string, status: PurchaseOrder['status']) {
    return await db.purchase_orders.update(id, {
      status,
      updated_at: new Date(),
    });
  },

  async delete(id: string) {
    return await db.transaction('rw', db.purchase_orders, db.purchase_order_items, async () => {
      await db.purchase_order_items.where('po_id').equals(id).delete();
      await db.purchase_orders.delete(id);
    });
  },
};
