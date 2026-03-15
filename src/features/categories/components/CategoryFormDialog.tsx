import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoryRepository } from '@/lib/db/categoryRepository';
import type { Category } from '@/lib/db/schema';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  code: z.string().min(1, 'Kode kategori wajib diisi'),
  description: z.string().optional(),
  parent_id: z.string().optional().nullable(),
  color: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  category?: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: Category[]; // For parent selection
}

export function CategoryFormDialog({
  category,
  open,
  onOpenChange,
  onSuccess,
  categories,
}: CategoryFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      parent_id: null,
      color: '#2D6A4F',
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        code: category.code,
        description: category.description || '',
        parent_id: category.parent_id || null,
        color: category.color || '#2D6A4F',
      });
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
        parent_id: null,
        color: '#2D6A4F',
      });
    }
  }, [category, form, open]);

  const onSubmit = async (data: CategoryFormValues) => {
    setIsLoading(true);
    try {
      // Fix parent_id: convert null to undefined for Dexie optional type
      const categoryData = {
        ...data,
        parent_id: data.parent_id === null ? undefined : data.parent_id,
      };

      if (category?.id) {
        await categoryRepository.update(category.id, categoryData);
        toast({ title: 'Berhasil', description: 'Kategori berhasil diperbarui' });
      } else {
        await categoryRepository.create(categoryData);
        toast({ title: 'Berhasil', description: 'Kategori berhasil dibuat' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (_error) {
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan kategori',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Kategori' : 'Tambah Kategori Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Kode Kategori</Label>
            <Input id="code" {...form.register('code')} placeholder="Ex: PUPUK" />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nama Kategori</Label>
            <Input id="name" {...form.register('name')} placeholder="Ex: Pupuk Kimia" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent_id">Induk Kategori (Opsional)</Label>
            <Select
              onValueChange={(value) => form.setValue('parent_id', value === 'root' ? null : value)}
              defaultValue={category?.parent_id || 'root'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih induk kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">-- Tidak Ada (Root) --</SelectItem>
                {categories
                  .filter((c) => c.id !== category?.id) // Prevent self-parenting
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id || ''}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Deskripsi singkat kategori..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Warna Label</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                className="h-10 w-20 p-1"
                {...form.register('color')}
              />
              <Input
                value={form.watch('color')}
                onChange={(e) => form.setValue('color', e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
