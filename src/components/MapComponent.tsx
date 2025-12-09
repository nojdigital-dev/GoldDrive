import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix oficial para ícones do Leaflet em React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ícone Personalizado para Origem (Verde)
const PickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Ícone Personalizado para Destino (Vermelho)
const DestinationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Componente para controlar o mapa (Zoom e Pan)
const MapController = ({ 
    center, 
    pickup, 
    destination,
    routeCoords 
}: { 
    center: [number, number], 
    pickup?: [number, number] | null, 
    destination?: [number, number] | null,
    routeCoords?: [number, number][] 
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // 1. Prioridade: Se tiver uma rota desenhada, foca nela
    if (routeCoords && routeCoords.length > 0) {
        const bounds = L.latLngBounds(routeCoords);
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    } 
    // 2. Se tiver origem e destino, foca nos dois
    else if (pickup && destination) {
        const bounds = L.latLngBounds([pickup, destination]);
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
    // 3. Se tiver só um ponto (ex: origem selecionada), vai para ele
    else if (pickup) {
        map.flyTo(pickup, 16, { animate: true, duration: 1.5 });
    }
    // 4. Default
    else {
        map.flyTo(center, 13);
    }

    // Force resize apenas uma vez para corrigir problemas de renderização
    map.invalidateSize();
  }, [center, pickup, destination, routeCoords, map]);

  return null;
};

interface MapProps {
  className?: string;
  pickupLocation?: { lat: number; lon: number } | null;
  destinationLocation?: { lat: number; lon: number } | null;
  routeCoordinates?: [number, number][]; 
}

const MapComponent = ({ 
    className = "h-full w-full", 
    pickupLocation, 
    destinationLocation,
    routeCoordinates 
}: MapProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const defaultCenter: [number, number] = [-23.55052, -46.633309]; // SP Default

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
        <div className="h-full w-full bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-2">
            <span className="text-sm">Carregando mapa...</span>
        </div>
    );
  }

  // Prepara posições para o Leaflet
  const pickupPos: [number, number] | null = pickupLocation ? [pickupLocation.lat, pickupLocation.lon] : null;
  const destPos: [number, number] | null = destinationLocation ? [destinationLocation.lat, destinationLocation.lon] : null;
  const activeCenter = pickupPos || defaultCenter;

  return (
    <div className={`relative z-0 ${className} bg-gray-100`}>
      <MapContainer 
        center={activeCenter} 
        zoom={13} 
        scrollWheelZoom={false} 
        className="h-full w-full isolate"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* Marcador de Origem */}
        {pickupPos && (
            <Marker 
                key={`pickup-${pickupPos[0]}-${pickupPos[1]}`} 
                position={pickupPos} 
                icon={PickupIcon}
            >
              <Popup>Local de Embarque</Popup>
            </Marker>
        )}

        {/* Marcador de Destino */}
        {destPos && (
             <Marker 
                key={`dest-${destPos[0]}-${destPos[1]}`} 
                position={destPos} 
                icon={DestinationIcon}
             >
              <Popup>Destino</Popup>
            </Marker>
        )}

        {/* Linha da Rota */}
        {routeCoordinates && routeCoordinates.length > 0 && (
            <Polyline 
                key={`route-${routeCoordinates.length}`}
                positions={routeCoordinates} 
                color="#000"
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
            />
        )}

        <MapController 
            center={defaultCenter} 
            pickup={pickupPos} 
            destination={destPos} 
            routeCoords={routeCoordinates}
        />
      </MapContainer>
      
      {/* Overlay gradiente */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/40 via-transparent to-white/60 z-[400]" />
    </div>
  );
};

export default MapComponent;