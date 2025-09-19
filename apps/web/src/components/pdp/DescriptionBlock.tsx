// V-2 (2025-09-18): Adequa container tema-safe preservando quebras de linha na descrição

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface DescriptionBlockProps {
  description?: string | null;
}

export function DescriptionBlock({ description }: DescriptionBlockProps) {
  const { t } = useTranslation();

  const safeDescription = description?.trim();
  if (!safeDescription) {
    return null;
  }

  return (
    <section aria-labelledby="pdp-description">
      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle id="pdp-description" className="text-lg font-semibold text-foreground">
            {t('pdp.description')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {safeDescription}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

export default DescriptionBlock;
