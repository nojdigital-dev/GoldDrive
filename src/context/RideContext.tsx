import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

export type RideStatus = 'SEARCHING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

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
  driver_name?: string; // Campo virtual (join)
}

interface RideContextType {
  ride: RideData | null;
  availableRides: RideData[];
  requestRide: (pickup: string, destination: string, price: number, distance: string, category: string) => Promise<void>;
  acceptRide: (rideId: string) => Promise<void>;
  startRide: (rideId: string) => Promise<void>;
  finishRide: (rideId: string) => Promise<void>;
  cancelRide: (rideId: string) => Promise<void>;
  userRole: 'client' | 'driver' | 'admin' | null;
  loading: boolean;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider = ({ children }: { children: ReactNode }) => {
  const [ride, setRide] = useState<RideData | null>(null);
  const [availableRides, setAvailableRides] = useState<RideData[]>([]);
  const [userRole, setUserRole] = useState<'client' | 'driver' | 'admin' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitorar Autenticação e Perfil
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile) setUserRole(profile.role);
      }
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            setUserId(session.user.id);
             const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
             if (profile) setUserRole(profile.role);
        } else {
            setUserId(null);
            setUserRole(null);
            setRide(null);
        }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Helpers para buscar dados extras do motorista
  const fetchDriverInfo = async (driverId: string) => {
      const { data } = await supabase.from('profiles').select('first_name, last_name').eq('id', driverId).single();
      return data ? `${data.first_name} ${data.last_name || ''}` : 'Motorista';
  };

  // Monitorar Corridas (Realtime)
  useEffect(() => {
    if (!userId) return;

    // Buscar estado inicial
    const fetchCurrentRide = async () => {
        if (userRole === 'client') {
             const { data } = await supabase
                .from('rides')
                .select('*')
                .eq('customer_id', userId)
                .in('status', ['SEARCHING', 'ACCEPTED', 'IN_PROGRESS'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
             
             if (data) {
                 let rideData = { ...data } as RideData;
                 if (data.driver_id) {
                     rideData.driver_name = await fetchDriverInfo(data.driver_id);
                 }
                 setRide(rideData);
             }
        } 
        else if (userRole === 'driver') {
             const { data } = await supabase
                .from('rides')
                .select('*')
                .eq('driver_id', userId)
                .in('status', ['ACCEPTED', 'IN_PROGRESS'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
             if (data) setRide(data as RideData);
             
             const { data: available } = await supabase
                .from('rides')
                .select('*')
                .eq('status', 'SEARCHING');
             if (available) setAvailableRides(available as RideData[]);
        }
    };

    fetchCurrentRide();

    // Inscrever no Realtime
    const channel = supabase
      .channel('public:rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, async (payload) => {
        const newRide = payload.new as RideData;
        
        // Logica para Cliente
        if (userRole === 'client') {
            if (newRide.customer_id === userId) {
                if (['COMPLETED', 'CANCELLED'].includes(newRide.status)) {
                    setRide(null);
                    if (newRide.status === 'COMPLETED') showSuccess("Corrida finalizada com sucesso!");
                } else {
                    // Se foi aceita, busca nome do motorista
                    let updatedRide = { ...newRide };
                    if (newRide.driver_id) {
                        updatedRide.driver_name = await fetchDriverInfo(newRide.driver_id);
                    }
                    setRide(updatedRide);
                    
                    if (newRide.status === 'ACCEPTED' && payload.eventType === 'UPDATE') {
                        showSuccess("Motorista a caminho!");
                    }
                }
            }
        }
        
        // Logica para Motorista
        if (userRole === 'driver') {
            if (payload.eventType === 'INSERT' && newRide.status === 'SEARCHING') {
                setAvailableRides(prev => [...prev, newRide]);
            }
            if (payload.eventType === 'UPDATE' && newRide.status !== 'SEARCHING') {
                // Remove da lista de disponíveis se alguém pegou ou cancelou
                setAvailableRides(prev => prev.filter(r => r.id !== newRide.id));
            }
            
            // Se for a corrida que o motorista atual pegou
            if (newRide.driver_id === userId) {
                if (['COMPLETED', 'CANCELLED'].includes(newRide.status)) {
                    setRide(null);
                } else {
                    setRide(newRide);
                }
            }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole]);


  const requestRide = async (pickup: string, destination: string, price: number, distance: string, category: string) => {
    if (!userId) return;
    try {
        const { error } = await supabase.from('rides').insert({
            customer_id: userId,
            pickup_address: pickup,
            destination_address: destination,
            price,
            distance,
            category,
            status: 'SEARCHING'
        });
        if (error) throw error;
        // Não precisamos setar o ride manualmente aqui, o realtime vai cuidar disso
        showSuccess("Procurando motoristas próximos...");
    } catch (e: any) {
        showError(e.message);
    }
  };

  const acceptRide = async (rideId: string) => {
      if (!userId) return;
      try {
          const { error } = await supabase.from('rides').update({
              status: 'ACCEPTED',
              driver_id: userId
          }).eq('id', rideId);
          if (error) throw error;
      } catch (e: any) {
          showError(e.message);
      }
  };

  const startRide = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({
              status: 'IN_PROGRESS',
          }).eq('id', rideId);
          if (error) throw error;
      } catch (e: any) {
          showError(e.message);
      }
  };

  const finishRide = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({
              status: 'COMPLETED',
          }).eq('id', rideId);
          if (error) throw error;
      } catch (e: any) {
          showError(e.message);
      }
  };

  const cancelRide = async (rideId: string) => {
      try {
          const { error } = await supabase.from('rides').update({
              status: 'CANCELLED',
          }).eq('id', rideId);
          if (error) throw error;
      } catch (e: any) {
          showError(e.message);
      }
  };

  return (
    <RideContext.Provider value={{ ride, availableRides, requestRide, acceptRide, startRide, finishRide, cancelRide, userRole, loading }}>
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