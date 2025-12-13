import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface RideContextType {
  ride: any | null;
  availableRides: any[];
  loading: boolean;
  requestRide: (pickup: string, destination: string, price: number, distance: string, category: string, paymentMethod: string) => Promise<void>;
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
  
  const rejectedIdsRef = useRef<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const forceStopLoading = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(forceStopLoading);
  }, []);

  const fetchActiveRide = async (userId: string) => {
    try {
      let role = userRole;
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
        .in('status', ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'])
        .maybeSingle();

      if (data) {
          // Só atualiza se houver mudança de status ou se não tivermos dados ainda
          setRide(prev => {
              if (!prev || prev.status !== data.status || prev.id !== data.id) {
                  return data;
              }
              return prev; 
          });
      } else {
          setRide(null);
      }
      
    } catch (err) {
      console.error("Erro fetchActiveRide:", err);
    }
  };

  const fetchAvailableRides = async () => {
      if (userRole !== 'driver' || !currentUserId) return;

      try {
          const { data } = await supabase
            .from('rides')
            .select(`*, client_details:profiles!public_rides_customer_id_fkey(*)`)
            .eq('status', 'SEARCHING')
            .is('driver_id', null)
            .order('created_at', { ascending: false });

          if (data) {
              const validRides = data.filter(r => {
                  if (r.customer_id === currentUserId) return false;
                  if (rejectedIdsRef.current.includes(r.id)) return false;
                  if (r.rejected_by && Array.isArray(r.rejected_by) && r.rejected_by.includes(currentUserId)) {
                      return false;
                  }
                  return true;
              });
              setAvailableRides(validRides);
          }
      } catch (err) {
          console.error("Erro fetchAvailableRides:", err);
      }
  };

  // 1. Inicialização
  useEffect(() => {
    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setCurrentUserId(session.user.id);
            await fetchActiveRide(session.user.id);
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
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. POLLING UNIVERSAL DE SEGURANÇA (A CORREÇÃO PRINCIPAL)
  // Verifica o status da corrida a cada 3 segundos se houver uma corrida ativa ou buscando
  useEffect(() => {
      let interval: NodeJS.Timeout;
      
      const shouldPoll = currentUserId && (
          // Se sou cliente e estou buscando ou em corrida
          (userRole === 'client' && ride) ||
          // Se sou cliente e estou na tela de busca (para pegar o aceite rápido)
          (userRole === 'client' && !ride) || 
          // Se sou motorista e estou em corrida
          (userRole === 'driver' && ride)
      );

      if (shouldPoll) {
          // Intervalo curto (2s) para sensação de tempo real
          interval = setInterval(() => {
              if (currentUserId) fetchActiveRide(currentUserId);
          }, 2000);
      }

      return () => {
          if (interval) clearInterval(interval);
      };
  }, [currentUserId, userRole, ride?.status]); // Re-executa se o status mudar

  // 3. Polling separado para lista de disponíveis (Motorista)
  useEffect(() => {
      let interval: NodeJS.Timeout;
      
      if (currentUserId && userRole === 'driver' && !ride) {
          fetchAvailableRides();
          interval = setInterval(fetchAvailableRides, 3000);
      }

      return () => {
          if (interval) clearInterval(interval);
      };
  }, [currentUserId, userRole, ride]);

  // 4. Realtime Channel (Mantido como "camada rápida")
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('global_ride_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        async (payload) => {
            const newRecord = payload.new as any;
            const oldRecord = payload.old as any;
            
            const isRelatedToMe = 
                (newRecord?.customer_id === currentUserId) ||
                (newRecord?.driver_id === currentUserId) ||
                (oldRecord?.customer_id === currentUserId) ||
                (oldRecord?.driver_id === currentUserId);

            if (isRelatedToMe) {
                await fetchActiveRide(currentUserId);
            }

            if (userRole === 'driver' && !ride) {
                 if (newRecord?.status === 'SEARCHING' || oldRecord?.status === 'SEARCHING') {
                     await fetchAvailableRides();
                 }
            }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userRole, ride]);

  // --- ACTIONS ---

  const requestRide = async (pickup: string, destination: string, price: number, distance: string, category: string, paymentMethod: string) => {
    if (!currentUserId) return toast({ title: "Erro", description: "Faça login.", variant: "destructive" });
    try {
      const { data, error } = await supabase.from('rides').insert({
          customer_id: currentUserId,
          pickup_address: pickup,
          destination_address: destination,
          price: price,
          distance: distance,
          status: 'SEARCHING',
          category: category,
          payment_method: paymentMethod
        }).select().single();
      if (error) throw error;
      setRide(data);
      await fetchActiveRide(currentUserId);
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  const cancelRide = async (rideId: string, reason?: string) => {
    try {
        const { error } = await supabase.rpc('cancel_ride_as_user', { ride_id_to_cancel: rideId });
        if (error) {
            console.warn("RPC cancel failed, trying direct update", error);
            await supabase.from('rides').update({ status: 'CANCELLED' }).eq('id', rideId);
        }
        setRide(null);
        toast({ title: "Cancelado", description: reason || "Corrida cancelada." });
    } catch (e: any) { toast({ title: "Erro", description: "Erro ao cancelar." }); }
  };

  const acceptRide = async (rideId: string) => {
     if (!currentUserId) return;
     try {
         const { data: check } = await supabase.from('rides').select('driver_id').eq('id', rideId).single();
         if (check?.driver_id) {
             toast({ title: "Aviso", description: "Esta corrida já foi aceita.", variant: "destructive" });
             if (!rejectedIdsRef.current.includes(rideId)) rejectedIdsRef.current.push(rideId);
             setAvailableRides(prev => prev.filter(r => r.id !== rideId));
             return;
         }

         const { error } = await supabase.from('rides').update({ status: 'ACCEPTED', driver_id: currentUserId }).eq('id', rideId);
         if (error) throw error;
         
         toast({ title: "Aceita", description: "Corrida aceita!" });
         await fetchActiveRide(currentUserId);
     } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const rejectRide = async (rideId: string) => {
      if (!rejectedIdsRef.current.includes(rideId)) {
          rejectedIdsRef.current.push(rideId);
      }
      setAvailableRides(prev => prev.filter(r => r.id !== rideId));

      try {
          const { error } = await supabase.rpc('reject_ride', { ride_id_param: rideId });
          if (error) console.error("Erro ao salvar rejeição no banco:", error);
      } catch (err) {
          console.error("Erro ao chamar reject_ride:", err);
      }
  };

  const confirmArrival = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({ status: 'ARRIVED' }).eq('id', rideId);
          if (error) throw error;
          await fetchActiveRide(currentUserId!);
          toast({ title: "Status Atualizado", description: "Passageiro notificado da chegada." });
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const startRide = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({ status: 'IN_PROGRESS' }).eq('id', rideId);
          if (error) throw error;
          await fetchActiveRide(currentUserId!);
          toast({ title: "Iniciada", description: "Boa viagem!" });
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const finishRide = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({ status: 'COMPLETED' }).eq('id', rideId);
          if (error) throw error;
          setRide(prev => prev ? ({...prev, status: 'COMPLETED'}) : null);
          toast({ title: "Finalizada", description: "Corrida concluída com sucesso." });
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const rateRide = async (rideId: string, rating: number, isDriver: boolean, comment?: string) => {
      try {
          const updateData = isDriver ? { customer_rating: rating } : { driver_rating: rating, review_comment: comment };
          const { error } = await supabase.from('rides').update(updateData).eq('id', rideId);
          if (error) throw error;
          setRide(null);
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const addBalance = async (amount: number) => {
      if(!currentUserId) return;
      try {
          const { data: profile } = await supabase.from('profiles').select('balance').eq('id', currentUserId).single();
          const newBalance = (profile?.balance || 0) + amount;
          
          await supabase.from('profiles').update({ balance: newBalance }).eq('id', currentUserId);
          await supabase.from('transactions').insert({
              user_id: currentUserId,
              amount: amount,
              type: 'DEPOSIT',
              description: 'Depósito via PIX'
          });
          toast({ title: "Sucesso", description: `R$ ${amount} adicionados!` });
      } catch(e: any) {
          toast({ title: "Erro", description: e.message });
          throw e;
      }
  }

  const clearRide = () => setRide(null);

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