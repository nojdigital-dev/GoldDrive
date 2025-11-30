import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null); // null = carregando
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const verifyRole = async (session: any) => {
        if (!session) {
            if (mounted) setIsAuthorized(false);
            return;
        }

        // 1. Tenta Metadata (Rápido)
        let role = session.user.user_metadata?.role;

        // 2. Fallback para RPC (Seguro)
        if (!role) {
            const { data } = await supabase.rpc('get_my_role');
            role = data;
        }

        // 3. Fallback para Tabela (Garantia Final)
        if (!role) {
            const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
            role = data?.role;
        }

        if (mounted) {
            if (role && allowedRoles.includes(role)) {
                setIsAuthorized(true);
            } else {
                console.warn(`Acesso negado. Role: ${role}, Esperado: ${allowedRoles}`);
                setIsAuthorized(false);
            }
        }
    };

    // Verificação Inicial + Listener de Mudanças
    // onAuthStateChange dispara o evento INITIAL_SESSION quando o storage é carregado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
             if (mounted) setIsAuthorized(false);
        } else if (session) {
             verifyRole(session);
        } else if (event === 'INITIAL_SESSION' && !session) {
             // Se terminou de carregar e não tem sessão
             if (mounted) setIsAuthorized(false);
        }
    });

    // Fallback: Check manual caso o evento não dispare rápido
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) verifyRole(session);
        // Nota: Se não tiver sessão aqui, esperamos o onAuthStateChange confirmar
        // para evitar o problema do "false positive" no F5
    });

    return () => { 
        mounted = false;
        subscription.unsubscribe();
    };
  }, [allowedRoles]);

  // Loading State
  if (isAuthorized === null) {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
                <p className="text-xs text-gray-400 font-medium">Restaurando sessão...</p>
            </div>
        </div>
    );
  }

  // Redirecionamento se falhar
  if (!isAuthorized) {
      let target = "/login";
      if (location.pathname.includes('/admin')) target = "/login/admin";
      else if (location.pathname.includes('/driver')) target = "/login/driver";
      
      return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;