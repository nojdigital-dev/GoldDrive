import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface RideContextType {
  ride: any | null;
  availableRides: any[];
  loading: boolean;
  requestRide: (
      pickup: string, 
      destination: string, 
      pickupCoords: { lat: number, lng: number },
      destCoords: { lat: number, lng: number },
      price: number, 
      distance: string, 
      category: string, 
      paymentMethod: string
  ) => Promise<void>;
  cancelRide: (rideId: string, reason?: string) => Promise<void>;
  acceptRide: (rideId: string) => Promise<void>;
  rejectRide: (rideId: string) => Promise<void>;
  startRide: (rideId: string) => Promise<void>;
  finishRide: (rideId: string) => Promise<void>;
  rateRide: (rideId: string, rating: number, isDriver: boolean, comment?: string) => Promise<void>;
  confirmArrival: (rideId: string) => Promise<void>;
  addBalance: (amount: number) => Promise<void>;
  clearRide: () => void;
  currentUserId: string | null;
  userRole: 'client' | 'driver' | null;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider = ({ children }: { children: React.ReactNode }) => {
  const [ride, setRide] = useState<any | null>(null);
  const [availableRides, setAvailableRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'client' | 'driver' | null>(null);
  
  const userRoleRef = useRef(userRole);
  const currentUserIdRef = useRef(currentUserId);
  const rejectedIdsRef = useRef<string[]>([]);
  const dismissedRidesRef = useRef<string[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
      userRoleRef.current = userRole;
      currentUserIdRef.current = currentUserId;
  }, [userRole, currentUserId]);

  useEffect(() => {
    const forceStopLoading = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(forceStopLoading);
  }, []);

  const fetchActiveRide = async (userId: string) => {
    try {
      let role = userRoleRef.current;
      
      if (!role) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
          role = profile?.role || 'client';
          setUserRole(role);
      }

      const queryField = role === 'driver' ? 'driver_id' : 'customer_id';
      
      const { data } = await supabase
        .from('rides')
        .select(`*, driver_details:profiles!public_rides_driver_id_fkey(*), client_details:profiles!public_rides_customer_id_fkey(*)`)
        .eq(queryField, userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
          if (dismissedRidesRef.current.includes(data.id)) {
              setRide(null);
              return;
          }

          const isFinished = ['CANCELLED', 'COMPLETED'].includes(data.status);
          if (isFinished) {
              const hasRated = role === 'driver' ? !!data.customer_rating : !!data.driver_rating;
              if (hasRated) {
                  setRide(null); 
                  return;
              }
              const updatedAt = new Date(data.created_at).getTime();
              const now = new Date().getTime();
              if ((now - updatedAt) / 1000 / 60 < 60) {
                  setRide(data);
              } else {
                  setRide(null);
              }
          } else {
              setRide(data);
          }
      } else {
          setRide(null);
      }
    } catch (err) {
      console.error("Erro fetchActiveRide:", err);
    }
  };

  const fetchAvailableRides = async () => {
      const role = userRoleRef.current;
      const uid = currentUserIdRef.current;
      
      if (role !== 'driver' || !uid) return;

      try {
          const { data: ridesData, error: ridesError } = await supabase
            .from('rides')
            .select('*')
            .eq('status', 'SEARCHING')
            .is('driver_id', null)
            .order('created_at', { ascending: false });

          if (ridesError) throw ridesError;

          if (ridesData && ridesData.length > 0) {
              const clientIds = ridesData.map(r => r.customer_id);
              const uniqueClientIds = [...new Set(clientIds)];
              
              const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', uniqueClientIds);
                
              if (profilesError) throw profilesError;

              const enrichedRides = ridesData.map(r => {
                  const clientProfile = profilesData?.find(p => p.id === r.customer_id);
                  return {
                      ...r,
                      client_details: clientProfile || { first_name: 'Passageiro', last_name: '' }
                  };
              });

              const validRides = enrichedRides.filter(r => {
                  if (r.customer_id === uid) return false;
                  if (rejectedIdsRef.current.includes(r.id)) return false; 
                  if (r.rejected_by && Array.isArray(r.rejected_by) && r.rejected_by.includes(uid)) return false; 
                  return true;
              });
              
              setAvailableRides(validRides);
          } else {
              setAvailableRides([]);
          }
      } catch (err: any) {
          console.error("Erro crítico ao buscar corridas disponíveis:", err);
      }
  };

  useEffect(() => {
    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setCurrentUserId(session.user.id);
            setTimeout(() => fetchActiveRide(session.user.id), 500);
        }
    };
    init();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId(null);
        setRide(null);
        setAvailableRides([]);
        rejectedIdsRef.current = [];
        dismissedRidesRef.current = [];
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
      let interval: NodeJS.Timeout;
      const shouldPoll = currentUserId; 
      if (shouldPoll) {
          interval = setInterval(() => { 
              if (currentUserId) fetchActiveRide(currentUserId); 
          }, 4000);
      }
      return () => { if (interval) clearInterval(interval); };
  }, [currentUserId, userRole]); 

  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (currentUserId && userRole === 'driver' && !ride) {
          fetchAvailableRides(); 
          interval = setInterval(fetchAvailableRides, 5000); 
      }
      return () => { if (interval) clearInterval(interval); };
  }, [currentUserId, userRole, ride]); 

  useEffect(() => {
    const channel = supabase
      .channel('global_ride_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        async (payload) => {
            const newRecord = payload.new as any;
            const uid = currentUserIdRef.current;
            const role = userRoleRef.current;
            
            if (payload.eventType === 'INSERT' && role === 'driver' && newRecord.status === 'SEARCHING' && !newRecord.driver_id) {
                await fetchAvailableRides();
            }
            else if (payload.eventType === 'UPDATE') {
                if (role === 'driver') {
                    if (newRecord.status !== 'SEARCHING' || newRecord.driver_id) {
                        setAvailableRides(prev => prev.filter(r => r.id !== newRecord.id));
                    }
                }
                const isRelatedToMe = (newRecord?.customer_id === uid) || (newRecord?.driver_id === uid);
                if (isRelatedToMe && uid) {
                    await fetchActiveRide(uid);
                }
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); 

  const requestRide = async (
      pickup: string, 
      destination: string, 
      pickupCoords: { lat: number, lng: number },
      destCoords: { lat: number, lng: number },
      price: number, 
      distance: string, 
      category: string, 
      paymentMethod: string
  ) => {
    if (!currentUserId) {
        toast({ title: "Erro", description: "Faça login.", variant: "destructive" });
        return;
    }
    try {
      const { data, error } = await supabase.from('rides').insert({
          customer_id: currentUserId,
          pickup_address: pickup,
          destination_address: destination,
          pickup_lat: pickupCoords.lat,
          pickup_lng: pickupCoords.lng,
          destination_lat: destCoords.lat,
          destination_lng: destCoords.lng,
          price: price,
          distance: distance,
          status: 'SEARCHING',
          category: category,
          payment_method: paymentMethod
        }).select().single();
      if (error) throw error;
      
      if (dismissedRidesRef.current.length > 50) dismissedRidesRef.current = [];
      
      setRide(data);
      await fetchActiveRide(currentUserId);
    } catch (e: any) { 
        console.error("Request Error", e);
        toast({ title: "Erro na solicitação", description: "Verifique sua conexão.", variant: "destructive" }); 
    }
  };

  const cancelRide = async (rideId: string, reason?: string) => {
    try {
        const { error } = await supabase.rpc('cancel_ride_as_user', { ride_id_to_cancel: rideId });
        if (error) {
            console.warn("RPC falhou, tentando update direto:", error);
            await supabase.from('rides').update({ status: 'CANCELLED' }).eq('id', rideId);
        }
        if(currentUserId) await fetchActiveRide(currentUserId); 
        toast({ title: "Cancelado", description: reason || "Corrida cancelada." });
    } catch (e: any) { 
        toast({ title: "Erro", description: "Não foi possível cancelar." }); 
    }
  };

  const acceptRide = async (rideId: string) => {
     if (!currentUserId) return;
     try {
         // --- TRAVA ATÔMICA (ANTI-CONFLITO) ---
         // Tentamos atualizar a corrida APENAS SE o driver_id for null.
         // Se alguém já tiver aceitado, 'data' virá vazio porque a condição .is('driver_id', null) falhará.
         const { data, error } = await supabase
            .from('rides')
            .update({ status: 'ACCEPTED', driver_id: currentUserId })
            .eq('id', rideId)
            .is('driver_id', null) // <--- O SEGREDO ESTÁ AQUI
            .select();

         if (error) throw error;

         // Verificação de Sucesso
         if (!data || data.length === 0) {
             // Se entrou aqui, é porque a condição .is('driver_id', null) falhou
             // Significa que outro motorista aceitou milissegundos antes
             toast({ 
                 title: "Corrida Indisponível", 
                 description: "Outro motorista aceitou esta corrida.", 
                 variant: "destructive" 
             });
             
             // Remove da lista para não tentar de novo
             if (!rejectedIdsRef.current.includes(rideId)) rejectedIdsRef.current.push(rideId);
             setAvailableRides(prev => prev.filter(r => r.id !== rideId));
             return;
         }
         
         toast({ title: "Sucesso!", description: "Corrida aceita. Dirija-se ao local." });
         await fetchActiveRide(currentUserId);
     } catch (e: any) { 
         toast({ title: "Erro", description: "Falha ao aceitar corrida." }); 
     }
  };

  const rejectRide = async (rideId: string) => {
      if (!rejectedIdsRef.current.includes(rideId)) rejectedIdsRef.current.push(rideId);
      setAvailableRides(prev => prev.filter(r => r.id !== rideId));
      try { await supabase.rpc('reject_ride', { ride_id_param: rideId }); } catch (err) { console.error(err); }
  };

  const confirmArrival = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({ status: 'ARRIVED' }).eq('id', rideId);
          if (error) throw error;
          if(currentUserId) await fetchActiveRide(currentUserId);
          toast({ title: "Chegou!", description: "Passageiro avisado." });
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const startRide = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({ status: 'IN_PROGRESS' }).eq('id', rideId);
          if (error) throw error;
          if(currentUserId) await fetchActiveRide(currentUserId);
          toast({ title: "Iniciada", description: "Boa viagem!" });
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const finishRide = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({ status: 'COMPLETED' }).eq('id', rideId);
          if (error) throw error;
          if(currentUserId) await fetchActiveRide(currentUserId); 
          toast({ title: "Finalizada", description: "Corrida concluída." });
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const rateRide = async (rideId: string, rating: number, isDriver: boolean, comment?: string) => {
      try {
          const updateData = isDriver ? { customer_rating: rating } : { driver_rating: rating, review_comment: comment };
          const { error } = await supabase.from('rides').update(updateData).eq('id', rideId);
          if (error) throw error;
          
          dismissedRidesRef.current.push(rideId);
          setRide(null); 
          
          toast({ title: "Obrigado", description: "Avaliação enviada." });
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const addBalance = async (amount: number) => {
      if(!currentUserId) return;
      try {
          const { data: profile } = await supabase.from('profiles').select('balance').eq('id', currentUserId).single();
          const newBalance = (profile?.balance || 0) + amount;
          await supabase.from('profiles').update({ balance: newBalance }).eq('id', currentUserId);
          await supabase.from('transactions').insert({ user_id: currentUserId, amount: amount, type: 'DEPOSIT', description: 'Depósito via PIX' });
          toast({ title: "Sucesso", description: `R$ ${amount} adicionados!` });
      } catch(e: any) { toast({ title: "Erro", description: e.message }); throw e; }
  }

  const clearRide = () => {
      if (ride) {
          dismissedRidesRef.current.push(ride.id);
      }
      setRide(null);
  };

  return (
    <RideContext.Provider value={{ 
        ride, availableRides, loading, 
        requestRide, cancelRide, acceptRide, rejectRide, 
        startRide, finishRide, rateRide, confirmArrival, 
        addBalance, clearRide, 
        currentUserId, userRole 
    }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (context === undefined) throw new Error('useRide must be used within a RideProvider');
  return context;
};