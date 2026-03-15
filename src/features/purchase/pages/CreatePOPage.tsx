import { useState } from 'react';
import { ProductSelectionPanel } from '../components/ProductSelectionPanel';
import { PurchaseOrderForm } from '../components/PurchaseOrderForm';
import { useToast } from '@/hooks/use-toast';
import { purchaseOrderRepository } from '@/lib/db/purchaseOrderRepository';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/lib/db/schema';

export default function CreatePOPage() {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleSubmit = async (items: any[]) => {
    try {
      // Group by supplier
      const bySupplier: Record<string, any[]> = {};
      items.forEach((item) => {
        if (!bySupplier[item.supplier_id]) bySupplier[item.supplier_id] = [];
        bySupplier[item.supplier_id].push(item);
      });

      // Create PO for each supplier
      const promises = Object.entries(bySupplier).map(async ([supplierId, supplierItems]) => {
        const totalAmount = supplierItems.reduce((sum, i) => sum + i.subtotal, 0);
        const poNumber = `PO-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 10000)}`;

        await purchaseOrderRepository.create(
          {
            po_number: poNumber,
            supplier_id: supplierId,
            ordered_by: user?.id || 'unknown',
            order_date: new Date(),
            status: 'draft',
            total_amount: totalAmount,
            notes: '',
          },
          supplierItems.map((i) => ({
            product_id: i.product_id,
            product_unit_id: i.unit_id,
            quantity_ordered: i.quantity,
            quantity_received: 0,
            unit_price: i.unit_price,
            subtotal: i.subtotal,
            notes: '',
          })),
        );
      });

      await Promise.all(promises);

      toast({
        title: 'Berhasil',
        description: `${Object.keys(bySupplier).length} Purchase Order berhasil dibuat.`,
      });

      navigate('/purchase'); // Redirect to PO list
    } catch (error) {
      console.error(error);
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat membuat PO.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Buat Purchase Order Baru</h1>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Product Selection */}
        <div className="w-1/3 flex flex-col">
          <h2 className="text-sm font-semibold mb-2">Pilih Produk</h2>
          <ProductSelectionPanel
            onSelect={setSelectedProducts}
            selectedIds={selectedProducts.map((p) => p.id!)}
          />
        </div>

        {/* Right: PO Form */}
        <div className="flex-1 flex flex-col border rounded-md bg-background">
          <h2 className="text-sm font-semibold p-3 border-b bg-muted/20">Detail Pesanan</h2>
          <PurchaseOrderForm selectedProducts={selectedProducts} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
