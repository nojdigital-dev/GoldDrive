import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Shield, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const LoginAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if(error) throw error;
        // Check role
        const { data: { user } } = await supabase.auth.getUser();
        if(user) {
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if(data?.role !== 'admin') {
                await supabase.auth.signOut();
                throw new Error("Acesso não autorizado");
            }
            navigate('/admin');
        }
    } catch (e: any) {
        showError(e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
       <Card className="w-full max-w-md bg-slate-950 border-slate-800 text-slate-200 shadow-2xl">
           <CardHeader className="text-center pb-2 pt-8">
               <div className="w-16 h-16 bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                   <Shield className="w-8 h-8 text-blue-500" />
               </div>
               <h1 className="text-2xl font-bold text-white">Administração</h1>
               <p className="text-slate-500">Acesso restrito à equipe GoldDrive</p>
           </CardHeader>
           <CardContent className="p-8">
               <form onSubmit={handleAuth} className="space-y-4">
                   <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Credencial</label>
                       <div className="relative">
                           <Input 
                               type="email" 
                               className="bg-slate-900 border-slate-800 pl-4 h-11 focus:border-blue-500 transition-colors"
                               value={email} onChange={e => setEmail(e.target.value)}
                           />
                       </div>
                   </div>
                   <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Chave de Acesso</label>
                       <div className="relative">
                           <Input 
                               type="password" 
                               className="bg-slate-900 border-slate-800 pl-4 h-11 focus:border-blue-500 transition-colors"
                               value={password} onChange={e => setPassword(e.target.value)}
                           />
                           <Lock className="absolute right-3 top-3 w-4 h-4 text-slate-600" />
                       </div>
                   </div>
                   <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11 mt-4 font-bold" disabled={loading}>
                       {loading ? <Loader2 className="animate-spin mr-2" /> : "Autenticar Sistema"}
                   </Button>
               </form>
               <Button variant="link" className="w-full mt-4 text-slate-600 hover:text-white" onClick={() => navigate('/')}>
                   Voltar ao Início
               </Button>
           </CardContent>
       </Card>
    </div>
  );
};

export default LoginAdmin;