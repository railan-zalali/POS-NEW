import { db } from './dexie';
import type {
  GoodsReceipt,
  GoodsReceiptItem,
  PurchaseOrder,
  ProductStock,
  PurchaseOrderItem,
} from './schema';

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
        // 1. Create Goods Receipt
        const grId = await db.goods_receipts.add({
          ...gr,
          received_date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          sync_status: 'pending',
        } as GoodsReceipt);

        // 2. Create Items & Update Stock
        for (const item of items) {
          // Save GR Item
          await db.goods_receipt_items.add({
            ...item,
            gr_id: grId,
            created_at: new Date(),
            updated_at: new Date(),
            sync_status: 'pending',
          } as GoodsReceiptItem);

          // Update Stock (Add new batch)
          if (item.quantity_received > 0 && item.condition === 'good') {
            // Fetch PO Item to get unit details and price
            const poItem = await db.purchase_order_items.get(item.po_item_id);

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
                purchase_order_item_id: item.po_item_id,
                purchase_price: poItem.unit_price / factor,
                created_at: new Date(),
                updated_at: new Date(),
                sync_status: 'pending',
              } as ProductStock);

              // Update PO Item quantity_received
              await db.purchase_order_items.update(item.po_item_id, {
                quantity_received: (poItem.quantity_received || 0) + item.quantity_received,
                updated_at: new Date(),
                sync_status: 'pending',
              });
            }
          }
        }

        // 3. Update PO Status
        const poItems = await db.purchase_order_items.where('po_id').equals(gr.po_id).toArray();
        const allReceived = poItems.every(
          (i: PurchaseOrderItem) => (i.quantity_received || 0) >= i.quantity_ordered,
        );
        const someReceived = poItems.some((i: PurchaseOrderItem) => (i.quantity_received || 0) > 0);

        let newStatus: PurchaseOrder['status'] = 'sent';
        if (allReceived) newStatus = 'received';
        else if (someReceived) newStatus = 'partial_received';

        await db.purchase_orders.update(gr.po_id, {
          status: newStatus,
          updated_at: new Date(),
          sync_status: 'pending',
        });

        return grId;
      },
    );
  },
};
