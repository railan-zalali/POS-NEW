import { useState } from 'react';
import { usePOSStore } from '../store/posStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { FileText, Save, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export function DraftTransactionPanel() {
  const { cart, customer, saveDraft, loadDraft, removeDraft, drafts, resetTransaction } =
    usePOSStore();
  const { toast } = useToast();

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSaveDraft = () => {
    if (cart.length === 0) {
      toast({
        title: 'Keranjang Kosong',
        description: 'Tidak ada item untuk disimpan.',
        variant: 'destructive',
      });
      return;
    }

    const defaultName = customer
      ? `${customer.name} - ${format(new Date(), 'HH:mm')}`
      : `Draft ${format(new Date(), 'dd/MM HH:mm')}`;

    setDraftName(defaultName);
    setIsSaveDialogOpen(true);
  };

  const confirmSaveDraft = () => {
    saveDraft(draftName);
    toast({
      title: 'Draft Disimpan',
      description: `Draft "${draftName}" berhasil disimpan.`,
    });
    setIsSaveDialogOpen(false);
    resetTransaction();
  };

  const handleLoadDraft = (draftId: string) => {
    loadDraft(draftId);
    toast({
      title: 'Draft Dimuat',
      description: 'Draft transaksi berhasil dimuat kembali.',
    });
    setIsSheetOpen(false);
  };

  const handleRemoveDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    removeDraft(draftId);
    toast({
      title: 'Draft Dihapus',
      description: 'Draft berhasil dihapus dari daftar.',
    });
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleSaveDraft}>
          <Save className="mr-2 h-4 w-4" />
          Simpan Draft
        </Button>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 relative">
              <FileText className="mr-2 h-4 w-4" />
              Buka Draft
              {drafts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {drafts.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Daftar Draft Transaksi</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 opacity-20 mb-2" />
                  <p>Tidak ada draft tersimpan.</p>
                </div>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleLoadDraft(draft.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{draft.name || 'Tanpa Nama'}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(draft.created_at), 'dd MMM HH:mm', { locale: id })}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleRemoveDraft(e, draft.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1 pt-2 border-t">
                      <span className="text-muted-foreground">{draft.items.length} Item</span>
                      <span className="font-semibold text-primary">
                        Rp{' '}
                        {draft.items
                          .reduce((sum, item) => sum + item.subtotal, 0)
                          .toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Simpan Draft Transaksi</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Nama Draft (Opsional)"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Transaksi saat ini akan disimpan dan keranjang akan dikosongkan.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={confirmSaveDraft}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
