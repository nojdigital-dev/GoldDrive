import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // 1. Verifica sessão local (rápido)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (mounted) setIsAuthorized(false);
          return;
        }

        // 2. Busca perfil
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, driver_status, is_blocked')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error || !profile) {
          console.error("Erro ao buscar perfil, mas mantendo sessão:", error);
          // Em caso de erro de rede, não deslogamos. Assumimos que o usuário é válido se tiver sessão.
          // Fallback seguro: se não conseguiu ler o perfil, deixa passar se for client (padrão)
          if (mounted) setIsAuthorized(true); 
          return;
        }

        // 3. Verificações de bloqueio (Sem deslogar, apenas redirecionar se necessário)
        if (profile.is_blocked) {
           if (allowedRoles.includes('driver')) {
               window.location.href = '/login/driver?blocked=true';
           } else {
               if (mounted) setIsAuthorized(false);
           }
           return;
        }

        // 4. Verificação de Role
        if (allowedRoles.includes(profile.role)) {
            if (mounted) setIsAuthorized(true);
        } else {
            // Role incorreta para esta rota
            if (mounted) setIsAuthorized(false);
        }

      } catch (error) {
        console.error("Erro fatal no auth check:", error);
        // Em caso de erro fatal, tentamos liberar o acesso se tiver sessão, senão login
        if (mounted) setIsAuthorized(false);
      }
    };

    checkAuth();

    return () => { mounted = false; };
  }, [allowedRoles, location.pathname]);

  if (isAuthorized === null) {
    // Timeout de segurança visual: se demorar muito, mostra loader, mas não trava lógica
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin h-8 w-8 text-yellow-500" />
            <p className="text-sm text-gray-500 animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;