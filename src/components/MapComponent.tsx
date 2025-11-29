import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para ícones do leaflet no vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Componente para atualizar o centro do mapa
const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14);
  }, [center, map]);
  return null;
};

interface MapProps {
  className?: string;
  showPickup?: boolean;
  showDestination?: boolean;
}

const MapComponent = ({ className = "h-full w-full", showPickup = false, showDestination = false }: MapProps) => {
  const centerPosition: [number, number] = [-23.55052, -46.633309]; // São Paulo
  const destinationPos: [number, number] = [-23.559, -46.640]; 

  return (
    <div className={`relative z-0 ${className}`}>
      <MapContainer 
        center={centerPosition} 
        zoom={13} 
        scrollWheelZoom={false} 
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
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