import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

export type RideStatus = 'SEARCHING' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface DriverInfo {
    name: string;
    avatar_url?: string;
    car_model?: string;
    car_plate?: string;
    car_color?: string;
    total_rides?: number;
    rating?: number;
    phone?: string;
}

export interface ClientInfo {
    name: string;
    avatar_url?: string;
    rating?: number;
    phone?: string;
    total_rides?: number;
}

export interface RideData {
  id: string;
  customer_id: string;
  driver_id?: string;
  pickup_address: string;
  destination_address: string;
  price: number;
  distance: string;
  category: string;
  status: RideStatus;
  created_at: string;
  driver_details?: DriverInfo;
  client_details?: ClientInfo;
  customer_rating?: number;
  driver_rating?: number;
  driver_earnings?: number;
  platform_fee?: number;
  rejected_by?: string[];
}

interface RideContextType {
  ride: RideData | null;
  availableRides: RideData[];
  requestRide: (pickup: string, destination: string, price: number, distance: string, category: string) => Promise<void>;
  acceptRide: (rideId: string) => Promise<void>;
  confirmArrival: (rideId: string) => Promise<void>;
  rejectRide: (rideId: string) => Promise<void>;
  startRide: (rideId: string) => Promise<void>;
  finishRide: (rideId: string) => Promise<void>;
  cancelRide: (rideId: string, reason?: string) => Promise<void>;
  rateRide: (rideId: string, rating: number, isDriver: boolean) => Promise<void>;
  clearRide: () => void;
  userRole: 'client' | 'driver' | 'admin' | null;
  loading: boolean;
  addBalance: (amount: number) => Promise<void>;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider = ({ children }: { children: ReactNode }) => {
  const [ride, setRide] = useState<RideData | null>(null);
  const [availableRides, setAvailableRides] = useState<RideData[]>([]);
  const [userRole, setUserRole] = useState<'client' | 'driver' | 'admin' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Helpers para buscar dados
  const fetchDriverFullInfo = async (driverId: string): Promise<DriverInfo> => {
      const { data } = await supabase.from('profiles').select('*').eq('id', driverId).single();
      const { data: ratings } = await supabase.from('rides').select('customer_rating').eq('driver_id', driverId).not('customer_rating', 'is', null);
      const avg = ratings && ratings.length > 0 ? ratings.reduce((a, b) => a + (b.customer_rating || 0), 0) / ratings.length : 5.0;
      return {
          name: data ? `${data.first_name} ${data.last_name || ''}` : 'Motorista GoldDrive',
          avatar_url: data?.avatar_url,
          car_model: data?.car_model,
          car_plate: data?.car_plate,
          car_color: data?.car_color,
          total_rides: data?.total_rides || 0,
          rating: avg,
          phone: data?.phone
      };
  };

  const fetchClientFullInfo = async (clientId: string): Promise<ClientInfo> => {
      const { data } = await supabase.from('profiles').select('*').eq('id', clientId).single();
      return {
          name: data ? `${data.first_name} ${data.last_name || ''}` : 'Passageiro',
          avatar_url: data?.avatar_url,
          rating: 5.0, // Simplificado
          phone: data?.phone,
          total_rides: data?.total_rides || 0
      };
  };

  // Auth Monitor e Recuperação Inicial
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserId(session.user.id);
          const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
          if (data) setUserRole(data.role);
          
          // Buscar corrida ativa imediatamente ao carregar
          fetchCurrentRide(session.user.id, data?.role);
        }
      } catch (e) {
        console.error("Erro ao iniciar sessão:", e);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            setUserId(session.user.id);
            const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            if (data) setUserRole(data.role);
        } else {
            setUserId(null); setUserRole(null); setRide(null);
        }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchCurrentRide = async (uid: string, role: string | null) => {
      if (!uid) return;
      const query = supabase.from('rides').select('*');
      
      // Busca a última corrida não finalizada ou a última finalizada sem avaliação
      if (role === 'client') query.eq('customer_id', uid);
      else if (role === 'driver') query.eq('driver_id', uid);
      
      const { data } = await query.order('created_at', { ascending: false }).limit(1).single();
      
      if (data) {
          const isActive = ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(data.status);
          const isPendingRating = data.status === 'COMPLETED' && (role === 'client' ? !data.customer_rating : !data.driver_rating);
          
          if (isActive || isPendingRating) {
              let rideData = { ...data } as RideData;
              if (data.driver_id) rideData.driver_details = await fetchDriverFullInfo(data.driver_id);
              if (data.customer_id) rideData.client_details = await fetchClientFullInfo(data.customer_id);
              setRide(rideData);
          }
      }
  };

  // Polling System
  useEffect(() => {
    if (!userId) return;

    const performPolling = async () => {
        // Driver: Busca novas corridas
        if (userRole === 'driver') {
            if (ride && ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED') return;

            const { data: available } = await supabase.from('rides').select('*').eq('status', 'SEARCHING');
            if (available) {
                const filtered = available.filter((r: any) => !r.rejected_by || !r.rejected_by.includes(userId));
                setAvailableRides(prev => JSON.stringify(prev) !== JSON.stringify(filtered) ? filtered as RideData[] : prev);
            }
        }
        
        // Updates de Status (Ambos)
        if (ride) {
            const { data: updatedRide } = await supabase.from('rides').select('*').eq('id', ride.id).single();
            
            if (updatedRide) {
                // Atualiza se mudou status ou se ganhou motorista
                if (updatedRide.status !== ride.status || (updatedRide.driver_id && !ride.driver_id)) {
                    let fullData = { ...updatedRide } as RideData;
                    
                    if (updatedRide.driver_id) fullData.driver_details = await fetchDriverFullInfo(updatedRide.driver_id);
                    if (updatedRide.customer_id) fullData.client_details = await fetchClientFullInfo(updatedRide.customer_id);
                    
                    setRide(fullData);
                    
                    if (updatedRide.status === 'ACCEPTED' && ride.status === 'SEARCHING') showSuccess("Motorista encontrado!");
                    if (updatedRide.status === 'CANCELLED' && ride.status !== 'CANCELLED') showError("A corrida foi cancelada.");
                }
            }
        }
    };

    const interval = setInterval(performPolling, 3000);
    return () => clearInterval(interval);
  }, [userId, userRole, ride]);


  // --- ACTIONS ---

  const clearRide = () => setRide(null);

  const requestRide = async (pickup: string, destination: string, price: number, distance: string, category: string) => {
    // 1. Garantir Usuário
    let currentUserId = userId;
    if (!currentUserId) {
        const { data } = await supabase.auth.getUser();
        currentUserId = data.user?.id || null;
    }
    
    if (!currentUserId) throw new Error("Usuário não identificado. Faça login novamente.");

    // 2. Verificar Saldo
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', currentUserId).single();
    if ((profile?.balance || 0) < price) { 
        throw new Error("Saldo insuficiente na carteira."); 
    }

    // 3. Criar Corrida (Sem rejected_by para usar default do banco)
    const { data, error } = await supabase.from('rides').insert({
        customer_id: currentUserId,
        pickup_address: pickup,
        destination_address: destination,
        price: Number(price),
        distance,
        category,
        status: 'SEARCHING'
    }).select().single();

    if (error) {
        console.error("Erro ao criar corrida:", error);
        throw new Error("Erro ao solicitar: " + error.message);
    }

    setRide(data as RideData);
  };

  const acceptRide = async (rideId: string) => {
      let currentUserId = userId;
      if (!currentUserId) {
         const { data } = await supabase.auth.getUser();
         currentUserId = data.user?.id || null;
      }
      if (!currentUserId) return;

      const { data: checkRide } = await supabase.from('rides').select('status').eq('id', rideId).single();
      if (checkRide.status !== 'SEARCHING') {
          showError("Esta corrida já foi aceita por outro motorista.");
          setAvailableRides(prev => prev.filter(r => r.id !== rideId));
          return;
      }

      const { error, data } = await supabase.from('rides').update({ status: 'ACCEPTED', driver_id: currentUserId }).eq('id', rideId).select().single();
      if (error) throw error;
      
      let fullData = { ...data } as RideData;
      fullData.client_details = await fetchClientFullInfo(data.customer_id);
      
      setRide(fullData);
      setAvailableRides([]);
      showSuccess("Corrida aceita! Vá até o passageiro.");
  };

  const confirmArrival = async (rideId: string) => {
      const { error, data } = await supabase.from('rides').update({ status: 'ARRIVED' }).eq('id', rideId).select().single();
      if (error) throw error;
      setRide(prev => prev ? { ...prev, ...data } : null);
      showSuccess("Chegada confirmada!");
  };

  const rejectRide = async (rideId: string) => {
      if (!userId) return;
      setAvailableRides(prev => prev.filter(r => r.id !== rideId));
      
      const { data: currentRide } = await supabase.from('rides').select('rejected_by').eq('id', rideId).single();
      if (currentRide) {
          const currentRejected = currentRide.rejected_by || [];
          // Verifica se já não está na lista para evitar duplicatas
          if (!currentRejected.includes(userId)) {
              await supabase.from('rides').update({ rejected_by: [...currentRejected, userId] }).eq('id', rideId);
          }
      }
  };

  const startRide = async (rideId: string) => {
      const { error, data } = await supabase.from('rides').update({ status: 'IN_PROGRESS' }).eq('id', rideId).select().single();
      if (error) throw error;
      setRide(prev => prev ? { ...prev, ...data } : null);
      showSuccess("Corrida iniciada! Boa viagem.");
  };

  const finishRide = async (rideId: string) => {
      if (!ride) return;
      const price = Number(ride.price);
      const driverEarn = price * 0.8;
      const platformFee = price * 0.2;

      await supabase.from('rides').update({ status: 'COMPLETED', driver_earnings: driverEarn, platform_fee: platformFee }).eq('id', rideId);
      
      // Update stats and balances
      if (ride.driver_id) {
           const { data: driverData } = await supabase.from('profiles').select('total_rides').eq('id', ride.driver_id).single();
           await supabase.from('profiles').update({ total_rides: (driverData?.total_rides || 0) + 1 }).eq('id', ride.driver_id);
           
           const { data: driverProfile } = await supabase.from('profiles').select('balance').eq('id', ride.driver_id).single();
           await supabase.from('profiles').update({ balance: (driverProfile?.balance || 0) + driverEarn }).eq('id', ride.driver_id);
           await supabase.from('transactions').insert({ user_id: ride.driver_id, amount: driverEarn, type: 'RIDE_EARNING', description: 'Ganho Corrida' });
      }

      const { data: clientProfile } = await supabase.from('profiles').select('balance').eq('id', ride.customer_id).single();
      await supabase.from('profiles').update({ balance: (clientProfile?.balance || 0) - price }).eq('id', ride.customer_id);
      await supabase.from('transactions').insert({ user_id: ride.customer_id, amount: -price, type: 'RIDE_PAYMENT', description: 'Pagamento Corrida' });
      
      setRide(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
      showSuccess("Corrida finalizada com sucesso!");
  };

  const cancelRide = async (rideId: string, reason: string = "Cancelado") => {
      const targetId = rideId || ride?.id;
      if (!targetId) return;

      // Timeout do sistema
      if (reason === 'TIMEOUT') {
           await supabase.from('rides').update({ status: 'CANCELLED' }).eq('id', targetId);
           setRide(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
           return;
      }
      
      // Cancelamento com taxa (se motorista já aceitou)
      const isLateCancel = (ride?.status === 'ACCEPTED' || ride?.status === 'ARRIVED');
      if (isLateCancel && userRole === 'client') {
          const fee = 5.00;
          const { data: p } = await supabase.from('profiles').select('balance').eq('id', userId).single();
          await supabase.from('profiles').update({ balance: (p?.balance || 0) - fee }).eq('id', userId);
          await supabase.from('transactions').insert({ user_id: userId, amount: -fee, type: 'FEE', description: 'Taxa Cancelamento' });
          
          if (ride?.driver_id) {
               const { data: d } = await supabase.from('profiles').select('balance').eq('id', ride.driver_id).single();
               await supabase.from('profiles').update({ balance: (d?.balance || 0) + (fee/2) }).eq('id', ride.driver_id);
          }
          showSuccess(`Corrida cancelada. Taxa de R$ ${fee.toFixed(2)} aplicada.`);
      } else {
          showSuccess("Corrida cancelada.");
      }

      await supabase.from('rides').update({ status: 'CANCELLED' }).eq('id', targetId);
      setRide(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
  };

  const rateRide = async (rideId: string, rating: number, isDriver: boolean) => {
      const update = isDriver ? { customer_rating: rating } : { driver_rating: rating };
      await supabase.from('rides').update(update).eq('id', rideId);
      showSuccess("Avaliação enviada! Obrigado.");
      setRide(null);
  };
  
  const addBalance = async (amount: number) => {
      let currentUserId = userId;
      if (!currentUserId) {
         const { data } = await supabase.auth.getUser();
         currentUserId = data.user?.id || null;
      }
      if (!currentUserId) return;

      const { data: p } = await supabase.from('profiles').select('balance').eq('id', currentUserId).single();
      await supabase.from('profiles').update({ balance: (p?.balance || 0) + amount }).eq('id', currentUserId);
      await supabase.from('transactions').insert({ user_id: currentUserId, amount, type: 'DEPOSIT', description: 'Recarga via PIX' });
      showSuccess(`R$ ${amount.toFixed(2)} adicionados com sucesso!`);
  };

  return (
    <RideContext.Provider value={{ ride, availableRides, requestRide, acceptRide, confirmArrival, rejectRide, startRide, finishRide, cancelRide, rateRide, clearRide, addBalance, userRole, loading }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (context === undefined) throw new Error('useRide must be used within a RideProvider');
  return context;
};