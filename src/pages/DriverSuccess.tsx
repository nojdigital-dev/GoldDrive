import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, MessageCircle, ShieldCheck, ArrowRight } from "lucide-react";

const DriverSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 font-sans overflow-hidden bg-slate-900">
      {/* Background Decorativo */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2583')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/80 to-slate-900" />
      
      {/* Orbs de luz */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-[100px]" />

      <Card className="w-full max-w-md bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-[40px] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500 slide-in-from-bottom-8">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600" />
        
        <CardContent className="p-8 lg:p-10 text-center flex flex-col items-center">
          
          {/* Ícone Animado */}
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center relative z-10">
                <CheckCircle2 className="w-12 h-12 text-green-600 animate-in zoom-in spin-in-12 duration-700" />
            </div>
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-75" />
          </div>

          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
            Cadastro Recebido!
          </h1>
          
          <div className="flex items-center gap-2 bg-yellow-50 px-4 py-1.5 rounded-full border border-yellow-100 mb-6">
            <ShieldCheck className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Em Análise de Segurança</span>
          </div>

          <div className="space-y-4 text-gray-600 leading-relaxed mb-8">
            <p>
              Seus documentos foram enviados com sucesso para nossa base segura.
            </p>
            <p className="font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
              Nossa equipe administrativa irá validar suas informações. Assim que aprovado, você receberá uma notificação via <span className="text-green-600 font-bold inline-flex items-center gap-1 align-bottom"><MessageCircle className="w-4 h-4" /> WhatsApp</span>.
            </p>
          </div>

          <Button 
            onClick={() => navigate('/')} 
            className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-lg shadow-xl shadow-slate-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] group"
          >
            Voltar ao Início
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

        </CardContent>
      </Card>
    </div>
  );
};

export default DriverSuccess;