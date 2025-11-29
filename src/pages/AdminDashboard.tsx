import React from "react";
import { 
  LayoutDashboard, Users, Car, Settings, Wallet, 
  Map as MapIcon, LogOut, Bell, Search, Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MapComponent from "@/components/MapComponent";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Go<span className="text-blue-500">Move</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Admin Pro v2.0</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {[
            { icon: LayoutDashboard, label: "Visão Geral", active: true },
            { icon: MapIcon, label: "Mapa em Tempo Real" },
            { icon: Users, label: "Passageiros" },
            { icon: Car, label: "Motoristas" },
            { icon: Wallet, label: "Financeiro & Carteira" },
            { icon: Settings, label: "Configurações" },
          ].map((item, i) => (
            <button 
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                item.active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="w-6 h-6" />
                </Button>
                <div className="relative w-96 hidden md:block">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Buscar corrida, usuário ou ID..." className="pl-10" />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                </Button>
                <div className="flex items-center gap-3 border-l pl-4">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium">Admin Master</p>
                        <p className="text-xs text-gray-500">Super User</p>
                    </div>
                    <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { title: "Faturamento Hoje", value: "R$ 12.450,00", change: "+15%", icon: Wallet, color: "text-green-600" },
                    { title: "Corridas Ativas", value: "142", change: "+8", icon: Car, color: "text-blue-600" },
                    { title: "Novos Usuários", value: "64", change: "+12%", icon: Users, color: "text-purple-600" },
                    { title: "Taxa de Aceite", value: "94.2%", change: "-1%", icon: Settings, color: "text-orange-600" },
                ].map((stat, i) => (
                    <Card key={i}>
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                                <p className="text-xs text-green-600 font-medium mt-1">{stat.change} vs ontem</p>
                            </div>
                            <div className={`p-3 bg-gray-100 rounded-full ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Live Map Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                <Card className="lg:col-span-2 flex flex-col overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b">
                        <div className="flex justify-between items-center">
                            <CardTitle>Monitoramento em Tempo Real</CardTitle>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">● Online</span>
                            </div>
                        </div>
                    </CardHeader>
                    <div className="flex-1 relative">
                        <MapComponent />
                    </div>
                </Card>

                {/* Live Feed */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Atividade Recente</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto pr-2">
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Nova corrida iniciada</p>
                                        <p className="text-xs text-gray-500">Motorista João aceitou corrida de Maria</p>
                                        <p className="text-xs text-gray-400 mt-1">Há 2 min • Centro</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;