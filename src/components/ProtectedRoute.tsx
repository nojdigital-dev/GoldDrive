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

    // Função de verificação robusta
    const checkUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                if (mounted) setStatus('unauthenticated');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            
            if (mounted) {
                if (!profile) {
                    setStatus('unauthorized');
                } else if (!allowedRoles.includes(profile.role)) {
                    setStatus('unauthorized');
                } else {
                    setStatus('authorized');
                }
            }
        } catch (error) {
            console.error("Auth check error:", error);
            if (mounted) setStatus('unauthorized');
        }
    };

    // 1. Verificação imediata ao montar
    checkUser();

    // 2. Listener para mudanças de estado (Login, Logout, Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            checkUser();
        } else if (event === 'SIGNED_OUT') {
            if (mounted) setStatus('unauthenticated');
        }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, [allowedRoles]);

  const handleForceLogout = () => {
      try { supabase.auth.signOut(); } catch (e) { console.error(e); }
      localStorage.clear();
      sessionStorage.clear();
      
      let redirectUrl = '/login';
      if (allowedRoles.includes('admin')) {
          redirectUrl = '/login/admin';
      } else if (allowedRoles.includes('driver')) {
          redirectUrl = '/login/driver';
      }
      window.location.replace(redirectUrl);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-12 w-12 text-yellow-500 mx-auto" />
          <p className="text-white font-medium text-sm animate-pulse">Verificando credenciais...</p>
        </div>
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 text-center animate-in fade-in">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-red-500/20">
            <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Acesso Negado</h1>
        <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
            Você não tem permissão para acessar esta área ou sua sessão expirou.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <Button 
                onClick={() => window.location.reload()} 
                className="flex-1 h-14 bg-white text-black hover:bg-gray-200 font-bold rounded-2xl"
            >
                <RefreshCw className="mr-2 h-5 w-5" /> Recarregar
            </Button>
            <Button 
                variant="destructive"
                onClick={handleForceLogout}
                className="flex-1 h-14 rounded-2xl font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20"
            >
                <LogOut className="mr-2 h-5 w-5" /> Sair
            </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;