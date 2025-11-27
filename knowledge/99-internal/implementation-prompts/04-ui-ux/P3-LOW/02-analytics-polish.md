# Analytics Polish UI/UX - Implementation Prompt

**Phase**: P3 - LOW Priority
**Priority**: LOW
**Effort**: 5 days
**Dependencies**: bazari-fee, bazari-dispute pallets
**Pallets**: bazari-fee, bazari-dispute
**Version**: 1.0
**Last Updated**: 2025-11-14

---

## 📋 Context

Polish analytics dashboards with advanced visualizations and export features:

1. **FeeHistoryChart** - Monthly fee trends with interactive tooltips
2. **VRFIndicator** - Juror selection transparency component
3. **Juror Leaderboard** - Top jurors by participation
4. **Export Functionality** - CSV/PDF export for analytics
5. **Advanced Filters** - Date range, category filters

**Current State** (from Gap Analysis Sections 7.3, 8.5):
- ❌ No fee history visualization
- ❌ No VRF transparency
- ❌ No export functionality

---

## 🎯 Objective

**Deliverables**:
- 4 components (FeeHistoryChart, VRFIndicator, ExportButton, FilterPanel)
- 2 utilities (generateCSV, generatePDF)

---

## 🔨 Implementation Details

### Step 1: Create FeeHistoryChart Component (2 days)

**Location**: `/root/bazari/apps/web/src/components/analytics/FeeHistoryChart.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { formatBZR } from '@/lib/utils';

interface FeeHistoryData {
  month: string;
  platformFees: number;
  affiliateFees: number;
  totalFees: number;
}

export function FeeHistoryChart() {
  const { data, isLoading } = useQuery<FeeHistoryData[]>({
    queryKey: ['fee-history'],
    queryFn: async () => {
      const response = await fetch('/api/admin/fees/history?months=12');
      return response.json();
    },
  });

  if (isLoading) return <div>Loading fee history...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Trends (Last 12 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => formatBZR(value.toString())}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="platformFees"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Platform Fees"
            />
            <Line
              type="monotone"
              dataKey="affiliateFees"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="Affiliate Fees"
            />
            <Line
              type="monotone"
              dataKey="totalFees"
              stroke="#10b981"
              strokeWidth={3}
              name="Total Fees"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

### Step 2: Create VRFIndicator Component (1 day)

**Location**: `/root/bazari/apps/web/src/components/disputes/VRFIndicator.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shuffle, ExternalLink } from 'lucide-react';

interface VRFIndicatorProps {
  disputeId: number;
  vrfProof?: {
    randomness: string;
    proof: string;
    blockNumber: number;
  };
}

