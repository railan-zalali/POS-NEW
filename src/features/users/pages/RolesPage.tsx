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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Role, PermissionKey } from '@/lib/db/schema';

// Group permissions for better UI
const PERMISSION_GROUPS: Record<string, PermissionKey[]> = {
  'POS (Kasir)': ['pos:read', 'pos:create', 'pos:edit', 'pos:delete', 'pos:void'],
  'Pembelian (PO)': ['purchase:read', 'purchase:create', 'purchase:edit', 'purchase:approve'],
  Produk: ['product:read', 'product:create', 'product:edit', 'product:delete'],
  Pelanggan: ['customer:read', 'customer:create', 'customer:edit'],
  Supplier: ['supplier:read', 'supplier:create', 'supplier:edit'],
  Stok: ['stock:read', 'stock:adjust'],
  Laporan: ['report:view', 'report:export'],
  Pengguna: ['user:read', 'user:create', 'user:edit', 'user:delete'],
  Pengaturan: ['settings:read', 'settings:edit'],
};

export default function RolesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);

  const { toast } = useToast();
  const roles = useLiveQuery(() => userRepository.getAllRoles()) || [];

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setIsDialogOpen(true);
  };

  const togglePermission = (perm: PermissionKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const toggleGroup = (groupPerms: PermissionKey[]) => {
    const allSelected = groupPerms.every((p) => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !groupPerms.includes(p)));
    } else {
      const newPerms = [...selectedPermissions];
      groupPerms.forEach((p) => {
        if (!newPerms.includes(p)) newPerms.push(p);
      });
      setSelectedPermissions(newPerms);
    }
  };

  const handleSubmit = async () => {
    if (!roleName) {
      toast({ title: 'Error', description: 'Nama role wajib diisi', variant: 'destructive' });
      return;
    }

    try {
      if (editingRole) {
        await userRepository.updateRole(editingRole.id!, {
          name: roleName,
          permissions: selectedPermissions,
        });
        toast({ title: 'Berhasil', description: 'Role berhasil diperbarui.' });
      } else {
        await userRepository.createRole({
          name: roleName,
          permissions: selectedPermissions,
        });
        toast({ title: 'Berhasil', description: 'Role baru berhasil dibuat.' });
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

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Manajemen Hak Akses</h1>
          <p className="text-muted-foreground">Atur role dan permission pengguna aplikasi</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Role</TableHead>
                  <TableHead>Jumlah Permission</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      {role.name}
                    </TableCell>
                    <TableCell>{role.permissions.length} akses</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(role)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Tambah Role Baru'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rolename" className="text-right">
                Nama Role
              </Label>
              <Input
                id="rolename"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="border rounded-md p-4 space-y-4">
              <Label>Permission</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group}`}
                        checked={perms.every((p) => selectedPermissions.includes(p))}
                        onCheckedChange={() => toggleGroup(perms)}
                      />
                      <label
                        htmlFor={`group-${group}`}
                        className="text-sm font-semibold leading-none cursor-pointer"
                      >
                        {group}
                      </label>
                    </div>
                    <div className="pl-6 space-y-1">
                      {perms.map((perm) => (
                        <div key={perm} className="flex items-center space-x-2">
                          <Checkbox
                            id={perm}
                            checked={selectedPermissions.includes(perm)}
                            onCheckedChange={() => togglePermission(perm)}
                          />
                          <label
                            htmlFor={perm}
                            className="text-xs leading-none cursor-pointer text-muted-foreground"
                          >
                            {perm.split(':')[1]}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
