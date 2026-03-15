import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { userRepository } from '@/lib/db/userRepository';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, User, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { User as UserType } from '@/lib/db/schema';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    role_id: '',
    pin: '',
    is_active: true,
  });

  const { toast } = useToast();

  const users = useLiveQuery(() => userRepository.getAll()) || [];
  const roles = useLiveQuery(() => userRepository.getAllRoles()) || [];

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      role_id: user.role_id,
      pin: user.pin || '',
      is_active: user.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      full_name: '',
      role_id: '',
      pin: '',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.username || !formData.full_name || !formData.role_id) {
      toast({
        title: 'Validasi Gagal',
        description: 'Mohon lengkapi data wajib.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingUser) {
        await userRepository.update(editingUser.id!, formData);
        toast({ title: 'Berhasil', description: 'Pengguna berhasil diperbarui.' });
      } else {
        await userRepository.create(formData);
        toast({ title: 'Berhasil', description: 'Pengguna baru berhasil dibuat.' });
      }
      setIsDialogOpen(false);
    } catch (_error) {
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan data.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      await userRepository.delete(id);
      toast({ title: 'Berhasil', description: 'Pengguna berhasil dihapus.' });
    }
  };

  const getRoleName = (roleId: string) => {
    return roles.find((r) => r.id === roleId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Manajemen Pengguna</h1>
          <p className="text-muted-foreground">Kelola akses dan akun staf toko</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">Daftar Pengguna</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama atau username..."
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
                  <TableHead>Username</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terakhir Login</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {user.username}
                    </TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        {getRoleName(user.role_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Aktif' : 'Non-Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login
                        ? format(user.last_login, 'dd MMM yyyy HH:mm', { locale: id })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(user.id!)}
                          disabled={user.username === 'admin'} // Protect admin
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="col-span-3"
                disabled={!!editingUser} // Username immutable usually
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nama
              </Label>
              <Input
                id="name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={formData.role_id}
                onValueChange={(val) => setFormData({ ...formData, role_id: val })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id!}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pin" className="text-right">
                PIN
              </Label>
              <Input
                id="pin"
                type="password"
                maxLength={6}
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                className="col-span-3"
                placeholder="6 digit angka"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSubmit}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
