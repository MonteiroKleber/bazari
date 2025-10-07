export function getTierVariant(tier: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants = {
    bronze: 'secondary' as const,
    prata: 'default' as const,
    ouro: 'outline' as const, // amarelo se tiver variante custom
    diamante: 'default' as const, // azul brilhante se tiver
  };
  return variants[tier as keyof typeof variants] ?? 'secondary';
}

export function getTierColor(tier: string): string {
  const colors = {
    bronze: 'text-amber-700',
    prata: 'text-slate-500',
    ouro: 'text-yellow-500',
    diamante: 'text-blue-400',
  };
  return colors[tier as keyof typeof colors] ?? 'text-muted-foreground';
}

export function calculateTier(score: number): string {
  if (score >= 1000) return 'diamante';
  if (score >= 500) return 'ouro';
  if (score >= 100) return 'prata';
  return 'bronze';
}

export function getTierLabel(tier: string, lang: 'pt' | 'en' | 'es' = 'pt'): string {
  const labels = {
    bronze: { pt: 'Bronze', en: 'Bronze', es: 'Bronce' },
    prata: { pt: 'Prata', en: 'Silver', es: 'Plata' },
    ouro: { pt: 'Ouro', en: 'Gold', es: 'Oro' },
    diamante: { pt: 'Diamante', en: 'Diamond', es: 'Diamante' },
  };
  return labels[tier as keyof typeof labels]?.[lang] ?? tier;
}
