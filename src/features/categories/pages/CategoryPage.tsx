import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { categoryRepository } from '@/lib/db/categoryRepository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CategoryFormDialog } from '../components/CategoryFormDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, FolderTree } from 'lucide-react';
import type { Category } from '@/lib/db/schema';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CategoryPage() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const categories = useLiveQuery(() => categoryRepository.getAll()) || [];

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(search.toLowerCase()) ||
      category.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await categoryRepository.delete(deleteId);
      toast({ title: 'Berhasil', description: 'Kategori berhasil dihapus' });
    } catch (error: unknown) {
      toast({
        title: 'Gagal',
        description: error instanceof Error ? error.message : 'Gagal menghapus kategori',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getParentName = (parentId: string | null | undefined) => {
    if (!parentId) return '-';
    const parent = categories.find((c) => c.id === parentId);
    return parent ? parent.name : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Kategori Produk</h1>
          <p className="text-muted-foreground">
            Kelola kategori untuk pengelompokan produk yang lebih baik
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Daftar Kategori</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari kategori..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Kode</TableHead>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead>Induk</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Tidak ada kategori ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderTree className="h-4 w-4 text-muted-foreground" />
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell>{getParentName(category.parent_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full border"
                            style={{ backgroundColor: category.color || '#2D6A4F' }}
                          />
                          <span className="text-xs text-muted-foreground">{category.color}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCategory(category);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(category.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={editingCategory}
        categories={categories}
        onSuccess={() => {}}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Kategori akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
