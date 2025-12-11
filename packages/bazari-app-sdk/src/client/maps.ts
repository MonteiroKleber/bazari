import { sendMessage } from '../utils/bridge';
import type { SDKCoordinates, SDKRouteResult } from '../types/responses';

type Coordinates = SDKCoordinates;

export interface MapOptions {
  center: Coordinates;
  zoom?: number;
  style?: 'street' | 'satellite' | 'terrain';
  interactive?: boolean;
}

export interface MarkerOptions {
  position: Coordinates;
  title?: string;
  icon?: string;
  color?: string;
  popup?: string;
  draggable?: boolean;
}

export interface RouteOptions {
  from: Coordinates;
  to: Coordinates;
  waypoints?: Coordinates[];
  mode?: 'driving' | 'walking' | 'cycling';
  color?: string;
}

export type RouteResult = SDKRouteResult;

export interface MapInstance {
  id: string;
  setCenter: (coords: Coordinates) => void;
  setZoom: (zoom: number) => void;
  addMarker: (options: MarkerOptions) => string;
  removeMarker: (markerId: string) => void;
  clearMarkers: () => void;
  drawRoute: (options: RouteOptions) => Promise<RouteResult>;
  clearRoutes: () => void;
  fitBounds: (coords: Coordinates[]) => void;
  destroy: () => void;
}

/**
 * API de Mapas do SDK
 * Usa OpenStreetMap/Leaflet para renderização
 */
export class MapsClient {
  private maps: Map<string, MapInstance> = new Map();

  /**
   * Cria um mapa em um container
   */
  async createMap(containerId: string, options: MapOptions): Promise<MapInstance> {
    const mapId = `map_${Date.now()}`;

    // Solicitar ao host para criar o mapa
    await sendMessage('maps:create', {
      mapId,
      containerId,
      options,
    });

    const instance: MapInstance = {
      id: mapId,

      setCenter: (coords: Coordinates) => {
        sendMessage('maps:setCenter', { mapId, coords });
      },

      setZoom: (zoom: number) => {
        sendMessage('maps:setZoom', { mapId, zoom });
      },

      addMarker: (markerOptions: MarkerOptions): string => {
        const markerId = `marker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        sendMessage('maps:addMarker', { mapId, markerId, options: markerOptions });
        return markerId;
      },

      removeMarker: (markerId: string) => {
        sendMessage('maps:removeMarker', { mapId, markerId });
      },

      clearMarkers: () => {
        sendMessage('maps:clearMarkers', { mapId });
      },

      drawRoute: async (routeOptions: RouteOptions): Promise<RouteResult> => {
        return sendMessage('maps:drawRoute', { mapId, options: routeOptions });
      },

      clearRoutes: () => {
        sendMessage('maps:clearRoutes', { mapId });
      },

      fitBounds: (coords: Coordinates[]) => {
        sendMessage('maps:fitBounds', { mapId, coords });
      },

      destroy: () => {
        sendMessage('maps:destroy', { mapId });
        this.maps.delete(mapId);
      },
    };

    this.maps.set(mapId, instance);
    return instance;
  }

  /**
   * Abre mapa em tela cheia (modal nativo)
   */
  async showFullscreenMap(options: {
    center?: Coordinates;
    markers?: MarkerOptions[];
    route?: RouteOptions;
    title?: string;
  }): Promise<void> {
    return sendMessage('maps:showFullscreen', options);
  }

  /**
   * Abre seletor de localização
   * Retorna coordenadas selecionadas ou null se cancelado
   */
  async pickLocation(options?: {
    initialPosition?: Coordinates;
    title?: string;
  }): Promise<Coordinates | null> {
    return sendMessage('maps:pickLocation', options || {});
  }

  /**
   * Abre navegação turn-by-turn
   * Abre app de mapas nativo (Google Maps, Apple Maps, etc)
   */
  async openNavigation(
    destination: Coordinates,
    options?: {
      mode?: 'driving' | 'walking' | 'cycling';
      startFromCurrentLocation?: boolean;
    }
  ): Promise<void> {
    return sendMessage('maps:openNavigation', { destination, ...options });
  }

  /**
   * Obtém URL para abrir no Google Maps
   */
  getGoogleMapsUrl(
    destination: Coordinates,
    options?: { mode?: 'driving' | 'walking' | 'bicycling' }
  ): string {
    const mode = options?.mode || 'driving';
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=${mode}`;
  }

  /**
   * Obtém URL para abrir no Apple Maps
   */
  getAppleMapsUrl(
    destination: Coordinates,
    options?: { mode?: 'd' | 'w' | 'r' } // driving, walking, transit
  ): string {
    const mode = options?.mode || 'd';
    return `https://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}&dirflg=${mode}`;
  }

  /**
   * Obtém todos os mapas ativos
   */
  getActiveMaps(): MapInstance[] {
    return Array.from(this.maps.values());
  }

  /**
   * Destrói todos os mapas
   */
  destroyAll(): void {
    this.maps.forEach((map) => map.destroy());
    this.maps.clear();
  }
}
