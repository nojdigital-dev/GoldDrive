import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  allowedRoles: string[];
}

type AuthStatus = 'loading' | 'authorized' | 'unauthorized' | 'unauthenticated';

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let mounted = true;

    const check = async () => {
        // Tenta pegar a sessão do cache local primeiro (instantâneo)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            if(mounted) setStatus('unauthenticated');
            return;
        }

        // Se já temos a role no metadata do usuário (cache do JWT), usamos ela para evitar bate-volta no banco
        // Isso acelera drasticamente a navegação
        const userRole = session.user.user_metadata?.role;
        
        if (userRole && allowedRoles.includes(userRole)) {
            if(mounted) setStatus('authorized');
            // Mesmo autorizado via cache, podemos validar no banco em background se necessário, 
            // mas para UX fluida, confiamos no JWT por enquanto.
            return;
        }

        // Fallback: Se não tiver no metadata, busca no banco (mais lento, mas seguro)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (mounted) {
            if (profile && allowedRoles.includes(profile.role)) {
                setStatus('authorized');
            } else {
                // Se o perfil não corresponde, desloga para segurança
                await supabase.auth.signOut();
                setStatus('unauthenticated');
            }
        }
    };

    check();

    return () => { mounted = false; };
  }, [allowedRoles]);

  if (status === 'loading') {
    // Loader mínimo para evitar piscar a tela, mas rápido o suficiente para não ser notado
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin h-8 w-8 text-yellow-500" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    let redirectUrl = '/login';
    if (allowedRoles.includes('admin')) redirectUrl = '/login/admin';
    else if (allowedRoles.includes('driver')) redirectUrl = '/login/driver';
    return <Navigate to={redirectUrl} replace />;
  }

  if (status === 'unauthorized') {
    // Se não autorizado, manda para a home, que redirecionará corretamente
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;