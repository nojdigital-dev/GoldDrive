import React, { useState, useEffect } from "react";
import { Wallet, MapPin, Navigation, Shield, DollarSign, Star, Menu, History, CheckCircle, Car, Calendar, ArrowRight, AlertTriangle, ChevronRight, TrendingUp, MessageCircle, Phone, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import FloatingDock from "@/components/FloatingDock";
import { ScrollArea } from "@/components/ui/scroll-area";
import RideChat from "@/components/RideChat";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { ride, availableRides, acceptRide, rejectRide, confirmArrival, finishRide, startRide, cancelRide, rateRide, currentUserId } = useRide();
  
  // Tabs & State
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRide, setIncomingRide] = useState<RideData | null>(null);
  const [timer, setTimer] = useState(30);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  
  // Status Check
  const [statusLoading, setStatusLoading] = useState(true);
  const [driverStatus, setDriverStatus] = useState("APPROVED"); // APPROVED, PENDING, REJECTED
  
  // Modals Control
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showFinishScreen, setShowFinishScreen] = useState(false);
  const [finishedRideData, setFinishedRideData] = useState<any>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  
  const [rating, setRating] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const isOnTrip = !!ride && ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(ride?.status || '');

  useEffect(() => { checkProfile(); }, [activeTab]);

  const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if(user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setDriverProfile(data);
          setDriverStatus(data.driver_status || 'APPROVED'); // Fallback para approved se nulo (legacy)
          setStatusLoading(false);

          if (data.driver_status === 'APPROVED') {
              if (activeTab === 'history') {
                   const { data: rides } = await supabase.from('rides')
                    .select(`*, customer:profiles!public_rides_customer_id_fkey(first_name, last_name, avatar_url, phone)`)
                    .eq('driver_id', user.id).order('created_at', { ascending: false });
                   setHistory(rides || []);
              }
              if (activeTab === 'wallet') {
                   const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
                   setTransactions(trans || []);
              }
          }
      }
  };

  useEffect(() => {
    if (isOnline && availableRides.length > 0 && !ride && activeTab === 'home' && driverStatus === 'APPROVED') {
        setIncomingRide(availableRides[0]);
        setTimer(30);
    } else {
        setIncomingRide(null);
    }
  }, [availableRides, isOnline, ride, activeTab, driverStatus]);

  useEffect(() => { 
      if (incomingRide && timer > 0) { const i = setInterval(() => setTimer(t => t - 1), 1000); return () => clearInterval(i); } 
      else if (timer === 0 && incomingRide) { handleReject(); } 
  }, [incomingRide, timer]);

  const handleAccept = async () => { if (incomingRide) { await acceptRide(incomingRide.id); setIncomingRide(null); } };
  const handleReject = async () => { if (incomingRide) { await rejectRide(incomingRide.id); setIncomingRide(null); } };
  const handleCancelClick = () => setShowCancelAlert(true);
  const confirmCancel = async () => { if (ride) { await cancelRide(ride.id, "Cancelado pelo motorista"); setShowCancelAlert(false); } };
  const handleFinish = async () => { if(ride) { setFinishedRideData({ ...ride, earned: Number(ride.price) * 0.8 }); await finishRide(ride.id); setShowFinishScreen(true); } };
  const handleSubmitRating = async (stars: number) => { if (finishedRideData) { await rateRide(finishedRideData.id, stars, true); setShowFinishScreen(false); setRating(0); setFinishedRideData(null); } };
  const toggleOnline = (val: boolean) => { setIsOnline(val); };
  const handleTabChange = (tab: string) => { if (tab === 'profile') navigate('/profile'); else setActiveTab(tab); };
  const openHistoryDetail = (item: any) => { setSelectedHistoryItem(item); setShowHistoryDetail(true); };

  const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return { full: date.toLocaleDateString(), time: date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
  };

  // --- TELA DE BLOQUEIO / LOADING ---
  if (statusLoading) return <div className="h-screen flex items-center justify-center bg-black text-white"><Clock className="animate-spin mr-2"/> Carregando perfil...</div>;

  if (driverStatus === 'PENDING') {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
              <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Clock className="w-12 h-12 text-yellow-500" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Cadastro em Análise</h1>
              <p className="text-gray-400 mb-8 max-w-xs">Recebemos seus documentos. Nossa equipe está validando suas informações. Você será notificado em breve.</p>
              <Button variant="outline" className="border-white/20 text-white" onClick={() => navigate('/')}>Voltar ao Início</Button>
          </div>
      );
  }

  if (driverStatus === 'REJECTED') {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                  <Lock className="w-12 h-12 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Acesso Negado</h1>
              <p className="text-gray-400 mb-8 max-w-xs">Infelizmente seu cadastro não foi aprovado pela nossa equipe de segurança.</p>
              <Button variant="outline" className="border-white/20 text-white" onClick={() => navigate('/')}>Sair</Button>
          </div>
      );
  }

  // --- DASHBOARD NORMAL (APROVADO) ---
  const cardBaseClasses = "bg-white/90 backdrop-blur-xl border border-white/40 p-6 rounded-[32px] shadow-2xl animate-in slide-in-from-bottom duration-500 w-full";

  return (
    <div className="h-screen flex flex-col bg-slate-50 relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0"><MapComponent className="h-full w-full" showPickup={isOnTrip} /></div>

      <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start pointer-events-none">
          <div className={`pointer-events-auto backdrop-blur-xl border border-white/20 p-2 pr-4 rounded-full flex items-center gap-3 shadow-lg transition-all duration-300 ${isOnline ? 'bg-black/80' : 'bg-white/80'}`}>
             <Switch checked={isOnline} onCheckedChange={toggleOnline} className="data-[state=checked]:bg-green-500" />
             <span className={`text-xs font-bold uppercase tracking-wider ${isOnline ? 'text-white' : 'text-slate-500'}`}>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="pointer-events-auto bg-white/10 backdrop-blur-xl border border-white/20 p-1 rounded-full shadow-lg cursor-pointer" onClick={() => navigate('/profile')}>
             <Avatar className="h-10 w-10 ring-2 ring-white/30"><AvatarImage src={driverProfile?.avatar_url} /><AvatarFallback className="bg-slate-900 text-white font-bold">{driverProfile?.first_name?.[0]}</AvatarFallback></Avatar>
          </div>
      </div>

      <div className="absolute inset-0 z-10 flex flex-col justify-end pb-32 md:pb-10 md:justify-center items-center pointer-events-none p-4">
         {activeTab === 'home' && (
            <div className="w-full max-w-md pointer-events-auto transition-all duration-500">
                {!isOnline && (
                    <div className="bg-white/90 backdrop-blur-xl border border-white/40 p-8 rounded-[32px] shadow-2xl text-center animate-in zoom-in-95">
                        <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-6"><Car className="w-10 h-10 text-slate-400" /></div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Vamos rodar?</h2>
                        <Button size="lg" className="w-full h-14 text-lg bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl mt-4" onClick={() => toggleOnline(true)}>FICAR ONLINE</Button>
                    </div>
                )}
                {isOnline && !incomingRide && !isOnTrip && (
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-full shadow-2xl flex items-center justify-center gap-3 animate-in fade-in">
                        <div className="relative"><div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" /><div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" /></div>
                        <p className="text-white font-bold">Procurando passageiros...</p>
                    </div>
                )}
                {incomingRide && (
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] shadow-2xl animate-in slide-in-from-bottom text-white">
                        <div className="flex justify-between items-center mb-4"><Badge className="bg-green-500 text-black font-bold">NOVA CORRIDA</Badge><div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center font-bold text-lg">{timer}</div></div>
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl mb-4"><Avatar><AvatarImage src={incomingRide.client_details?.avatar_url} /><AvatarFallback>{incomingRide.client_details?.name?.[0]}</AvatarFallback></Avatar><div><p className="font-bold text-sm">{incomingRide.client_details?.name}</p><div className="flex items-center gap-1 text-xs text-gray-300"><Phone className="w-3 h-3" /> {incomingRide.client_details?.phone || 'Sem telefone'}</div></div></div>
                        <div className="text-center mb-6"><h2 className="text-5xl font-black text-white">R$ {(incomingRide.price * 0.8).toFixed(2)}</h2><div className="flex justify-center gap-3 mt-4"><Badge variant="outline" className="text-slate-300">{incomingRide.distance}</Badge><Badge variant="outline" className="text-slate-300">{incomingRide.category}</Badge></div></div>
                        <div className="grid grid-cols-2 gap-4"><Button variant="ghost" className="h-14 rounded-xl bg-white/10 text-white" onClick={handleReject}>Recusar</Button><Button className="h-14 rounded-xl bg-green-500 text-black font-black" onClick={handleAccept}>ACEITAR</Button></div>
                    </div>
                )}
                {isOnTrip && !showFinishScreen && (
                     <div className={cardBaseClasses}>
                        <div className="flex justify-between items-center mb-6">
                            <div><Badge className="mb-2 bg-black">{ride?.status === 'ACCEPTED' ? 'A CAMINHO' : ride?.status === 'ARRIVED' ? 'NO LOCAL' : 'EM VIAGEM'}</Badge><h3 className="text-2xl font-bold text-slate-900">{ride?.client_details?.name}</h3></div>
                            <div className="text-right"><h3 className="text-3xl font-black text-slate-900">R$ {(Number(ride?.price) * 0.8).toFixed(2)}</h3></div>
                        </div>
                        <div className="flex flex-col gap-3">
                             <div className="bg-gray-100 p-3 rounded-2xl flex items-center gap-3 cursor-pointer" onClick={() => setShowChat(true)}><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-sm"><MessageCircle className="w-5 h-5" /></div><div className="flex-1"><p className="text-xs font-bold text-gray-500 uppercase">Mensagem</p><p className="text-sm font-medium text-slate-900">Abrir chat...</p></div></div>
                             {ride?.status === 'ACCEPTED' && (<div className="flex gap-3"><Button variant="ghost" className="flex-1 text-red-500 h-14 rounded-xl" onClick={handleCancelClick}>Cancelar</Button><Button className="flex-[2] h-14 bg-black text-white rounded-xl" onClick={() => confirmArrival(ride!.id)}>Confirmar Chegada</Button></div>)}
                             {ride?.status === 'ARRIVED' && (<div className="flex gap-3"><Button variant="ghost" className="flex-1 text-red-500 h-14 rounded-xl" onClick={handleCancelClick}>Cancelar</Button><Button className="flex-[2] h-14 bg-green-600 text-white rounded-xl" onClick={() => startRide(ride!.id)}>Iniciar Corrida</Button></div>)}
                             {ride?.status === 'IN_PROGRESS' && (<Button className="w-full h-14 text-xl bg-black text-white rounded-xl" onClick={handleFinish}>Finalizar Viagem</Button>)}
                        </div>
                     </div>
                )}
            </div>
         )}
         {/* Historico e Carteira simplificados aqui para manter lógica anterior, mas respeitando o novo componente */}
         {activeTab === 'history' && (
            <div className={`w-full max-w-md h-[65vh] ${cardBaseClasses} flex flex-col pointer-events-auto`}>
                 <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2"><History className="w-6 h-6" /> Corridas</h2>
                 <ScrollArea className="flex-1"><div className="space-y-3">{history.map(item => (<div key={item.id} onClick={() => openHistoryDetail(item)} className="bg-white/50 p-4 rounded-2xl border border-white/60 cursor-pointer"><div className="flex justify-between"><span className="font-bold">{item.customer?.first_name}</span><span className="text-green-700 font-bold">R$ {Number(item.driver_earnings).toFixed(2)}</span></div></div>))}</div></ScrollArea>
            </div>
         )}
         {activeTab === 'wallet' && (
             <div className="w-full max-w-md pointer-events-auto"><Card className="bg-black text-white border-0 shadow-2xl rounded-[32px] mb-4"><CardContent className="p-8 text-center"><p className="text-gray-400 text-sm font-bold uppercase mb-2">Saldo Total</p><h2 className="text-5xl font-black">R$ {driverProfile?.balance?.toFixed(2)}</h2></CardContent></Card></div>
         )}
      </div>

      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}><AlertDialogContent className="rounded-3xl border-0"><AlertDialogHeader><AlertDialogTitle>Cancelar?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl h-12">Não</AlertDialogCancel><AlertDialogAction onClick={confirmCancel} className="bg-red-600 rounded-xl h-12">Sim</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      {/* MODAL DETALHES HISTORICO */}
      <Dialog open={showHistoryDetail} onOpenChange={setShowHistoryDetail}><DialogContent className="rounded-3xl border-0"><DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader><div className="space-y-4"><div className="bg-gray-50 p-4 rounded-xl"><p className="text-xs text-gray-500 uppercase font-bold">Passageiro</p><p className="font-bold">{selectedHistoryItem?.customer?.first_name} {selectedHistoryItem?.customer?.last_name}</p></div><div className="bg-gray-50 p-4 rounded-xl"><p className="text-xs text-gray-500 uppercase font-bold">Ganho</p><p className="font-black text-2xl text-green-600">R$ {Number(selectedHistoryItem?.driver_earnings).toFixed(2)}</p></div></div></DialogContent></Dialog>

      {/* SUCESSO */}
      {showFinishScreen && finishedRideData && (
          <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center p-6 animate-in fade-in"><div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"><CheckCircle className="w-12 h-12 text-green-600"/></div><h1 className="text-3xl font-black mb-2">Sucesso!</h1><p className="text-gray-500 mb-8">Ganho: R$ {finishedRideData.earned.toFixed(2)}</p><div className="flex gap-2">{[1,2,3,4,5].map(s=><Star key={s} className={`w-10 h-10 ${rating>=s?'fill-yellow-400 text-yellow-400':'text-gray-200'}`} onClick={()=>setRating(s)}/>)}</div><Button className="mt-8 w-full max-w-sm h-14 rounded-2xl bg-black text-white font-bold" onClick={()=>handleSubmitRating(rating||5)}>Continuar</Button></div>
      )}

      {/* CHAT */}
      {showChat && ride && ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(ride.status) && currentUserId && (
          <RideChat rideId={ride.id} currentUserId={currentUserId} role="driver" otherUserName={ride.client_details?.name||'Passageiro'} otherUserAvatar={ride.client_details?.avatar_url} onClose={()=>setShowChat(false)} />
      )}

      <div className="relative z-[100]"><FloatingDock activeTab={activeTab} onTabChange={handleTabChange} role="driver" /></div>
    </div>
  );
};

export default DriverDashboard;