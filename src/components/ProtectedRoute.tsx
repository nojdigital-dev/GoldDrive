import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    // Timeout de segurança: Se travar por 3 segundos, força a falha e redireciona
    const timeoutId = setTimeout(() => {
        if (mounted && isLoading) {
            console.warn("Verificação de sessão demorou muito. Redirecionando...");
            setIsLoading(false);
            setIsAuthenticated(false);
        }
    }, 3000);

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            if (mounted) {
                setIsAuthenticated(false);
                setIsLoading(false);
            }
            return;
        }

        // Se tem sessão, busca a role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

        if (mounted) {
            if (profile && !profileError) {
                setUserRole(profile.role);
                setIsAuthenticated(true);
            } else {
                // Sessão existe mas não conseguimos ler o perfil (erro de rede ou banco)
                console.error("Erro ao ler perfil:", profileError);
                setIsAuthenticated(false);
            }
            setIsLoading(false);
        }
      } catch (error) {
        console.error("Auth Check Error:", error);
        if (mounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
            if (mounted) {
                setIsAuthenticated(false);
                setUserRole(null);
                // Não precisa setar loading, o redirect vai acontecer no render
            }
        }
    });

    return () => {
        mounted = false;
        clearTimeout(timeoutId); // Limpa o timer se o componente desmontar
        subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">Verificando credenciais...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirecionamento inteligente baseado na URL que tentou acessar
    if (location.pathname.includes('/admin')) return <Navigate to="/login/admin" replace />;
    if (location.pathname.includes('/driver')) return <Navigate to="/login/driver" replace />;
    return <Navigate to="/login" replace />;
  }

  // Verifica permissão de Role
  if (userRole && !allowedRoles.includes(userRole)) {
      if (userRole === 'admin') return <Navigate to="/admin" replace />;
      if (userRole === 'driver') return <Navigate to="/driver" replace />;
      return <Navigate to="/client" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;