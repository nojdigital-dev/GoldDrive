import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        // 1. Pega a sessão atual (recupera do localStorage se der F5)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (mounted) {
            setIsAllowed(false);
            setLoading(false);
          }
          return;
        }

        // 2. Se tem sessão, verifica a Role no banco
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          console.error("Erro ao verificar permissão:", error);
          if (mounted) setIsAllowed(false);
        } else {
          // 3. Verifica se a role bate com o permitido
          if (mounted) {
             setIsAllowed(allowedRoles.includes(profile.role));
          }
        }
      } catch (err) {
        console.error("Erro crítico na rota protegida:", err);
        if (mounted) setIsAllowed(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-12 w-12 text-yellow-500 mx-auto" />
          <p className="text-white font-medium text-sm animate-pulse">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  // Se não for permitido, manda pra home (ou login) para quebrar o ciclo
  return isAllowed ? <>{children}</> : <Navigate to="/" replace />;
};

export default ProtectedRoute;