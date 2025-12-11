import type { Coordinates } from './location-handler';

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

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  polyline: Coordinates[];
  steps?: {
    instruction: string;
    distance: number;
    duration: number;
  }[];
}

interface MapState {
  container: HTMLElement | null;
  markers: Map<string, unknown>;
  routes: unknown[];
}

/**
 * Handler de mapas para a plataforma host
 * Processa mensagens de maps do SDK
 * Usa Leaflet para renderização
 */
export class MapsHandler {
  private maps: Map<string, MapState> = new Map();
  private appIframe: HTMLIFrameElement | null = null;

  constructor(iframe?: HTMLIFrameElement) {
    this.appIframe = iframe || null;
  }

  setIframe(iframe: HTMLIFrameElement) {
    this.appIframe = iframe;
  }

  async handleMessage(
    type: string,
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    switch (type) {
      case 'maps:create':
        return this.createMap(payload, sendResponse);

      case 'maps:setCenter':
        return this.setCenter(payload);

      case 'maps:setZoom':
        return this.setZoom(payload);

      case 'maps:addMarker':
        return this.addMarker(payload, sendResponse);

      case 'maps:removeMarker':
        return this.removeMarker(payload);

      case 'maps:clearMarkers':
        return this.clearMarkers(payload);

      case 'maps:drawRoute':
        return this.drawRoute(payload, sendResponse);

      case 'maps:clearRoutes':
        return this.clearRoutes(payload);

      case 'maps:fitBounds':
        return this.fitBounds(payload);

      case 'maps:destroy':
        return this.destroyMap(payload);

      case 'maps:showFullscreen':
        return this.showFullscreen(payload, sendResponse);

      case 'maps:pickLocation':
        return this.pickLocation(payload, sendResponse);

      case 'maps:openNavigation':
        return this.openNavigation(payload, sendResponse);
    }
  }

