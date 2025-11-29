import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, ShieldCheck, User, ArrowRight, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
         <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl w-full space-y-12 z-10">
        <div className="text-center space-y-6">
          <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter">
            Go<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">Move</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light">
            A revolução da mobilidade urbana.
            <br />
            Conectando destinos, pessoas e oportunidades.
          </p>
          
          <div className="pt-4">
            <Button 
                onClick={() => navigate('/login')} 
                className="h-14 px-8 text-lg rounded-full bg-white text-black hover:bg-gray-200 transition-all font-bold"
            >
                Entrar na Plataforma <LogIn className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 pt-8">
          {[
             { title: "Passageiro", desc: "Viaje com segurança e conforto", icon: User, color: "bg-blue-500", nav: '/client' },
             { title: "Motorista", desc: "Maximize seus ganhos diários", icon: Car, color: "bg-green-500", nav: '/driver' },
             { title: "Corporativo", desc: "Gestão completa de frota", icon: ShieldCheck, color: "bg-purple-500", nav: '/admin' }
          ].map((item, i) => (
             <div key={i} onClick={() => navigate('/login')} className="group relative bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all cursor-pointer backdrop-blur-sm">
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="text-white w-6 h-6" />
                </div>
             </div>
          ))}
        </div>
      </div>
      
      <div className="fixed bottom-0 w-full z-20">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;