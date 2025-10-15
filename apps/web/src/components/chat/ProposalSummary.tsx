import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ProposalItem } from '@bazari/shared-types';
import { Separator } from '../ui/separator';
import { MultiStoreCart } from './MultiStoreCart';
import { useMemo } from 'react';

interface ProposalSummaryProps {
  items: ProposalItem[];
  shipping?: { method: string; price: string };
  commission: number;
  expiresIn: string;
  onExpiresChange: (value: string) => void;
}

export function ProposalSummary({
  items,
  shipping,
  commission,
  expiresIn,
  onExpiresChange,
}: ProposalSummaryProps) {
  // Group items by store if they have storeId
  const storeGroups = useMemo(() => {
    const itemsWithStore = items.filter((item: any) => item.storeId);

    if (itemsWithStore.length === 0) {
      return undefined;
    }

    // Group by store
    const groupsMap = new Map<number, any>();

    itemsWithStore.forEach((item: any) => {
      if (!groupsMap.has(item.storeId)) {
        groupsMap.set(item.storeId, {
          storeId: item.storeId,
          storeName: item.storeName || `Loja ${item.storeId}`,
          items: [],
          subtotal: 0,
          total: 0,
        });
      }

      const group = groupsMap.get(item.storeId)!;
      group.items.push(item);
      const itemTotal = parseFloat(item.price) * item.qty;
      group.subtotal += itemTotal;
      group.total += itemTotal;
    });

    // Add shipping if single store
    if (groupsMap.size === 1 && shipping && parseFloat(shipping.price) > 0) {
      const group = Array.from(groupsMap.values())[0];
      group.shipping = {
        method: shipping.method,
        price: parseFloat(shipping.price),
      };
      group.total += parseFloat(shipping.price);
    }

    return Array.from(groupsMap.values());
  }, [items, shipping]);

  const calculateTotal = () => {
    const itemsTotal = items.reduce((sum, item) =>
      sum + (parseFloat(item.price) * item.qty), 0
    );
    const shippingCost = shipping ? parseFloat(shipping.price) || 0 : 0;
    return itemsTotal + shippingCost;
  };

  const total = calculateTotal();
  const commissionAmount = total * (commission / 100);
  const isMultiStore = storeGroups && storeGroups.length > 1;

  return (
    <div className="space-y-4">
      {/* Multi-Store Cart */}
      <MultiStoreCart
        items={items}
        storeGroups={storeGroups}
        isMultiStore={isMultiStore}
      />

      <Separator />

      {/* Comissão */}
      {isMultiStore && storeGroups ? (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Comissão por loja:
          </div>
          {storeGroups.map((group) => {
            const groupTotal = group.total;
            const groupCommission = groupTotal * (commission / 100);
            return (
              <div key={group.storeId} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {group.storeName}:
                </span>
                <span className="font-medium">
                  {commission}% (R$ {groupCommission.toFixed(2)})
                </span>
              </div>
            );
          })}
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total de comissão:</span>
            <span>R$ {commissionAmount.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Comissão para promotores:
            </span>
            <span className="font-medium">
              {commission}% (R$ {commissionAmount.toFixed(2)})
            </span>
          </div>
        </div>
      )}

      <Separator />

      {/* Validade */}
      <div>
        <Label>Validade da Proposta</Label>
        <Select value={expiresIn} onValueChange={onExpiresChange}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 horas</SelectItem>
            <SelectItem value="48h">48 horas</SelectItem>
            <SelectItem value="72h">3 dias</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Após este período, a proposta expira automaticamente
        </p>
      </div>
    </div>
  );
}
