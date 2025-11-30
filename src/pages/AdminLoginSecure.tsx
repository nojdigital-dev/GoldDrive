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
      // 1. Tenta Autenticar
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Usuário não encontrado.");

      setSuccessMsg("Credenciais aceitas. Verificando permissões...");

      // 2. Verifica a Role no banco de dados (Força bruta, sem confiar em cache)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
          // Se der erro ao buscar perfil, desloga por segurança
          await supabase.auth.signOut();
          throw new Error("Erro ao verificar perfil de usuário.");
      }

      // 3. Validação Final
      if (profile?.role !== 'admin') {
         await supabase.auth.signOut();
         throw new Error("ACESSO NEGADO: Este usuário não é um administrador.");
      }

      // 4. Sucesso Total
      setSuccessMsg("Acesso autorizado. Redirecionando...");
      
      // Pequeno delay apenas para o usuário ver a mensagem de sucesso
      setTimeout(() => {
          navigate('/admin', { replace: true });
      }, 500);

    } catch (err: any) {
      console.error("Login Error:", err);
      setErrorMsg(err.message === "Invalid login credentials" ? "Email ou senha incorretos." : err.message);
      setLoading(false); // Garante que o botão destrave
    }
    // Nota: Não coloco setLoading(false) no finally aqui porque se der sucesso, 
    // quero que o botão continue travado enquanto redireciona.
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
        <CardHeader className="space-y-1 text-center border-b border-zinc-800 pb-6">
          <div className="mx-auto w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-2 border border-red-900/50">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Acesso Administrativo</CardTitle>
          <CardDescription className="text-zinc-400">
            Login de Segurança (Modo de Reserva)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {errorMsg && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-900/50 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro de Acesso</AlertTitle>
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
              <Label htmlFor="email">Email Corporativo</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@golddrive.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-950 border-zinc-700 focus:border-red-500 focus:ring-red-500/20"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha de Acesso</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-950 border-zinc-700 focus:border-red-500 focus:ring-red-500/20"
                disabled={loading}
              />
            </div>

            <Button 
                type="submit" 
                className="w-full h-12 font-bold bg-white text-black hover:bg-zinc-200 mt-2"
                disabled={loading}
            >
              {loading ? "Verificando..." : "ACESSAR SISTEMA"}
            </Button>

            <div className="pt-4 text-center">
                <button 
                    type="button" 
                    onClick={() => navigate('/')}
                    className="text-xs text-zinc-500 hover:text-zinc-300 underline"
                >
                    Voltar para Home
                </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginSecure;