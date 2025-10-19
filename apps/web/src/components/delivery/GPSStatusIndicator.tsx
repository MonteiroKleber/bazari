import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, MapPinOff, AlertCircle, AlertTriangle } from 'lucide-react';
import type { UseGeolocationReturn } from '@/hooks/useGeolocation';

interface GPSStatusIndicatorProps {
  geolocation: UseGeolocationReturn;
  compact?: boolean;
}

export function GPSStatusIndicator({ geolocation, compact = false }: GPSStatusIndicatorProps) {
  const { location, isEnabled, error, isLoading, requestPermission } = geolocation;

  // Versão compacta (para header/navbar)
  if (compact) {
    if (error) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={requestPermission}
          className="text-red-600 hover:text-red-700"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          GPS Erro
        </Button>
      );
    }

    if (!isEnabled) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={requestPermission}
          className="text-yellow-600 hover:text-yellow-700"
        >
          <MapPinOff className="h-4 w-4 mr-2" />
          GPS Desativado
        </Button>
      );
    }

    if (isLoading) {
      return (
        <Badge variant="secondary" className="gap-2">
          <MapPin className="h-3 w-3 animate-pulse" />
          Obtendo GPS...
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="gap-2 bg-green-600">
        <MapPin className="h-3 w-3" />
        GPS Ativo {location && `(±${location.accuracy.toFixed(0)}m)`}
      </Badge>
    );
  }

  // Versão completa (para alertas em páginas)
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro de Localização</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={requestPermission}>
            Tentar Novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!isEnabled) {
    return (
      <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
          GPS Desativado
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-3 text-yellow-700 dark:text-yellow-300">
          <span>
            Ative sua localização para ver apenas demandas próximas a você. Sem o GPS, você verá todas as demandas da plataforma.
          </span>
          <Button
            size="sm"
            onClick={requestPermission}
            className="w-fit bg-yellow-600 hover:bg-yellow-700"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Ativar GPS
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Alert>
        <MapPin className="h-4 w-4 animate-pulse" />
        <AlertTitle>Obtendo Localização...</AlertTitle>
        <AlertDescription>
          Aguardando permissão de localização do navegador...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
      <MapPin className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800 dark:text-green-200">
        GPS Ativo
      </AlertTitle>
      <AlertDescription className="text-green-700 dark:text-green-300">
        Localização atualizada {location && `com precisão de ±${location.accuracy.toFixed(0)}m`}
      </AlertDescription>
    </Alert>
  );
}
