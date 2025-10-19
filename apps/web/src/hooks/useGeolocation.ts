import { useState, useEffect, useRef, useCallback } from 'react';
import { deliveryApi } from '@/lib/api/delivery';
import { toast } from 'sonner';

export interface GeolocationCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface UseGeolocationReturn {
  location: GeolocationCoordinates | null;
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  requestPermission: () => void;
  startTracking: () => void;
  stopTracking: () => void;
}

const LOCATION_UPDATE_INTERVAL = 300000; // 5 minutos (reduzido para evitar overhead)
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false, // Desativar alta precisão para economizar bateria
  timeout: 10000,
  maximumAge: 60000, // Cache de 1 minuto
};

export function useGeolocation(autoStart = false): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  // Sincronizar localização com o backend
  const syncLocation = useCallback(async (coords: GeolocationCoordinates) => {
    try {
      await deliveryApi.updateLocation({
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
      });
      console.log('[Geolocation] Localização sincronizada com o backend', coords);
    } catch (err: any) {
      console.error('[Geolocation] Erro ao sincronizar localização:', err);
    }
  }, []);

  // Handler de sucesso do geolocation
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const coords: GeolocationCoordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };

    setLocation(coords);
    setError(null);
    setIsEnabled(true);
    setIsLoading(false);

    console.log('[Geolocation] Localização obtida:', coords);
  }, []);

  // Handler de erro do geolocation
  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage: string;

    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = 'Permissão de localização negada';
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Localização indisponível';
        break;
      case err.TIMEOUT:
        errorMessage = 'Timeout ao obter localização';
        break;
      default:
        errorMessage = 'Erro ao obter localização';
    }

    setError(errorMessage);
    setIsEnabled(false);
    setIsLoading(false);

    console.error('[Geolocation] Erro:', errorMessage, err);
  }, []);

  // Iniciar rastreamento
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada pelo navegador');
      setIsLoading(false);
      return;
    }

    console.log('[Geolocation] Iniciando rastreamento...');
    setIsLoading(true);

    // Obter localização imediatamente
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleSuccess(position);
        const coords: GeolocationCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        // Sincronizar imediatamente
        syncLocation(coords);
      },
      handleError,
      GEOLOCATION_OPTIONS
    );

    // REMOVER watchPosition para evitar atualizações constantes
    // Usar apenas polling com intervalo para economizar recursos

    // Sincronizar e atualizar periodicamente
    syncIntervalRef.current = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleSuccess(position);
          const coords: GeolocationCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          syncLocation(coords);
        },
        handleError,
        GEOLOCATION_OPTIONS
      );
    }, LOCATION_UPDATE_INTERVAL);
  }, [handleSuccess, handleError, syncLocation]); // REMOVIDO 'location' para evitar loop

  // Parar rastreamento
  const stopTracking = useCallback(() => {
    console.log('[Geolocation] Parando rastreamento...');

    // Limpar apenas o intervalo (não há mais watchPosition)
    if (syncIntervalRef.current !== null) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    setIsEnabled(false);
  }, []);

  // Solicitar permissão e iniciar
  const requestPermission = useCallback(() => {
    startTracking();
  }, [startTracking]);

  // Auto-start se solicitado
  useEffect(() => {
    if (autoStart && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startTracking();
    }

    // Cleanup ao desmontar
    return () => {
      if (hasStartedRef.current) {
        stopTracking();
        hasStartedRef.current = false;
      }
    };
  }, [autoStart]); // APENAS autoStart como dependência

  // Remover sincronização automática - será feita apenas pelo intervalo
  // para evitar loops infinitos

  return {
    location,
    error,
    isEnabled,
    isLoading,
    requestPermission,
    startTracking,
    stopTracking,
  };
}
