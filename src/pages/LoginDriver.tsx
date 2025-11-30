import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ArrowLeft, Loader2, Car, Label as LabelIcon, Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const LoginDriver = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Dados
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  
  // Arquivos
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [cnhFront, setCnhFront] = useState<File | null>(null);
  const [cnhBack, setCnhBack] = useState<File | null>(null);

  // Carro
  const [carModel, setCarModel] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [carColor, setCarColor] = useState("");
  const [carYear, setCarYear] = useState("");

  // Limpeza inicial ao montar o componente
  useEffect(() => {
    const clearSession = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(`sb-${new URL(supabase.supabaseUrl).hostname.split('.')[0]}-auth-token`);
    };
    clearSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;
      if (!email || !password) return showError("Preencha email e senha");
      
      setLoading(true);
      
      try {
          // 1. Força limpeza antes de tentar
          await supabase.auth.signOut();

          // 2. Timeout de segurança (15s)
          const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Tempo limite excedido")), 15000)
          );

          // 3. Tentativa de Login
          const loginPromise = supabase.auth.signInWithPassword({ 
              email: email.trim(), 
              password: password.trim() 
          });

          const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;
          
          if (error) throw error;
          if (!data?.user) throw new Error("Usuário não encontrado.");

          // 4. Verifica Perfil
          const { data: profile } = await supabase.from('profiles').select('role, driver_status').eq('id', data.user.id).maybeSingle();
          
          if (profile?.role === 'driver') {
              if (profile.driver_status === 'PENDING') navigate('/success', { replace: true });
              else navigate('/driver', { replace: true });
          }
          else if (profile?.role === 'admin') navigate('/admin', { replace: true });
          else navigate('/client', { replace: true });

      } catch (e: any) {
          console.error(e);
          let msg = e.message || "Erro no login";
          if (msg.includes("Invalid login")) msg = "Email ou senha incorretos.";
          showError(msg);
      } finally {
          setLoading(false);
      }
  };

  const uploadFileSafe = async (file: File, path: string) => {
      if (!file) return "";
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2,9)}.${fileExt}`;
          const filePath = `${path}/${fileName}`;
          await supabase.storage.from('documents').upload(filePath, file, { upsert: true });
          const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
          return data.publicUrl;
      } catch { return ""; }
  };

  const submitRegistration = async () => {
      if (loading) return;
      setLoading(true);

      try {
          await supabase.auth.signOut(); // Garante sessão limpa

          const { data: authData, error: authError } = await supabase.auth.signUp({
              email: email.trim(),
              password: password.trim(),
              options: { 
                  data: { 
                      role: 'driver', 
                      first_name: name.split(' ')[0], 
                      last_name: name.split(' ').slice(1).join(' ') 
                  } 
              }
          });

          let userId = authData?.user?.id;

          if (authError) {
              if (authError.message.includes("already registered")) {
                   const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });
                   if (loginData.user) userId = loginData.user.id;
                   else throw authError;
              } else throw authError;
          }

          if (!userId) {
              showSuccess("Verifique seu email para confirmar.");
              return;
          }

          const [faceUrl, cnhFrontUrl, cnhBackUrl] = await Promise.all([
             uploadFileSafe(facePhoto!, `face/${userId}`),
             uploadFileSafe(cnhFront!, `cnh/${userId}`),
             uploadFileSafe(cnhBack!, `cnh/${userId}`)
          ]);

          await supabase.from('profiles').upsert({
              id: userId,
              role: 'driver',
              email: email.trim(),
              first_name: name.split(' ')[0],
              last_name: name.split(' ').slice(1).join(' '),
              cpf, phone, car_model: carModel, car_plate: carPlate.toUpperCase(),
              car_color: carColor, car_year: carYear,
              face_photo_url: faceUrl, cnh_front_url: cnhFrontUrl, cnh_back_url: cnhBackUrl,
              driver_status: 'PENDING',
              updated_at: new Date().toISOString()
          });

          navigate('/success', { replace: true });
      } catch (e: any) {
          showError(e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleNextStep = () => { if (step < 3) setStep(step + 1); else submitRegistration(); };

  if (!isSignUp) {
      return (
        <div className="min-h-screen relative flex items-center justify-center font-sans overflow-hidden bg-slate-900">
            <div className="relative z-10 w-full max-w-lg bg-white p-8 rounded-3xl shadow-2xl">
                <Button variant="ghost" onClick={() => navigate('/')} className="pl-0 mb-4"><ArrowLeft className="mr-2 w-4 h-4"/> Voltar</Button>
                <h2 className="text-3xl font-black text-slate-900 mb-6">Login Motorista</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12" placeholder="seu@email.com"/></div>
                    <div className="space-y-1"><Label>Senha</Label><div className="relative"><Input type={showPassword?"text":"password"} value={password} onChange={e => setPassword(e.target.value)} className="h-12 pr-10"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400"><Eye className="w-5 h-5"/></button></div></div>
                    <Button className="w-full h-14 font-bold bg-slate-900 text-white rounded-xl mt-4" disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : "Entrar"}</Button>
                </form>
                <div className="mt-6 text-center pt-4 border-t"><Button variant="outline" onClick={() => setIsSignUp(true)} className="w-full h-12 font-bold rounded-xl">Quero ser motorista</Button></div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <Card className="w-full max-w-xl bg-white rounded-3xl border-0 shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
                <Button variant="ghost" onClick={() => step===1 ? setIsSignUp(false) : setStep(step-1)}><ArrowLeft/></Button>
                <span className="font-bold text-slate-500">Passo {step} de 3</span>
            </div>
            <CardContent className="p-6 space-y-4">
                {step===1 && (
                    <>
                        <div className="space-y-1"><Label>Nome</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome Completo"/></div>
                        <div className="space-y-1"><Label>CPF</Label><Input value={cpf} onChange={e=>setCpf(e.target.value)} placeholder="000.000.000-00"/></div>
                        <div className="space-y-1"><Label>Celular</Label><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(00) 00000-0000"/></div>
                        <div className="space-y-1"><Label>Email</Label><Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@exemplo.com"/></div>
                        <div className="space-y-1"><Label>Senha</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></div>
                        <div className="space-y-1"><Label>Confirmar Senha</Label><Input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></div>
                    </>
                )}
                {step===2 && (
                    <>
                       <div className="bg-slate-50 p-4 rounded-xl text-center cursor-pointer border-2 border-dashed" onClick={()=>document.getElementById('face')?.click()}><input id="face" type="file" className="hidden" onChange={e=>setFacePhoto(e.target.files?.[0]||null)}/><p>{facePhoto?"Foto Rosto OK":"Foto do Rosto (Selfie)"}</p></div>
                       <div className="bg-slate-50 p-4 rounded-xl text-center cursor-pointer border-2 border-dashed" onClick={()=>document.getElementById('cnhf')?.click()}><input id="cnhf" type="file" className="hidden" onChange={e=>setCnhFront(e.target.files?.[0]||null)}/><p>{cnhFront?"CNH Frente OK":"Foto CNH Frente"}</p></div>
                       <div className="bg-slate-50 p-4 rounded-xl text-center cursor-pointer border-2 border-dashed" onClick={()=>document.getElementById('cnhb')?.click()}><input id="cnhb" type="file" className="hidden" onChange={e=>setCnhBack(e.target.files?.[0]||null)}/><p>{cnhBack?"CNH Verso OK":"Foto CNH Verso"}</p></div>
                    </>
                )}
                {step===3 && (
                    <>
                        <div className="space-y-1"><Label>Modelo Carro</Label><Input value={carModel} onChange={e=>setCarModel(e.target.value)} placeholder="Ex: Gol 1.0"/></div>
                        <div className="space-y-1"><Label>Placa</Label><Input value={carPlate} onChange={e=>setCarPlate(e.target.value.toUpperCase())} placeholder="ABC-1234"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><Label>Cor</Label><Input value={carColor} onChange={e=>setCarColor(e.target.value)} placeholder="Prata"/></div>
                            <div className="space-y-1"><Label>Ano</Label><Input value={carYear} onChange={e=>setCarYear(e.target.value)} placeholder="2020"/></div>
                        </div>
                    </>
                )}
                <Button className="w-full h-14 font-bold bg-slate-900 text-white rounded-xl mt-4" onClick={handleNextStep} disabled={loading}>{loading?<Loader2 className="animate-spin"/>:(step===3?"Finalizar":"Continuar")}</Button>
            </CardContent>
        </Card>
    </div>
  );
};

export default LoginDriver;