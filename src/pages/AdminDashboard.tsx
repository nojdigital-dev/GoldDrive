import React, { useEffect, useState } from "react";
import { 
  LayoutDashboard, Users, Car, Settings, Wallet, 
  Map as MapIcon, LogOut, Bell, Search, Menu,
  ArrowUpRight, ArrowDownRight, Save, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import MapComponent from "@/components/MapComponent";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react";

// Tipos
type DashboardStats = {
  totalRevenue: number;
  totalRides: number;
  totalUsers: number;
  activeDrivers: number;
};

type CarCategory = {
  id: string;
  name: string;
  description: string;
  base_fare: number;
  cost_per_km: number;
  min_fare: number;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dados Reais
  const [stats, setStats] = useState<DashboardStats>({ totalRevenue: 0, totalRides: 0, totalUsers: 0, activeDrivers: 0 });
  const [rides, setRides] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<CarCategory[]>([]);

  // Carregar Dados
  const fetchData = async () => {
    setLoading(true);
    try {
        // 1. Stats de Receita e Corridas
        const { data: ridesData } = await supabase.from('rides').select('id, price, status, created_at, pickup_address, destination_address, category');
        
        const completedRides = ridesData?.filter(r => r.status === 'COMPLETED') || [];
        const revenue = completedRides.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
        
        // 2. Usuários
        const { data: profilesData } = await supabase.from('profiles').select('*');
        const drivers = profilesData?.filter((p: any) => p.role === 'driver') || [];

        setStats({
            totalRevenue: revenue,
            totalRides: ridesData?.length || 0,
            totalUsers: profilesData?.length || 0,
            activeDrivers: drivers.length
        });

        if (ridesData) setRides(ridesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        if (profilesData) setUsers(profilesData);

        // 3. Configurações (Categorias)
        const { data: catData } = await supabase.from('car_categories').select('*').order('base_fare', { ascending: true });
        if (catData) setCategories(catData as CarCategory[]);

    } catch (error: any) {
        showError("Erro ao carregar dados: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Inscrever em atualizações em tempo real para manter o dashboard vivo
    const channel = supabase.channel('admin_dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => fetchData())
        .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, []);

  // Atualizar Configurações
  const handleUpdateCategory = async (id: string, field: string, value: string) => {
     // Atualiza estado local para UI responsiva
     setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, [field]: parseFloat(value) } : cat));
  };

  const saveCategoryChanges = async (category: CarCategory) => {
      try {
          const { error } = await supabase.from('car_categories').update({
              base_fare: category.base_fare,
              cost_per_km: category.cost_per_km,
              min_fare: category.min_fare
          }).eq('id', category.id);

          if (error) throw error;
          showSuccess(`Configurações de ${category.name} salvas!`);
      } catch (e: any) {
          showError(e.message);
      }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 text-white hidden md:flex flex-col border-r border-slate-800">
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tighter">
            Go<span className="text-blue-500">Move</span> <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">ADMIN</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Visão Geral" },
            { id: "map", icon: MapIcon, label: "Mapa em Tempo Real" },
            { id: "users", icon: Users, label: "Usuários & Motoristas" },
            { id: "finance", icon: Settings, label: "Configurações & Preços" },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                activeTab === item.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-900">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors text-sm px-4">
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm sticky top-0 z-10">
            <h2 className="text-lg font-bold text-gray-800 capitalize">{activeTab.replace('_', ' ')}</h2>
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
                <div className="flex items-center gap-3 border-l pl-4">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-gray-900">Administrador</p>
                        <p className="text-xs text-green-600">Super User</p>
                    </div>
                    <Avatar className="w-8 h-8">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
            {/* TABS CONTENT */}
            
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { title: "Faturamento Total", value: `R$ ${stats.totalRevenue.toFixed(2)}`, icon: Wallet, color: "bg-green-500" },
                            { title: "Corridas Totais", value: stats.totalRides, icon: Car, color: "bg-blue-500" },
                            { title: "Usuários Cadastrados", value: stats.totalUsers, icon: Users, color: "bg-purple-500" },
                            { title: "Motoristas Ativos", value: stats.activeDrivers, icon: Settings, color: "bg-orange-500" },
                        ].map((stat, i) => (
                            <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                                        <h3 className="text-3xl font-bold mt-2 text-gray-900">{stat.value}</h3>
                                    </div>
                                    <div className={`p-4 rounded-2xl text-white shadow-lg ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Recent Rides Table */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle>Corridas Recentes</CardTitle>
                            <CardDescription>Monitoramento das últimas solicitações na plataforma</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Origem / Destino</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Data</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rides.slice(0, 10).map((ride) => (
                                        <TableRow key={ride.id}>
                                            <TableCell className="font-mono text-xs">{ride.id.slice(0, 8)}...</TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    ride.status === 'COMPLETED' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                                    ride.status === 'CANCELLED' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                                                    ride.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                                                    'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                                                }>
                                                    {ride.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{ride.category}</TableCell>
                                            <TableCell className="max-w-[300px]">
                                                <div className="text-xs truncate" title={ride.pickup_address}>📍 {ride.pickup_address}</div>
                                                <div className="text-xs truncate text-gray-500" title={ride.destination_address}>🏁 {ride.destination_address}</div>
                                            </TableCell>
                                            <TableCell className="font-bold">R$ {ride.price}</TableCell>
                                            <TableCell className="text-xs text-gray-500">
                                                {new Date(ride.created_at).toLocaleDateString()} {new Date(ride.created_at).toLocaleTimeString().slice(0,5)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'map' && (
                <Card className="h-full border-0 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="bg-white border-b z-10">
                        <div className="flex justify-between items-center">
                            <CardTitle>Monitoramento em Tempo Real</CardTitle>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                ● {rides.filter(r => r.status === 'IN_PROGRESS').length} Corridas em andamento
                            </Badge>
                        </div>
                    </CardHeader>
                    <div className="flex-1 relative bg-gray-100">
                        <MapComponent />
                        {/* Overlay simulado de corridas ativas */}
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg z-[400] max-w-sm">
                            <h4 className="font-bold text-sm mb-2 text-gray-700">Atividade Recente</h4>
                            <div className="space-y-3">
                                {rides.slice(0,3).map(r => (
                                    <div key={r.id} className="flex items-center gap-3 text-xs border-b last:border-0 pb-2 last:pb-0">
                                        <div className={`w-2 h-2 rounded-full ${r.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                        <div>
                                            <p className="font-medium">{r.status}</p>
                                            <p className="text-gray-500 truncate w-40">{r.destination_address}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'finance' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                     <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Configuração de Preços</h2>
                            <p className="text-gray-500">Gerencie o valor cobrado por km e tarifa base de cada categoria.</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((cat) => (
                            <Card key={cat.id} className="border-0 shadow-sm hover:shadow-lg transition-all">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-xl">{cat.name}</CardTitle>
                                        <Badge variant="secondary">{cat.description}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-500">Tarifa Base (R$)</label>
                                        <Input 
                                            type="number" 
                                            value={cat.base_fare} 
                                            onChange={(e) => handleUpdateCategory(cat.id, 'base_fare', e.target.value)}
                                            className="font-bold text-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-500">Preço por KM (R$)</label>
                                        <Input 
                                            type="number" 
                                            value={cat.cost_per_km} 
                                            onChange={(e) => handleUpdateCategory(cat.id, 'cost_per_km', e.target.value)}
                                            className="font-bold text-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-500">Tarifa Mínima (R$)</label>
                                        <Input 
                                            type="number" 
                                            value={cat.min_fare} 
                                            onChange={(e) => handleUpdateCategory(cat.id, 'min_fare', e.target.value)}
                                            className="font-bold text-lg"
                                        />
                                    </div>
                                    <Button className="w-full mt-4" onClick={() => saveCategoryChanges(cat)}>
                                        <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                     </div>
                </div>
            )}

            {activeTab === 'users' && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>Base de Usuários</CardTitle>
                        <CardDescription>Gestão de passageiros e motoristas parceiros</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="all">Todos</TabsTrigger>
                                <TabsTrigger value="driver">Motoristas</TabsTrigger>
                                <TabsTrigger value="client">Passageiros</TabsTrigger>
                            </TabsList>
                            <TabsContent value="all">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Perfil</TableHead>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Cadastro</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarFallback>{user.first_name?.[0]}{user.last_name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={user.role === 'driver' ? 'default' : 'secondary'}>
                                                        {user.role === 'driver' ? 'Motorista' : 'Passageiro'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-gray-400">{user.id}</TableCell>
                                                <TableCell className="text-gray-500">
                                                    {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;