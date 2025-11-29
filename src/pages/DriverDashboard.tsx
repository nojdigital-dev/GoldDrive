import React, { useState, useEffect } from "react";
import { Wallet, User, MapPin, Navigation, Shield, DollarSign, Clock, Star, Menu, Home, List, History, XCircle, CheckCircle, Car, Calendar, ArrowRight, AlertTriangle, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import MapComponent from "@/components/MapComponent";
import { useRide, RideData } from "@/context/RideContext";
import { showSuccess, showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { ride, availableRides, acceptRide, rejectRide, confirmArrival, finishRide, startRide, cancelRide, rateRide } = useRide();
  
  // Tabs & State
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'wallet'>('home');
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRide, setIncomingRide] = useState<RideData | null>(null);
  const [timer, setTimer] = useState(15);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  
  // Modals Control
  const [showCarForm, setShowCarForm] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showFinishScreen, setShowFinishScreen] = useState(false);
  const [finishedRideData, setFinishedRideData] = useState<any>(null);
  
  // Rating
  const [rating, setRating] = useState(0);

  // Forms & Data
  const [carData, setCarData] = useState({ model: '', plate: '', year: '', color: '' });
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Derived States
  const isOnTrip = !!ride && ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(ride?.status || '');

  useEffect(() => { checkProfile(); }, [activeTab]);

  const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if(user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setDriverProfile(data);
          if (!data.car_model || !data.car_plate) { setShowCarForm(true); setIsOnline(false); }

          if (activeTab === 'history') {
               const { data: rides } = await supabase.from('rides')
                .select('*, customer:profiles!customer_id(first_name, last_name, avatar_url, phone)')
                .eq('driver_id', user.id)
                .order('created_at', { ascending: false });
               setHistory(rides || []);
          }
          if (activeTab === 'wallet') {
               const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
               setTransactions(trans || []);
          }
      }
  };

  const handleSaveCar = async () => {
      if(!carData.model || !carData.plate || !carData.year) { showError("Preencha todos os campos"); return; }
      const { error } = await supabase.from('profiles').update({ car_model: carData.model, car_plate: carData.plate, car_year: carData.year, car_color: carData.color }).eq('id', driverProfile.id);
      if(error) showError(error.message); else { showSuccess("Veículo cadastrado!"); setShowCarForm(false); checkProfile(); }
  };

  // Polling para nova corrida
  useEffect(() => {
    if (isOnline && availableRides.length > 0 && !ride && activeTab === 'home') {
        setIncomingRide(availableRides[0]);
        setTimer(15);
    } else {
        setIncomingRide(null);
    }
  }, [availableRides, isOnline, ride, activeTab]);

  useEffect(() => { 
      if (incomingRide && timer > 0) { const i = setInterval(() => setTimer(t => t - 1), 1000); return () => clearInterval(i); } 
      else if (timer === 0 && incomingRide) { handleReject(); } 
  }, [incomingRide, timer]);

  const handleAccept = async () => { if (incomingRide) { await acceptRide(incomingRide.id); setIncomingRide(null); } };
  const handleReject = async () => { if (incomingRide) { await rejectRide(incomingRide.id); setIncomingRide(null); } };
  
  const handleCancelClick = () => setShowCancelAlert(true);
  
  const confirmCancel = async () => {
      if (ride) {
          await cancelRide(ride.id, "Cancelado pelo motorista");
          setShowCancelAlert(false);
      }
  };

  const handleFinish = async () => {
      if(ride) {
          setFinishedRideData({ ...ride, earned: Number(ride.price) * 0.8 });
          await finishRide(ride.id);
          setShowFinishScreen(true);
      }
  };

  const handleSubmitRating = async (stars: number) => {
      if (finishedRideData) {
          await rateRide(finishedRideData.id, stars, true);
          setShowFinishScreen(false);
          setRating(0);
          setFinishedRideData(null);
      }
  };

  const toggleOnline = (val: boolean) => { if (val && (!driverProfile?.car_model)) { setShowCarForm(true); return; } setIsOnline(val); };

  const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return {
          full: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
          day: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          weekday: date.toLocaleDateString('pt-BR', { weekday: 'long' })
      };
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 relative overflow-hidden font-sans">
      
      {/* 1. Modal Cadastro Carro */}
      <Dialog open={showCarForm} onOpenChange={(open) => !open && (!driverProfile?.car_model ? setShowCarForm(true) : setShowCarForm(false))}>
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Cadastro do Veículo</DialogTitle><DialogDescription>Dados obrigatórios para rodar.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="grid gap-2"><Label>Modelo (ex: Civic)</Label><Input value={carData.model} onChange={e => setCarData({...carData, model: e.target.value})} /></div><div className="grid gap-2"><Label>Placa</Label><Input value={carData.plate} onChange={e => setCarData({...carData, plate: e.target.value.toUpperCase()})} /></div><div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label>Ano</Label><Input value={carData.year} type="number" onChange={e => setCarData({...carData, year: e.target.value})} /></div><div className="grid gap-2"><Label>Cor</Label><Input value={carData.color} onChange={e => setCarData({...carData, color: e.target.value})} /></div></div></div><DialogFooter><Button onClick={handleSaveCar} className="w-full bg-black">Salvar</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* 2. Alert Cancelamento */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle /> Cancelar Corrida?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita. Você poderá sofrer penalidades se cancelar muitas corridas.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmCancel} className="bg-red-600 hover:bg-red-700">Sim, Cancelar</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {/* 3. TELA DE SUCESSO (Finish Screen) */}
      {showFinishScreen && finishedRideData && (
          <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom duration-500">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">Excelente!</h1>
              <p className="text-gray-500 mb-8">Você finalizou mais uma corrida com sucesso.</p>

              <div className="w-full max-w-sm bg-gradient-to-b from-green-50 to-white rounded-3xl p-8 mb-8 border border-green-100 shadow-xl">
                  <div className="text-center border-b border-dashed border-green-200 pb-6 mb-6">
                      <p className="text-sm font-bold text-green-700 uppercase tracking-widest mb-2">Seu Ganho Líquido</p>
                      <h2 className="text-6xl font-black text-slate-900 tracking-tighter">R$ {finishedRideData.earned.toFixed(2)}</h2>
                  </div>
                  <div className="space-y-4">
                      <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border border-gray-200">
                              <AvatarImage src={finishedRideData.client_details?.avatar_url} />
                              <AvatarFallback>P</AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="font-bold text-slate-900">{finishedRideData.client_details?.name || 'Cliente'}</p>
                              <p className="text-xs text-gray-500">Passageiro</p>
                          </div>
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <p className="text-xs text-gray-400">Distância</p>
                              <p className="font-bold text-slate-700">{finishedRideData.distance}</p>
                          </div>
                          <div>
                              <p className="text-xs text-gray-400">Categoria</p>
                              <p className="font-bold text-slate-700">{finishedRideData.category}</p>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="text-center w-full max-w-sm animate-in slide-in-from-bottom-10 delay-300 fill-mode-forwards">
                  <p className="font-bold mb-4 text-slate-600">Avalie sua experiência</p>
                  <div className="flex justify-center gap-3 mb-8">
                      {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setRating(star)} className="transition-all hover:scale-125 focus:outline-none">
                              <Star className={`w-10 h-10 ${rating >= star ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm' : 'text-gray-200'}`} />
                          </button>
                      ))}
                  </div>
                  <Button className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200" onClick={() => handleSubmitRating(rating || 5)}>
                      Receber Nova Corrida
                  </Button>
              </div>
          </div>
      )}

      {/* 4. Modal de Detalhes do Histórico (Completo) */}
      <Dialog open={!!selectedHistoryItem} onOpenChange={(o) => !o && setSelectedHistoryItem(null)}>
          <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
              <DialogHeader className="border-b pb-4">
                  <DialogTitle className="text-xl">Resumo da Viagem</DialogTitle>
                  <DialogDescription className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {selectedHistoryItem && formatDate(selectedHistoryItem.created_at).full}
                  </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 pt-4">
                  {/* Status e Valor */}
                  <div className="bg-slate-50 p-6 rounded-2xl flex justify-between items-center border border-slate-100">
                      <div>
                          <Badge className={`${selectedHistoryItem?.status === 'COMPLETED' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} mb-2 border-0 px-3 py-1`}>
                              {selectedHistoryItem?.status === 'COMPLETED' ? 'FINALIZADA' : 'CANCELADA'}
                          </Badge>
                          <p className="text-xs text-gray-400 font-mono">#{selectedHistoryItem?.id.split('-')[0]}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Seu Ganho</p>
                          <p className="text-3xl font-black text-slate-900">R$ {selectedHistoryItem?.driver_earnings?.toFixed(2)}</p>
                      </div>
                  </div>

                  {/* Passageiro */}
                  {selectedHistoryItem?.customer && (
                      <div className="flex items-center gap-4 bg-white p-2">
                          <Avatar className="w-14 h-14 border-2 border-slate-100 shadow-sm">
                              <AvatarImage src={selectedHistoryItem.customer.avatar_url} />
                              <AvatarFallback>{selectedHistoryItem.customer.first_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="font-bold text-lg text-slate-900">{selectedHistoryItem.customer.first_name} {selectedHistoryItem.customer.last_name}</p>
                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                   <span className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full text-yellow-700 font-bold text-xs"><Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> {selectedHistoryItem.customer_rating || '5.0'}</span>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Timeline da Rota */}
                  <div className="relative pl-6 space-y-8 ml-2">
                      {/* Linha Conectora */}
                      <div className="absolute left-[5px] top-2 bottom-8 w-0.5 bg-gray-200" />
                      
                      <div className="relative">
                          <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-900 ring-4 ring-slate-100" />
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Ponto de Partida</p>
                            <p className="font-medium text-sm leading-tight text-slate-700">{selectedHistoryItem?.pickup_address}</p>
                          </div>
                      </div>
                      <div className="relative">
                          <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-900 ring-4 ring-slate-100" />
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Destino Final</p>
                             <p className="font-medium text-sm leading-tight text-slate-700">{selectedHistoryItem?.destination_address}</p>
                          </div>
                      </div>
                  </div>

                  {/* Grid Infos */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                          <p className="text-gray-400 text-xs uppercase mb-1">Distância Percorrida</p>
                          <p className="font-black text-slate-900 text-lg">{selectedHistoryItem?.distance}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                          <p className="text-gray-400 text-xs uppercase mb-1">Horário</p>
                          <p className="font-black text-slate-900 text-lg">{selectedHistoryItem && formatDate(selectedHistoryItem.created_at).time}</p>
                      </div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>

      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 p-4 z-30 flex justify-between items-center shadow-sm">
         <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/profile')}>
            <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                <AvatarImage src={driverProfile?.avatar_url} />
                <AvatarFallback className="bg-slate-900 text-white font-bold">GD</AvatarFallback>
            </Avatar>
            <div>
                <div className="font-black text-sm text-slate-900 leading-tight">Olá, {driverProfile?.first_name}</div>
                <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                    <Star className="w-3 h-3 fill-green-600" /> 4.98
                </div>
            </div>
         </div>
         {activeTab === 'home' && (
             <div className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-300 ${isOnline ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`text-[10px] font-black uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-gray-400'}`}>{isOnline ? 'Disponível' : 'Offline'}</span>
                <Switch checked={isOnline} onCheckedChange={toggleOnline} className="data-[state=checked]:bg-green-600 scale-75" />
            </div>
         )}
      </header>

      <div className="flex-1 relative overflow-y-auto">
        {activeTab === 'home' && (
            isOnline ? (
                <div className="h-full w-full relative">
                    <MapComponent className="h-full w-full" showPickup={isOnTrip} />
                    
                    {!isOnTrip && !incomingRide && !showFinishScreen && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 text-slate-900 px-6 py-3 rounded-full shadow-xl backdrop-blur-md z-20 flex items-center gap-3 border border-gray-100">
                             <div className="relative">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
                             </div>
                             <p className="text-sm font-bold">Buscando passageiros...</p>
                        </div>
                    )}

                    {/* --- PAINEL INFERIOR (EM CORRIDA) --- */}
                    {isOnTrip && !showFinishScreen && (
                        <div className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-5px_30px_rgba(0,0,0,0.1)] z-20 animate-in slide-in-from-bottom duration-500 rounded-t-3xl border-t border-gray-100">
                            <div className="p-6 pb-8">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge className={`
                                                ${ride?.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 
                                                ride?.status === 'ARRIVED' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' : 
                                                'bg-green-100 text-green-700 hover:bg-green-100'} border-0 px-3 py-1
                                            `}>
                                                {ride?.status === 'ACCEPTED' ? 'A CAMINHO' : 
                                                 ride?.status === 'ARRIVED' ? 'NO LOCAL' : 
                                                 'EM ROTA'}
                                            </Badge>
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900">{ride?.client_details?.name || 'Passageiro'}</h3>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-3xl font-black text-slate-900">R$ {(ride?.price || 0) * 0.8}</h3>
                                        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Seu Ganho</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <div className="flex items-start gap-4">
                                        <div className="w-3 h-3 rounded-full bg-slate-900 mt-1.5 shrink-0 ring-4 ring-white" />
                                        <div><p className="text-[10px] text-gray-400 uppercase font-bold">Embarque</p><p className="text-sm font-medium leading-tight text-slate-700">{ride?.pickup_address}</p></div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-3 h-3 rounded-full bg-slate-900 mt-1.5 shrink-0 ring-4 ring-white" />
                                        <div><p className="text-[10px] text-gray-400 uppercase font-bold">Destino</p><p className="text-sm font-medium leading-tight text-slate-700">{ride?.destination_address}</p></div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {ride?.status === 'ACCEPTED' && (
                                        <div className="flex gap-3">
                                            <Button variant="ghost" className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-14 font-bold" onClick={handleCancelClick}>
                                                CANCELAR
                                            </Button>
                                            <Button className="flex-[2] h-14 text-lg bg-slate-900 hover:bg-slate-800 font-bold rounded-xl shadow-lg shadow-slate-200" onClick={() => confirmArrival(ride!.id)}>
                                                <MapPin className="mr-2 h-5 w-5" /> Confirmar Chegada
                                            </Button>
                                        </div>
                                    )}

                                    {ride?.status === 'ARRIVED' && (
                                        <div className="flex gap-3">
                                            <Button variant="ghost" className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-14 font-bold" onClick={handleCancelClick}>
                                                CANCELAR
                                            </Button>
                                            <Button className="flex-[2] h-14 text-lg bg-green-600 hover:bg-green-700 font-bold rounded-xl animate-pulse shadow-lg shadow-green-200" onClick={() => startRide(ride!.id)}>
                                                <Navigation className="mr-2 h-5 w-5" /> Iniciar Corrida
                                            </Button>
                                        </div>
                                    )}

                                    {ride?.status === 'IN_PROGRESS' && (
                                        <div className="flex gap-3">
                                             <Button variant="ghost" className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-14 font-bold" onClick={handleCancelClick}>
                                                CANCELAR
                                            </Button>
                                            <Button className="flex-[2] h-14 text-xl bg-slate-900 hover:bg-slate-800 font-bold rounded-xl shadow-lg shadow-slate-200" onClick={handleFinish}>
                                                <Shield className="mr-2 h-6 w-6" /> Finalizar Viagem
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                     {/* POPUP DE NOVA CORRIDA */}
                    {incomingRide && !showFinishScreen && (
                        <div className="absolute inset-0 z-50 flex flex-col bg-slate-900 text-white animate-in slide-in-from-bottom duration-300">
                            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                                <div className="absolute top-6 right-6 w-14 h-14 rounded-full border-4 border-white/10 flex items-center justify-center font-black text-2xl bg-white/5">{timer}</div>
                                <h2 className="text-xs font-bold text-green-400 uppercase tracking-[0.2em] mb-4 bg-green-400/10 px-3 py-1 rounded-full">Nova Solicitação</h2>
                                
                                <div className="w-full bg-slate-800 rounded-3xl p-8 space-y-8 mb-8 mt-4 border border-slate-700 shadow-2xl">
                                    <div className="text-center">
                                        <p className="text-slate-400 text-xs uppercase font-bold mb-1">Ganho Estimado</p>
                                        <p className="text-6xl font-black text-white tracking-tighter">R$ {(incomingRide.price * 0.8).toFixed(2)}</p>
                                        <div className="flex justify-center gap-4 mt-4">
                                            <Badge variant="outline" className="border-slate-600 text-slate-300">{incomingRide.distance}</Badge>
                                            <Badge variant="outline" className="border-slate-600 text-slate-300">{incomingRide.category}</Badge>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6 relative">
                                        {/* Linha pontilhada */}
                                        <div className="absolute left-[15px] top-3 bottom-8 w-0.5 border-l-2 border-dashed border-slate-600" />

                                        <div className="flex items-start gap-4 relative">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 border-4 border-slate-700 z-10 flex items-center justify-center text-[10px] font-bold">A</div>
                                            <div><p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Buscar em</p><p className="text-lg font-bold leading-tight line-clamp-2">{incomingRide.pickup_address}</p></div>
                                        </div>
                                        <div className="flex items-start gap-4 relative">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 border-4 border-white z-10 flex items-center justify-center text-[10px] font-bold text-black bg-white">B</div>
                                            <div><p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Levar até</p><p className="text-lg font-bold leading-tight line-clamp-2">{incomingRide.destination_address}</p></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full grid grid-cols-2 gap-4">
                                    <Button variant="ghost" className="h-16 text-lg bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold" onClick={handleReject}>Pular</Button>
                                    <Button className="h-16 text-lg bg-green-500 hover:bg-green-400 text-black font-black rounded-2xl animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.3)]" onClick={handleAccept}>ACEITAR CORRIDA</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (<div className="p-8 space-y-8 h-full bg-white flex flex-col items-center justify-center text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 rounded-full" />
                        <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 relative z-10 shadow-lg">
                            <Car className="w-20 h-20 text-slate-900" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Vamos faturar?</h2>
                        <p className="text-gray-500 max-w-xs mx-auto text-lg">Fique online agora para começar a receber chamadas na sua região.</p>
                    </div>
                    <Button size="lg" className="w-full max-w-xs h-14 text-lg bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 transition-all hover:scale-105" onClick={() => toggleOnline(true)}>
                        FICAR ONLINE
                    </Button>
                </div>)
        )}
        
        {/* Histórico Melhorado */}
        {activeTab === 'history' && (
            <div className="bg-gray-50 min-h-full pb-20">
                <div className="bg-white px-6 py-8 shadow-sm border-b border-gray-100 sticky top-0 z-10">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Suas Viagens</h2>
                    <p className="text-gray-400">Histórico completo de atividades</p>
                </div>
                <div className="p-4 space-y-4">
                    {history.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhuma corrida realizada ainda.</p>
                        </div>
                    ) : (
                        history.map(item => (
                            <div 
                                key={item.id} 
                                onClick={() => setSelectedHistoryItem(item)}
                                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-all cursor-pointer group hover:shadow-md"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <p className="font-bold text-base text-slate-900 capitalize">{formatDate(item.created_at).weekday}, {formatDate(item.created_at).time}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border-0 font-bold ${item.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {item.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-xl text-slate-900">R$ {item.driver_earnings?.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-600 truncate flex-1">{item.destination_address}</p>
                                    <ChevronRight className="w-5 h-5 text-gray-300" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* Wallet Simplificada */}
        {activeTab === 'wallet' && (
             <div className="bg-gray-50 min-h-full pb-20 p-6">
                <Card className="bg-slate-900 text-white border-0 shadow-xl rounded-3xl overflow-hidden relative mb-8">
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <CardContent className="p-8 relative z-10">
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Saldo Disponível</p>
                        <h2 className="text-5xl font-black mb-6">R$ {driverProfile?.balance?.toFixed(2)}</h2>
                        <div className="flex gap-4">
                            <Button className="flex-1 bg-white text-slate-900 hover:bg-gray-100 font-bold h-12 rounded-xl">Sacar</Button>
                            <Button variant="outline" className="flex-1 border-slate-700 text-white hover:bg-slate-800 h-12 rounded-xl">Extrato</Button>
                        </div>
                    </CardContent>
                </Card>

                <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" /> Movimentações Recentes
                </h3>
                
                <div className="space-y-3">
                    {transactions.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {t.amount > 0 ? <DollarSign className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-900">{t.description}</p>
                                    <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className={`font-black ${t.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                {t.amount > 0 ? '+' : ''} R$ {Math.abs(t.amount).toFixed(2)}
                            </span>
                        </div>
                    ))}
                    {transactions.length === 0 && <p className="text-center text-gray-400 py-4">Nenhuma transação encontrada.</p>}
                </div>
             </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-100 p-2 flex justify-around shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-40 h-20 items-center">
          <Button variant="ghost" className={`flex-col h-full w-full gap-1 rounded-xl hover:bg-gray-50 ${activeTab === 'home' ? 'text-slate-900' : 'text-gray-400'}`} onClick={() => setActiveTab('home')}>
              <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-slate-900' : ''}`} /> 
              <span className="text-[10px] font-bold">Início</span>
          </Button>
          <Button variant="ghost" className={`flex-col h-full w-full gap-1 rounded-xl hover:bg-gray-50 ${activeTab === 'history' ? 'text-slate-900' : 'text-gray-400'}`} onClick={() => setActiveTab('history')}>
              <List className={`w-6 h-6 ${activeTab === 'history' ? 'fill-slate-900' : ''}`} /> 
              <span className="text-[10px] font-bold">Corridas</span>
          </Button>
          <Button variant="ghost" className={`flex-col h-full w-full gap-1 rounded-xl hover:bg-gray-50 ${activeTab === 'wallet' ? 'text-slate-900' : 'text-gray-400'}`} onClick={() => setActiveTab('wallet')}>
              <Wallet className={`w-6 h-6 ${activeTab === 'wallet' ? 'fill-slate-900' : ''}`} /> 
              <span className="text-[10px] font-bold">Ganhos</span>
          </Button>
      </div>
    </div>
  );
};

export default DriverDashboard;