import { db } from './dexie';
import type {
  GoodsReceipt,
  GoodsReceiptItem,
  PurchaseOrder,
  ProductStock,
  PurchaseOrderItem,
} from './schema';
import { coerceEntityId, sameEntityId } from '@/lib/entityId';

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

async function resolvePurchaseOrderItemKey(id: string | number) {
  const directMatch = await db.purchase_order_items.get(coerceEntityId(id));
  if (directMatch?.id != null) {
    return directMatch.id;
  }

  const fallbackMatch = await db.purchase_order_items
    .toArray()
    .then((items) => items.find((item) => sameEntityId(item.id, id)));

  return fallbackMatch?.id;
}

export const goodsReceiptRepository = {
  async getAll() {
    return await db.goods_receipts.reverse().toArray();
  },

  async getById(id: string) {
    return await db.goods_receipts.get(id);
  },

  async getItemsByGrId(grId: string) {
    return await db.goods_receipt_items.where('gr_id').equals(grId).toArray();
  },

  async create(gr: Omit<GoodsReceipt, 'id'>, items: Omit<GoodsReceiptItem, 'id' | 'gr_id'>[]) {
    return await db.transaction(
      'rw',
      [
        db.goods_receipts,
        db.goods_receipt_items,
        db.purchase_orders,
        db.purchase_order_items,
        db.product_units,
        db.product_stocks,
      ],
      async () => {
        const resolvedPoId = await resolvePurchaseOrderKey(gr.po_id);
        if (resolvedPoId == null) {
          throw new Error('Purchase Order tidak ditemukan.');
        }

        // 1. Create Goods Receipt
        const grId = await db.goods_receipts.add({
          ...gr,
          po_id: resolvedPoId,
          received_date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        } as GoodsReceipt);

        // 2. Create Items & Update Stock
        for (const item of items) {
          const resolvedPoItemId = await resolvePurchaseOrderItemKey(item.po_item_id);
          if (resolvedPoItemId == null) {
            throw new Error('Item Purchase Order tidak ditemukan.');
          }

          // Save GR Item
          await db.goods_receipt_items.add({
            ...item,
            gr_id: grId,
            po_item_id: resolvedPoItemId,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'pending',
          } as GoodsReceiptItem);

          // Update Stock (Add new batch)
          if (item.quantity_received > 0 && item.condition === 'good') {
            // Fetch PO Item to get unit details and price
            const poItem = await db.purchase_order_items.get(resolvedPoItemId);

            if (poItem) {
              const unit = await db.product_units.get(poItem.product_unit_id);
              const factor = unit?.conversion_factor || 1;

              // Add to product_stocks (Normalize to base unit)
              await db.product_stocks.add({
                product_id: item.product_id,
                unit_id: poItem.product_unit_id,
                batch_number: item.batch_number,
                expire_date: item.expire_date,
                quantity: item.quantity_received * factor,
                received_date: new Date(),
                purchase_order_item_id: resolvedPoItemId,
                purchase_price: poItem.unit_price / factor,
                created_at: new Date(),
                updated_at: new Date(),
                sync_status: 'pending',
              } as ProductStock);

              // Update PO Item quantity_received
              await db.purchase_order_items.update(resolvedPoItemId, {
                quantity_received: (poItem.quantity_received || 0) + item.quantity_received,
                updated_at: new Date(),
                sync_status: 'pending',
              });
            }
          }
        }

        // 3. Update PO Status
        const poItems = await db.purchase_order_items
          .toArray()
          .then((purchaseOrderItems) =>
            purchaseOrderItems.filter((purchaseOrderItem) =>
              sameEntityId(purchaseOrderItem.po_id, resolvedPoId),
            ),
          );
        const allReceived = poItems.every(
          (i: PurchaseOrderItem) => (i.quantity_received || 0) >= i.quantity_ordered,
        );
        const someReceived = poItems.some((i: PurchaseOrderItem) => (i.quantity_received || 0) > 0);

        let newStatus: PurchaseOrder['status'] = 'sent';
        if (allReceived) newStatus = 'received';
        else if (someReceived) newStatus = 'partial_received';

        await db.purchase_orders.update(resolvedPoId, {
          status: newStatus,
          updated_at: new Date(),
          sync_status: 'pending',
        });

        return grId;
      },
    );
  },
};
