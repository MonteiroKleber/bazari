export const REPUTATION_RULES = [
  { code: 'ORDER_COMPLETED', points: 3, dailyLimit: 50, emitter: 'marketplace' },
  { code: 'DELIVERY_DONE', points: 2, dailyLimit: 100, emitter: 'delivery' },
  { code: 'DISPUTE_RESOLVED', points: 5, dailyLimit: 10, emitter: 'marketplace' },
  { code: 'DAO_VOTE_VALID', points: 1, dailyLimit: 100, emitter: 'dao' },
  { code: 'P2P_ESCROW_OK', points: 2, dailyLimit: 50, emitter: 'p2p' },
  { code: 'SOCIAL_CONTRIB', points: 1, dailyLimit: 40, emitter: 'social' },
  { code: 'SPAM_WARN', points: -2, dailyLimit: 20, emitter: 'social' },
  { code: 'FRAUD_CONFIRMED', points: -20, dailyLimit: 1, emitter: 'arbitration' },
] as const;

export type ReputationEventCode = typeof REPUTATION_RULES[number]['code'];

export function calculateTier(score: number): string {
  if (score >= 1000) return 'diamante';
  if (score >= 500) return 'ouro';
  if (score >= 100) return 'prata';
  return 'bronze';
}

export function getBadgeLabel(code: string): { pt: string; en: string; es: string } {
  const labels: Record<string, { pt: string; en: string; es: string }> = {
    FOUNDER: { pt: 'Fundador', en: 'Founder', es: 'Fundador' },
    EARLY_ADOPTER: { pt: 'Pioneiro', en: 'Early Adopter', es: 'Pionero' },
    SELLER_10: { pt: '10 Vendas', en: '10 Sales', es: '10 Ventas' },
    SELLER_50: { pt: '50 Vendas', en: '50 Sales', es: '50 Ventas' },
    SELLER_100: { pt: '100 Vendas', en: '100 Sales', es: '100 Ventas' },
    SELLER_500: { pt: '500 Vendas', en: '500 Sales', es: '500 Ventas' },
    TOP_RATED: { pt: 'Bem Avaliado', en: 'Top Rated', es: 'Bien Evaluado' },
    VERIFIED: { pt: 'Verificado', en: 'Verified', es: 'Verificado' },
  };

  return labels[code] ?? { pt: code, en: code, es: code };
}
