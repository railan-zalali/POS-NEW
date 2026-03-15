import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as xlsx from 'xlsx';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, FileSpreadsheet, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export interface ColumnMap {
  excelColumn: string;
  dbField: string;
  required?: boolean;
}

export interface ExcelImportProps<T = unknown> {
  onImport: (data: T[]) => Promise<void>;
  columnMapping: ColumnMap[];
  validateRow?: (row: T) => { isValid: boolean; errors: Record<string, string> };
  templateUrl?: string; // e.g. /templates/customers.xlsx
  onClose?: () => void;
}

export function ExcelImport<T = unknown>({
  onImport,
  columnMapping,
  validateRow,
  templateUrl,
  onClose,
}: ExcelImportProps<T>) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<
    { row: T; metadata: { isValid: boolean; errors: Record<string, string> } }[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const processFile = useCallback(
    (fileToProcess: File) => {
      setIsProcessing(true);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const workbook = xlsx.read(buffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const rawData = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: '',
          });

          // Map and validate
          const mappedData = rawData.map((rawRow) => {
            const mappedRow = {} as T;
            const errors: Record<string, string> = {};

            columnMapping.forEach((col) => {
              const val = rawRow[col.excelColumn];
              (mappedRow as Record<string, unknown>)[col.dbField] = val;

              if (
                col.required &&
                (val === undefined || val === null || String(val).trim() === '')
              ) {
                errors[col.dbField] = `Kolom ${col.excelColumn} wajib diisi.`;
              }
            });

            let isValid = Object.keys(errors).length === 0;

            if (validateRow && isValid) {
              const extraValidation = validateRow(mappedRow);
              if (!extraValidation.isValid) {
                Object.assign(errors, extraValidation.errors);
                isValid = false;
              }
            }

            return { row: mappedRow as T, metadata: { isValid, errors } };
          });

          setData(mappedData);
        } catch (error) {
          console.error('Error parsing file:', error);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsArrayBuffer(fileToProcess);
    },
    [columnMapping, validateRow],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);
        processFile(selectedFile);
      }
    },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleImportAll = async () => {
    const validRows = data.filter((d) => d.metadata.isValid).map((d) => d.row);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    setImportProgress(10); // Start progress

    try {
      // Provide progress updates based on chunks if needed, but for now just call onImport
      await onImport(validRows);
      setImportProgress(100);
      if (onClose) onClose();
    } catch (error) {
      console.error('Import failed:', error);
      // Handle overall failure
    } finally {
      setIsProcessing(false);
      setImportProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    setData([]);
  };

  const { validCount, invalidCount } = data.reduce(
    (acc, cur) => {
      if (cur.metadata.isValid) acc.validCount++;
      else acc.invalidCount++;
      return acc;
    },
    { validCount: 0, invalidCount: 0 },
  );

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-slate-300 hover:border-primary/50 bg-slate-50'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-10 w-10 text-slate-400 mb-4" />
          <p className="text-sm font-medium text-slate-700 text-center">
            Drag & drop file Excel Anda di sini, atau klik untuk memilih file
          </p>
          <p className="text-xs text-slate-500 mt-2">Mendukung file .xlsx, .xls, dan .csv</p>

          {templateUrl && (
            <div className="mt-6 pt-6 border-t border-slate-200 w-full text-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation(); // prevent opening file dialog
                  window.open(templateUrl, '_blank');
                }}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Unduh Template Excel
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-sm text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={clearFile} disabled={isProcessing}>
              <XCircle className="h-5 w-5 text-slate-400 hover:text-destructive" />
            </Button>
          </div>

          {(validCount > 0 || invalidCount > 0) && (
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle2 className="w-4 h-4 mr-1" /> {validCount} Baris Valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="w-4 h-4 mr-1" /> {invalidCount} Baris Error
                </Badge>
              )}
            </div>
          )}

          {data.length > 0 && (
            <div className="border rounded-md max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    {columnMapping.map((col) => (
                      <TableHead key={col.dbField}>{col.excelColumn}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((rowWrapper, idx) => (
                    <TableRow
                      key={idx}
                      className={!rowWrapper.metadata.isValid ? 'bg-red-50/50 hover:bg-red-50' : ''}
                    >
                      <TableCell>
                        {rowWrapper.metadata.isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <div title={Object.values(rowWrapper.metadata.errors).join('\n')}>
                            <AlertCircle className="w-5 h-5 text-destructive cursor-help" />
                          </div>
                        )}
                      </TableCell>
                      {columnMapping.map((col) => (
                        <TableCell key={col.dbField}>
                          <span
                            className={
                              rowWrapper.metadata.errors[col.dbField]
                                ? 'text-destructive underline decoration-dotted underline-offset-2'
                                : ''
                            }
                            title={rowWrapper.metadata.errors[col.dbField]}
                          >
                            {String(rowWrapper.row[col.dbField as keyof T] || '')}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {isProcessing ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Memproses import...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} />
            </div>
          ) : (
            <div className="flex justify-end gap-3 pt-4 border-t">
              {onClose && (
                <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                  Batal
                </Button>
              )}
              <Button
                onClick={handleImportAll}
                disabled={validCount === 0 || isProcessing}
                className="gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                Import {validCount} Baris Valid
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
