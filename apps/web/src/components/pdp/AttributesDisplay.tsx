// V-2 (2025-09-18): Ajusta props e layout para padrão de 6 temas com expansão controlada

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CategorySpec } from '../../hooks/useEffectiveSpec';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface AttributesDisplayProps {
  attributes?: Record<string, unknown>;
  categorySpec?: CategorySpec | null;
  maxCollapsed?: number;
}

const HUMANIZE = (key: string) =>
  key
    .replace(/[_.-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value: unknown, t: (key: string, options?: any) => string): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value
      .map((item) => formatValue(item, t))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'boolean') {
    return value
      ? t('pdp.booleanTrue', { defaultValue: 'Sim' })
      : t('pdp.booleanFalse', { defaultValue: 'Não' });
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  }
  return String(value);
};

export function AttributesDisplay({
  attributes = {},
  categorySpec,
  maxCollapsed = 6,
}: AttributesDisplayProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const entries = useMemo(() => {
    const schemaProps = (categorySpec?.jsonSchema?.properties as Record<string, any>) ?? {};
    const keys = new Set<string>([
      ...Object.keys(schemaProps),
      ...Object.keys(attributes),
    ]);

    return Array.from(keys)
      .map((key) => {
        const schema = schemaProps[key] ?? {};
        const label = schema.title || schema.description || HUMANIZE(key);
        const value = formatValue(attributes[key], t);
        return { key, label, value };
      })
      .filter(({ value }) => value !== '')
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [attributes, categorySpec, t]);

  if (!entries.length) {
    return null;
  }

  const visibleEntries = expanded ? entries : entries.slice(0, maxCollapsed);
  const hasOverflow = entries.length > maxCollapsed;

  return (
    <section aria-labelledby="pdp-specs">
      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle id="pdp-specs" className="text-lg font-semibold text-foreground">
            {t('pdp.specs')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid gap-2">
            {visibleEntries.map(({ key, label, value }) => (
              <div
                key={key}
                className="grid gap-1 rounded-2xl border border-border bg-muted px-3 py-2 text-sm text-muted-foreground sm:grid-cols-[minmax(140px,200px)_1fr]"
              >
                <dt className="font-medium text-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {hasOverflow ? (
            <button
              type="button"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? t('pdp.seeLess') : t('pdp.seeMore')}
            </button>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export default AttributesDisplay;
