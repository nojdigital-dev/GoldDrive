import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ArrowLeft, Mail, Lock, Loader2, ArrowRight } from "lucide-react";

const LoginClient = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!email || !password) return showError("Preencha todos os campos");
    if(isSignUp && !name) return showError("Digite seu nome");

    setLoading(true);
    try {
        if(isSignUp) {
            const { error } = await supabase.auth.signUp({
                email, password,
                options: { data: { role: 'client', first_name: name.split(' ')[0], last_name: name.split(' ').slice(1).join(' ') } }
            });
            if(error) throw error;
            showSuccess("Conta criada! Verifique seu email.");
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if(error) throw error;
            navigate('/client');
        }
    } catch (e: any) {
        showError(e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col relative overflow-hidden">
       {/* Decorativo */}
       <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-bl-full opacity-20 z-0 transform translate-x-20 -translate-y-20" />
       
       <div className="p-6 z-10">
           <Button variant="ghost" onClick={() => navigate('/')} className="hover:bg-gray-100 rounded-full w-10 h-10 p-0">
               <ArrowLeft className="w-6 h-6" />
           </Button>
       </div>

       <div className="flex-1 flex flex-col justify-center px-8 sm:max-w-md mx-auto w-full z-10 pb-20">
           <div className="mb-8">
               <h1 className="text-4xl font-black tracking-tighter mb-2">
                   Gold<span className="text-yellow-500">Drive</span>
               </h1>
               <p className="text-gray-500 text-lg">
                   {isSignUp ? "Crie sua conta para começar." : "Bem-vindo de volta, Passageiro."}
               </p>
           </div>

           <form onSubmit={handleAuth} className="space-y-6">
               {isSignUp && (
                   <div className="space-y-2 animate-in slide-in-from-bottom-2">
                       <Input 
                           placeholder="Nome Completo" 
                           className="h-14 bg-gray-50 border-gray-200 text-lg rounded-2xl focus:ring-yellow-500 focus:border-yellow-500"
                           value={name} onChange={e => setName(e.target.value)}
                       />
                   </div>
               )}

               <div className="space-y-2">
                   <Input 
                       type="email" placeholder="Email" 
                       className="h-14 bg-gray-50 border-gray-200 text-lg rounded-2xl focus:ring-yellow-500 focus:border-yellow-500"
                       value={email} onChange={e => setEmail(e.target.value)}
                   />
               </div>

               <div className="space-y-2">
                   <Input 
                       type="password" placeholder="Senha" 
                       className="h-14 bg-gray-50 border-gray-200 text-lg rounded-2xl focus:ring-yellow-500 focus:border-yellow-500"
                       value={password} onChange={e => setPassword(e.target.value)}
                   />
                   {!isSignUp && <p className="text-right text-sm text-gray-400 font-medium cursor-pointer hover:text-yellow-600">Esqueci a senha</p>}
               </div>

               <Button 
                   className="w-full h-14 text-lg font-bold rounded-2xl bg-black hover:bg-slate-800 text-white shadow-xl shadow-slate-200 transition-all active:scale-95"
                   disabled={loading}
               >
                   {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? "Criar Conta" : "Entrar")}
                   {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
               </Button>
           </form>

           <div className="mt-8 text-center">
               <p className="text-gray-500">
                   {isSignUp ? "Já tem uma conta?" : "Não tem conta ainda?"}
                   <button onClick={() => setIsSignUp(!isSignUp)} className="ml-2 font-bold text-yellow-600 hover:underline">
                       {isSignUp ? "Fazer Login" : "Cadastre-se"}
                   </button>
               </p>
           </div>
       </div>
    </div>
  );
};

export default LoginClient;