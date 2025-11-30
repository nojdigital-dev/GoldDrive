import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AdminLoginSecure = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      console.log("Iniciando login...");
      
      // 1. Autenticação Básica
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Usuário não identificado.");

      setSuccessMsg("Autenticado. Verificando permissões via RPC...");

      // 2. Verificação via RPC (Remote Procedure Call)
      // Isso evita ler a tabela 'profiles' diretamente, fugindo de qualquer loop de RLS
      const { data: role, error: rpcError } = await supabase.rpc('get_my_role');

      if (rpcError) {
          console.error("Erro RPC:", rpcError);
          // Fallback: Tenta ler do metadata se o RPC falhar
          const metaRole = authData.user.user_metadata?.role;
          if (metaRole !== 'admin') throw new Error("Erro ao verificar permissão do servidor.");
      } else {
          console.log("Role recebida:", role);
          if (role !== 'admin') {
             await supabase.auth.signOut();
             throw new Error("ACESSO NEGADO: Usuário não é administrador.");
          }
      }

      // 3. Sucesso
      setSuccessMsg("Acesso autorizado! Redirecionando...");
      
      setTimeout(() => {
          // Força um reload para limpar qualquer estado de cache do React
          window.location.href = '/admin';
      }, 1000);

    } catch (err: any) {
      console.error("Login Error:", err);
      let msg = err.message;
      if (msg === "Invalid login credentials") msg = "Email ou senha incorretos.";
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
        <CardHeader className="space-y-1 text-center border-b border-zinc-800 pb-6">
          <div className="mx-auto w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-2 border border-red-900/50">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Admin Secure Login</CardTitle>
          <CardDescription className="text-zinc-400">
            Modo de Segurança (RPC Bypass)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {errorMsg && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-900/50 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {successMsg && (
              <Alert className="bg-green-900/20 border-green-900/50 text-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Sucesso</AlertTitle>
                <AlertDescription>{successMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-950 border-zinc-700"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-950 border-zinc-700"
                disabled={loading}
              />
            </div>

            <Button 
                type="submit" 
                className="w-full h-12 font-bold bg-white text-black hover:bg-zinc-200 mt-2"
                disabled={loading}
            >
              {loading ? "Processando..." : "ENTRAR"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginSecure;