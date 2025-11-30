import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { showError } from "@/utils/toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const verifyAccess = async () => {
      try {
        // 1. Pega sessão atual
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (mounted) {
            setIsAllowed(false);
            setIsLoading(false);
          }
          return;
        }

        // 2. Busca perfil e role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error || !profile) {
          console.error("Erro ao buscar perfil:", error);
          // Se tem sessão mas não tem perfil, algo está errado. Desloga por segurança.
          await supabase.auth.signOut();
          if (mounted) {
            setIsAllowed(false);
            setIsLoading(false);
          }
          return;
        }

        // 3. Verifica permissão
        if (allowedRoles.includes(profile.role)) {
          if (mounted) setIsAllowed(true);
        } else {
          // Logado, mas sem permissão para essa rota específica
          if (mounted) {
             showError("Acesso não autorizado para seu perfil.");
             setIsAllowed(false); 
          }
        }
      } catch (err) {
        console.error("Erro geral auth:", err);
        if (mounted) setIsAllowed(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // Escuta mudanças de auth (importante para F5 e recuperação de sessão)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        verifyAccess();
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setIsAllowed(false);
          setIsLoading(false);
        }
      }
    });

    // Executa verificação inicial (caso o listener não dispare imediatamente)
    verifyAccess();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [allowedRoles]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
      </div>
    );
  }

  if (!isAllowed) {
    // Redirecionamento inteligente: Se falhou, manda pro login correspondente
    // para que o usuário possa tentar logar novamente (ou trocar de conta)
    if (location.pathname.includes('/admin')) return <Navigate to="/login/admin" replace />;
    if (location.pathname.includes('/driver')) return <Navigate to="/login/driver" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;