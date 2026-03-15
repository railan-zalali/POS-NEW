import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '@/lib/db/productRepository';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/lib/db/schema';

interface ProductSelectionPanelProps {
  onSelect: (products: Product[]) => void;
  selectedIds: string[];
}

export function ProductSelectionPanel({ onSelect, selectedIds }: ProductSelectionPanelProps) {
  const [search, setSearch] = useState('');

  const products = useLiveQuery(() => productRepository.getAll()) || [];

  // TODO: Sort by lowest stock (need to fetch stock counts)
  // For now simple list

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggle = (product: Product, checked: boolean) => {
    if (checked) {
      // Find all currently selected products + this new one
      const currentSelected = products.filter((p) => selectedIds.includes(p.id!));
      onSelect([...currentSelected, product]);
    } else {
      const currentSelected = products.filter(
        (p) => selectedIds.includes(p.id!) && p.id !== product.id,
      );
      onSelect(currentSelected);
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md"
          >
            <Checkbox
              id={`prod-${product.id}`}
              checked={selectedIds.includes(product.id!)}
              onCheckedChange={(checked) => handleToggle(product, checked as boolean)}
            />
            <div className="flex-1 grid gap-1">
              <label
                htmlFor={`prod-${product.id}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {product.name}
              </label>
              <p className="text-xs text-muted-foreground">{product.code}</p>
            </div>
            {/* Placeholder for stock status */}
            <Badge variant="outline" className="text-[10px]">
              Stok: -
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
