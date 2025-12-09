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

    const verifyAccess = async () => {
      try {
        // 1. Verifica sessão atual
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (mounted) setStatus('unauthenticated');
          return;
        }

        // 2. Busca perfil e role
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (mounted) {
          if (error || !data) {
            console.error('Erro ao buscar perfil:', error);
            // Se tem sessão mas deu erro no perfil, marcamos como não autorizado para não gerar loop
            setStatus('unauthorized');
          } else {
            // 3. Valida permissão
            const hasAccess = allowedRoles.includes(data.role);
            setStatus(hasAccess ? 'authorized' : 'unauthorized');
          }
        }
      } catch (error) {
        console.error('Erro crítico na verificação:', error);
        if (mounted) setStatus('unauthorized');
      }
    };

    verifyAccess();

    // Timeout de segurança: se travar no loading por 10s, força erro para liberar a UI
    const timeout = setTimeout(() => {
        if (mounted && status === 'loading') {
            setStatus('unauthorized'); // Mostra tela de erro em vez de loop
        }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [allowedRoles, status]); // 'status' na dependência apenas para o timeout check, cuidado com loops internos

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
    // Se não tem sessão nenhuma, manda pro login
    return <Navigate to="/login" replace />;
  }

  if (status === 'unauthorized') {
    // Se tem sessão mas falhou a validação, MOSTRA ERRO em vez de redirecionar.
    // Isso impede o loop infinito com a página de login.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Falha na Verificação</h1>
        <p className="text-gray-400 max-w-md mb-8">
            Não foi possível validar suas permissões de acesso. Isso pode acontecer devido a uma falha de conexão ou sessão expirada.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <Button 
                onClick={() => window.location.reload()} 
                className="flex-1 h-12 bg-white text-black hover:bg-gray-200 font-bold rounded-xl"
            >
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
            </Button>
            <Button 
                variant="destructive"
                onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/login'; // Força reload limpo
                }} 
                className="flex-1 h-12 rounded-xl font-bold"
            >
                <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
            </Button>
        </div>
      </div>
    );
  }

  // Se autorizado, renderiza o conteúdo
  return <>{children}</>;
};

export default ProtectedRoute;