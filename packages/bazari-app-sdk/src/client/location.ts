import { sendMessage } from '../utils/bridge';
import type {
  SDKCoordinates,
  SDKPosition,
  SDKDistanceResult,
} from '../types/responses';

export type Coordinates = SDKCoordinates;
export type Position = SDKPosition;
export type DistanceResult = SDKDistanceResult;

export interface PositionError {
  code: number;
  message: string;
}

export interface WatchOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * API de Localização do SDK
 * Requer permissões: location.coarse, location.precise, ou location.background
 */
export class LocationClient {
  private watchCallbacks: Map<string, (position: Position) => void> = new Map();
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    if (this.messageHandler) return;

    this.messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'location:positionUpdate') {
        const callback = this.watchCallbacks.get(event.data.watchId);
        if (callback) {
          callback(event.data.position);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.messageHandler);
    }
  }

  /**
   * Obtém posição atual do usuário
   * Requer permissão: location.coarse ou location.precise
   */
  async getCurrentPosition(options?: WatchOptions): Promise<Position> {
    return sendMessage('location:getCurrentPosition', options || {});
  }

  /**
   * Observa mudanças de posição
   * Requer permissão: location.precise
   */
  watchPosition(
    callback: (position: Position) => void,
    errorCallback?: (error: PositionError) => void,
    options?: WatchOptions
  ): string {
    const watchId = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.watchCallbacks.set(watchId, callback);

    sendMessage('location:watchPosition', { watchId, options })
      .catch((error) => {
        errorCallback?.({ code: 1, message: error.message });
        this.watchCallbacks.delete(watchId);
      });

    return watchId;
  }

  /**
   * Para de observar posição
   */
  clearWatch(watchId: string): void {
    this.watchCallbacks.delete(watchId);
    sendMessage('location:clearWatch', { watchId });
  }

  /**
   * Calcula distância entre dois pontos
   * @param mode 'straight' usa Haversine (local), 'driving'/'walking' usa OSRM
   */
  async calculateDistance(
    from: Coordinates,
    to: Coordinates,
    mode: 'straight' | 'driving' | 'walking' = 'straight'
  ): Promise<DistanceResult> {
    if (mode === 'straight') {
      // Fórmula de Haversine (local, não requer API)
      const R = 6371; // Raio da Terra em km
      const dLat = this.toRad(to.latitude - from.latitude);
      const dLon = this.toRad(to.longitude - from.longitude);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(from.latitude)) *
          Math.cos(this.toRad(to.latitude)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;

      return {
        distanceKm,
        distanceMeters: distanceKm * 1000,
      };
    }

    // Para driving/walking, usar API de routing
    return sendMessage('location:calculateDistance', { from, to, mode });
  }

  /**
   * Geocodifica endereço para coordenadas
   */
  async geocode(address: string): Promise<Coordinates | null> {
    return sendMessage('location:geocode', { address });
  }

  /**
   * Geocodificação reversa (coordenadas para endereço)
   */
  async reverseGeocode(coords: Coordinates): Promise<string | null> {
    return sendMessage('location:reverseGeocode', coords);
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Cleanup - remover listener quando não for mais necessário
   */
  destroy(): void {
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.watchCallbacks.clear();
  }
}
