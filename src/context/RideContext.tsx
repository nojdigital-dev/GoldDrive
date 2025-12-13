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
  const [loading, setLoading] = useState(true); // Mantemos o state, mas vamos forçar false rápido
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'client' | 'driver' | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Força o loading a parar rapidamente, independente do Supabase
  useEffect(() => {
    // Para de carregar visualmente após 1 segundo no máximo
    const forceStopLoading = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(forceStopLoading);
  }, []);

  const fetchActiveRide = async (userId: string) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      const role = profile?.role || 'client';
      setUserRole(role);

      const queryField = role === 'driver' ? 'driver_id' : 'customer_id';
      
      const { data, error } = await supabase
        .from('rides')
        .select(`*, driver_details:profiles!public_rides_driver_id_fkey(*), customer_details:profiles!public_rides_customer_id_fkey(*)`)
        .eq(queryField, userId)
        .in('status', ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'])
        .maybeSingle();

      if (data) setRide(data);
      else setRide(null);
      
    } catch (err) {
      console.error("Erro silencioso ao buscar corrida:", err);
    }
  };

  useEffect(() => {
    // Inicialização simples
    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setCurrentUserId(session.user.id);
            await fetchActiveRide(session.user.id);
        }
    };
    init();

    // Listener de Auth APENAS atualiza o ID, não força logout se não for evento explícito
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId(null);
        setRide(null);
      }
    });

    return () => {
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
          if (
            (payload.new && (payload.new as any).customer_id === currentUserId) ||
            (payload.new && (payload.new as any).driver_id === currentUserId) ||
            (payload.old && (payload.old as any).customer_id === currentUserId)
          ) {
            await fetchActiveRide(currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // --- ACTIONS (Mantidas simples e diretas) ---

  const requestRide = async (pickup: string, destination: string, price: number, distance: string, category: string, paymentMethod: string) => {
    if (!currentUserId) return toast({ title: "Erro", description: "Faça login novamente.", variant: "destructive" });

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
      toast({ title: "Sucesso", description: "Procurando motoristas...", className: "bg-green-600 text-white" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const cancelRide = async (rideId: string) => {
    try {
        const { error } = await supabase.from('rides').update({ status: 'CANCELLED' }).eq('id', rideId);
        if (error) throw error;
        setRide(null);
        toast({ title: "Cancelado", description: "Corrida cancelada." });
    } catch (error: any) {
        toast({ title: "Erro", description: "Erro ao cancelar." });
    }
  };

  const acceptRide = async (rideId: string) => {
     if (!currentUserId) return;
     try {
         const { error } = await supabase.from('rides').update({ status: 'ACCEPTED', driver_id: currentUserId }).eq('id', rideId);
         if (error) throw error;
         toast({ title: "Aceita", description: "Corrida aceita!" });
         await fetchActiveRide(currentUserId);
     } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const startRide = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({ status: 'IN_PROGRESS' }).eq('id', rideId);
          if (error) throw error;
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const finishRide = async (rideId: string) => {
      try {
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
          setRide(null);
          toast({ title: "Obrigado", description: "Avaliação enviada." });
      } catch (e: any) { toast({ title: "Erro", description: e.message }); }
  };

  const clearRide = () => setRide(null);

  return (
    <RideContext.Provider value={{ ride, loading, requestRide, cancelRide, acceptRide, startRide, finishRide, rateRide, clearRide, currentUserId, userRole }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (context === undefined) throw new Error('useRide must be used within a RideProvider');
  return context;
};