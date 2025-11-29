import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        // 1. Verifica sessão atual
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (!session) {
          setLoading(false);
          return;
        }

        setSession(session);

        // 2. Verifica Role (Prioridade: Metadata > Banco de Dados)
        let userRole = session.user.user_metadata?.role;
        
        if (!userRole) {
          const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
          userRole = data?.role;
        }

        setRole(userRole || 'client');
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Listener para mudanças de auth (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        if(!session) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-yellow-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    // Redireciona para o login específico se estiver tentando acessar área restrita
    if (location.pathname.includes('/driver')) return <Navigate to="/login/driver" replace />;
    if (location.pathname.includes('/admin')) return <Navigate to="/login/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  // Verifica permissão de Role
  if (role && !allowedRoles.includes(role)) {
      if (role === 'admin') return <Navigate to="/admin" replace />;
      if (role === 'driver') return <Navigate to="/driver" replace />;
      return <Navigate to="/client" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;