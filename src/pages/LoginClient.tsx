import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ArrowLeft, Loader2, ArrowRight, User, Lock, Mail, Eye, EyeOff, Camera, ShieldCheck, ChevronLeft } from "lucide-react";

const LoginClient = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState(1); // Controle de etapas
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para foto
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            navigate('/client');
        }
    };
    checkUser();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  const nextStep = () => {
      if (!name || !email || !password) {
          showError("Preencha todos os campos para continuar.");
          return;
      }
      if (password.length < 6) {
          showError("A senha deve ter no mínimo 6 caracteres.");
          return;
      }
      setStep(2);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!email || !password) return showError("Preencha todos os campos");
    setLoading(true);
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if(error) throw error;
        navigate('/client');
    } catch (e: any) {
        showError(e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if(!name) return showError("Digite seu nome");
    
    // Validação da foto (agora obrigatória ou fortemente sugerida)
    if (!avatarFile) {
        showError("Por favor, envie uma foto de perfil para sua segurança.");
        return;
    }

    setLoading(true);
    try {
        // 1. Criar Usuário
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email, password,
            options: { data: { role: 'client', first_name: name.split(' ')[0], last_name: name.split(' ').slice(1).join(' ') } }
        });
        if(authError) throw authError;

        // 2. Upload da Foto
        if (authData.user && avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${authData.user.id}/avatar-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, avatarFile);
            
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                
                await supabase.from('profiles')
                    .update({ avatar_url: publicUrl })
                    .eq('id', authData.user.id);
            }
        }

        showSuccess("Conta criada! Verifique seu email.");
        
    } catch (e: any) {
        showError(e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
       {/* Lado Esquerdo - Visual (Desktop) */}
       <div className="hidden lg:flex lg:w-1/2 bg-black relative items-center justify-center overflow-hidden">
           <div 
                className="absolute inset-0 opacity-60 bg-cover bg-center"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1496442226666-8d4a0e29f122?q=80&w=2576&auto=format&fit=crop')` }}
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
           <div className="relative z-10 text-center px-12 flex flex-col items-center">
                <img src="/logo-goldmobile-2.png" alt="Gold Mobile" className="w-64 h-auto mb-8 drop-shadow-2xl" />
                <h2 className="text-5xl font-black text-white mb-6 tracking-tight">Sua cidade, <br/>suas regras.</h2>
                <p className="text-gray-400 text-xl font-light leading-relaxed max-w-md mx-auto">
                    Conecte-se aos melhores motoristas da região com a segurança e o conforto que você merece.
                </p>
           </div>
       </div>

       {/* Lado Direito - Form */}
       <div className="w-full lg:w-1/2 flex flex-col relative overflow-y-auto">
           <div className="p-6">
               <Button variant="ghost" onClick={() => {
                   if (isSignUp && step === 2) setStep(1);
                   else if (isSignUp) { setIsSignUp(false); setStep(1); }
                   else navigate('/');
               }} className="hover:bg-gray-100 rounded-full w-12 h-12 p-0 -ml-2">
                   {isSignUp && step === 2 ? <ChevronLeft className="w-6 h-6 text-gray-800" /> : <ArrowLeft className="w-6 h-6 text-gray-800" />}
               </Button>
           </div>

           <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 max-w-xl mx-auto w-full py-10">
               
               {/* LOGIN FORM */}
               {!isSignUp && (
                   <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-slate-800">Bem-vindo de volta</h2>
                            <p className="text-gray-500 mt-2">Faça login para solicitar sua próxima corrida.</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="relative group">
                                <Mail className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-yellow-600 transition-colors" />
                                <Input type="email" placeholder="Endereço de Email" className="h-14 pl-12 bg-gray-50 border-gray-200 text-base rounded-2xl focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all text-slate-900" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-yellow-600 transition-colors" />
                                <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Sua Senha" 
                                    className="h-14 pl-12 pr-12 bg-gray-50 border-gray-200 text-base rounded-2xl focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all text-slate-900" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            
                            <div className="flex justify-end"><span className="text-sm font-semibold text-gray-400 hover:text-yellow-600 cursor-pointer transition-colors">Esqueceu a senha?</span></div>
                            
                            <Button className="w-full h-14 text-lg font-bold rounded-2xl bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : "Entrar na Plataforma"}
                                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                            </Button>
                        </form>

                        {/* NOVO CALL TO ACTION DE CADASTRO */}
                        <div className="mt-12 bg-yellow-50 border border-yellow-100 rounded-3xl p-6 text-center">
                            <p className="text-yellow-800 font-medium text-sm mb-4">
                                Ainda não tem conta? Clique no botão abaixo e crie em menos de 1 minuto.
                            </p>
                            <Button 
                                onClick={() => { setIsSignUp(true); setStep(1); }} 
                                className="w-full h-12 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl shadow-lg shadow-yellow-500/20 text-base"
                            >
                                CRIAR CONTA GRÁTIS
                            </Button>
                        </div>
                   </div>
               )}

               {/* SIGNUP FLOW */}
               {isSignUp && (
                   <div className="animate-in slide-in-from-right fade-in duration-300">
                       <div className="mb-8">
                           <div className="flex items-center gap-2 mb-2">
                               <span className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-sm">{step} de 2</span>
                               <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                   <div className={`h-full bg-yellow-500 transition-all duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
                               </div>
                           </div>
                           <h2 className="text-2xl font-bold text-slate-800">{step === 1 ? "Dados Pessoais" : "Foto de Identificação"}</h2>
                           <p className="text-gray-500 mt-1">{step === 1 ? "Comece com o básico." : "Para sua segurança e dos motoristas."}</p>
                       </div>

                       {step === 1 && (
                           <div className="space-y-5">
                               <div className="relative group">
                                   <User className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-yellow-600 transition-colors" />
                                   <Input placeholder="Nome Completo" className="h-14 pl-12 bg-gray-50 border-gray-200 text-base rounded-2xl text-slate-900" value={name} onChange={e => setName(e.target.value)} />
                               </div>
                               <div className="relative group">
                                   <Mail className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-yellow-600 transition-colors" />
                                   <Input type="email" placeholder="Endereço de Email" className="h-14 pl-12 bg-gray-50 border-gray-200 text-base rounded-2xl text-slate-900" value={email} onChange={e => setEmail(e.target.value)} />
                               </div>
                               <div className="relative group">
                                   <Lock className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-yellow-600 transition-colors" />
                                   <Input 
                                       type={showPassword ? "text" : "password"} 
                                       placeholder="Crie uma Senha" 
                                       className="h-14 pl-12 pr-12 bg-gray-50 border-gray-200 text-base rounded-2xl text-slate-900" 
                                       value={password} 
                                       onChange={e => setPassword(e.target.value)} 
                                   />
                               </div>
                               
                               <Button onClick={nextStep} className="w-full h-14 text-lg font-bold rounded-2xl bg-slate-900 hover:bg-black text-white mt-4">
                                   Continuar <ArrowRight className="ml-2 w-5 h-5" />
                               </Button>
                           </div>
                       )}

                       {step === 2 && (
                           <div className="space-y-6">
                               <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start">
                                   <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                   <p className="text-sm text-blue-700">Por favor, envie uma <strong>selfie</strong> nítida. Isso ajuda os motoristas a te identificarem com segurança.</p>
                               </div>

                               <div className="flex justify-center">
                                   <div className="relative group w-full max-w-xs">
                                       <label 
                                            htmlFor="avatar-upload"
                                            className={`
                                                w-full aspect-square rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all
                                                ${avatarPreview ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
                                            `}
                                       >
                                           {avatarPreview ? (
                                               <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover rounded-[30px]" />
                                           ) : (
                                               <div className="flex flex-col items-center p-6 text-center">
                                                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                                       <Camera className="w-8 h-8 text-gray-400" />
                                                   </div>
                                                   <span className="font-bold text-slate-900">Toque para tirar foto</span>
                                                   <span className="text-xs text-gray-500 mt-1">ou escolher da galeria</span>
                                               </div>
                                           )}
                                       </label>
                                       
                                       <input 
                                           id="avatar-upload" 
                                           type="file" 
                                           accept="image/*" 
                                           className="hidden" 
                                           onChange={handleFileChange}
                                       />
                                   </div>
                               </div>

                               <Button onClick={handleSignUp} disabled={loading} className="w-full h-14 text-lg font-bold rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20">
                                   {loading ? <Loader2 className="animate-spin" /> : "FINALIZAR CADASTRO"}
                               </Button>
                           </div>
                       )}
                   </div>
               )}
           </div>
           
           <div className="p-6 text-center lg:hidden"><p className="text-xs text-gray-300 font-medium">Gold Mobile &copy; 2024</p></div>
       </div>
    </div>
  );
};

export default LoginClient;