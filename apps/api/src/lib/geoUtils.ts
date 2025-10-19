/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param lat1 - Latitude do ponto 1
 * @param lng1 - Longitude do ponto 1
 * @param lat2 - Latitude do ponto 2
 * @param lng2 - Longitude do ponto 2
 * @returns Distância em quilômetros
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // 2 casas decimais
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estima coordenadas a partir de CEP (fallback - quando não houver API de geocoding)
 * MOCK: Retorna coordenadas aproximadas do centro da cidade baseado no CEP
 */
export function estimateCoordinatesFromZipCode(zipCode: string): {
  lat: number;
  lng: number;
} | null {
  // Remover hífen e espaços
  const cleanZip = zipCode.replace(/\D/g, '');

  // MOCK: Mapeamento básico de regiões por prefixo de CEP
  const zipPrefix = cleanZip.substring(0, 2);

  // Tabela simplificada (expandir conforme necessário)
  const mockCoordinates: Record<string, { lat: number; lng: number }> = {
    '20': { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro - Centro
    '21': { lat: -22.8036, lng: -43.3061 }, // Rio de Janeiro - Zona Norte
    '22': { lat: -22.9653, lng: -43.1802 }, // Rio de Janeiro - Zona Sul
    '23': { lat: -22.8825, lng: -43.5469 }, // Rio de Janeiro - Zona Oeste
    '24': { lat: -22.8874, lng: -43.1086 }, // Niterói
    '01': { lat: -23.5505, lng: -46.6333 }, // São Paulo - Centro
    '30': { lat: -19.9167, lng: -43.9345 }, // Belo Horizonte
    '40': { lat: -12.9714, lng: -38.5014 }, // Salvador
    '50': { lat: -8.0476, lng: -34.8770 },  // Recife
    '60': { lat: -3.7172, lng: -38.5433 },  // Fortaleza
    '70': { lat: -15.7939, lng: -47.8828 }, // Brasília
    '80': { lat: -25.4284, lng: -49.2733 }, // Curitiba
    '90': { lat: -30.0346, lng: -51.2177 }, // Porto Alegre
  };

  return mockCoordinates[zipPrefix] || null;
}

/**
 * Valida se coordenadas estão dentro do Brasil (bounds aproximados)
 */
export function isWithinBrazil(lat: number, lng: number): boolean {
  // Bounds aproximados do Brasil
  const BRAZIL_BOUNDS = {
    minLat: -33.75,
    maxLat: 5.27,
    minLng: -73.99,
    maxLng: -28.84,
  };

  return (
    lat >= BRAZIL_BOUNDS.minLat &&
    lat <= BRAZIL_BOUNDS.maxLat &&
    lng >= BRAZIL_BOUNDS.minLng &&
    lng <= BRAZIL_BOUNDS.maxLng
  );
}
