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

/**
 * Handler de localização para a plataforma host
 * Processa mensagens de location do SDK
 */
export class LocationHandler {
  private watchPositions: Map<string, number> = new Map();
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
      case 'location:getCurrentPosition':
        return this.getCurrentPosition(payload, sendResponse);

      case 'location:watchPosition':
        return this.watchPosition(payload, sendResponse);

      case 'location:clearWatch':
        return this.clearWatch(payload);

      case 'location:geocode':
        return this.geocode(payload, sendResponse);

      case 'location:reverseGeocode':
        return this.reverseGeocode(payload as Coordinates, sendResponse);

      case 'location:calculateDistance':
        return this.calculateDistance(payload, sendResponse);
    }
  }

  private async getCurrentPosition(
    options: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: (options.enableHighAccuracy as boolean) ?? true,
          timeout: (options.timeout as number) ?? 10000,
          maximumAge: (options.maximumAge as number) ?? 0,
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

  private async watchPosition(
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    const watchId = payload.watchId as string;
    const options = payload.options as Record<string, unknown> | undefined;

    const nativeWatchId = navigator.geolocation.watchPosition(
      (position) => {
        // Enviar posição de volta para o iframe
        const message = {
          type: 'location:positionUpdate',
          watchId,
          position: {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          },
        };

        if (this.appIframe?.contentWindow) {
          this.appIframe.contentWindow.postMessage(message, '*');
        } else {
          window.postMessage(message, '*');
        }
      },
      (error) => {
        const errorMessage = {
          type: 'location:positionError',
          watchId,
          error: { code: error.code, message: error.message },
        };

        if (this.appIframe?.contentWindow) {
          this.appIframe.contentWindow.postMessage(errorMessage, '*');
        } else {
          window.postMessage(errorMessage, '*');
        }
      },
      {
        enableHighAccuracy: (options?.enableHighAccuracy as boolean) ?? true,
        timeout: (options?.timeout as number) ?? 10000,
        maximumAge: (options?.maximumAge as number) ?? 0,
      }
    );

    this.watchPositions.set(watchId, nativeWatchId);
    sendResponse({ success: true });
  }

  private clearWatch(payload: Record<string, unknown>): void {
    const watchId = payload.watchId as string;
    const nativeWatchId = this.watchPositions.get(watchId);
    if (nativeWatchId !== undefined) {
      navigator.geolocation.clearWatch(nativeWatchId);
      this.watchPositions.delete(watchId);
    }
  }

  private async geocode(
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    const address = payload.address as string;

    try {
      // Usar Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
        {
          headers: {
            'User-Agent': 'Bazari-App/1.0',
          },
        }
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

  private async reverseGeocode(
    coords: Coordinates,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
        {
          headers: {
            'User-Agent': 'Bazari-App/1.0',
          },
        }
      );
      const result = await response.json();

      sendResponse(result.display_name || null);
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }

  private async calculateDistance(
    payload: Record<string, unknown>,
    sendResponse: (data: unknown) => void
  ): Promise<void> {
    const from = payload.from as Coordinates;
    const to = payload.to as Coordinates;
    const mode = payload.mode as string;

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

  /**
   * Cleanup - parar todos os watches
   */
  destroy(): void {
    this.watchPositions.forEach((nativeWatchId) => {
      navigator.geolocation.clearWatch(nativeWatchId);
    });
    this.watchPositions.clear();
  }
}