  private async createMap(
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    const mapId = payload.mapId as string;
    const containerId = payload.containerId as string;
    const options = payload.options as MapOptions;

    try {
      const container = document.getElementById(containerId);
      if (!container) {
        sendResponse({ error: `Container ${containerId} not found` });
        return;
      }

      // Nota: A criação real do mapa Leaflet é feita no componente React
      // Este handler apenas mantém o estado
      this.maps.set(mapId, {
        container,
        markers: new Map(),
        routes: [],
      });

      sendResponse({ success: true, mapId });
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }

  private setCenter(payload: Record<string, unknown>): void {
    const mapId = payload.mapId as string;
    const coords = payload.coords as Coordinates;

    // Emitir evento para o componente de mapa React
    window.dispatchEvent(
      new CustomEvent('bazari:map:setCenter', {
        detail: { mapId, coords },
      })
    );
  }

  private setZoom(payload: Record<string, unknown>): void {
    const mapId = payload.mapId as string;
    const zoom = payload.zoom as number;

    window.dispatchEvent(
      new CustomEvent('bazari:map:setZoom', {
        detail: { mapId, zoom },
      })
    );
  }

  private addMarker(
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): void {
    const mapId = payload.mapId as string;
    const markerId = payload.markerId as string;
    const options = payload.options as MarkerOptions;

    const mapState = this.maps.get(mapId);
    if (mapState) {
      mapState.markers.set(markerId, options);
    }

    window.dispatchEvent(
      new CustomEvent('bazari:map:addMarker', {
        detail: { mapId, markerId, options },
      })
    );

    sendResponse({ success: true, markerId });
  }

  private removeMarker(payload: Record<string, unknown>): void {
    const mapId = payload.mapId as string;
    const markerId = payload.markerId as string;

    const mapState = this.maps.get(mapId);
    if (mapState) {
      mapState.markers.delete(markerId);
    }

    window.dispatchEvent(
      new CustomEvent('bazari:map:removeMarker', {
        detail: { mapId, markerId },
      })
    );
  }

  private clearMarkers(payload: Record<string, unknown>): void {
    const mapId = payload.mapId as string;

    const mapState = this.maps.get(mapId);
    if (mapState) {
      mapState.markers.clear();
    }

    window.dispatchEvent(
      new CustomEvent('bazari:map:clearMarkers', {
        detail: { mapId },
      })
    );
  }

  private async drawRoute(
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    const mapId = payload.mapId as string;
    const options = payload.options as RouteOptions;

    try {
      // Usar OSRM para obter rota
      const profile =
        options.mode === 'walking'
          ? 'foot'
          : options.mode === 'cycling'
          ? 'bike'
          : 'car';

      let url = `https://router.project-osrm.org/route/v1/${profile}/${options.from.longitude},${options.from.latitude}`;

      if (options.waypoints) {
        options.waypoints.forEach((wp) => {
          url += `;${wp.longitude},${wp.latitude}`;
        });
      }

      url += `;${options.to.longitude},${options.to.latitude}?overview=full&geometries=geojson&steps=true`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        const polyline: Coordinates[] = route.geometry.coordinates.map(
          (coord: number[]) => ({
            longitude: coord[0],
            latitude: coord[1],
          })
        );

        const routeResult: RouteResult = {
          distanceKm: route.distance / 1000,
          durationMinutes: route.duration / 60,
          polyline,
          steps: route.legs?.[0]?.steps?.map(
            (step: { maneuver: { instruction: string }; distance: number; duration: number }) => ({
              instruction: step.maneuver.instruction,
              distance: step.distance,
              duration: step.duration,
            })
          ),
        };

        // Emitir evento para desenhar a rota no mapa
        window.dispatchEvent(
          new CustomEvent('bazari:map:drawRoute', {
            detail: { mapId, polyline, color: options.color || '#3b82f6' },
          })
        );

        sendResponse(routeResult);
      } else {
        sendResponse({ error: 'Route not found' });
      }
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }

  private clearRoutes(payload: Record<string, unknown>): void {
    const mapId = payload.mapId as string;

    const mapState = this.maps.get(mapId);
    if (mapState) {
      mapState.routes = [];
    }

    window.dispatchEvent(
      new CustomEvent('bazari:map:clearRoutes', {
        detail: { mapId },
      })
    );
  }

  private fitBounds(payload: Record<string, unknown>): void {
    const mapId = payload.mapId as string;
    const coords = payload.coords as Coordinates[];

    window.dispatchEvent(
      new CustomEvent('bazari:map:fitBounds', {
        detail: { mapId, coords },
      })
    );
  }

  private destroyMap(payload: Record<string, unknown>): void {
    const mapId = payload.mapId as string;
    this.maps.delete(mapId);

    window.dispatchEvent(
      new CustomEvent('bazari:map:destroy', {
        detail: { mapId },
      })
    );
  }

  private async showFullscreen(
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    // Emitir evento para abrir modal de mapa fullscreen
    window.dispatchEvent(
      new CustomEvent('bazari:map:showFullscreen', {
        detail: payload,
      })
    );
    sendResponse({ success: true });
  }

  private async pickLocation(
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    // Emitir evento para abrir picker de localização
    // A resposta virá via evento
    const handlePick = (event: Event) => {
      const customEvent = event as CustomEvent;
      sendResponse(customEvent.detail.coords);
      window.removeEventListener('bazari:map:locationPicked', handlePick);
    };

    window.addEventListener('bazari:map:locationPicked', handlePick);

    window.dispatchEvent(
      new CustomEvent('bazari:map:pickLocation', {
        detail: payload,
      })
    );
  }

  private async openNavigation(
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    const destination = payload.destination as Coordinates;
    const mode = (payload.mode as string) || 'driving';

    // Detectar plataforma e abrir app de mapas apropriado
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let url: string;

    if (isIOS) {
      // Apple Maps
      const dirMode = mode === 'walking' ? 'w' : mode === 'cycling' ? 'w' : 'd';
      url = `https://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}&dirflg=${dirMode}`;
    } else if (isAndroid) {
      // Google Maps intent
      url = `google.navigation:q=${destination.latitude},${destination.longitude}&mode=${mode === 'walking' ? 'w' : mode === 'cycling' ? 'b' : 'd'}`;
    } else {
      // Web - Google Maps
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=${mode}`;
    }

    window.open(url, '_blank');
    sendResponse({ success: true });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.maps.forEach((_, mapId) => {
      window.dispatchEvent(
        new CustomEvent('bazari:map:destroy', {
          detail: { mapId },
        })
      );
    });
    this.maps.clear();
  }
}
