import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      // Timeout de segurança: se o Supabase não responder em 2s, assume que não está logado para não travar
      const timeout = new Promise((resolve) => setTimeout(resolve, 2000));
      
      const check = async () => {
         const { data: { session } } = await supabase.auth.getSession();
         if (!session) return false;

         // Se já tiver a role no metadata (cache), usa ela pra ser instantâneo
         let role = session.user.user_metadata?.role;
         
         // Se não tiver, busca no banco rapidinho
         if (!role) {
             const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
             role = data?.role;
         }

         return { role, match: role && allowedRoles.includes(role) };
      };

      try {
        // Corrida entre verificação e timeout
        const result: any = await Promise.race([check(), timeout]);

        if (mounted) {
            if (!result || !result.role) {
                // Não logado ou erro
                setRedirectPath(determineLoginRoute(location.pathname));
            } else if (result.match) {
                // Sucesso total
                setCanAccess(true);
            } else {
                // Logado mas role errada
                setRedirectPath(determineRedirectByRole(result.role));
            }
        }
      } catch (e) {
        console.error("Auth Error", e);
        if (mounted) setRedirectPath("/login");
      } finally {
        if (mounted) setIsChecking(false);
      }
    };

    verify();

    return () => { mounted = false; };
  }, [location.pathname, allowedRoles]);

  const determineLoginRoute = (path: string) => {
      if (path.includes('/admin')) return "/login/admin";
      if (path.includes('/driver')) return "/login/driver";
      return "/login";
  };

  const determineRedirectByRole = (role: string) => {
      if (role === 'admin') return "/admin";
      if (role === 'driver') return "/driver";
      return "/client";
  };

  // Enquanto verifica, não mostra NADA (melhor que loader travado) ou um loader invisível
  // Se demorar muito, o timeout libera.
  if (isChecking) {
      return null; // Tela branca rápida é melhor que "Carregando..." eterno
  }

  if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
  }

  if (canAccess) {
      return <>{children}</>;
  }

  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;