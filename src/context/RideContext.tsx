import React, { createContext, useContext, useState, ReactNode } from 'react';

export type RideStatus = 'IDLE' | 'SEARCHING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED';

interface RideData {
  pickup: string;
  destination: string;
  price: string;
  distance: string;
  passengerName: string;
  driverName?: string;
  status: RideStatus;
}

interface RideContextType {
  ride: RideData | null;
  requestRide: (pickup: string, destination: string, price: string, distance: string) => void;
  acceptRide: () => void;
  startRide: () => void;
  finishRide: () => void;
  cancelRide: () => void;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider = ({ children }: { children: ReactNode }) => {
  const [ride, setRide] = useState<RideData | null>(null);

  const requestRide = (pickup: string, destination: string, price: string, distance: string) => {
    setRide({
      pickup,
      destination,
      price,
      distance,
      passengerName: "Usuário Teste",
      status: 'SEARCHING'
    });
  };

  const acceptRide = () => {
    if (ride) setRide({ ...ride, status: 'ACCEPTED', driverName: "Carlos Motorista" });
  };

  const startRide = () => {
    if (ride) setRide({ ...ride, status: 'IN_PROGRESS' });
  };

  const finishRide = () => {
    if (ride) setRide({ ...ride, status: 'COMPLETED' });
    // Reset após 5 segundos para demo
    setTimeout(() => setRide(null), 5000);
  };

  const cancelRide = () => {
    setRide(null);
  };

  return (
    <RideContext.Provider value={{ ride, requestRide, acceptRide, startRide, finishRide, cancelRide }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};