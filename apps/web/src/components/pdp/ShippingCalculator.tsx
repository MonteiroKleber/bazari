// V-1 (2025-09-18): Calculadora de frete mock com resposta tema-safe e acessível

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface ShippingCalculatorProps {
  className?: string;
}

const BETWEEN_THREE_AND_SEVEN = [3, 4, 5, 6, 7];

const pickRandomDays = () => {
  const index = Math.floor(Math.random() * BETWEEN_THREE_AND_SEVEN.length);
  return BETWEEN_THREE_AND_SEVEN[index];
};

export function ShippingCalculator({ className }: ShippingCalculatorProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [estimate, setEstimate] = useState<string | null>(null);

  const trimmedValue = useMemo(() => inputValue.trim(), [inputValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedValue) {
      setEstimate(null);
      return;
    }

    const days = pickRandomDays();
    const isCenter = trimmedValue.toLowerCase().includes('centro');
    const price = isCenter ? 'BZR 0,00' : 'BZR 9,90';

    setEstimate(
      t('pdp.estimateResult', {
        days,
        price,
      })
    );
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    setEstimate(null);
  };

  return (
    <section aria-labelledby="pdp-freight">
      <Card className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}>
        <CardHeader className="pb-4">
          <CardTitle id="pdp-freight" className="text-lg font-semibold text-foreground">
            {t('pdp.freight')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="shipping-input" className="text-sm font-medium text-foreground">
                {t('pdp.freight')}
              </Label>
              <Input
                id="shipping-input"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder={t('pdp.enterZipOrCity')}
                aria-describedby="shipping-helper"
              />
              <p id="shipping-helper" className="text-xs text-muted-foreground">
                {t('pdp.enterZipOrCity')}
              </p>
            </div>

            <Button type="submit" disabled={!trimmedValue}>
              {t('pdp.calculate')}
            </Button>
          </form>

          <div className="mt-4 min-h-[1.5rem] text-sm text-muted-foreground" aria-live="polite">
            {estimate}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default ShippingCalculator;
