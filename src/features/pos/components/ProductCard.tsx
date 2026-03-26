import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import type { Product, ProductUnit } from '@/lib/db/schema';

interface ProductCardProps {
  product: Product;
  units: ProductUnit[];
  onClick: () => void;
}

export function ProductCard({ product, units, onClick }: ProductCardProps) {
  // Find base unit or first unit for display price
  const displayUnit = units.find((u) => u.is_base_unit) || units[0];
  const price = displayUnit?.selling_price || 0;

  // Calculate total stock (simplified for now, ideally sum of stocks per unit normalized)
  // For UI display we might just show "Available" or fetch stock count

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary hover:shadow-md flex flex-col h-full"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Pilih produk ${product.name}, kode ${product.code}, harga Rp ${price.toLocaleString('id-ID')} per ${displayUnit?.unit_name || 'satuan'}`}
    >
      <div className="aspect-square w-full bg-muted/20 relative overflow-hidden rounded-t-lg">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="h-12 w-12 opacity-20" />
          </div>
        )}
        {!product.is_active && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Badge variant="destructive">Non-Aktif</Badge>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold line-clamp-2 text-sm leading-tight mb-1" title={product.name}>
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{product.code}</p>

        <div className="mt-auto">
          <p className="font-bold text-primary">
            Rp {price.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              /{displayUnit?.unit_name}
            </span>
          </p>
          {units.length > 1 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {units.map((u) => (
                <Badge key={u.id} variant="secondary" className="text-[10px] px-1 h-4">
                  {u.unit_name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
