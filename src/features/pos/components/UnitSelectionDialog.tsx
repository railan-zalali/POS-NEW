import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import type { Product, ProductUnit } from '@/lib/db/schema';

interface UnitSelectionDialogProps {
  product: Product | null;
  units: ProductUnit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (unit: ProductUnit) => void;
}

export function UnitSelectionDialog({
  product,
  units,
  open,
  onOpenChange,
  onSelect,
}: UnitSelectionDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Pilih Satuan - {product.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {units.map((unit) => (
            <Card
              key={unit.id}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex justify-between items-center"
              onClick={() => {
                onSelect(unit);
                onOpenChange(false);
              }}
            >
              <div>
                <p className="font-semibold">{unit.unit_name}</p>
                {unit.conversion_factor > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Isi: {unit.conversion_factor}{' '}
                    {units.find((u) => u.is_base_unit)?.unit_name || 'Base'}
                  </p>
                )}
              </div>
              <p className="font-bold text-primary">
                Rp {unit.selling_price.toLocaleString('id-ID')}
              </p>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
