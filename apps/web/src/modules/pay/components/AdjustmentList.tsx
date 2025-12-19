// path: apps/web/src/modules/pay/components/AdjustmentList.tsx
// Lista de ajustes de um contrato (PROMPT-03)

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Clock, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { AdjustmentCard } from './AdjustmentCard';
import { AdjustmentForm } from './AdjustmentForm';
import { getContractAdjustments } from '../api';

interface AdjustmentListProps {
  contractId: string;
  canManage: boolean;
}

export function AdjustmentList({ contractId, canManage }: AdjustmentListProps) {
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({
    queryKey: ['pay-contract-adjustments', contractId],
    queryFn: () => getContractAdjustments(contractId),
  });

  const adjustments = data?.adjustments || [];

  // Separar por status
  const pendingAdjustments = adjustments.filter(
    (a) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(a.status)
  );
  const appliedAdjustments = adjustments.filter((a) => a.status === 'APPLIED');
  const otherAdjustments = adjustments.filter(
    (a) => ['REJECTED', 'CANCELLED'].includes(a.status)
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Ajustes</CardTitle>
          {canManage && (
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Ajuste
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Ajuste</DialogTitle>
                </DialogHeader>
                <AdjustmentForm
                  contractId={contractId}
                  onSuccess={() => setShowForm(false)}
                  onCancel={() => setShowForm(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {adjustments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum ajuste registrado.
          </p>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pendentes ({pendingAdjustments.length})
              </TabsTrigger>
              <TabsTrigger value="applied" className="flex items-center gap-1">
                <CheckCheck className="h-3 w-3" />
                Aplicados ({appliedAdjustments.length})
              </TabsTrigger>
              <TabsTrigger value="other">
                Outros ({otherAdjustments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-2 mt-4">
              {pendingAdjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum ajuste pendente.
                </p>
              ) : (
                pendingAdjustments.map((adj) => (
                  <AdjustmentCard key={adj.id} adjustment={adj} />
                ))
              )}
            </TabsContent>

            <TabsContent value="applied" className="space-y-2 mt-4">
              {appliedAdjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum ajuste aplicado.
                </p>
              ) : (
                appliedAdjustments.map((adj) => (
                  <AdjustmentCard key={adj.id} adjustment={adj} showExecution />
                ))
              )}
            </TabsContent>

            <TabsContent value="other" className="space-y-2 mt-4">
              {otherAdjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum ajuste rejeitado ou cancelado.
                </p>
              ) : (
                otherAdjustments.map((adj) => (
                  <AdjustmentCard key={adj.id} adjustment={adj} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
