import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save, Store, Printer, Database, Download, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const settings = useLiveQuery(() => db.app_settings.toArray()) || [];

  // Local state for form values
  const [storeInfo, setStoreInfo] = useState({
    name: 'Toko Tani Makmur',
    address: '',
    phone: '',
    footer_text: 'Terima Kasih atas Kunjungan Anda',
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [printSettings, setPrintSettings] = useState({
    paper_size: '58mm',
    show_logo: true,
    show_footer: true,
  });

  // Load settings from DB
  useEffect(() => {
    if (settings.length > 0) {
      const info = settings.find((s) => s.key === 'store_info')?.value as any;
      if (info) setStoreInfo(info);

      const print = settings.find((s) => s.key === 'print_settings')?.value as any;
      if (print) setPrintSettings(print);
    }
  }, [settings]);

  const saveSettings = async (key: string, value: any, sectionName: string) => {
    try {
      await db.app_settings.put({
        key,
        value,
        description: `Settings for ${sectionName}`,
      });
      toast({ title: 'Berhasil', description: `Pengaturan ${sectionName} disimpan.` });
    } catch (error) {
      toast({ title: 'Gagal', description: 'Gagal menyimpan pengaturan.', variant: 'destructive' });
    }
  };

  const handleBackup = async () => {
    try {
      // Export DB tables to JSON
      const backupData: any = {};

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
      console.error(error);
      toast({
        title: 'Gagal Backup',
        description: 'Terjadi kesalahan saat membuat backup.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = async () => {
    if (confirm('PERINGATAN: Semua data akan dihapus permanen! Anda yakin?')) {
      try {
        await db.delete();
        window.location.reload();
      } catch (error) {
        toast({
          title: 'Gagal Reset',
          description: 'Gagal menghapus database.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-3xl font-bold tracking-tight text-primary">Pengaturan Aplikasi</h1>

      <Tabs defaultValue="store" className="space-y-4">
        <TabsList>
          <TabsTrigger value="store" className="flex gap-2">
            <Store className="h-4 w-4" /> Info Toko
          </TabsTrigger>
          <TabsTrigger value="print" className="flex gap-2">
            <Printer className="h-4 w-4" /> Struk & Printer
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex gap-2">
            <Database className="h-4 w-4" /> Backup & Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Toko</CardTitle>
              <CardDescription>Informasi ini akan dicetak pada struk belanja.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Toko</Label>
                <Input
                  id="name"
                  value={storeInfo.name}
                  onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  value={storeInfo.address}
                  onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  value={storeInfo.phone}
                  onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="footer">Teks Footer Struk</Label>
                <Input
                  id="footer"
                  value={storeInfo.footer_text}
                  onChange={(e) => setStoreInfo({ ...storeInfo, footer_text: e.target.value })}
                />
              </div>
              <Button onClick={() => saveSettings('store_info', storeInfo, 'Toko')}>
                <Save className="mr-2 h-4 w-4" /> Simpan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="print">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Cetak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Simplified print settings */}
              <div className="p-4 border rounded bg-muted/20 text-sm text-muted-foreground">
                Pengaturan printer akan menggunakan dialog cetak bawaan browser. Pastikan ukuran
                kertas diatur sesuai printer Anda (58mm/80mm).
                <br />
                {printSettings.paper_size}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Manajemen Data</CardTitle>
              <CardDescription>Backup dan restore database lokal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto justify-start"
                  onClick={handleBackup}
                >
                  <Download className="mr-2 h-4 w-4" /> Backup Database (JSON)
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto justify-start text-destructive hover:text-destructive"
                  onClick={handleReset}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Reset Database (Factory Reset)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
