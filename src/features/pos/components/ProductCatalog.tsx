import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from './ProductCard';
import type { Product, Category, ProductUnit } from '@/lib/db/schema';

interface ProductCatalogProps {
  products: Product[];
  categories: Category[];
  allUnits: ProductUnit[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onProductClick: (product: Product) => void;
}

export function ProductCatalog({
  products,
  categories,
  allUnits,
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onProductClick,
}: ProductCatalogProps) {
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory && p.is_active;
  });

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="product-search"
              placeholder="Cari produk (F1)..."
              className="pl-8"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              aria-label="Cari produk berdasarkan nama atau kode produk"
              aria-describedby="search-instructions"
            />
            <span id="search-instructions" className="sr-only">
              Tekan F1 untuk fokus ke kotak pencarian, atau gunakan keyboard arrow untuk navigasi
              produk
            </span>
          </div>
          <div
            className="flex gap-2 overflow-x-auto pb-1 max-w-[50%] no-scrollbar"
            role="tablist"
            aria-label="Filter kategori produk"
          >
            <Badge
              role="tab"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => onCategoryChange('all')}
              aria-selected={selectedCategory === 'all'}
              aria-label="Tampilkan semua kategori"
            >
              Semua
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                role="tab"
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => onCategoryChange(cat.id!)}
                aria-selected={selectedCategory === cat.id}
                aria-label={`Filter kategori ${cat.name}`}
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

      <div
        className="grid flex-1 grid-cols-2 content-start gap-4 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-1"
        role="region"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Daftar produk"
      >
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
              onClick={() => onProductClick(product)}
            />
          ))
        )}
      </div>
    </div>
  );
}
