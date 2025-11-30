import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ArrowLeft, Loader2, ArrowRight, Car, Upload, CheckCircle2, User, FileText, Camera } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const LoginDriver = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Login/Dados, 2: Docs, 3: Carro
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Dados Pessoais
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");

  // Docs (Files)
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [cnhFront, setCnhFront] = useState<File | null>(null);
  const [cnhBack, setCnhBack] = useState<File | null>(null);

  // Carro
  const [carModel, setCarModel] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [carColor, setCarColor] = useState("");
  const [carYear, setCarYear] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) return showError("Preencha email e senha");
      setLoading(true);
      try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          
          // Verifica Role e Status
          const { data: profile } = await supabase.from('profiles').select('role, driver_status').eq('id', data.user.id).single();
          
          if (profile?.role !== 'driver') {
              await supabase.auth.signOut();
              throw new Error("Esta conta não é de motorista.");
          }
          
          navigate('/driver');
      } catch (e: any) {
          showError(e.message);
      } finally {
          setLoading(false);
      }
  };

  const uploadFile = async (file: File, path: string) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
      return data.publicUrl;
  };

  const handleNextStep = async () => {
      if (step === 1) {
          if (!name || !email || !password || !cpf || !phone) return showError("Preencha todos os campos pessoais");
          setStep(2);
      } else if (step === 2) {
          if (!facePhoto || !cnhFront || !cnhBack) return showError("Faça upload de todos os documentos");
          setStep(3);
      } else if (step === 3) {
          if (!carModel || !carPlate || !carColor || !carYear) return showError("Preencha os dados do veículo");
          await submitRegistration();
      }
  };

  const submitRegistration = async () => {
      setLoading(true);
      try {
          // 1. Criar Usuário Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
              email, password,
              options: { 
                  data: { 
                      role: 'driver', 
                      first_name: name.split(' ')[0], 
                      last_name: name.split(' ').slice(1).join(' ') 
                  } 
              }
          });
          if (authError) throw authError;
          if (!authData.user) throw new Error("Erro ao criar usuário");

          const userId = authData.user.id;

          // 2. Upload Docs
          const faceUrl = await uploadFile(facePhoto!, `face/${userId}`);
          const cnhFrontUrl = await uploadFile(cnhFront!, `cnh/${userId}`);
          const cnhBackUrl = await uploadFile(cnhBack!, `cnh/${userId}`);

          // 3. Atualizar Profile com TUDO (Docs + Carro + Status PENDING)
          const { error: updateError } = await supabase.from('profiles').update({
              cpf,
              phone,
              face_photo_url: faceUrl,
              cnh_front_url: cnhFrontUrl,
              cnh_back_url: cnhBackUrl,
              car_model: carModel,
              car_plate: carPlate.toUpperCase(),
              car_color: carColor,
              car_year: carYear,
              driver_status: 'PENDING' // IMPORTANTE: Começa pendente
          }).eq('id', userId);

          if (updateError) throw updateError;

          showSuccess("Cadastro enviado para análise!");
          // Auto-login logic usually works after signup, but let's force navigate
          navigate('/driver'); 

      } catch (e: any) {
          showError("Erro no cadastro: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  // Render do Login Simples
  if (!isSignUp) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070')] bg-cover bg-center opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
            
            <div className="p-6 z-10"><Button variant="ghost" onClick={() => navigate('/')} className="text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"><ArrowLeft className="w-6 h-6" /></Button></div>
            
            <div className="flex-1 flex flex-col justify-end sm:justify-center px-8 sm:max-w-md mx-auto w-full z-10 pb-12">
                <div className="mb-8">
                    <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-4 text-black"><Car className="w-6 h-6" /></div>
                    <h1 className="text-4xl font-bold mb-2">Login <span className="text-yellow-500">Parceiro</span></h1>
                    <p className="text-gray-400">Acesse sua conta para começar a dirigir.</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                    <Input type="email" placeholder="Email" className="h-14 bg-white/10 border-white/10 text-white rounded-xl" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                    <Input type="password" placeholder="Senha" className="h-14 bg-white/10 border-white/10 text-white rounded-xl" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                    <Button className="w-full h-14 text-lg font-bold rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black mt-4" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "Acessar Painel"}
                    </Button>
                </form>
                <div className="mt-8 text-center z-20">
                    <button onClick={() => setIsSignUp(true)} className="text-sm font-bold text-yellow-500 hover:text-yellow-400 transition-colors">Quero me cadastrar</button>
                </div>
            </div>
        </div>
      );
  }

  // Render do Cadastro Multi-Etapa
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
        {/* Header Passos */}
        <div className="bg-black text-white p-6 pb-12 rounded-b-[40px] shadow-xl">
             <div className="flex items-center gap-4 mb-6">
                 <Button variant="ghost" onClick={() => step === 1 ? setIsSignUp(false) : setStep(step - 1)} className="text-white hover:bg-white/10 p-0 w-10 h-10 rounded-full"><ArrowLeft /></Button>
                 <h2 className="text-xl font-bold">Cadastro de Motorista</h2>
             </div>
             <div className="flex justify-between px-4 relative">
                 <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -z-0"></div>
                 {[1, 2, 3].map((i) => (
                     <div key={i} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= i ? 'bg-yellow-500 text-black scale-110 shadow-lg shadow-yellow-500/50' : 'bg-zinc-800 text-gray-400'}`}>
                         {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
                     </div>
                 ))}
             </div>
             <div className="flex justify-between px-2 mt-2 text-xs text-gray-400 font-medium">
                 <span>Pessoal</span>
                 <span>Docs</span>
                 <span>Veículo</span>
             </div>
        </div>

        <div className="flex-1 px-6 -mt-6">
            <Card className="shadow-xl border-0 rounded-[32px] overflow-hidden">
                <CardContent className="p-6 pt-8">
                    {/* ETAPA 1: DADOS PESSOAIS */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right">
                            <h3 className="text-lg font-bold flex items-center gap-2"><User className="w-5 h-5 text-yellow-500"/> Dados Pessoais</h3>
                            <Input placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl bg-gray-50" />
                            <Input placeholder="CPF (apenas números)" value={cpf} onChange={e => setCpf(e.target.value)} className="h-12 rounded-xl bg-gray-50" />
                            <Input placeholder="Celular / WhatsApp" value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl bg-gray-50" />
                            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl bg-gray-50" />
                            <Input type="password" placeholder="Crie uma Senha" value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl bg-gray-50" />
                        </div>
                    )}

                    {/* ETAPA 2: DOCUMENTOS */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right">
                            <h3 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-yellow-500"/> Documentação (KYC)</h3>
                            
                            <div className="space-y-2">
                                <Label>Foto do Rosto (Selfie)</Label>
                                <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors ${facePhoto ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                                    <input type="file" accept="image/*" className="hidden" id="face" onChange={e => setFacePhoto(e.target.files?.[0] || null)} />
                                    <label htmlFor="face" className="cursor-pointer block">
                                        {facePhoto ? <span className="text-green-700 font-bold flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4"/> Foto Carregada</span> : <span className="text-gray-500 flex flex-col items-center gap-2"><Camera className="w-8 h-8 text-gray-300"/> Toque para tirar foto</span>}
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>CNH Frente</Label>
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 ${cnhFront ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                                        <input type="file" accept="image/*" className="hidden" id="cnhf" onChange={e => setCnhFront(e.target.files?.[0] || null)} />
                                        <label htmlFor="cnhf" className="cursor-pointer block">
                                            {cnhFront ? <span className="text-xs font-bold text-green-700">OK</span> : <Upload className="w-6 h-6 mx-auto text-gray-400" />}
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>CNH Verso</Label>
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 ${cnhBack ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                                        <input type="file" accept="image/*" className="hidden" id="cnhb" onChange={e => setCnhBack(e.target.files?.[0] || null)} />
                                        <label htmlFor="cnhb" className="cursor-pointer block">
                                            {cnhBack ? <span className="text-xs font-bold text-green-700">OK</span> : <Upload className="w-6 h-6 mx-auto text-gray-400" />}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ETAPA 3: VEÍCULO */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in slide-in-from-right">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Car className="w-5 h-5 text-yellow-500"/> Dados do Veículo</h3>
                            <Input placeholder="Modelo (ex: Honda Civic)" value={carModel} onChange={e => setCarModel(e.target.value)} className="h-12 rounded-xl bg-gray-50" />
                            <Input placeholder="Placa (ex: ABC-1234)" value={carPlate} onChange={e => setCarPlate(e.target.value.toUpperCase())} className="h-12 rounded-xl bg-gray-50" />
                            <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="Cor" value={carColor} onChange={e => setCarColor(e.target.value)} className="h-12 rounded-xl bg-gray-50" />
                                <Input type="number" placeholder="Ano" value={carYear} onChange={e => setCarYear(e.target.value)} className="h-12 rounded-xl bg-gray-50" />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Button onClick={handleNextStep} className="w-full h-14 mt-6 text-lg font-bold rounded-2xl bg-black hover:bg-zinc-800 text-white shadow-xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : step === 3 ? "Finalizar Cadastro" : "Continuar"} 
                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
            </Button>
        </div>
    </div>
  );
};

export default LoginDriver;