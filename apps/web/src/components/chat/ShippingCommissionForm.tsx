import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ShippingCommissionFormProps {
  shipping: { method: string; price: string };
  onShippingChange: (shipping: { method: string; price: string }) => void;
  commission: number;
  onCommissionChange: (value: number) => void;
  storePolicy?: { minPercent: number; maxPercent: number };
  isVendor?: boolean; // Se true, é dono da loja
  readonlyCommission?: boolean; // Se true, não pode editar comissão
}

export function ShippingCommissionForm({
  shipping,
  onShippingChange,
  commission,
  onCommissionChange,
  storePolicy,
  isVendor = false,
  readonlyCommission = false,
}: ShippingCommissionFormProps) {
  const minCommission = storePolicy?.minPercent || 0;
  const maxCommission = storePolicy?.maxPercent || 15;

  return (
    <div className="space-y-6">
      {/* Frete */}
      <div>
        <Label>Frete</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <Select
            value={shipping.method}
            onValueChange={(m) => onShippingChange({ ...shipping, method: m })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PAC">PAC</SelectItem>
              <SelectItem value="SEDEX">SEDEX</SelectItem>
              <SelectItem value="gratis">Grátis</SelectItem>
              <SelectItem value="motoboy">Motoboy</SelectItem>
              <SelectItem value="retirada">Retirada no Local</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Valor (R$)"
            value={shipping.price}
            onChange={(e) => onShippingChange({ ...shipping, price: e.target.value })}
            min="0"
            step="0.01"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Defina o método e o valor do frete. Use R$ 0 para frete grátis.
        </p>
      </div>

      {/* Comissão */}
      <div>
        <Label>Comissão</Label>

        {isVendor ? (
          // Vendedor: comissão = 0% (fixo)
          <div className="mt-2 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-lg">0%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Como dono da loja, você recebe 100% do valor (descontando a taxa Bazari de 1%)
                </p>
              </div>
            </div>
          </div>
        ) : readonlyCommission ? (
          // Promotor: comissão vem da política (readonly)
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-lg text-blue-900 dark:text-blue-100">{commission}%</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Comissão definida pela loja - Em R$ 100, você ganha R$ {commission.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Fallback (não deveria acontecer): editar comissão
          <div className="space-y-2 mt-2">
            <Slider
              value={[commission]}
              onValueChange={([v]) => onCommissionChange(v)}
              min={minCommission}
              max={maxCommission}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span className="font-medium text-lg text-foreground">{commission}%</span>
              <span>Em R$ 100, promotor ganha R$ {commission.toFixed(2)}</span>
            </div>

            {storePolicy && (
              <p className="text-xs text-muted-foreground mt-2">
                Política da loja: {storePolicy.minPercent}% - {storePolicy.maxPercent}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
