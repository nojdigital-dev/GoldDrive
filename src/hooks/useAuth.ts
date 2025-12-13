import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (email?: string, password?: string, requiredRole?: 'admin' | 'client' | 'driver' | null) => {
    if (!email || !password) {
      showError("Por favor, preencha o email e a senha.");
      return;
    }
    
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error("A autenticação falhou. Tente novamente.");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, driver_status, is_blocked')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) throw new Error("Não foi possível encontrar o perfil do usuário.");

      if (profile.is_blocked) {
        await supabase.auth.signOut();
        if (profile.role === 'driver') {
            navigate('/login/driver?blocked=true', { replace: true });
        } else {
            throw new Error("Sua conta está bloqueada. Entre em contato com o suporte.");
        }
        return;
      }

      if (requiredRole && profile.role !== requiredRole) {
        await supabase.auth.signOut();
        throw new Error(`Acesso negado. Esta área é restrita para administradores.`);
      }

      switch (profile.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'driver':
          if (profile.driver_status === 'PENDING') {
            navigate('/driver-pending', { replace: true });
          } else {
            navigate('/driver', { replace: true });
          }
          break;
        case 'client':
          navigate('/client', { replace: true });
          break;
        default:
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
      }
    } catch (error: any) {
      if (error.message.includes("Invalid login credentials")) {
        showError("Email ou senha incorretos.");
      } else {
        showError(error.message || "Ocorreu um erro no login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleSignIn };
};