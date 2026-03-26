import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  Store,
  Printer,
  Database,
  Download,
  Trash2,
  Users,
  ShieldCheck,
  Key,
  Plus,
  UserPlus,
  RefreshCcw,
  Cloud,
} from 'lucide-react';
import { userRepository } from '@/lib/db/userRepository';
import { syncEngine } from '@/lib/supabase/syncEngine';
import { seedDummyData } from '@/lib/db/dummyData';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User, Role } from '@/lib/db/schema';

export default function SettingsPage() {
  const { toast } = useToast();
  const liveSettings = useLiveQuery(() => db.app_settings.toArray());
  const settings = useMemo(() => liveSettings || [], [liveSettings]);

  // Local state for form values
  const [storeInfo, setStoreInfo] = useState({
    name: 'Toko Tani Makmur',
    address: '',
    phone: '',
    footer_text: 'Terima Kasih atas Kunjungan Anda',
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    full_name: '',
    pin: '',
    role_id: '',
    is_active: true,
  });

  // Load settings and users from DB
  useEffect(() => {
    const loadData = async () => {
      const users = await userRepository.getAll();
      const roles = await userRepository.getAllRoles();
      setAllUsers(users);
      setAllRoles(roles);
    };

    loadData();

    if (settings.length > 0) {
      const info = settings.find((s) => s.key === 'store_info')?.value as typeof storeInfo;
      if (info) setStoreInfo(info);
    }
  }, [settings]);

  const saveSettings = async (key: string, value: unknown, sectionName: string) => {
    try {
      await db.app_settings.put({
        key,
        value,
        description: `Settings for ${sectionName}`,
        updated_at: new Date(),
        sync_status: 'pending',
      });
      toast({ title: 'Berhasil', description: `Pengaturan ${sectionName} disimpan.` });
    } catch {
      toast({ title: 'Gagal', description: 'Gagal menyimpan pengaturan.', variant: 'destructive' });
    }
  };

  const handleBackup = async () => {
    try {
      // Export DB tables to JSON
      const backupData: Record<string, unknown[]> = {};

      // List all tables
      const tables = db.tables.map((table) => table.name);

      for (const table of tables) {
        backupData[table] = await db.table(table).toArray();
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_toko_tani_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Backup Berhasil', description: 'File backup telah diunduh.' });
    } catch (error) {
      toast({
        title: 'Gagal Backup',
        description:
          error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat backup.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = async () => {
    if (confirm('PERINGATAN: Semua data akan dihapus permanen! Anda yakin?')) {
      try {
        await db.delete();
        window.location.reload();
      } catch {
        toast({
          title: 'Gagal Reset',
          description: 'Gagal menghapus database.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.pin || !newUser.role_id) {
      toast({
        title: 'Gagal',
        description: 'Mohon lengkapi data pengguna.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await userRepository.create(newUser);
      toast({ title: 'Berhasil', description: 'Pengguna baru telah ditambahkan.' });
      setIsAddingUser(false);
      setNewUser({ username: '', full_name: '', pin: '', role_id: '', is_active: true });
      // Refresh list
      const users = await userRepository.getAll();
      setAllUsers(users);
    } catch {
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menambah pengguna.',
        variant: 'destructive',
      });
    }
  };

  const toggleUserStatus = async (user: User) => {
    if (!user.id) return;
    try {
      await userRepository.update(user.id, { is_active: !user.is_active });
      toast({ title: 'Berhasil', description: `Status ${user.username} diperbarui.` });
      const users = await userRepository.getAll();
      setAllUsers(users);
    } catch {
      toast({ title: 'Gagal', description: 'Gagal memperbarui status.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Pengaturan</h1>
        <p className="text-slate-500">Konfigurasi toko, manajemen akses, dan pemeliharaan data.</p>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="bg-white p-1 shadow-sm border rounded-xl h-auto flex flex-wrap gap-1">
          <TabsTrigger
            value="store"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all py-2.5 px-6"
          >
            <Store className="h-4 w-4 mr-2" /> Toko
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all py-2.5 px-6"
          >
            <Users className="h-4 w-4 mr-2" /> Pengguna
          </TabsTrigger>
          <TabsTrigger
            value="print"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all py-2.5 px-6"
          >
            <Printer className="h-4 w-4 mr-2" /> Struk
          </TabsTrigger>
          <TabsTrigger
            value="backup"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all py-2.5 px-6"
          >
            <Database className="h-4 w-4 mr-2" /> Pemeliharaan
          </TabsTrigger>
          <TabsTrigger
            value="sync"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all py-2.5 px-6"
          >
            <Cloud className="h-4 w-4 mr-2" /> Cloud Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-xl flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" /> Identitas Toko
              </CardTitle>
              <CardDescription>
                Informasi ini akan muncul pada setiap struk transaksi.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Nama Toko
                    </Label>
                    <Input
                      className="bg-slate-50 border-none shadow-none focus:ring-1"
                      value={storeInfo.name}
                      onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Nomor Telepon
                    </Label>
                    <Input
                      className="bg-slate-50 border-none shadow-none focus:ring-1"
                      value={storeInfo.phone}
                      onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Alamat Lengkap
                    </Label>
                    <Textarea
                      className="bg-slate-50 border-none shadow-none focus:ring-1 min-h-[100px]"
                      value={storeInfo.address}
                      onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="space-y-2 bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pesan Kaki (Footer Struk)
                  </Label>
                  <Input
                    className="bg-white border-none shadow-sm focus:ring-1"
                    value={storeInfo.footer_text}
                    placeholder="Contoh: Terima Kasih Atas Kunjungan Anda"
                    onChange={(e) => setStoreInfo({ ...storeInfo, footer_text: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400">
                    Kalimat penutup yang akan tercetak di bagian bawah struk.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => saveSettings('store_info', storeInfo, 'Toko')}
                  className="rounded-full px-8 shadow-lg shadow-primary/20"
                >
                  <Save className="mr-2 h-4 w-4" /> Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Keamanan & Akses
                </CardTitle>
                <CardDescription>Kelola pengguna dan hak akses aplikasi.</CardDescription>
              </div>
              <Button
                onClick={() => setIsAddingUser(!isAddingUser)}
                variant={isAddingUser ? 'ghost' : 'default'}
                className="rounded-full shadow-lg shadow-primary/10"
              >
                {isAddingUser ? (
                  <RefreshCcw className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {isAddingUser ? 'Kembali Ke Daftar' : 'Tambah Pengguna'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isAddingUser ? (
                <div className="p-8 max-w-xl mx-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Username
                      </Label>
                      <Input
                        className="bg-slate-50 border-none shadow-none"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Role / Jabatan
                      </Label>
                      <Select
                        value={newUser.role_id}
                        onValueChange={(v) => setNewUser({ ...newUser, role_id: v })}
                      >
                        <SelectTrigger className="bg-slate-50 border-none">
                          <SelectValue placeholder="Pilih Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {allRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id || ''}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Nama Lengkap
                    </Label>
                    <Input
                      className="bg-slate-50 border-none shadow-none"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      PIN Login (6 Digit)
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        type="password"
                        maxLength={6}
                        className="pl-10 bg-slate-50 border-none shadow-none"
                        value={newUser.pin}
                        onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddUser} className="w-full rounded-xl h-12">
                    <Plus className="mr-2 h-4 w-4" /> Simpan Pengguna Baru
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 border-b">
                      <tr>
                        <th className="px-6 py-4">Username</th>
                        <th className="px-6 py-4">Nama Lengkap</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 font-bold text-slate-700">{user.username}</td>
                          <td className="px-6 py-4 text-slate-500">{user.full_name}</td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                            >
                              {user.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`rounded-full h-8 text-[10px] font-bold ${user.is_active ? 'text-rose-500' : 'text-emerald-500'}`}
                              onClick={() => toggleUserStatus(user)}
                            >
                              {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="print">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-xl flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" /> Pengaturan Struk
              </CardTitle>
              <CardDescription>Konfigurasi format cetakan printer thermal.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <Printer className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium text-center px-8">
                  Aplikasi menggunakan dialog cetak standard browser. <br />
                  Support printer thermal USB/Bluetooth 58mm & 80mm.
                </p>
                <div className="mt-8 flex gap-3">
                  <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-100 text-xs font-bold text-slate-600">
                    58MM Thermal
                  </div>
                  <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-100 text-xs font-bold text-slate-600">
                    80MM Thermal
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-xl flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" /> Pemeliharaan Sistem
              </CardTitle>
              <CardDescription>Ekspor data lokal dan pembersihan database.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div
                  onClick={handleBackup}
                  className="p-8 rounded-3xl bg-emerald-50 border border-emerald-100 cursor-pointer hover:scale-[1.02] transition-transform group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Download className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">Backup Seluruh Data</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Unduh semua data transaksi, stok, dan pelanggan dalam format JSON.
                  </p>
                </div>
                <div
                  onClick={async () => {
                    if (confirm('Isi database dengan data dummy? Data yang ada akan dihapus.')) {
                      try {
                        await seedDummyData();
                        toast({ title: 'Berhasil', description: 'Data dummy telah dibuat.' });
                        window.location.reload();
                      } catch {
                        toast({
                          title: 'Gagal',
                          description: 'Gagal membuat data dummy.',
                          variant: 'destructive',
                        });
                      }
                    }
                  }}
                  className="p-8 rounded-3xl bg-blue-50 border border-blue-100 cursor-pointer hover:scale-[1.02] transition-transform group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Database className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">Generate Data Dummy</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Isi database dengan kategori, produk, dan stok contoh untuk percobaan.
                  </p>
                </div>
                <div
                  onClick={handleReset}
                  className="p-8 rounded-3xl bg-rose-50 border border-rose-100 cursor-pointer hover:scale-[1.02] transition-transform group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-rose-600 shadow-sm mb-4 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">Factory Reset</h3>
                  <p className="text-sm text-slate-500 mt-1 text-rose-600/70 font-bold italic">
                    PERINGATAN! Ini akan menghapus semua data secara permanen.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-xl flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" /> Cloud Synchronization
              </CardTitle>
              <CardDescription>
                Sinkronisasi data ke Supabase Cloud untuk backup dan multi-device.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="p-6 rounded-3xl bg-slate-50 space-y-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Status Koneksi
                    </h3>
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'px-3 py-1 rounded-full text-[10px] font-black uppercase',
                          navigator.onLine
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700',
                        )}
                      >
                        {navigator.onLine ? 'Online' : 'Offline'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {navigator.onLine
                          ? 'Terhubung ke server cloud.'
                          : 'Koneksi terputus. Data disimpan secara lokal.'}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-slate-50 space-y-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4 text-primary" /> Jalankan Sinkronisasi
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sinkronisasi otomatis berjalan setiap 60 detik. Anda dapat memicu sinkronisasi
                      manual jika diperlukan.
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          const results = await syncEngine.syncAll();
                          const failures = results.filter((result) => !result.success);

                          if (failures.length > 0) {
                            toast({
                              title: 'Sync Sebagian Gagal',
                              description: `${failures.length} tabel gagal disinkronkan.`,
                              variant: 'destructive',
                            });
                            return;
                          }

                          toast({
                            title: 'Sync Berhasil',
                            description: 'Semua data telah disinkronkan ke cloud.',
                          });
                        } catch {
                          toast({
                            title: 'Sync Gagal',
                            description: 'Gagal menyinkronkan data.',
                            variant: 'destructive',
                          });
                        }
                      }}
                      disabled={!navigator.onLine}
                      className="rounded-full w-full shadow-lg shadow-primary/20"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" /> Sinkronkan Sekarang
                    </Button>
                  </div>
                </div>

                <div className="flex-1 p-6 rounded-3xl border border-dashed border-slate-200">
                  <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-slate-400">
                    Tips Sinkronisasi
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'Pastikan koneksi internet stabil saat sinkronisasi manual.',
                      'Sinkronisasi mencakup master data, stok, transaksi, pengeluaran, piutang, retur, pengguna, dan pengaturan.',
                      'Data yang belum terkirim ditandai dengan label "Pending" di sidebar.',
                      'Data di cloud terenkripsi dan aman sebagai cadangan jika perangkat rusak.',
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 text-xs text-slate-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
