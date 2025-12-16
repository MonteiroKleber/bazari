# P3: SDK de GPS e Mapas

**Prioridade:** P3 (Baixa)
**Status:** Pendente
**Esforço:** Alto
**Impacto:** Médio

---

## Objetivo

Adicionar APIs de geolocalização e mapas ao SDK para habilitar casos de uso como:
- Apps de delivery
- Rastreamento de pedidos
- Localização de lojas
- Rotas e navegação

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GPS & MAPS ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        @bazari.libervia.xyz/app-sdk                                │   │
│  │                                                                       │   │
│  │  sdk.location.getCurrentPosition()                                   │   │
│  │  sdk.location.watchPosition(callback)                                │   │
│  │  sdk.location.calculateDistance(from, to)                            │   │
│  │                                                                       │   │
│  │  sdk.maps.showMap(container, options)                                │   │
│  │  sdk.maps.addMarker(position, options)                               │   │
│  │  sdk.maps.drawRoute(from, to)                                        │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     BAZARI HOST (Platform)                            │   │
│  │                                                                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │   │
│  │  │   Geolocation   │  │    OpenMaps     │  │    Routing      │       │   │
│  │  │     API         │  │    Leaflet      │  │     OSRM        │       │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Permissões

Adicionar novas permissões ao sistema:

```typescript
// packages/bazari-app-sdk/src/types/permissions.ts

export const LOCATION_PERMISSIONS = {
  'location.coarse': {
    id: 'location.coarse',
    name: 'Localização Aproximada',
    description: 'Acesso à localização aproximada (cidade/bairro)',
    risk: 'medium',
  },
  'location.precise': {
    id: 'location.precise',
    name: 'Localização Precisa',
    description: 'Acesso à localização GPS precisa',
    risk: 'high',
  },
  'location.background': {
    id: 'location.background',
    name: 'Localização em Background',
    description: 'Rastrear localização mesmo com app em segundo plano',
    risk: 'high',
  },
};
```

---

## Implementação

### Task 1: Location Client no SDK

**Arquivo:** `packages/bazari-app-sdk/src/client/location.ts`

```typescript
import { sendMessage } from '../utils/bridge';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface Position {
  coords: Coordinates;
  timestamp: number;
}

export interface PositionError {
  code: number;
  message: string;
}

export interface WatchOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface DistanceResult {
  distanceKm: number;
  distanceMeters: number;
  durationMinutes?: number;
  durationSeconds?: number;
}

/**
 * API de Localização do SDK
 */
export class LocationClient {
  private watchCallbacks: Map<string, (position: Position) => void> = new Map();

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

    // Enviar mensagem para iniciar watch
    sendMessage('location:watchPosition', { watchId, options })
      .then(() => {
        // Watch iniciado com sucesso
      })
      .catch((error) => {
        errorCallback?.({ code: 1, message: error.message });
        this.watchCallbacks.delete(watchId);
      });

    // Ouvir atualizações
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'location:positionUpdate' && event.data.watchId === watchId) {
        callback(event.data.position);
      }
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
}
```

---

### Task 2: Maps Client no SDK

**Arquivo:** `packages/bazari-app-sdk/src/client/maps.ts`

```typescript
import { sendMessage } from '../utils/bridge';
import type { Coordinates } from './location';

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
   */
  async pickLocation(options?: {
    initialPosition?: Coordinates;
    title?: string;
  }): Promise<Coordinates | null> {
    return sendMessage('maps:pickLocation', options || {});
  }

  /**
   * Abre navegação turn-by-turn (abre app de mapas nativo)
   */
  async openNavigation(destination: Coordinates, options?: {
    mode?: 'driving' | 'walking' | 'cycling';
    startFromCurrentLocation?: boolean;
  }): Promise<void> {
    return sendMessage('maps:openNavigation', { destination, ...options });
  }
}
```

---

### Task 3: Implementar no Host (Platform)

**Arquivo:** `apps/web/src/platform/handlers/location-handler.ts`

