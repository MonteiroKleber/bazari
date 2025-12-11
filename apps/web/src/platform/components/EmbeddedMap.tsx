import { useEffect, useRef, useState, useCallback } from 'react';

// Tipos
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface MarkerData {
  id?: string;
  position: Coordinates;
  title?: string;
  popup?: string;
  color?: string;
}

interface EmbeddedMapProps {
  center: Coordinates;
  zoom?: number;
  markers?: MarkerData[];
  onMarkerClick?: (index: number) => void;
  onMapClick?: (coords: Coordinates) => void;
  interactive?: boolean;
  showUserLocation?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

// Declaração do Leaflet (carregado via CDN)
declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

/**
 * Componente de mapa embarcado usando OpenStreetMap/Leaflet
 */
export function EmbeddedMap({
  center,
  zoom = 13,
  markers = [],
  onMarkerClick,
  onMapClick,
  interactive = true,
  showUserLocation = false,
  style,
  className = '',
}: EmbeddedMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Carregar Leaflet via CDN
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // Carregar CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    // Carregar JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Não remover scripts pois podem ser usados por outros componentes
    };
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;

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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Click no mapa
    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        });
      });
    }

    mapInstanceRef.current = map;

    // Invalidar tamanho após renderização
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletLoaded]);

  // Atualizar centro e zoom
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([center.latitude, center.longitude], zoom);
    }
  }, [center.latitude, center.longitude, zoom]);

  // Atualizar markers
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;

    const L = window.L;

    // Remover markers antigos
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Adicionar novos markers
    markers.forEach((markerData, index) => {
      const icon = L.divIcon({
        className: 'bzr-map-marker',
        html: `<div style="
          width: 24px;
          height: 24px;
          background: ${markerData.color || '#3b82f6'};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      const marker = L.marker(
        [markerData.position.latitude, markerData.position.longitude],
        { icon }
      ).addTo(mapInstanceRef.current!);

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
        markers.map((m) => [m.position.latitude, m.position.longitude] as [number, number])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, onMarkerClick, leafletLoaded]);

  // Mostrar localização do usuário
  useEffect(() => {
    if (!showUserLocation || !mapInstanceRef.current || !leafletLoaded) return;

    const L = window.L;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userIcon = L.divIcon({
          className: 'bzr-user-marker',
          html: `<div style="
            width: 16px;
            height: 16px;
            background: #3b82f6;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 0 2px #3b82f6, 0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        userMarkerRef.current = L.marker(
          [position.coords.latitude, position.coords.longitude],
          { icon: userIcon }
        )
          .addTo(mapInstanceRef.current!)
          .bindTooltip('Sua localização');
      },
      (error) => {
        console.warn('Erro ao obter localização:', error.message);
      }
    );

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [showUserLocation, leafletLoaded]);

  // Métodos públicos via ref
  const setCenter = useCallback((coords: Coordinates, newZoom?: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [coords.latitude, coords.longitude],
        newZoom ?? mapInstanceRef.current.getZoom()
      );
    }
  }, []);

  const fitBounds = useCallback((coords: Coordinates[]) => {
    if (mapInstanceRef.current && coords.length > 0 && window.L) {
      const bounds = window.L.latLngBounds(
        coords.map((c) => [c.latitude, c.longitude] as [number, number])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, []);

  if (!leafletLoaded) {
    return (
      <div
        className={`bzr-map-loading ${className}`}
        style={{
          width: '100%',
          height: '300px',
          borderRadius: '12px',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <span style={{ color: '#6b7280' }}>Carregando mapa...</span>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`bzr-embedded-map ${className}`}
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

/**
 * Componente de picker de localização
 */
export function LocationPicker({
  initialPosition,
  onSelect,
  onCancel,
}: {
  initialPosition?: Coordinates;
  onSelect: (coords: Coordinates) => void;
  onCancel: () => void;
}) {
  const [selectedPosition, setSelectedPosition] = useState<Coordinates | null>(
    initialPosition || null
  );

  const defaultCenter = initialPosition || {
    latitude: -23.55,
    longitude: -46.63,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '18px' }}>Selecione a localização</h3>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
          }}
        >
          &times;
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <EmbeddedMap
          center={defaultCenter}
          zoom={15}
          markers={
            selectedPosition
              ? [{ position: selectedPosition, color: '#22c55e' }]
              : []
          }
          onMapClick={setSelectedPosition}
          style={{ height: '100%', borderRadius: 0 }}
        />
      </div>

      <div
        style={{
          background: 'white',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => selectedPosition && onSelect(selectedPosition)}
          disabled={!selectedPosition}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: selectedPosition ? '#3b82f6' : '#9ca3af',
            color: 'white',
            cursor: selectedPosition ? 'pointer' : 'not-allowed',
          }}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
