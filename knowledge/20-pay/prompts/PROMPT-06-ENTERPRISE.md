# Prompt 06: Escala Empresarial (CSV/API)

## Objetivo

Implementar funcionalidades para empresas de grande porte: upload de contratos em lote via CSV e API de integração com ERP/RH.

## Pré-requisitos

- Fases 1-5 implementadas

## Contexto

Empresas com milhares de funcionários precisam de formas eficientes de gerenciar pagamentos em massa. Esta fase adiciona upload CSV e API de integração.

## Entrega Esperada

### 1. Upload CSV em Lote

#### 1.1 Template CSV

```csv
receiver_handle,receiver_wallet,value,currency,period,payment_day,start_date,end_date,description,reference_type,reference_id
@joao,5GrwvaEF...,8000.00,BRL,MONTHLY,5,2025-02-01,,Salário,EMPLOYEE,EMP001
@maria,5FHneW46...,5000.00,BRL,MONTHLY,5,2025-02-01,,Salário,EMPLOYEE,EMP002
@carlos,5DAAnrj7...,6500.00,BRL,MONTHLY,10,2025-02-01,2025-12-31,Contrato temporário,CONTRACTOR,CTR003
```

#### 1.2 Endpoint de Upload

```typescript
// POST /api/pay/contracts/batch
router.post('/batch', upload.single('file'), async (req, res) => {
  const { companyId } = req.body;
  const file = req.file;

  // Validar empresa
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { payPlan: true },
  });

  if (!company) throw new NotFound('Empresa não encontrada');

  // Verificar limite do plano
  const existingCount = await prisma.payContract.count({
    where: { payerCompanyId: companyId, status: 'ACTIVE' },
  });

  const maxContracts = company.payPlan?.maxContracts || 100;
  const csvRows = await parseCSV(file.buffer);

  if (existingCount + csvRows.length > maxContracts) {
    throw new BadRequest(`Limite de ${maxContracts} contratos excedido`);
  }

  // Validar CSV
  const validation = await validateBatchCSV(csvRows, companyId);

  if (validation.errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
      validRows: validation.validRows,
    });
  }

  // Processar (async se > 100 linhas)
  if (csvRows.length > 100) {
    const batch = await prisma.payBatchImport.create({
      data: {
        companyId,
        fileName: file.originalname,
        totalRows: csvRows.length,
        status: 'PROCESSING',
        data: csvRows,
      },
    });

    // Enfileirar processamento
    await batchQueue.add('process-pay-batch', { batchId: batch.id });

    return res.json({
      success: true,
      batchId: batch.id,
      message: 'Processamento iniciado. Você será notificado ao concluir.',
    });
  }

  // Processar imediatamente (< 100 linhas)
  const results = await processBatch(csvRows, companyId, req.user.id);

  return res.json({
    success: true,
    created: results.created,
    errors: results.errors,
  });
});
```

#### 1.3 Validação do CSV

```typescript
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
  reference_type?: string;
  reference_id?: string;
}

interface ValidationResult {
  validRows: CSVRow[];
  errors: Array<{ row: number; field: string; message: string }>;
}

async function validateBatchCSV(rows: CSVRow[], companyId: string): Promise<ValidationResult> {
  const errors: ValidationResult['errors'] = [];
  const validRows: CSVRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 para considerar header e 1-indexed
    let hasError = false;

    // Validar handle ou wallet
    if (!row.receiver_handle && !row.receiver_wallet) {
      errors.push({ row: rowNum, field: 'receiver', message: 'Handle ou wallet obrigatório' });
      hasError = true;
    }

    // Validar valor
    const value = parseFloat(row.value);
    if (isNaN(value) || value <= 0) {
      errors.push({ row: rowNum, field: 'value', message: 'Valor inválido' });
      hasError = true;
    }

    // Validar moeda
    if (!['BRL', 'BZR'].includes(row.currency)) {
      errors.push({ row: rowNum, field: 'currency', message: 'Moeda deve ser BRL ou BZR' });
      hasError = true;
    }

    // Validar período
    if (!['WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(row.period)) {
      errors.push({ row: rowNum, field: 'period', message: 'Período inválido' });
      hasError = true;
    }

    // Validar dia
    const day = parseInt(row.payment_day);
    if (isNaN(day) || day < 1 || day > 28) {
      errors.push({ row: rowNum, field: 'payment_day', message: 'Dia deve ser 1-28' });
      hasError = true;
    }

    // Validar data início
    if (!isValidDate(row.start_date)) {
      errors.push({ row: rowNum, field: 'start_date', message: 'Data inválida' });
      hasError = true;
    }

    // Verificar se usuário existe
    if (row.receiver_handle) {
      const user = await prisma.user.findFirst({
        where: { handle: row.receiver_handle.replace('@', '') },
      });
      if (!user) {
        errors.push({ row: rowNum, field: 'receiver_handle', message: 'Usuário não encontrado' });
        hasError = true;
      }
    }

    if (!hasError) {
      validRows.push(row);
    }
  }

  return { validRows, errors };
}
```

#### 1.4 Processamento em Background

```typescript
// apps/api/src/jobs/pay-batch.processor.ts

import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('pay-batch')
export class PayBatchProcessor {
  @Process('process-pay-batch')
  async handleBatch(job: Job<{ batchId: string }>) {
    const batch = await prisma.payBatchImport.findUnique({
      where: { id: job.data.batchId },
      include: { company: true },
    });

    if (!batch) return;

    let created = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const row of batch.data as CSVRow[]) {
      try {
        await createContractFromCSV(row, batch.companyId);
        created++;

        // Atualizar progresso
        await prisma.payBatchImport.update({
          where: { id: batch.id },
          data: { processedRows: created + failed },
        });
      } catch (error) {
        failed++;
        errors.push({ row, error: error.message });
      }
    }

    // Finalizar
    await prisma.payBatchImport.update({
      where: { id: batch.id },
      data: {
        status: failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        createdCount: created,
        failedCount: failed,
        errors: errors,
        completedAt: new Date(),
      },
    });

    // Notificar empresa
    await notifyBatchCompleted(batch, created, failed);
  }
}
```

### 2. API de Integração

#### 2.1 Autenticação API Key

```typescript
// Gerar API Key para empresa
// POST /api/pay/api-keys
router.post('/api-keys', async (req, res) => {
  const { companyId, name, permissions } = req.body;

  // Verificar permissão
  const isMember = await checkCompanyMembership(req.user.id, companyId);
  if (!isMember) throw new Forbidden();

  const apiKey = generateSecureKey();
  const hashedKey = hashApiKey(apiKey);

  const key = await prisma.payApiKey.create({
    data: {
      companyId,
      name,
      keyHash: hashedKey,
      keyPrefix: apiKey.substring(0, 8),
      permissions: permissions || ['contracts:read', 'contracts:write'],
    },
  });

  // Retornar chave apenas uma vez
  return res.json({
    id: key.id,
    name: key.name,
    key: apiKey,  // Só mostrado uma vez!
    prefix: key.keyPrefix,
    permissions: key.permissions,
    createdAt: key.createdAt,
  });
});
```

#### 2.2 Middleware de Autenticação

```typescript
// Middleware para rotas /api/pay/v1/*
async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'API key required' });
  }

  const apiKey = authHeader.substring(7);
  const hashedKey = hashApiKey(apiKey);

  const key = await prisma.payApiKey.findFirst({
    where: { keyHash: hashedKey, status: 'ACTIVE' },
    include: { company: true },
  });

  if (!key) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Atualizar último uso
  await prisma.payApiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  req.apiKey = key;
  req.companyId = key.companyId;
  next();
}
```

#### 2.3 Endpoints da API v1

```typescript
// /api/pay/v1/*

// Listar contratos
GET /api/pay/v1/contracts
Query: status, receiverId, page, limit
Headers: Authorization: Bearer <api_key>

// Criar contrato
POST /api/pay/v1/contracts
Body: { receiverWallet, value, currency, period, paymentDay, startDate, ... }

// Detalhes do contrato
GET /api/pay/v1/contracts/:id

// Atualizar status
PATCH /api/pay/v1/contracts/:id/status
Body: { status: 'PAUSED' | 'ACTIVE' | 'CLOSED' }

// Criar ajuste
POST /api/pay/v1/contracts/:id/adjustments
Body: { type, value, referenceMonth, reason }

// Listar execuções
GET /api/pay/v1/contracts/:id/executions

// Bulk create
POST /api/pay/v1/contracts/bulk
Body: { contracts: [...] }

// Webhooks
POST /api/pay/v1/webhooks
Body: { url, events: ['payment.success', 'payment.failed', ...] }
```

#### 2.4 Documentação OpenAPI

```yaml
openapi: 3.0.0
info:
  title: Bazari Pay API
  version: 1.0.0
  description: API para integração de pagamentos recorrentes

servers:
  - url: https://bazari.libervia.xyz/api/pay/v1

security:
  - ApiKeyAuth: []

paths:
  /contracts:
    get:
      summary: Listar contratos
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [ACTIVE, PAUSED, CLOSED]
        - name: page
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer
            maximum: 100
      responses:
        '200':
          description: Lista de contratos
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/Contract'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

    post:
      summary: Criar contrato
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateContractRequest'
      responses:
        '201':
          description: Contrato criado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Contract'

components:
  securitySchemes:
    ApiKeyAuth:
      type: http
      scheme: bearer

  schemas:
    Contract:
      type: object
      properties:
        id:
          type: string
        receiverWallet:
          type: string
        baseValue:
          type: string
        currency:
          type: string
        period:
          type: string
          enum: [WEEKLY, BIWEEKLY, MONTHLY]
        status:
          type: string
          enum: [ACTIVE, PAUSED, CLOSED]
        nextPaymentDate:
          type: string
          format: date-time
```

### 3. Dashboard Empresarial

#### 3.1 Páginas

