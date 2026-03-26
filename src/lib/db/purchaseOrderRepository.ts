import { db } from './dexie';
import type { PurchaseOrder, PurchaseOrderItem } from './schema';
import { coerceEntityId, sameEntityId } from '@/lib/entityId';
import { queueDeleteInstruction } from '@/lib/supabase/deleteOutbox';

async function resolvePurchaseOrderKey(id: string | number) {
  const directMatch = await db.purchase_orders.get(coerceEntityId(id));
  if (directMatch?.id != null) {
    return directMatch.id;
  }

  const fallbackMatch = await db.purchase_orders
    .toArray()
    .then((purchaseOrders) =>
      purchaseOrders.find((purchaseOrder) => sameEntityId(purchaseOrder.id, id)),
    );

  return fallbackMatch?.id;
}

export const purchaseOrderRepository = {
  async getAll() {
    return await db.purchase_orders.reverse().toArray();
  },

  async getById(id: string | number) {
    const resolvedId = await resolvePurchaseOrderKey(id);
    if (resolvedId == null) {
      return undefined;
    }

    return await db.purchase_orders.get(resolvedId);
  },

  async getItemsByPoId(poId: string | number) {
    return await db.purchase_order_items
      .toArray()
      .then((items) => items.filter((item) => sameEntityId(item.po_id, poId)));
  },

  async create(po: Omit<PurchaseOrder, 'id'>, items: Omit<PurchaseOrderItem, 'id' | 'po_id'>[]) {
    return await db.transaction('rw', [db.purchase_orders, db.purchase_order_items], async () => {
      const poId = await db.purchase_orders.add({
        ...po,
        created_at: new Date(),
        updated_at: new Date(),
        sync_status: 'pending',
      } as PurchaseOrder);

      const poItems = items.map(
        (item) =>
          ({
            ...item,
            po_id: poId,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'pending',
          }) as PurchaseOrderItem,
      );

      await db.purchase_order_items.bulkAdd(poItems);

      return poId;
    });
  },

  async updateStatus(id: string | number, status: PurchaseOrder['status']) {
    const resolvedId = await resolvePurchaseOrderKey(id);
    if (resolvedId == null) {
      return 0;
    }

    return await db.purchase_orders.update(resolvedId, {
      status,
      updated_at: new Date(),
      sync_status: 'pending',
    });
  },

  async delete(id: string | number) {
    const resolvedId = await resolvePurchaseOrderKey(id);
    if (resolvedId == null) {
      return;
    }

    return await db.transaction(
      'rw',
      [db.purchase_orders, db.purchase_order_items, db.app_settings],
      async () => {
        const relatedItems = await db.purchase_order_items
          .toArray()
          .then((items) => items.filter((item) => sameEntityId(item.po_id, resolvedId)));

        if (relatedItems.length > 0) {
          for (const item of relatedItems) {
            if (item.id != null) {
              await queueDeleteInstruction('purchase_order_items', item.id);
            }
          }

          await db.purchase_order_items.bulkDelete(
            relatedItems
              .map((item) => item.id)
              .filter((itemId): itemId is string => itemId != null),
          );
        }

        await queueDeleteInstruction('purchase_orders', resolvedId);
        await db.purchase_orders.delete(resolvedId);
      },
    );
  },
};
