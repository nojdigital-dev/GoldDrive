import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Shield, Loader2, Lock, ArrowLeft, KeyRound, LogOut, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const LoginAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Verificação inicial de sessão (apenas ao carregar a página)
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && mounted) {
                 const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
                 if (data?.role === 'admin') {
                     navigate('/admin', { replace: true });
                 }
            }
        } catch (e) {
            // Ignora erro silencioso na montagem
        }
    };
    checkSession();
    return () => { mounted = false; };
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    // Timeout de segurança: Se o Supabase travar, isso destrava o botão em 10s
    const safetyTimeout = setTimeout(() => {
        if (loading) {
            setLoading(false);
            showError("O servidor demorou para responder. Verifique sua conexão.");
        }
    }, 10000);

    try {
        // 1. Tentativa de Login Direta
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim()
        });
        
        // Se der erro de senha/email, o Supabase retorna authError aqui
        if (authError) throw authError;
        
        if (!authData.user) throw new Error("Usuário não encontrado.");

        // 2. Verificação de Permissão (Admin)
        // Usamos maybeSingle para não estourar erro se o perfil não existir (embora deva existir)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .maybeSingle();
        
        if (profileError) throw new Error("Erro ao carregar perfil: " + profileError.message);

        if (!profile || profile.role !== 'admin') {
            // Se logou mas não é admin, desloga imediatamente
            await supabase.auth.signOut();
            throw new Error("Acesso negado: Apenas administradores.");
        }
        
        // 3. Sucesso - Limpa timeout e Redireciona
        clearTimeout(safetyTimeout);
        navigate('/admin', { replace: true });

    } catch (e: any) {
        clearTimeout(safetyTimeout);
        console.error("Erro login:", e);
        
        // Tratamento de mensagens de erro
        const msg = e.message || "";
        if (msg.includes("Invalid login") || msg.includes("Invalid credentials")) {
            showError("Email ou senha incorretos.");
        } else if (msg.includes("network")) {
            showError("Erro de conexão. Verifique sua internet.");
        } else {
            showError(msg || "Erro ao autenticar. Tente novamente.");
        }
    } finally {
        // Isso GARANTE que o botão vai parar de rodar, independente do que aconteça
        clearTimeout(safetyTimeout);
        setLoading(false);
    }
  };

  const handleForceClear = () => {
      localStorage.clear();
      window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
       <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
       <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

       <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="mb-8 text-center">
               <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/10 ring-4 ring-white/5">
                   <Shield className="w-8 h-8 text-yellow-500" />
               </div>
               <h1 className="text-3xl font-black text-white tracking-tight mb-2">Gold<span className="text-yellow-500">Admin</span></h1>
               <p className="text-slate-400">Credenciais de alta segurança necessárias.</p>
           </div>

           <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[32px] overflow-hidden">
               <CardContent className="p-8">
                   <form onSubmit={handleAuth} className="space-y-6">
                       <div className="space-y-2">
                           <label className="text-xs font-bold uppercase text-slate-500 tracking-wider ml-1">ID Corporativo</label>
                           <div className="relative group">
                               <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-yellow-500 transition-colors"><Shield className="w-5 h-5" /></div>
                               <Input 
                                   type="email" 
                                   placeholder="admin@golddrive.com" 
                                   className="bg-slate-900/50 border-white/10 pl-12 h-12 rounded-xl text-white placeholder:text-slate-600 focus:border-yellow-500/50 focus:ring-yellow-500/20 transition-all" 
                                   value={email} 
                                   onChange={e => setEmail(e.target.value)} 
                                   autoComplete="email" 
                               />
                           </div>
                       </div>
                       
                       <div className="space-y-2">
                           <label className="text-xs font-bold uppercase text-slate-500 tracking-wider ml-1">Chave de Acesso</label>
                           <div className="relative group">
                               <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-yellow-500 transition-colors"><KeyRound className="w-5 h-5" /></div>
                               <Input 
                                   type={showPassword ? "text" : "password"} 
                                   placeholder="••••••••••••" 
                                   className="bg-slate-900/50 border-white/10 pl-12 pr-12 h-12 rounded-xl text-white placeholder:text-slate-600 focus:border-yellow-500/50 focus:ring-yellow-500/20 transition-all" 
                                   value={password} 
                                   onChange={e => setPassword(e.target.value)} 
                                   autoComplete="current-password" 
                               />
                               <button 
                                   type="button"
                                   onClick={() => setShowPassword(!showPassword)}
                                   className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors focus:outline-none z-10 p-1"
                               >
                                   {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                               </button>
                           </div>
                       </div>

                       <Button 
                           className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black h-12 rounded-xl shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
                           disabled={loading}
                       >
                           {loading ? <Loader2 className="animate-spin mr-2" /> : "AUTENTICAR SISTEMA"}
                       </Button>
                   </form>
               </CardContent>
           </Card>

           <div className="mt-8 text-center space-y-2">
               <Button variant="ghost" className="text-slate-500 hover:text-white hover:bg-white/5 rounded-xl gap-2 transition-colors" onClick={() => navigate('/')}>
                   <ArrowLeft className="w-4 h-4" /> Voltar ao Início
               </Button>
               
               <div onClick={handleForceClear} className="text-[10px] text-slate-700 hover:text-red-500 cursor-pointer pt-4 uppercase font-bold tracking-widest flex items-center justify-center gap-1">
                   <LogOut className="w-3 h-3" /> Resetar Dados Locais
               </div>
           </div>
       </div>
    </div>
  );
};

export default LoginAdmin;