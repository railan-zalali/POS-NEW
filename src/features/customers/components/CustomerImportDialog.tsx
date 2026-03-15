import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExcelImport, ColumnMap } from '@/components/common/ExcelImport';
import { customerRepository } from '@/lib/db/customerRepository';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/db/schema';

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const customerColumnMapping: ColumnMap[] = [
  { excelColumn: 'NIK', dbField: 'nik', required: false },
  { excelColumn: 'Nama', dbField: 'name', required: true },
  { excelColumn: 'Telepon', dbField: 'phone', required: false },
  { excelColumn: 'Email', dbField: 'email', required: false },
  { excelColumn: 'Alamat', dbField: 'address', required: false },
  { excelColumn: 'Desa', dbField: 'village', required: false },
  { excelColumn: 'Kecamatan', dbField: 'district', required: false },
  { excelColumn: 'Kabupaten', dbField: 'regency', required: false },
  { excelColumn: 'Provinsi', dbField: 'province', required: false },
];

export function CustomerImportDialog({ open, onOpenChange, onSuccess }: CustomerImportDialogProps) {
  const { toast } = useToast();

  const handleImport = async (data: Record<string, unknown>[]) => {
    try {
      const customersToImport = data.map((row) => ({
        ...row,
        code: `CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Generate simple code Temp
        credit_limit: 0,
        outstanding_credit: 0,
        loyalty_points: 0,
        is_active: true,
      })) as Omit<Customer, 'id'>[];

      // Use Dexie bulkAdd for better performance if possible, but our repo just has create
      // For now, iterate:
      await Promise.all(customersToImport.map((c) => customerRepository.create(c)));

      toast({
        title: 'Import Berhasil',
        description: `${customersToImport.length} pelanggan berhasil diimpor.`,
      });
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Terjadi kesalahan saat mengimpor data';
      toast({
        title: 'Gagal Import',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const validateRow = (row: Record<string, unknown>) => {
    const errors: Record<string, string> = {};
    const email = row.email as string | undefined;
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Format email tidak valid';
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Data Pelanggan</DialogTitle>
        </DialogHeader>

        <ExcelImport
          columnMapping={customerColumnMapping}
          onImport={handleImport}
          validateRow={validateRow}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