```typescript
import type { Coordinates, Position } from '@bazari.libervia.xyz/app-sdk';

export class LocationHandler {
  private watchPositions: Map<string, number> = new Map();

  async handleMessage(type: string, payload: any, sendResponse: (data: any) => void) {
    switch (type) {
      case 'location:getCurrentPosition':
        return this.getCurrentPosition(payload, sendResponse);

      case 'location:watchPosition':
        return this.watchPosition(payload, sendResponse);

      case 'location:clearWatch':
        return this.clearWatch(payload);

      case 'location:geocode':
        return this.geocode(payload, sendResponse);

      case 'location:reverseGeocode':
        return this.reverseGeocode(payload, sendResponse);

      case 'location:calculateDistance':
        return this.calculateDistance(payload, sendResponse);
    }
  }

  private async getCurrentPosition(options: any, sendResponse: (data: any) => void) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 10000,
          maximumAge: options.maximumAge ?? 0,
        });
      });

      sendResponse({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        },
        timestamp: position.timestamp,
      });
    } catch (error) {
      sendResponse({ error: (error as GeolocationPositionError).message });
    }
  }

  private async watchPosition(payload: any, sendResponse: (data: any) => void) {
    const { watchId, options } = payload;

    const nativeWatchId = navigator.geolocation.watchPosition(
      (position) => {
        // Enviar posição de volta para o iframe
        window.postMessage({
          type: 'location:positionUpdate',
          watchId,
          position: {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
            timestamp: position.timestamp,
          },
        }, '*');
      },
      (error) => {
        window.postMessage({
          type: 'location:positionError',
          watchId,
          error: { code: error.code, message: error.message },
        }, '*');
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0,
      }
    );

    this.watchPositions.set(watchId, nativeWatchId);
    sendResponse({ success: true });
  }

  private clearWatch(payload: any) {
    const { watchId } = payload;
    const nativeWatchId = this.watchPositions.get(watchId);
    if (nativeWatchId !== undefined) {
      navigator.geolocation.clearWatch(nativeWatchId);
      this.watchPositions.delete(watchId);
    }
  }

  private async geocode(payload: any, sendResponse: (data: any) => void) {
    const { address } = payload;

    try {
      // Usar Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const results = await response.json();

      if (results.length > 0) {
        sendResponse({
          latitude: parseFloat(results[0].lat),
          longitude: parseFloat(results[0].lon),
        });
      } else {
        sendResponse(null);
      }
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }

  private async reverseGeocode(payload: Coordinates, sendResponse: (data: any) => void) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${payload.latitude}&lon=${payload.longitude}`
      );
      const result = await response.json();

      sendResponse(result.display_name || null);
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }

  private async calculateDistance(payload: any, sendResponse: (data: any) => void) {
    const { from, to, mode } = payload;

    try {
      // Usar OSRM para routing
      const profile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'car';
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=false`
      );
      const result = await response.json();

      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        sendResponse({
          distanceKm: route.distance / 1000,
          distanceMeters: route.distance,
          durationMinutes: route.duration / 60,
          durationSeconds: route.duration,
        });
      } else {
        sendResponse({ error: 'Route not found' });
      }
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }
}
```

---

### Task 4: Componente de Mapa

**Arquivo:** `apps/web/src/platform/components/EmbeddedMap.tsx`

```typescript
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface EmbeddedMapProps {
  center: { latitude: number; longitude: number };
  zoom?: number;
  markers?: Array<{
    position: { latitude: number; longitude: number };
    title?: string;
    popup?: string;
  }>;
  onMarkerClick?: (index: number) => void;
  interactive?: boolean;
  style?: React.CSSProperties;
}

export function EmbeddedMap({
  center,
  zoom = 13,
  markers = [],
  onMarkerClick,
  interactive = true,
  style,
}: EmbeddedMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Criar mapa
    const map = L.map(mapRef.current, {
      center: [center.latitude, center.longitude],
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
    });

    // Adicionar tiles do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Atualizar centro
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([center.latitude, center.longitude], zoom);
    }
  }, [center.latitude, center.longitude, zoom]);

  // Atualizar markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remover markers antigos
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Adicionar novos markers
    markers.forEach((markerData, index) => {
      const marker = L.marker([markerData.position.latitude, markerData.position.longitude])
        .addTo(mapInstanceRef.current!);

      if (markerData.popup) {
        marker.bindPopup(markerData.popup);
      }

      if (markerData.title) {
        marker.bindTooltip(markerData.title);
      }

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(index));
      }

      markersRef.current.push(marker);
    });

    // Ajustar bounds se tiver múltiplos markers
    if (markers.length > 1) {
      const bounds = L.latLngBounds(
        markers.map((m) => [m.position.latitude, m.position.longitude])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, onMarkerClick]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '300px',
        borderRadius: '12px',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}
```

---

### Task 5: Adicionar ao SDK

**Arquivo:** `packages/bazari-app-sdk/src/client/sdk.ts`

```typescript
// Adicionar imports
import { LocationClient } from './location';
import { MapsClient } from './maps';

export class BazariSDK {
  // ... existing clients ...

  /** API de localização */
  readonly location: LocationClient;

  /** API de mapas */
  readonly maps: MapsClient;

  constructor(options: BazariSDKOptions = {}) {
    // ... existing initialization ...

    this.location = new LocationClient();
    this.maps = new MapsClient();
  }
}
```

---

## Exemplo de Uso: App de Delivery

```typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

// Componente de rastreamento de pedido
async function TrackingPage() {
  // Obter posição do entregador (atualiza em tempo real)
  const watchId = sdk.location.watchPosition((position) => {
    updateDeliveryMarker(position.coords);
    calculateETA(position.coords);
  });

  // Criar mapa
  const map = await sdk.maps.createMap('map-container', {
    center: { latitude: -23.55, longitude: -46.63 },
    zoom: 14,
  });

  // Adicionar marker do destino
  map.addMarker({
    position: destinationCoords,
    title: 'Seu endereço',
    icon: 'home',
    color: 'green',
  });

  // Desenhar rota
  const route = await map.drawRoute({
    from: deliveryPosition,
    to: destinationCoords,
    mode: 'driving',
    color: '#3b82f6',
  });

  // Mostrar ETA
  showETA(route.durationMinutes);

  // Cleanup
  return () => {
    sdk.location.clearWatch(watchId);
    map.destroy();
  };
}
```

---

## Critérios de Aceite

- [ ] LocationClient implementado no SDK
- [ ] MapsClient implementado no SDK
- [ ] Handler de location no host
- [ ] Handler de maps no host
- [ ] Componente EmbeddedMap funcional
- [ ] Permissões de location definidas
- [ ] Geocoding funcionando
- [ ] Routing funcionando
- [ ] Documentação de uso

---

**Versão:** 1.0.0
**Data:** 2024-12-07
