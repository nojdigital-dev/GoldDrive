import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para ícones do leaflet no vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: typeof icon === 'string' ? icon : (icon as any).src,
    shadowUrl: typeof iconShadow === 'string' ? iconShadow : (iconShadow as any).src,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Componente auxiliar para corrigir renderização ao redimensionar
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    // Força o leaflet a recalcular o tamanho do container após montar
    const timer = setTimeout(() => {
        map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// Componente para atualizar o centro do mapa dinamicamente
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, {
        animate: true,
        duration: 1.5
    });
  }, [center, map]);
  return null;
};

interface MapProps {
  className?: string;
  showPickup?: boolean;
  showDestination?: boolean;
}

const MapComponent = ({ className = "h-full w-full", showPickup = false, showDestination = false }: MapProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const centerPosition: [number, number] = [-23.55052, -46.633309]; // São Paulo
  const destinationPos: [number, number] = [-23.559, -46.640]; 

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
        <div className="h-full w-full bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-2">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-sm">Carregando mapa...</span>
        </div>
    );
  }

  return (
    <div className={`relative z-0 ${className} bg-gray-100`}>
      <MapContainer 
        center={centerPosition} 
        zoom={13} 
        scrollWheelZoom={true} 
        className="h-full w-full isolate"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapResizer />

        {showPickup && (
            <Marker position={centerPosition}>
              <Popup>Sua Localização</Popup>
            </Marker>
        )}

        {showDestination && (
             <Marker position={destinationPos}>
              <Popup>Destino</Popup>
            </Marker>
        )}

        <MapUpdater center={centerPosition} />
      </MapContainer>
      
      {/* Overlay gradiente para melhor leitura de UI sobre o mapa */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/40 via-transparent to-white/60 z-[400]" />
    </div>
  );
};

export default MapComponent;