import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePOSStore } from '../store/posStore';
import { useToast } from '@/hooks/use-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '@/lib/db/productRepository';
import { categoryRepository } from '@/lib/db/categoryRepository';
import { db } from '@/lib/db/dexie';
import { ProductCatalog } from '../components/ProductCatalog';
import { CartPanel } from '../components/CartPanel';
import { UnitSelectionDialog } from '../components/UnitSelectionDialog';
import { PaymentDialog } from '../components/PaymentDialog';
import type { Product, ProductUnit } from '@/lib/db/schema';

export default function POSPage() {
  const { user } = useAuthStore();
  const { cart, addItem, resetTransaction } = usePOSStore();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Announce important events for screen readers
  const announce = (message: string) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(''), 3000);
  };

  // Fetch data
  const products = useLiveQuery(() => productRepository.getAll()) || [];
  const categories = useLiveQuery(() => categoryRepository.getAll()) || [];
  const allUnits = useLiveQuery(() => db.product_units.toArray()) || [];

  const handleProductClick = async (product: Product) => {
    const units = allUnits.filter((u) => u.product_id === product.id);

    if (units.length === 0) {
      toast({
        title: 'Error',
        description: 'Produk ini tidak memiliki satuan harga.',
        variant: 'destructive',
      });
      announce(`Error: ${product.name} tidak memiliki satuan harga`);
      return;
    }

    if (units.length === 1) {
      addItem(product, units[0]);
      announce(`${product.name} ditambahkan ke keranjang`);
    } else {
      setSelectedProduct(product);
      setProductUnits(units);
      setIsUnitDialogOpen(true);
      announce(`${product.name} - pilih satuan harga`);
    }
  };

  const handleUnitSelect = (unit: ProductUnit) => {
    if (selectedProduct) {
      addItem(selectedProduct, unit);
      setIsUnitDialogOpen(false);
      announce(`Satuan ${unit.unit_name} dipilih untuk ${selectedProduct.name}`);
    }
  };

  const handlePaymentClick = useCallback(() => {
    if (cart.length === 0) {
      toast({
        title: 'Keranjang Kosong',
        description: 'Tambahkan produk sebelum melakukan pembayaran.',
        variant: 'destructive',
      });
      announce('Keranjang kosong - tambahkan produk terlebih dahulu');
      return;
    }
    setIsPaymentDialogOpen(true);
    announce('Dialog pembayaran dibuka');
  }, [cart.length, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Focus Search
      if (e.key === 'F1') {
        e.preventDefault();
        document.getElementById('product-search')?.focus();
      }
      // F2: Focus Bayar Amount
      if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('amount-input')?.focus();
      }
      // F4: Reset Order
      if (e.key === 'F4') {
        e.preventDefault();
        if (confirm('Reset transaksi saat ini?')) {
          resetTransaction();
        }
      }
      // F5: Bayar
      if (e.key === 'F5') {
        e.preventDefault();
        handlePaymentClick();
      }
      // F6: Customer Search
      if (e.key === 'F6') {
        e.preventDefault();
        document.getElementById('customer-selector')?.click();
      }
      // F7: Drafts
      if (e.key === 'F7') {
        e.preventDefault();
        document.getElementById('draft-panel-trigger')?.click();
      }
      // F8: Save Draft
      if (e.key === 'F8') {
        e.preventDefault();
        document.getElementById('save-draft-trigger')?.click();
      }
      // ESC: Close Dialogs
      if (e.key === 'Escape') {
        setIsUnitDialogOpen(false);
        setIsPaymentDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePaymentClick, resetTransaction]);

  return (
    <>
      {/* ARIA Live Region for screen reader announcements */}
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div
        className="flex h-[calc(100vh-4rem)] flex-col gap-4 md:flex-row p-4 overflow-hidden bg-muted/30"
        role="application"
        aria-label="Point of Sale - Katalog produk dan panel keranjang"
      >
        {/* LEFT PANEL: PRODUCT CATALOG */}
        <ProductCatalog
          products={products}
          categories={categories}
          allUnits={allUnits}
          search={search}
          onSearchChange={setSearch}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onProductClick={handleProductClick}
        />

        {/* RIGHT PANEL: CART & CHECKOUT */}
        <CartPanel user={user} onPaymentOpen={handlePaymentClick} />

        <UnitSelectionDialog
          open={isUnitDialogOpen}
          onOpenChange={setIsUnitDialogOpen}
          product={selectedProduct}
          units={productUnits}
          onSelect={handleUnitSelect}
        />

        <PaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} />
      </div>
    </>
  );
}
