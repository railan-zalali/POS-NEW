import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePOSStore } from '../store/posStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, CreditCard, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '@/lib/db/productRepository';
import { categoryRepository } from '@/lib/db/categoryRepository';
import { ProductCard } from '../components/ProductCard';
import { UnitSelectionDialog } from '../components/UnitSelectionDialog';
import { CartItemRow } from '../components/CartItemRow';
import { CustomerSelector } from '../components/CustomerSelector';
import { CustomerHistoryPanel } from '../components/CustomerHistoryPanel';
import { DraftTransactionPanel } from '../components/DraftTransactionPanel';
import { PaymentDialog } from '../components/PaymentDialog';
import type { Product, ProductUnit } from '@/lib/db/schema';

export default function POSPage() {
  const { user } = useAuthStore();
  const { cart, getTotal, getChange, paid_amount, setPaidAmount, resetTransaction, addItem } =
    usePOSStore();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // Fetch data
  const products = useLiveQuery(() => productRepository.getAll()) || [];
  const categories = useLiveQuery(() => categoryRepository.getAll()) || [];
  const allUnits =
    useLiveQuery(() => import('@/lib/db/dexie').then((m) => m.db.product_units.toArray())) || [];

  // Filtering
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory && p.is_active;
  });

  const total = getTotal();
  const change = getChange();

  // Handlers
  const handleProductClick = async (product: Product) => {
    const units = allUnits.filter((u) => u.product_id === product.id);

    if (units.length === 0) {
      toast({
        title: 'Error',
        description: 'Produk ini tidak memiliki satuan harga.',
        variant: 'destructive',
      });
      return;
    }

    if (units.length === 1) {
      addItem(product, units[0]);
      toast({
        title: 'Ditambahkan',
        description: `${product.name} ditambahkan ke keranjang.`,
      });
    } else {
      setSelectedProduct(product);
      setProductUnits(units);
      setIsUnitDialogOpen(true);
    }
  };

  const handleUnitSelect = (unit: ProductUnit) => {
    if (selectedProduct) {
      addItem(selectedProduct, unit);
      toast({
        title: 'Ditambahkan',
        description: `${selectedProduct.name} (${unit.unit_name}) ditambahkan.`,
      });
    }
  };

  const handlePaymentClick = () => {
    if (cart.length === 0) {
      toast({
        title: 'Keranjang Kosong',
        description: 'Tambahkan produk sebelum melakukan pembayaran.',
        variant: 'destructive',
      });
      return;
    }
    setIsPaymentDialogOpen(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        document.getElementById('product-search')?.focus();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('amount-input')?.focus();
      }
      if (e.key === 'F5') {
        e.preventDefault();
        handlePaymentClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 md:flex-row p-4 overflow-hidden">
      {/* LEFT PANEL: PRODUCT CATALOG */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden rounded-lg border bg-background p-4 shadow-sm">
        {/* Header Search & Filter */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="product-search"
                placeholder="Cari produk (F1)..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-[50%] no-scrollbar">
              <Badge
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedCategory('all')}
              >
                Semua
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedCategory(cat.id!)}
                  style={
                    selectedCategory === cat.id && cat.color ? { backgroundColor: cat.color } : {}
                  }
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid flex-1 grid-cols-2 content-start gap-4 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-1">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-40 text-muted-foreground">
              <p>Produk tidak ditemukan</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                units={allUnits.filter((u) => u.product_id === product.id)}
                onClick={() => handleProductClick(product)}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CART & CHECKOUT */}
      <div className="flex w-full flex-col rounded-lg border bg-background shadow-sm md:w-[400px]">
        {/* Customer & Info */}
        <div className="border-b p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
            </span>
            <span className="text-sm font-medium">{user?.username}</span>
          </div>
          <CustomerSelector />
          <DraftTransactionPanel />
        </div>

        {/* Customer History Accordion */}
        <CustomerHistoryPanel />

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="mb-2 h-12 w-12 opacity-20" />
              <p>Keranjang kosong</p>
            </div>
          ) : (
            <div className="space-y-1">
              {cart.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Totals & Payment */}
        <div className="border-t bg-muted/10 p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>
            {/* Discount summary logic could be improved if global discount is used */}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold">Rp</span>
              <Input
                id="amount-input"
                type="number"
                className="pl-10 text-right font-bold text-lg"
                placeholder="0"
                value={paid_amount || ''}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setPaidAmount(total)}
              >
                Uang Pas
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setPaidAmount(50000)}
              >
                50k
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setPaidAmount(100000)}
              >
                100k
              </Button>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>Kembalian</span>
              <span className={change < 0 ? 'text-destructive' : 'text-green-600'}>
                Rp {change.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={resetTransaction}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handlePaymentClick}>
              <CreditCard className="mr-2 h-4 w-4" />
              Bayar (F5)
            </Button>
          </div>
        </div>
      </div>

      <UnitSelectionDialog
        open={isUnitDialogOpen}
        onOpenChange={setIsUnitDialogOpen}
        product={selectedProduct}
        units={productUnits}
        onSelect={handleUnitSelect}
      />

      <PaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} />
    </div>
  );
}
