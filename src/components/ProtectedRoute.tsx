import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Verifica sessão
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        // Busca a role no perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        setUserRole(profile?.role || null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-gray-500 font-medium">Verificando permissões...</p>
      </div>
    );
  }

  // Se não estiver logado, manda pro login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se tiver a role mas ela não estiver na lista de permitidas
  if (userRole && !allowedRoles.includes(userRole)) {
    // Redireciona para o dashboard correto baseado na role do usuário
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'driver') return <Navigate to="/driver" replace />;
    if (userRole === 'client') return <Navigate to="/client" replace />;
    
    // Fallback
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;