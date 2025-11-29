import React, { useState, useEffect } from "react";
import MapComponent from "@/components/MapComponent";
import { 
  MapPin, Menu, User, ArrowLeft, Car, Navigation, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRide } from "@/context/RideContext";
import { showSuccess, showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

// Mocks apenas para distâncias
const MOCK_LOCATIONS = [
    { id: "short", label: "Shopping Center (2km)", distance: "2.1 km", km: 2.1 },
    { id: "medium", label: "Centro da Cidade (5km)", distance: "5.0 km", km: 5.0 },
    { id: "long", label: "Aeroporto (15km)", distance: "15.4 km", km: 15.4 }
];

type Category = {
    id: string;
    name: string;
    description: string;
    base_fare: number;
    cost_per_km: number;
    min_fare: number;
};

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { ride, requestRide, cancelRide } = useRide();
  
  // Estados
  const [step, setStep] = useState<'search' | 'confirm' | 'waiting'>('search');
  const [pickup, setPickup] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // Dados do DB
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // Carregar categorias do banco
  useEffect(() => {
    const fetchCategories = async () => {
        setLoadingCats(true);
        const { data } = await supabase.from('car_categories').select('*').order('base_fare', { ascending: true });
        if (data) {
            setCategories(data);
            if(data.length > 0) setSelectedCategoryId(data[0].id);
        }
        setLoadingCats(false);
    };
    fetchCategories();
  }, []);

  // Sincronizar estado da corrida com a UI
  useEffect(() => {
    if (ride) {
      if (['SEARCHING', 'ACCEPTED', 'IN_PROGRESS'].includes(ride.status)) {
        setStep('waiting');
      }
    } else {
      setStep('search');
      setDestinationId("");
    }
  }, [ride]);

  // Função para pegar localização
  const getCurrentLocation = () => {
      setLoadingLocation(true);
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((position) => {
              setPickup(`Rua das Flores, 123 (Minha Localização)`);
              setLoadingLocation(false);
          }, (error) => {
              showError("Erro ao obter localização. Digite manualmente.");
              setPickup("");
              setLoadingLocation(false);
          });
      } else {
          showError("Geolocalização não suportada.");
          setLoadingLocation(false);
      }
  };

  const handleRequest = () => {
    if (!pickup || !destinationId) {
        showError("Preencha origem e destino");
        return;
    }
    setStep('confirm');
  };

  const getPrice = (catId: string) => {
      const dest = MOCK_LOCATIONS.find(l => l.id === destinationId);
      const cat = categories.find(c => c.id === catId);
      
      if (!dest || !cat) return "0.00";

      // Fórmula: Taxa Base + (Km * Custo por Km)
      const calculated = Number(cat.base_fare) + (dest.km * Number(cat.cost_per_km));
      
      // Respeitar tarifa mínima
      const finalPrice = Math.max(calculated, Number(cat.min_fare));
      
      return finalPrice.toFixed(2);
  };

  const confirmRide = async () => {
    const dest = MOCK_LOCATIONS.find(l => l.id === destinationId);
    const cat = categories.find(c => c.id === selectedCategoryId);
    
    if (dest && cat) {
        const price = parseFloat(getPrice(cat.id));
        await requestRide(pickup, dest.label, price, dest.distance, cat.name);
    }
  };

  const handleCancel = async () => {
      if (ride) await cancelRide(ride.id);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden font-sans bg-gray-100">
      <div className="absolute inset-0 z-0">
         <MapComponent 
            showPickup={step !== 'search'} 
            showDestination={!!destinationId && step !== 'search'} 
         />
      </div>

      {/* Botão de Voltar / Menu */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center pointer-events-none">
        <Button 
            variant="secondary" 
            size="icon" 
            className="shadow-lg pointer-events-auto rounded-full h-10 w-10 bg-white"
            onClick={() => navigate('/')}
        >
          {step === 'search' ? <Menu className="h-5 w-5 text-gray-700" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Painel Inferior */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-end md:justify-center pointer-events-none">
        <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl p-6 pointer-events-auto md:mb-10 transition-all duration-500 ease-in-out">
          
          {step === 'search' && (
            <>
              <h2 className="text-xl font-bold mb-4">Para onde vamos?</h2>
              <div className="space-y-4">
                {/* Input Origem */}
                <div className="relative flex items-center gap-2">
                   <div className="absolute left-3 top-3 w-2 h-2 rounded-full bg-blue-500 z-10"></div>
                   <Input 
                        value={pickup} 
                        onChange={(e) => setPickup(e.target.value)} 
                        placeholder="Sua localização"
                        className="pl-8 bg-gray-50 border-0" 
                   />
                   <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute right-2 text-blue-600"
                        onClick={getCurrentLocation}
                        disabled={loadingLocation}
                   >
                        <Navigation className={`w-5 h-5 ${loadingLocation ? 'animate-spin' : ''}`} />
                   </Button>
                </div>

                {/* Input Destino */}
                <div className="relative">
                   <div className="absolute left-3 top-3.5 w-2 h-2 bg-black z-10"></div>
                   <Select onValueChange={setDestinationId} value={destinationId}>
                      <SelectTrigger className="pl-8 bg-gray-100 border-0 h-12 text-lg font-medium">
                        <SelectValue placeholder="Selecione o destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_LOCATIONS.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>
                                {loc.label}
                            </SelectItem>
                        ))}
                      </SelectContent>
                   </Select>
                </div>
              </div>
              <Button className="w-full mt-6 py-6 text-lg rounded-xl bg-black hover:bg-zinc-800" onClick={handleRequest} disabled={!destinationId || !pickup}>
                Continuar
              </Button>
            </>
          )}

          {step === 'confirm' && (
             <div className="animate-in slide-in-from-bottom duration-300">
                <span className="font-medium text-gray-500 block mb-4">Escolha a categoria</span>
                
                {loadingCats ? (
                    <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>
                ) : (
                    <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
                        {categories.map((cat) => (
                            <div 
                                key={cat.id} 
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                    selectedCategoryId === cat.id 
                                    ? 'border-black bg-zinc-50 shadow-md' 
                                    : 'border-transparent bg-white hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <Car className="w-10 h-10 text-gray-700" />
                                    <div>
                                        <h4 className="font-bold text-lg">{cat.name}</h4>
                                        <p className="text-xs text-gray-500">{cat.description}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-lg">R$ {getPrice(cat.id)}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex gap-3 items-center">
                    <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Pagamento</p>
                        <div className="flex items-center gap-2 font-bold">
                            💵 Dinheiro
                        </div>
                    </div>
                    <Button className="flex-[2] py-6 text-lg rounded-xl bg-black hover:bg-zinc-800" onClick={confirmRide} disabled={!selectedCategoryId}>
                        Confirmar GoMove
                    </Button>
                </div>
             </div>
          )}

          {step === 'waiting' && (
             <div className="text-center py-4">
                {ride?.status === 'ACCEPTED' || ride?.status === 'IN_PROGRESS' ? (
                    <div className="animate-in fade-in zoom-in space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
                            <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow">
                                <User className="w-8 h-8 text-gray-500" />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-bold text-lg">{ride.driver_name || 'Motorista'}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="bg-gray-200 px-2 py-0.5 rounded text-xs font-bold">★ 5.0</span>
                                    <span>• {ride.category}</span>
                                </div>
                                <p className="text-xs font-mono bg-zinc-100 inline-block px-1 mt-1 rounded border">ABC-1234</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center px-2">
                             <div className="text-left">
                                <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                                <p className="text-blue-600 font-bold animate-pulse">
                                    {ride.status === 'IN_PROGRESS' ? 'Em viagem ao destino' : 'Motorista chegando'}
                                </p>
                             </div>
                             <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase font-bold">Chegada</p>
                                <p className="font-bold">14:35</p>
                             </div>
                        </div>

                        {ride?.status !== 'IN_PROGRESS' && (
                             <Button variant="destructive" className="w-full mt-4" onClick={handleCancel}>
                                Cancelar Corrida
                             </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-blue-50 rounded-full mx-auto flex items-center justify-center mb-4 relative">
                            <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-ping opacity-20"></div>
                            <Car className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Procurando motorista...</h3>
                        <p className="text-gray-500 mb-6 text-sm px-8">Estamos oferecendo sua corrida para os motoristas parceiros da GoMove.</p>
                        
                        <div className="bg-gray-50 p-4 rounded-lg mb-4 text-left">
                             <div className="flex justify-between items-center border-b pb-2 mb-2">
                                <span className="text-sm font-bold">{ride?.category}</span>
                                <span className="text-sm font-bold text-green-600">R$ {ride?.price}</span>
                             </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-500">Origem</span>
                                <span className="text-sm font-medium truncate max-w-[200px]">{ride?.pickup_address}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Destino</span>
                                <span className="text-sm font-medium truncate max-w-[200px]">{ride?.destination_address}</span>
                            </div>
                        </div>

                        <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 w-full" onClick={handleCancel}>
                            Cancelar Solicitação
                        </Button>
                    </>
                )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;