```
pages/
  EnterpriseDashboard.tsx    # Visão geral
  BatchImportPage.tsx        # Upload CSV
  ApiKeysPage.tsx            # Gerenciar chaves
  WebhooksPage.tsx           # Configurar webhooks
  ReportsPage.tsx            # Relatórios consolidados
```

#### 3.2 EnterpriseDashboard.tsx

```tsx
export function EnterpriseDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['enterprise-stats'],
    queryFn: payApi.getEnterpriseStats,
  });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Contratos Ativos"
          value={stats?.activeContracts || 0}
          icon={<FileText />}
        />
        <StatCard
          title="Folha Mensal"
          value={formatCurrency(stats?.monthlyTotal || 0)}
          icon={<DollarSign />}
        />
        <StatCard
          title="Próximos Pagamentos"
          value={stats?.upcomingPayments || 0}
          subtitle="Próximos 7 dias"
          icon={<Calendar />}
        />
        <StatCard
          title="Taxa de Sucesso"
          value={`${stats?.successRate || 0}%`}
          icon={<TrendingUp />}
        />
      </div>

      {/* Ações Rápidas */}
      <div className="flex gap-4">
        <Button asChild>
          <Link to="/pay/enterprise/import">
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/pay/enterprise/api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/pay/enterprise/reports">
            <BarChart className="h-4 w-4 mr-2" />
            Relatórios
          </Link>
        </Button>
      </div>

      {/* Importações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Importações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchImportList limit={5} />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 3.3 BatchImportPage.tsx

```tsx
export function BatchImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [errors, setErrors] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);

    // Preview primeiras 10 linhas
    const text = await f.text();
    const rows = parseCSVPreview(text, 10);
    setPreview(rows);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const result = await payApi.uploadBatch(formData);

    if (result.errors?.length) {
      setErrors(result.errors);
    } else {
      toast.success(`${result.created} contratos criados`);
      navigate('/pay/enterprise');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar Contratos via CSV</CardTitle>
          <CardDescription>
            Faça upload de um arquivo CSV para criar múltiplos contratos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Template download */}
          <div className="mb-6">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template CSV
            </Button>
          </div>

          {/* Upload */}
          <FileDropzone
            accept=".csv"
            onChange={handleFileChange}
            value={file}
          />

          {/* Preview */}
          {preview && (
            <div className="mt-6">
              <h4 className="font-medium mb-2">Preview ({preview.length} linhas)</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Handle</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.receiver_handle}</TableCell>
                      <TableCell>{row.value} {row.currency}</TableCell>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.payment_day}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Erros */}
          {errors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Erros encontrados</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {errors.map((err, i) => (
                    <li key={i}>
                      Linha {err.row}: {err.field} - {err.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpload} disabled={!file}>
            <Upload className="h-4 w-4 mr-2" />
            Importar {file ? `(${preview?.length} contratos)` : ''}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### 4. Relatórios

```typescript
// GET /api/pay/reports/monthly
// Relatório mensal consolidado
router.get('/reports/monthly', async (req, res) => {
  const { month, year } = req.query;
  const companyId = req.companyId;

  const report = await generateMonthlyReport(companyId, month, year);

  return res.json({
    period: `${year}-${month}`,
    summary: {
      totalContracts: report.totalContracts,
      activeContracts: report.activeContracts,
      totalPaid: report.totalPaid,
      totalExtras: report.totalExtras,
      totalDiscounts: report.totalDiscounts,
      successRate: report.successRate,
    },
    byReceiver: report.byReceiver,
    executions: report.executions,
  });
});

// GET /api/pay/reports/export
// Exportar relatório
router.get('/reports/export', async (req, res) => {
  const { format, startDate, endDate } = req.query;

  if (format === 'csv') {
    const csv = await generateCSVReport(req.companyId, startDate, endDate);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
    return res.send(csv);
  }

  if (format === 'pdf') {
    const pdf = await generatePDFReport(req.companyId, startDate, endDate);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    return res.send(pdf);
  }
});
```

## Critérios de Aceite

- [ ] Upload CSV com até 1000 linhas
- [ ] Validação detalhada com erros por linha
- [ ] Processamento assíncrono para grandes arquivos
- [ ] API Key para integração externa
- [ ] Endpoints REST documentados
- [ ] Dashboard com métricas consolidadas
- [ ] Relatórios exportáveis (CSV/PDF)
- [ ] Webhooks para eventos

## Arquivos a Criar

```
apps/api/
  prisma/schema.prisma (modificar)
  src/routes/pay/batch.ts
  src/routes/pay/api-v1/
    contracts.ts
    adjustments.ts
    webhooks.ts
  src/jobs/pay-batch.processor.ts
  src/services/pay-report.service.ts
  src/middleware/api-key.middleware.ts

apps/web/src/modules/pay/
  pages/enterprise/
    EnterpriseDashboard.tsx
    BatchImportPage.tsx
    ApiKeysPage.tsx
    WebhooksPage.tsx
    ReportsPage.tsx
  components/
    BatchImportList.tsx
    ApiKeyCard.tsx
    ReportChart.tsx
```