export function VRFIndicator({ disputeId, vrfProof }: VRFIndicatorProps) {
  if (!vrfProof) {
    return (
      <Alert>
        <Shuffle className="h-4 w-4" />
        <AlertDescription>
          Jurors will be randomly selected using VRF (Verifiable Random Function) when voting begins.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shuffle className="h-5 w-5" />
          VRF Juror Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Jurors were selected using Verifiable Random Function (VRF), ensuring unbiased and
          transparent selection.
        </div>

        <div className="space-y-2 bg-muted p-4 rounded">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Block Number</span>
            <span className="font-mono">{vrfProof.blockNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">Randomness</span>
            <span className="font-mono text-xs">
              {vrfProof.randomness.slice(0, 16)}...{vrfProof.randomness.slice(-16)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">VRF Proof</span>
            <span className="font-mono text-xs">
              {vrfProof.proof.slice(0, 16)}...{vrfProof.proof.slice(-16)}
            </span>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => verifyVRFProof(vrfProof)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Verify VRF Proof
        </Button>

        <div className="text-xs text-muted-foreground">
          <strong>How it works:</strong> VRF generates randomness that is verifiable on-chain,
          preventing manipulation of juror selection.
        </div>
      </CardContent>
    </Card>
  );
}

function verifyVRFProof(proof: any) {
  // Open blockchain explorer with VRF verification
  const explorerUrl = `https://polkadot.js.org/apps/#/explorer/query/${proof.blockNumber}`;
  window.open(explorerUrl, '_blank');
}
```

---

### Step 3: Create Export Functionality (1.5 days)

**Component**: `/root/bazari/apps/web/src/components/analytics/ExportButton.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import { generateCSV, generatePDF } from '@/lib/export-utils';

interface ExportButtonProps {
  data: any[];
  filename: string;
  type: 'fees' | 'disputes' | 'couriers';
}

export function ExportButton({ data, filename, type }: ExportButtonProps) {
  const handleExportCSV = () => {
    const csv = generateCSV(data, type);
    downloadFile(csv, `${filename}.csv`, 'text/csv');
  };

  const handleExportPDF = () => {
    const pdf = generatePDF(data, type);
    downloadFile(pdf, `${filename}.pdf`, 'application/pdf');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

**Utilities**: `/root/bazari/apps/web/src/lib/export-utils.ts`

```typescript
import { parse } from 'json2csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateCSV(data: any[], type: string): string {
  const fields = getFieldsByType(type);
  return parse(data, { fields });
}

export function generatePDF(data: any[], type: string): Blob {
  const doc = new jsPDF();
  const columns = getFieldsByType(type);

  doc.text(`Bazari ${type.charAt(0).toUpperCase() + type.slice(1)} Report`, 14, 15);

  autoTable(doc, {
    head: [columns.map((col) => col.label)],
    body: data.map((row) => columns.map((col) => row[col.value])),
    startY: 25,
  });

  return doc.output('blob');
}

function getFieldsByType(type: string) {
  switch (type) {
    case 'fees':
      return [
        { label: 'Month', value: 'month' },
        { label: 'Platform Fees', value: 'platformFees' },
        { label: 'Affiliate Fees', value: 'affiliateFees' },
        { label: 'Total Fees', value: 'totalFees' },
      ];
    case 'disputes':
      return [
        { label: 'Dispute ID', value: 'disputeId' },
        { label: 'Status', value: 'status' },
        { label: 'Ruling', value: 'ruling' },
        { label: 'Resolution Time', value: 'resolutionTime' },
      ];
    case 'couriers':
      return [
        { label: 'Address', value: 'address' },
        { label: 'Reputation', value: 'reputation' },
        { label: 'Total Deliveries', value: 'totalDeliveries' },
        { label: 'Success Rate', value: 'successRate' },
      ];
    default:
      return [];
  }
}
```

---

### Step 4: Add Filter Panel (0.5 days)

**Component**: `/root/bazari/apps/web/src/components/analytics/FilterPanel.tsx`

```typescript
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface FilterPanelProps {
  onFilter: (filters: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
  }) => void;
}

export function FilterPanel({ onFilter }: FilterPanelProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleApply = () => {
    onFilter({ startDate, endDate });
  };

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onFilter({});
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleApply}>Apply Filters</Button>
          <Button variant="outline" onClick={handleReset}>Reset</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## ✅ Acceptance Criteria

1. **Fee History Chart**
   - [ ] Displays last 12 months by default
   - [ ] 3 lines: Platform Fees, Affiliate Fees, Total Fees
   - [ ] Interactive tooltips show BZR amounts
   - [ ] Chart responsive on mobile

2. **VRF Indicator**
   - [ ] Shows VRF proof details (randomness, proof hash, block number)
   - [ ] "Verify VRF Proof" button opens blockchain explorer
   - [ ] Explanation: "How it works" section

3. **Export Functionality**
   - [ ] CSV export generates correct format
   - [ ] PDF export includes table with headers
   - [ ] Downloads trigger immediately

4. **Filter Panel**
   - [ ] Date range picker functional
   - [ ] "Apply Filters" updates data
   - [ ] "Reset" clears filters

---

## 🧪 Testing

**Manual**:
- [ ] Fee history chart displays 12 months
- [ ] Export CSV → open in Excel → verify formatting
- [ ] Export PDF → verify table structure
- [ ] Apply date filter → verify chart updates
- [ ] VRF indicator → click "Verify" → verify explorer opens

---

## 🤖 Prompt for Claude Code

```
Implement Analytics Polish UI/UX for bazari-fee and bazari-dispute pallets.

**Objective**:
1. Create FeeHistoryChart (monthly trends, 12 months)
2. Create VRFIndicator component (juror selection transparency)
3. Implement ExportButton (CSV/PDF export)
4. Create FilterPanel (date range filtering)

**Components**:
- /root/bazari/apps/web/src/components/analytics/FeeHistoryChart.tsx
- /root/bazari/apps/web/src/components/disputes/VRFIndicator.tsx
- /root/bazari/apps/web/src/components/analytics/ExportButton.tsx
- /root/bazari/apps/web/src/components/analytics/FilterPanel.tsx
- /root/bazari/apps/web/src/lib/export-utils.ts

**Dependencies**: recharts, jspdf, jspdf-autotable, json2csv

**Testing**: Fee chart displays, CSV export works, VRF proof verification

**References**: /root/bazari/UI_UX_GAP_ANALYSIS.md Sections 7.3, 8.5
```

---

**Version**: 1.0
**Last Updated**: 2025-11-14
