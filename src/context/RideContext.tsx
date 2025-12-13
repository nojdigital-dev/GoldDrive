import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface RideContextType {
  ride: any | null;
  loading: boolean;
  requestRide: (pickup: string, destination: string, price: number, distance: string, category: string, paymentMethod: string) => Promise<void>;
  cancelRide: (rideId: string) => Promise<void>;
  acceptRide: (rideId: string) => Promise<void>;
  startRide: (rideId: string) => Promise<void>;
  finishRide: (rideId: string) => Promise<void>;
  rateRide: (rideId: string, rating: number, isDriver: boolean, comment?: string) => Promise<void>;
  clearRide: () => void;
  currentUserId: string | null;
  userRole: 'client' | 'driver' | null;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider = ({ children }: { children: React.ReactNode }) => {
  const [ride, setRide] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'client' | 'driver' | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Função de segurança para garantir que o loading pare
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (loading) {
        console.warn("Safety timer triggered: Force stopping loading.");
        setLoading(false);
      }
    }, 4000); // 4 segundos maximo de tela azul
    return () => clearTimeout(safetyTimer);
  }, [loading]);

  const fetchActiveRide = async (userId: string) => {
    try {
      // Busca perfil para saber role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
      const role = profile?.role || 'client';
      setUserRole(role);

      const queryField = role === 'driver' ? 'driver_id' : 'customer_id';
      
      // Busca corrida ativa
      const { data, error } = await supabase
        .from('rides')
        .select(`*, driver_details:profiles!public_rides_driver_id_fkey(*), customer_details:profiles!public_rides_customer_id_fkey(*)`)
        .eq(queryField, userId)
        .in('status', ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'])
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar corrida:', error);
      }
      
      if (data) {
        setRide(data);
      } else {
        setRide(null);
      }
    } catch (err) {
      console.error("Critical error fetching ride:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          if(mounted) setCurrentUserId(session.user.id);
          await fetchActiveRide(session.user.id);
        } else {
          if(mounted) setLoading(false);
        }
      } catch (error) {
        console.error("Init error:", error);
        if(mounted) setLoading(false);
      }
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      if (session?.user) {
        setCurrentUserId(session.user.id);
        await fetchActiveRide(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId(null);
        setRide(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Realtime Subscription
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('public:rides')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        async (payload) => {
          // Se a mudança for relevante para o usuário atual
          if (
            (payload.new && (payload.new as any).customer_id === currentUserId) ||
            (payload.new && (payload.new as any).driver_id === currentUserId) ||
            (payload.old && (payload.old as any).customer_id === currentUserId)
          ) {
            // Recarrega a corrida completa para garantir dados (joins)
            await fetchActiveRide(currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const requestRide = async (pickup: string, destination: string, price: number, distance: string, category: string, paymentMethod: string) => {
    if (!currentUserId) {
        toast({ title: "Erro", description: "Usuário não autenticado", variant: "destructive" });
        return;
    }

    try {
      console.log("Iniciando requestRide...", { pickup, destination, price, paymentMethod });
      
      const { data, error } = await supabase
        .from('rides')
        .insert({
          customer_id: currentUserId,
          pickup_address: pickup,
          destination_address: destination,
          price: price,
          distance: distance,
          status: 'SEARCHING',
          category: category,
          payment_method: paymentMethod
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      console.log("Corrida criada:", data);
      setRide(data);
      toast({ title: "Sucesso", description: "Procurando motoristas...", className: "bg-green-600 text-white" });
    } catch (error: any) {
      console.error('Erro ao solicitar corrida:', error);
      toast({ title: "Erro", description: error.message || "Falha ao criar corrida.", variant: "destructive" });
      throw error; // Re-throw para o componente pegar
    }
  };

  const cancelRide = async (rideId: string) => {
    try {
        // Tenta usar a função RPC segura primeiro
        const { error: rpcError } = await supabase.rpc('cancel_ride_as_user', { ride_id_to_cancel: rideId });
        
        if (rpcError) {
            // Fallback para update manual se a RPC falhar ou não existir
            console.warn("RPC failed, trying manual update", rpcError);
            const { error } = await supabase.from('rides').update({ status: 'CANCELLED' }).eq('id', rideId);
            if (error) throw error;
        }

        setRide(null);
        toast({ title: "Cancelado", description: "A corrida foi cancelada." });
    } catch (error: any) {
        console.error("Erro cancel:", error);
        toast({ title: "Erro", description: "Erro ao cancelar." });
    }
  };

  const acceptRide = async (rideId: string) => {
     if (!currentUserId) return;
     try {
         const { error } = await supabase.from('rides').update({ status: 'ACCEPTED', driver_id: currentUserId }).eq('id', rideId);
         if (error) throw error;
         toast({ title: "Aceita", description: "Você aceitou a corrida!" });
         await fetchActiveRide(currentUserId);
     } catch (e: any) {
         toast({ title: "Erro", description: e.message, variant: "destructive" });
     }
  };

  const startRide = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({ status: 'IN_PROGRESS' }).eq('id', rideId);
          if (error) throw error;
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const finishRide = async (rideId: string) => {
      try {
          // Aqui a trigger/edge function deveria tratar o saldo, mas fazemos o update básico
          const { error } = await supabase.from('rides').update({ status: 'COMPLETED' }).eq('id', rideId);
          if (error) throw error;
          setRide(prev => prev ? ({...prev, status: 'COMPLETED'}) : null);
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const rateRide = async (rideId: string, rating: number, isDriver: boolean, comment?: string) => {
      try {
          const updateData = isDriver ? { customer_rating: rating } : { driver_rating: rating, review_comment: comment };
          const { error } = await supabase.from('rides').update(updateData).eq('id', rideId);
          if (error) throw error;
          
          setRide(null); // Limpa a corrida da tela
          toast({ title: "Avaliado", description: "Obrigado pela avaliação!" });
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const clearRide = () => {
    setRide(null);
  };

  return (
    <RideContext.Provider value={{ 
      ride, 
      loading, 
      requestRide, 
      cancelRide, 
      acceptRide, 
      startRide, 
      finishRide, 
      rateRide,
      clearRide, 
      currentUserId,
      userRole
    }}>
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