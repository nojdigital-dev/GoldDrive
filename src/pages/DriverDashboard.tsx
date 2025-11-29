import React, { useState } from "react";
import { Wallet, User, MapPin, Navigation, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import MapComponent from "@/components/MapComponent";
import { useRide } from "@/context/RideContext";
import { showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const DriverDashboard = () => {
  const { ride, acceptRide, finishRide } = useRide();
  const [isOnline, setIsOnline] = useState(false);

  // Calcula se deve mostrar o modal de nova corrida
  const showRequest = isOnline && ride?.status === 'SEARCHING';
  const isOnTrip = ride?.status === 'ACCEPTED' || ride?.status === 'IN_PROGRESS';

  const handleAccept = () => {
    acceptRide();
    showSuccess("Corrida aceita! Navegando para passageiro.");
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 relative">
      {/* Header Fixo */}
      <header className="bg-zinc-900 text-white p-4 shadow-md z-30">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-zinc-700 p-2 rounded-full"><User className="w-5 h-5" /></div>
             <div>
                <div className="font-bold text-sm">Carlos Mot.</div>
                <div className="text-xs text-yellow-400">★ 4.98</div>
             </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-800 px-4 py-2 rounded-full">
             <span className={`text-xs font-bold ${isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
             </span>
             <Switch checked={isOnline} onCheckedChange={setIsOnline} className="data-[state=checked]:bg-green-500" />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 relative">
        {isOnline ? (
            <div className="h-full w-full relative">
                <MapComponent className="h-full w-full" showPickup={isOnTrip} />
                
                {/* Floating Status Pill */}
                {!isOnTrip && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-white px-6 py-2 rounded-full shadow-lg backdrop-blur z-20">
                        <p className="text-sm font-medium animate-pulse">Procurando corridas...</p>
                    </div>
                )}

                {/* Painel de Viagem em Andamento */}
                {isOnTrip && (
                    <div className="absolute bottom-0 left-0 right-0 bg-white p-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.2)] z-20">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Em viagem</h3>
                                <p className="text-gray-500">Destino: {ride?.destination}</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-xl font-bold text-green-600">R$ {ride?.price}</h3>
                                <p className="text-gray-400 text-sm">Dinheiro</p>
                            </div>
                        </div>
                        <Button className="w-full py-6 text-lg bg-green-600 hover:bg-green-700" onClick={finishRide}>
                            Finalizar Corrida
                        </Button>
                    </div>
                )}
            </div>
        ) : (
            <div className="p-6 space-y-6">
                 <Card className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border-0 shadow-xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-zinc-400 text-sm">Saldo total</p>
                                <h2 className="text-4xl font-bold">R$ 842,50</h2>
                            </div>
                            <Wallet className="w-8 h-8 opacity-50" />
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-white/10 px-4 py-2 rounded-lg flex-1">
                                <p className="text-xs text-zinc-400">Corridas</p>
                                <p className="font-bold text-lg">12</p>
                            </div>
                            <div className="bg-white/10 px-4 py-2 rounded-lg flex-1">
                                <p className="text-xs text-zinc-400">Horas</p>
                                <p className="font-bold text-lg">6.5h</p>
                            </div>
                        </div>
                    </CardContent>
                 </Card>

                 <h3 className="font-bold text-gray-800">Ações Rápidas</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-24 flex flex-col gap-2 border-gray-200">
                        <Shield className="w-6 h-6 text-blue-600" />
                        Segurança
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 border-gray-200">
                        <Navigation className="w-6 h-6 text-green-600" />
                        Destino Definido
                    </Button>
                 </div>
            </div>
        )}
      </div>

      {/* Toca da Corrida (Popup) */}
      <Dialog open={showRequest}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-green-400">Nova Corrida!</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4 text-center">
             <div className="flex justify-center gap-8">
                 <div className="text-center">
                     <p className="text-gray-400 text-xs uppercase">Distância</p>
                     <p className="text-2xl font-bold">2.4 km</p>
                 </div>
                 <div className="text-center">
                     <p className="text-gray-400 text-xs uppercase">Ganho</p>
                     <p className="text-2xl font-bold text-green-400">R$ 18,50</p>
                 </div>
             </div>
             
             <div className="bg-zinc-800 p-4 rounded-xl text-left space-y-3">
                 <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-blue-500" />
                     <p className="text-sm font-medium">{ride?.pickup}</p>
                 </div>
                 <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-green-500" />
                     <p className="text-sm font-medium">{ride?.destination}</p>
                 </div>
             </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:justify-center">
            <Button className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold" onClick={handleAccept}>
                ACEITAR CORRIDA
            </Button>
            <Button variant="ghost" className="w-full text-gray-400 hover:text-white hover:bg-zinc-800">
                Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDashboard;