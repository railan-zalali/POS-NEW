import { useState, useEffect } from 'react';
import { purchaseOrderRepository } from '@/lib/db/purchaseOrderRepository';
import { goodsReceiptRepository } from '@/lib/db/goodsReceiptRepository';
import { productRepository } from '@/lib/db/productRepository';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/common/ImageUpload/ImageUpload';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/db/schema';

export default function GoodsReceiptPage() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<
    (PurchaseOrderItem & { productName: string; unitName: string })[]
  >([]);
  const [receiptData, setReceiptData] = useState({
    received_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    proof_image: null as Blob | null,
  });
  const [receivedItems, setReceivedItems] = useState<
    Record<
      string,
      {
        quantity: number;
        batch_number: string;
        expire_date: string;
        condition: 'good' | 'damaged' | 'rejected';
      }
    >
  >({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (poId) {
      const fetchData = async () => {
        const poData = await purchaseOrderRepository.getById(poId);
        if (poData) {
          setPo(poData);
          const poItems = await purchaseOrderRepository.getItemsByPoId(poId);

          // Enrich items
          const enrichedItems = await Promise.all(
            poItems.map(async (item) => {
              const product = await productRepository.getById(item.product_id);
              const units = await productRepository.getUnitsByProductId(item.product_id);
              const unit = units.find((u) => u.id === item.product_unit_id);
              return {
                ...item,
                productName: product?.name || 'Unknown',
                unitName: unit?.unit_name || 'Unknown',
              };
            }),
          );

          setItems(enrichedItems);

          // Initialize received items state
          const initialReceived: any = {};
          enrichedItems.forEach((item) => {
            initialReceived[item.id!] = {
              quantity: item.quantity_ordered - (item.quantity_received || 0),
              batch_number: '',
              expire_date: '',
              condition: 'good',
            };
          });
          setReceivedItems(initialReceived);
        }
      };
      fetchData();
    }
  }, [poId]);

  const handleItemChange = (itemId: string, field: string, value: any) => {
    setReceivedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!po) return;
    setIsLoading(true);

    try {
      const grNumber = `GR-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 10000)}`;

      // Prepare items
      const grItems = items
        .map((item) => {
          const received = receivedItems[item.id!];
          if (received.quantity <= 0) return null;

          return {
            po_item_id: item.id!,
            product_id: item.product_id,
            quantity_received: received.quantity,
            batch_number: received.batch_number || null,
            expire_date: received.expire_date ? new Date(received.expire_date) : null,
            condition: received.condition,
            notes: '',
          };
        })
        .filter(Boolean) as any[];

      if (grItems.length === 0) {
        toast({
          title: 'Error',
          description: 'Tidak ada barang yang diterima (Qty 0).',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      await goodsReceiptRepository.create(
        {
          gr_number: grNumber,
          po_id: po.id!,
          received_by: 'current-user-id', // Replace with actual user ID
          received_date: new Date(receiptData.received_date),
          status: 'complete', // Or partial logic handled in repo
          notes: receiptData.notes,
          proof_image_local: receiptData.proof_image,
          proof_image_url: null,
        },
        grItems,
      );

      toast({
        title: 'Berhasil',
        description: 'Penerimaan barang berhasil disimpan.',
      });

      navigate('/purchase');
    } catch (error) {
      console.error(error);
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan GR.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!po) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchase')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Terima Barang (GR)</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/purchase')}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Simpan Penerimaan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden h-full">
        {/* Left: Receipt Info */}
        <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info Penerimaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">No. PO</label>
                <Input value={po.po_number} disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Terima</label>
                <Input
                  type="date"
                  value={receiptData.received_date}
                  onChange={(e) =>
                    setReceiptData({ ...receiptData, received_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bukti Foto / Surat Jalan</label>
                <ImageUpload
                  value={receiptData.proof_image}
                  onChange={(file) => setReceiptData({ ...receiptData, proof_image: file })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Catatan</label>
                <Input
                  value={receiptData.notes}
                  onChange={(e) => setReceiptData({ ...receiptData, notes: e.target.value })}
                  placeholder="Catatan tambahan..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Items List */}
        <div className="md:col-span-2 flex flex-col overflow-hidden border rounded-md bg-background">
          <div className="flex-1 overflow-y-auto p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Produk</TableHead>
                  <TableHead>Sisa Pesanan</TableHead>
                  <TableHead className="w-[100px]">Diterima</TableHead>
                  <TableHead className="w-[120px]">Batch No.</TableHead>
                  <TableHead className="w-[140px]">Expired</TableHead>
                  <TableHead className="w-[120px]">Kondisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const received = receivedItems[item.id!] || {};
                  const remaining = item.quantity_ordered - (item.quantity_received || 0);

                  if (remaining <= 0) return null; // Hide fully received items? Or show as disabled?

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">{item.unitName}</div>
                      </TableCell>
                      <TableCell>{remaining}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 w-20"
                          value={received.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id!, 'quantity', Number(e.target.value))
                          }
                          max={remaining}
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          placeholder="Batch"
                          value={received.batch_number}
                          onChange={(e) =>
                            handleItemChange(item.id!, 'batch_number', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          className="h-8"
                          value={received.expire_date}
                          onChange={(e) =>
                            handleItemChange(item.id!, 'expire_date', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={received.condition}
                          onValueChange={(val) => handleItemChange(item.id!, 'condition', val)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Baik</SelectItem>
                            <SelectItem value="damaged">Rusak</SelectItem>
                            <SelectItem value="rejected">Ditolak</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
