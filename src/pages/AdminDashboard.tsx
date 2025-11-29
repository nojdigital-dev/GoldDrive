import React, { useEffect, useState } from "react";
import { 
  LayoutDashboard, Users, Car, Settings, Wallet, 
  Map as MapIcon, LogOut, Search, Star, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, Save, RefreshCw, Filter, Menu, User,
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronRight, DollarSign, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import MapComponent from "@/components/MapComponent";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  
  // Dados Principais
  const [stats, setStats] = useState({ revenue: 0, adminRevenue: 0, rides: 0, users: 0, drivers: 0, activeRides: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Modais e Seleções
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Filtros
  const [filterStatus, setFilterStatus] = useState("ALL");

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setAdminProfile(data);
        }

        // 1. Buscar Corridas com Relacionamentos (Motorista e Passageiro)
        // Nota: A sintaxe driver:profiles!driver_id é específica do Supabase para joins
        const { data: ridesData, error: ridesError } = await supabase
            .from('rides')
            .select(`
                *,
                driver:profiles!driver_id(first_name, last_name, email, car_model, car_plate, car_color, avatar_url, phone),
                customer:profiles!customer_id(first_name, last_name, email, avatar_url, phone)
            `)
            .order('created_at', { ascending: false });

        if (ridesError) throw ridesError;
        
        // Calcular Estatísticas
        const totalRevenue = ridesData?.filter(r => r.status === 'COMPLETED').reduce((acc, curr) => acc + (Number(curr.price) || 0), 0) || 0;
        const adminRev = ridesData?.reduce((acc, curr) => acc + (Number(curr.platform_fee) || 0), 0) || 0;
        const activeCount = ridesData?.filter(r => ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(r.status)).length || 0;

        // Dados do Gráfico
        const chartMap = new Map();
        // Inicializa últimos 7 dias
        for(let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('pt-BR');
            chartMap.set(dateStr, { date: dateStr, total: 0, admin: 0 });
        }

        ridesData?.forEach(r => {
            if (r.status === 'COMPLETED') {
                const date = new Date(r.created_at).toLocaleDateString('pt-BR');
                if(chartMap.has(date)) {
                    const item = chartMap.get(date);
                    item.total += Number(r.price || 0);
                    item.admin += Number(r.platform_fee || 0);
                }
            }
        });
        setChartData(Array.from(chartMap.values()));

        // 2. Buscar Usuários
        const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        
        // 3. Buscar Categorias
        const { data: catsData } = await supabase.from('car_categories').select('*').order('base_fare', { ascending: true });

        setStats({
            revenue: totalRevenue,
            adminRevenue: adminRev,
            rides: ridesData?.length || 0,
            activeRides: activeCount,
            users: usersData?.filter((u:any) => u.role === 'client').length || 0,
            drivers: usersData?.filter((u:any) => u.role === 'driver').length || 0
        });

        if (ridesData) setRides(ridesData);
        if (usersData) setUsers(usersData);
        if (catsData) setCategories(catsData);

    } catch (e: any) {
        showError("Erro ao carregar dados: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh a cada 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ações de Admin
  const updateCategory = async (id: string, field: string, value: string) => {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const saveCategory = async (cat: any) => {
      try {
          const { error } = await supabase.from('car_categories').update({
              base_fare: cat.base_fare,
              cost_per_km: cat.cost_per_km,
              min_fare: cat.min_fare
          }).eq('id', cat.id);
          if (error) throw error;
          showSuccess(`Categoria ${cat.name} atualizada!`);
      } catch (e: any) {
          showError(e.message);
      }
  };

  const formatDate = (dateString: string) => {
      if(!dateString) return '-';
      return new Date(dateString).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Filtragem de Corridas
  const filteredRides = rides.filter(r => {
      if (filterStatus === 'ALL') return true;
      return r.status === filterStatus;
  });

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* MODAL DETALHES DA CORRIDA */}
      <Dialog open={!!selectedRide} onOpenChange={(o) => !o && setSelectedRide(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <div className="flex items-center gap-2">
                      <Badge variant="outline">ID: {selectedRide?.id.split('-')[0]}</Badge>
                      <Badge className={
                          selectedRide?.status === 'COMPLETED' ? 'bg-green-600' : 
                          selectedRide?.status === 'CANCELLED' ? 'bg-red-600' : 'bg-blue-600'
                      }>{selectedRide?.status}</Badge>
                  </div>
                  <DialogTitle className="text-2xl mt-2">Detalhes da Corrida</DialogTitle>
                  <DialogDescription>Realizada em {formatDate(selectedRide?.created_at)}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Lado Esquerdo - Info Financeira */}
                  <div className="space-y-6">
                      <Card className="bg-slate-50 border-0">
                          <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-gray-500">Financeiro</CardTitle></CardHeader>
                          <CardContent className="space-y-3">
                              <div className="flex justify-between items-center">
                                  <span>Valor Total</span>
                                  <span className="font-black text-lg">R$ {selectedRide?.price}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between items-center text-sm text-green-600">
                                  <span>Motorista (80%)</span>
                                  <span className="font-bold">+ R$ {selectedRide?.driver_earnings || '0.00'}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm text-blue-600">
                                  <span>Plataforma (20%)</span>
                                  <span className="font-bold">+ R$ {selectedRide?.platform_fee || '0.00'}</span>
                              </div>
                          </CardContent>
                      </Card>

                      <div className="space-y-4">
                          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
                              <Avatar><AvatarImage src={selectedRide?.driver?.avatar_url} /><AvatarFallback>M</AvatarFallback></Avatar>
                              <div>
                                  <p className="text-xs text-gray-400 uppercase font-bold">Motorista</p>
                                  <p className="font-bold text-sm">{selectedRide?.driver ? `${selectedRide.driver.first_name} ${selectedRide.driver.last_name}` : 'Não atribuído'}</p>
                                  {selectedRide?.driver && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                          <Car className="w-3 h-3" /> {selectedRide.driver.car_model} • {selectedRide.driver.car_plate}
                                      </div>
                                  )}
                              </div>
                          </div>

                          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
                              <Avatar><AvatarImage src={selectedRide?.customer?.avatar_url} /><AvatarFallback>P</AvatarFallback></Avatar>
                              <div>
                                  <p className="text-xs text-gray-400 uppercase font-bold">Passageiro</p>
                                  <p className="font-bold text-sm">{selectedRide?.customer ? `${selectedRide.customer.first_name} ${selectedRide.customer.last_name}` : 'Desconhecido'}</p>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Star className="w-3 h-3 text-yellow-500" /> {selectedRide?.customer_rating || '-'}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Lado Direito - Mapa e Rota */}
                  <div className="space-y-4">
                       <div className="h-40 bg-gray-100 rounded-xl overflow-hidden relative border">
                           <MapComponent className="w-full h-full pointer-events-none" />
                           <div className="absolute inset-0 bg-black/10" />
                       </div>
                       <div className="space-y-4 pl-2">
                           <div className="relative border-l-2 border-gray-200 pl-4 pb-4">
                               <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                               <p className="text-xs text-gray-500 font-bold uppercase">Origem</p>
                               <p className="text-sm font-medium">{selectedRide?.pickup_address}</p>
                           </div>
                           <div className="relative border-l-2 border-transparent pl-4">
                               <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
                               <p className="text-xs text-gray-500 font-bold uppercase">Destino</p>
                               <p className="text-sm font-medium">{selectedRide?.destination_address}</p>
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-2 text-center">
                           <div className="bg-gray-50 p-2 rounded">
                               <p className="text-xs text-gray-400">Distância</p>
                               <p className="font-bold">{selectedRide?.distance}</p>
                           </div>
                           <div className="bg-gray-50 p-2 rounded">
                               <p className="text-xs text-gray-400">Categoria</p>
                               <p className="font-bold">{selectedRide?.category}</p>
                           </div>
                       </div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>

      {/* MODAL DETALHES USUÁRIO */}
      <Dialog open={!!selectedUser} onOpenChange={(o) => !o && setSelectedUser(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Perfil do Usuário</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-4">
                  <Avatar className="w-24 h-24 mb-4 border-4 border-slate-100">
                      <AvatarImage src={selectedUser?.avatar_url} />
                      <AvatarFallback className="text-2xl">{selectedUser?.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{selectedUser?.first_name} {selectedUser?.last_name}</h2>
                  <Badge variant="outline" className="mt-1 capitalize">{selectedUser?.role === 'client' ? 'Passageiro' : selectedUser?.role === 'driver' ? 'Motorista' : 'Admin'}</Badge>
                  
                  <div className="w-full grid grid-cols-2 gap-4 mt-8">
                      <div className="p-3 bg-slate-50 rounded-lg text-center">
                          <p className="text-xs text-gray-500">Saldo em Carteira</p>
                          <p className="text-xl font-bold text-green-600">R$ {selectedUser?.balance?.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg text-center">
                          <p className="text-xs text-gray-500">Total Viagens</p>
                          <p className="text-xl font-bold">{selectedUser?.total_rides || 0}</p>
                      </div>
                  </div>

                  {selectedUser?.role === 'driver' && (
                      <div className="w-full mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                          <div className="flex items-center gap-2 mb-2 text-yellow-800 font-bold">
                              <Car className="w-4 h-4" /> Veículo Cadastrado
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><span className="text-gray-500">Modelo:</span> <span className="font-medium">{selectedUser.car_model || '-'}</span></div>
                              <div><span className="text-gray-500">Placa:</span> <span className="font-medium uppercase">{selectedUser.car_plate || '-'}</span></div>
                              <div><span className="text-gray-500">Cor:</span> <span className="font-medium">{selectedUser.car_color || '-'}</span></div>
                              <div><span className="text-gray-500">Ano:</span> <span className="font-medium">{selectedUser.car_year || '-'}</span></div>
                          </div>
                      </div>
                  )}
              </div>
              <DialogFooter>
                  <Button variant="destructive" className="w-full">Bloquear Usuário (Demo)</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col z-20">
         <div className="p-6">
             <div className="flex items-center gap-2 text-xl font-black tracking-tighter text-white">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-black">
                    <Shield className="w-5 h-5" />
                </div>
                Gold<span className="text-yellow-500">Admin</span>
             </div>
         </div>

         <nav className="flex-1 px-3 space-y-1 mt-6">
             {[
                 { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                 { id: 'rides', label: 'Corridas', icon: MapIcon },
                 { id: 'users', label: 'Passageiros', icon: Users },
                 { id: 'drivers', label: 'Motoristas', icon: Car },
                 { id: 'finance', label: 'Financeiro', icon: Wallet },
                 { id: 'config', label: 'Configurações', icon: Settings },
             ].map(item => (
                 <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        activeTab === item.id 
                        ? 'bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                 >
                     <item.icon className="w-5 h-5" />
                     {item.label}
                 </button>
             ))}
         </nav>

         <div className="p-4 border-t border-white/10">
             <button onClick={() => navigate('/profile')} className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-lg transition-colors">
                 <Avatar className="w-8 h-8 border border-white/20">
                     <AvatarImage src={adminProfile?.avatar_url} />
                     <AvatarFallback>AD</AvatarFallback>
                 </Avatar>
                 <div className="text-left">
                     <p className="text-sm font-bold">{adminProfile?.first_name || 'Admin'}</p>
                     <p className="text-xs text-slate-500">Ver Perfil</p>
                 </div>
             </button>
         </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header Mobile/Desktop */}
          <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
              <div className="lg:hidden">
                  <Sheet>
                      <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu /></Button></SheetTrigger>
                      <SheetContent side="left" className="bg-slate-900 text-white border-0">
                          {/* Sidebar content duplication for mobile omitted for brevity, keeping simple */}
                          <SheetHeader><SheetTitle className="text-white">Menu Admin</SheetTitle></SheetHeader>
                          <div className="mt-8 space-y-2">
                              {['overview', 'rides', 'users', 'drivers', 'finance', 'config'].map(id => (
                                  <Button key={id} variant="ghost" className="w-full justify-start text-lg capitalize" onClick={() => setActiveTab(id)}>{id}</Button>
                              ))}
                          </div>
                      </SheetContent>
                  </Sheet>
              </div>
              
              <h1 className="text-xl font-bold capitalize hidden lg:block">{activeTab === 'overview' ? 'Visão Geral' : activeTab}</h1>

              <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
                      <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                      <span className="text-xs font-medium text-slate-600">{loading ? 'Atualizando...' : 'Sistema Online'}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => navigate('/')}><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
              
              {/* --- DASHBOARD (OVERVIEW) --- */}
              {activeTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                              <CardContent className="p-6">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="text-blue-100 text-sm font-medium">Receita Total</p>
                                          <h3 className="text-3xl font-bold mt-1">R$ {stats.revenue.toFixed(2)}</h3>
                                      </div>
                                      <div className="p-2 bg-white/20 rounded-lg"><DollarSign className="w-6 h-6 text-white" /></div>
                                  </div>
                              </CardContent>
                          </Card>
                          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                              <CardContent className="p-6">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="text-emerald-100 text-sm font-medium">Lucro Líquido</p>
                                          <h3 className="text-3xl font-bold mt-1">R$ {stats.adminRevenue.toFixed(2)}</h3>
                                      </div>
                                      <div className="p-2 bg-white/20 rounded-lg"><Wallet className="w-6 h-6 text-white" /></div>
                                  </div>
                              </CardContent>
                          </Card>
                          <Card className="border-0 shadow-sm">
                              <CardContent className="p-6">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="text-gray-500 text-sm font-medium">Corridas Ativas</p>
                                          <h3 className="text-3xl font-bold mt-1 text-slate-800">{stats.activeRides}</h3>
                                      </div>
                                      <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-6 h-6 text-yellow-600" /></div>
                                  </div>
                              </CardContent>
                          </Card>
                          <Card className="border-0 shadow-sm">
                              <CardContent className="p-6">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="text-gray-500 text-sm font-medium">Motoristas</p>
                                          <h3 className="text-3xl font-bold mt-1 text-slate-800">{stats.drivers}</h3>
                                      </div>
                                      <div className="p-2 bg-slate-100 rounded-lg"><Car className="w-6 h-6 text-slate-600" /></div>
                                  </div>
                              </CardContent>
                          </Card>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <Card className="col-span-2 border-0 shadow-sm">
                              <CardHeader>
                                  <CardTitle>Fluxo de Corridas (7 dias)</CardTitle>
                              </CardHeader>
                              <CardContent className="h-[300px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={chartData}>
                                          <defs>
                                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                              </linearGradient>
                                          </defs>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                          <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} />
                                          <YAxis axisLine={false} tickLine={false} fontSize={12} />
                                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                          <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" name="Volume (R$)" />
                                      </AreaChart>
                                  </ResponsiveContainer>
                              </CardContent>
                          </Card>

                          <Card className="border-0 shadow-sm">
                              <CardHeader><CardTitle>Status da Frota</CardTitle></CardHeader>
                              <CardContent>
                                  <div className="space-y-4">
                                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                              <div className="w-2 h-2 rounded-full bg-green-500" />
                                              <span className="text-sm font-medium">Disponíveis</span>
                                          </div>
                                          <span className="font-bold">{stats.drivers > 0 ? Math.floor(stats.drivers * 0.6) : 0}</span>
                                      </div>
                                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                                              <span className="text-sm font-medium">Em Corrida</span>
                                          </div>
                                          <span className="font-bold">{stats.activeRides}</span>
                                      </div>
                                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                                              <span className="text-sm font-medium">Offline</span>
                                          </div>
                                          <span className="font-bold">{stats.drivers > 0 ? Math.floor(stats.drivers * 0.3) : 0}</span>
                                      </div>
                                  </div>
                              </CardContent>
                          </Card>
                      </div>
                  </div>
              )}

              {/* --- GESTÃO DE CORRIDAS --- */}
              {activeTab === 'rides' && (
                  <Card className="border-0 shadow-sm animate-in fade-in">
                      <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle>Todas as Corridas</CardTitle>
                          <div className="flex items-center gap-2">
                              <Select value={filterStatus} onValueChange={setFilterStatus}>
                                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="ALL">Todos</SelectItem>
                                      <SelectItem value="COMPLETED">Finalizadas</SelectItem>
                                      <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                                      <SelectItem value="CANCELLED">Canceladas</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                      </CardHeader>
                      <CardContent>
                          <div className="overflow-x-auto">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead>ID / Data</TableHead>
                                          <TableHead>Passageiro</TableHead>
                                          <TableHead>Motorista</TableHead>
                                          <TableHead>Rota</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead className="text-right">Valor</TableHead>
                                          <TableHead className="text-right">Ações</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {filteredRides.length === 0 ? (
                                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">Nenhuma corrida encontrada</TableCell></TableRow>
                                      ) : (
                                          filteredRides.map(ride => (
                                              <TableRow key={ride.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedRide(ride)}>
                                                  <TableCell>
                                                      <span className="font-mono text-xs font-bold text-gray-500">{ride.id.split('-')[0]}</span>
                                                      <div className="text-[10px] text-gray-400">{new Date(ride.created_at).toLocaleDateString()}</div>
                                                  </TableCell>
                                                  <TableCell>
                                                      <div className="flex items-center gap-2">
                                                          <Avatar className="w-6 h-6"><AvatarImage src={ride.customer?.avatar_url}/><AvatarFallback>U</AvatarFallback></Avatar>
                                                          <span className="text-sm font-medium">{ride.customer ? ride.customer.first_name : 'N/A'}</span>
                                                      </div>
                                                  </TableCell>
                                                  <TableCell>
                                                      {ride.driver ? (
                                                          <div className="flex items-center gap-2">
                                                              <Avatar className="w-6 h-6"><AvatarImage src={ride.driver.avatar_url}/><AvatarFallback>M</AvatarFallback></Avatar>
                                                              <div className="flex flex-col">
                                                                  <span className="text-sm font-medium">{ride.driver.first_name}</span>
                                                                  <span className="text-[10px] text-gray-500">{ride.driver.car_model}</span>
                                                              </div>
                                                          </div>
                                                      ) : <span className="text-gray-400 text-xs">-</span>}
                                                  </TableCell>
                                                  <TableCell>
                                                      <div className="max-w-[150px] truncate text-xs text-gray-600" title={ride.destination_address}>
                                                          {ride.destination_address}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell>
                                                      <Badge variant="outline" className={
                                                          ride.status === 'COMPLETED' ? 'text-green-600 border-green-200 bg-green-50' : 
                                                          ride.status === 'CANCELLED' ? 'text-red-600 border-red-200 bg-red-50' : 
                                                          'text-blue-600 border-blue-200 bg-blue-50'
                                                      }>{ride.status}</Badge>
                                                  </TableCell>
                                                  <TableCell className="text-right font-bold">
                                                      R$ {ride.price}
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                      <Button size="icon" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button>
                                                  </TableCell>
                                              </TableRow>
                                          ))
                                      )}
                                  </TableBody>
                              </Table>
                          </div>
                      </CardContent>
                  </Card>
              )}

              {/* --- GESTÃO DE USUÁRIOS E MOTORISTAS --- */}
              {(activeTab === 'users' || activeTab === 'drivers') && (
                  <Card className="border-0 shadow-sm animate-in fade-in">
                      <CardHeader>
                          <CardTitle>{activeTab === 'drivers' ? 'Base de Motoristas' : 'Passageiros Cadastrados'}</CardTitle>
                          <div className="relative max-w-sm mt-2">
                              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <Input placeholder="Buscar por nome ou email..." className="pl-9" />
                          </div>
                      </CardHeader>
                      <CardContent>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Usuário</TableHead>
                                      <TableHead>Contato</TableHead>
                                      {activeTab === 'drivers' && <TableHead>Veículo</TableHead>}
                                      <TableHead>Saldo</TableHead>
                                      <TableHead>Viagens</TableHead>
                                      <TableHead className="text-right">Ações</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {users.filter(u => u.role === (activeTab === 'users' ? 'client' : 'driver')).map(user => (
                                      <TableRow key={user.id} onClick={() => setSelectedUser(user)} className="cursor-pointer hover:bg-slate-50">
                                          <TableCell>
                                              <div className="flex items-center gap-3">
                                                  <Avatar>
                                                      <AvatarImage src={user.avatar_url} />
                                                      <AvatarFallback>{user.first_name?.[0]}</AvatarFallback>
                                                  </Avatar>
                                                  <div>
                                                      <p className="font-bold text-sm">{user.first_name} {user.last_name}</p>
                                                      <p className="text-xs text-gray-400">ID: {user.id.substring(0,6)}</p>
                                                  </div>
                                              </div>
                                          </TableCell>
                                          <TableCell>
                                              <div className="text-xs">
                                                  <p>{user.email}</p>
                                                  <p className="text-gray-500">{user.phone || '-'}</p>
                                              </div>
                                          </TableCell>
                                          {activeTab === 'drivers' && (
                                              <TableCell>
                                                  {user.car_model ? (
                                                      <div className="text-xs">
                                                          <p className="font-medium">{user.car_model} ({user.car_color})</p>
                                                          <Badge variant="outline" className="text-[10px] mt-0.5">{user.car_plate}</Badge>
                                                      </div>
                                                  ) : <span className="text-gray-400 text-xs">Pendente</span>}
                                              </TableCell>
                                          )}
                                          <TableCell className="font-bold text-green-600">R$ {user.balance?.toFixed(2)}</TableCell>
                                          <TableCell>{user.total_rides || 0}</TableCell>
                                          <TableCell className="text-right">
                                              <Button variant="ghost" size="sm">Detalhes</Button>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </CardContent>
                  </Card>
              )}

              {/* --- FINANCEIRO --- */}
              {activeTab === 'finance' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <Card className="border-0 shadow-sm bg-slate-900 text-white col-span-2">
                               <CardHeader><CardTitle>Visão Financeira</CardTitle><CardDescription className="text-slate-400">Faturamento vs Lucro Real</CardDescription></CardHeader>
                               <CardContent className="h-[300px]">
                                   <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={chartData}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                          <XAxis dataKey="date" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                          <YAxis tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                          <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', color: '#fff'}} />
                                          <Bar dataKey="total" fill="#3b82f6" name="Total Bruto" radius={[4,4,0,0]} barSize={20} />
                                          <Bar dataKey="admin" fill="#10b981" name="Lucro Plataforma" radius={[4,4,0,0]} barSize={20} />
                                      </BarChart>
                                  </ResponsiveContainer>
                               </CardContent>
                           </Card>
                           <div className="space-y-4">
                               <Card className="border-0 shadow-sm"><CardContent className="p-6">
                                   <p className="text-sm text-gray-500 font-medium">Ticket Médio</p>
                                   <h3 className="text-2xl font-bold mt-1">R$ {(stats.rides > 0 ? stats.revenue / stats.rides : 0).toFixed(2)}</h3>
                               </CardContent></Card>
                               <Card className="border-0 shadow-sm"><CardContent className="p-6">
                                   <p className="text-sm text-gray-500 font-medium">Comissão Média</p>
                                   <h3 className="text-2xl font-bold mt-1 text-green-600">20%</h3>
                               </CardContent></Card>
                               <Button className="w-full bg-slate-900 text-white">Exportar Relatório CSV</Button>
                           </div>
                      </div>
                  </div>
              )}

              {/* --- CONFIGURAÇÕES --- */}
              {activeTab === 'config' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right">
                      <div className="space-y-6">
                          <h3 className="text-lg font-bold">Precificação de Categorias</h3>
                          {categories.map((cat) => (
                              <Card key={cat.id} className="border-0 shadow-sm">
                                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-slate-100 rounded-lg"><Car className="w-5 h-5" /></div>
                                          <div><CardTitle className="text-base">{cat.name}</CardTitle><CardDescription className="text-xs">{cat.description}</CardDescription></div>
                                      </div>
                                      <Button size="sm" variant="ghost" onClick={() => saveCategory(cat)}><Save className="w-4 h-4" /></Button>
                                  </CardHeader>
                                  <CardContent className="grid grid-cols-3 gap-4">
                                      <div><label className="text-[10px] uppercase font-bold text-gray-400">Tarifa Base</label><Input type="number" value={cat.base_fare} onChange={(e) => updateCategory(cat.id, 'base_fare', e.target.value)} className="mt-1 h-8" /></div>
                                      <div><label className="text-[10px] uppercase font-bold text-gray-400">Por Km</label><Input type="number" value={cat.cost_per_km} onChange={(e) => updateCategory(cat.id, 'cost_per_km', e.target.value)} className="mt-1 h-8" /></div>
                                      <div><label className="text-[10px] uppercase font-bold text-gray-400">Mínimo</label><Input type="number" value={cat.min_fare} onChange={(e) => updateCategory(cat.id, 'min_fare', e.target.value)} className="mt-1 h-8" /></div>
                                  </CardContent>
                              </Card>
                          ))}
                      </div>

                      <div className="space-y-6">
                          <h3 className="text-lg font-bold">Configurações Gerais</h3>
                          <Card className="border-0 shadow-sm">
                              <CardContent className="p-6 space-y-4">
                                  <div className="flex items-center justify-between">
                                      <div><p className="font-bold">Manutenção do Sistema</p><p className="text-sm text-gray-500">Bloqueia acesso para usuários</p></div>
                                      <Switch />
                                  </div>
                                  <Separator />
                                  <div className="flex items-center justify-between">
                                      <div><p className="font-bold">Novos Cadastros</p><p className="text-sm text-gray-500">Permitir novos motoristas</p></div>
                                      <Switch defaultChecked />
                                  </div>
                                  <Separator />
                                  <div className="pt-2">
                                      <label className="text-sm font-bold block mb-2">Taxa da Plataforma (%)</label>
                                      <div className="flex gap-2">
                                          <Input defaultValue="20" className="w-20" />
                                          <Button variant="secondary">Atualizar Global</Button>
                                      </div>
                                      <p className="text-xs text-gray-400 mt-2">Atenção: Isso afetará o cálculo de lucro de todas as corridas futuras.</p>
                                  </div>
                              </CardContent>
                          </Card>
                      </div>
                  </div>
              )}
          </div>
      </main>
    </div>
  );
};

export default AdminDashboard;