// path: apps/web/src/modules/pay/pages/enterprise/BatchImportPage.tsx
// Bazari Pay - Batch Import Page (PROMPT-06)

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';

interface CSVRow {
  receiver_handle: string;
  receiver_wallet?: string;
  value: string;
  currency: string;
  period: string;
  payment_day: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ValidationResult {
  totalRows: number;
  validRows: number;
  errors: ValidationError[];
  preview: CSVRow[];
}

interface ImportResult {
  success: boolean;
  batchId: string;
  created: number;
  failed: number;
  errors?: Array<{ row: string; error: string }>;
}

export function BatchImportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company');

  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [preview, setPreview] = useState<CSVRow[] | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setResult(null);
    setErrors([]);

    const text = await f.text();
    setCsvContent(text);

    // Parse preview
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 1) {
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const rows: CSVRow[] = [];

      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        rows.push(row as CSVRow);
      }

      setPreview(rows);
    }
  }, []);

  const handleValidate = async () => {
    if (!csvContent || !companyId) return;

    setValidating(true);
    setErrors([]);

    try {
      const response = await apiHelpers.post<ValidationResult>('/api/pay/batch/validate', {
        csv: csvContent,
        companyId,
      });

      if (response.errors.length > 0) {
        setErrors(response.errors);
        toast.error(`Erros encontrados: ${response.errors.length} erros no arquivo CSV`);
      } else {
        toast.success(`Validação OK: ${response.validRows} linhas prontas para importar`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro na validação');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!csvContent || !companyId) return;

    setImporting(true);
    setErrors([]);

    try {
      const response = await apiHelpers.post<ImportResult>('/api/pay/batch', {
        csv: csvContent,
        companyId,
      });

      setResult(response);

      if (response.success && response.failed === 0) {
        toast.success(`Importação concluída: ${response.created} contratos criados`);
      } else if (response.success && response.failed > 0) {
        toast.error(`Importação com erros: ${response.created} criados, ${response.failed} com erro`);
      }
    } catch (error: any) {
      if (error.errors) {
        setErrors(error.errors);
      }
      toast.error(error instanceof Error ? error.message : 'Erro na importação');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/pay/batch/template', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bazari-pay-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erro ao baixar template');
    }
  };

  if (!companyId) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Empresa não selecionada</AlertTitle>
          <AlertDescription>
            Selecione uma empresa para importar contratos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar Contratos via CSV</h1>
        <p className="text-muted-foreground">
          Faça upload de um arquivo CSV para criar múltiplos contratos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivo</CardTitle>
          <CardDescription>
            Use o template CSV para garantir o formato correto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template CSV
            </Button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {file ? file.name : 'Clique para selecionar arquivo CSV'}
              </p>
              <p className="text-sm text-muted-foreground">
                ou arraste e solte aqui
              </p>
            </label>
          </div>

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Preview ({preview.length} linhas)</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Handle</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Dia</TableHead>
                      <TableHead>Início</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.receiver_handle || row.receiver_wallet?.slice(0, 10)}...</TableCell>
                        <TableCell>{row.value} {row.currency}</TableCell>
                        <TableCell>{row.period}</TableCell>
                        <TableCell>{row.payment_day}</TableCell>
                        <TableCell>{row.start_date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erros encontrados ({errors.length})</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2 max-h-40 overflow-y-auto">
                  {errors.slice(0, 20).map((err, i) => (
                    <li key={i}>
                      Linha {err.row}: <strong>{err.field}</strong> - {err.message}
                    </li>
                  ))}
                  {errors.length > 20 && (
                    <li>... e mais {errors.length - 20} erros</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {result && result.success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Importação Concluída</AlertTitle>
              <AlertDescription>
                <p>{result.created} contratos criados com sucesso.</p>
                {result.failed > 0 && (
                  <p className="text-destructive">{result.failed} contratos falharam.</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button variant="outline" onClick={handleValidate} disabled={!file || validating}>
            {validating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Validar
          </Button>
          <Button onClick={handleImport} disabled={!file || importing || errors.length > 0}>
            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar {preview?.length ? `(${preview.length}+ contratos)` : ''}
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
