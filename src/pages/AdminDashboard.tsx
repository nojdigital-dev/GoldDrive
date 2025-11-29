import React, { useEffect, useState } from "react";
import { 
  LayoutDashboard, Users, Car, Settings, Wallet, 
  Map as MapIcon, LogOut, RefreshCw, Filter, Menu, Shield,
  Sun, Moon, PanelLeftClose, PanelLeftOpen, DollarSign, Clock, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { useTheme } from "@/components/theme-provider";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Dados Principais
  const [stats, setStats] = useState({ revenue: 0, adminRevenue: 0, rides: 0, users: 0, drivers: 0, activeRides: 0 });
  const [rides, setRides] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Modais e Seleções
  const [selectedRide, setSelectedRide] = useState<any>(null);
  
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

        // Busca Corridas com Relacionamentos Explícitos
        // Usando sintaxe simplificada que agora funciona garantido pelos FKs
        const { data: ridesData, error: ridesError } = await supabase
            .from('rides')
            .select(`
                *,
                driver:profiles!rides_driver_id_fkey(first_name, last_name, email, car_model, car_plate, avatar_url, phone),
                customer:profiles!rides_customer_id_fkey(first_name, last_name, email, avatar_url, phone)
            `)
            .order('created_at', { ascending: false });

        if (ridesError) {
             console.error("Erro SQL:", ridesError);
             throw new Error("Falha ao carregar corridas. Verifique as conexões do banco.");
        }
        
        const totalRevenue = ridesData?.filter(r => r.status === 'COMPLETED').reduce((acc, curr) => acc + (Number(curr.price) || 0), 0) || 0;
        const adminRev = ridesData?.reduce((acc, curr) => acc + (Number(curr.platform_fee) || 0), 0) || 0;
        const activeCount = ridesData?.filter(r => ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(r.status)).length || 0;

        // Chart Data Builder
        const chartMap = new Map();
        for(let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('pt-BR');
            chartMap.set(dateStr, { date: dateStr, total: 0 });
        }
        ridesData?.forEach(r => {
            if (r.status === 'COMPLETED') {
                const date = new Date(r.created_at).toLocaleDateString('pt-BR');
                if(chartMap.has(date)) {
                    chartMap.get(date).total += Number(r.price || 0);
                }
            }
        });
        setChartData(Array.from(chartMap.values()));

        // Busca Usuários
        const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

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

    } catch (e: any) {
        showError(e.message);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRides = rides.filter(r => {
      if (filterStatus === 'ALL') return true;
      return r.status === filterStatus;
  });

  return (
    <div className="flex h-screen bg-background font-sans text-foreground overflow-hidden">
      
      {/* --- SIDEBAR DESKTOP --- */}
      <aside className={`hidden lg:flex bg-muted/20 border-r flex-col z-20 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
         <div className="p-4 flex items-center justify-between">
             {!sidebarCollapsed && (
                 <div className="flex items-center gap-2 text-xl font-black tracking-tighter">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                    </div>
                    Gold<span className="text-yellow-500">Admin</span>
                 </div>
             )}
             {sidebarCollapsed && <Shield className="w-6 h-6 mx-auto text-yellow-500" />}
             
             <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="ml-auto">
                 {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
             </Button>
         </div>

         <nav className="flex-1 px-3 space-y-2 mt-4">
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 
                    ${activeTab === item.id ? 'bg-primary text-primary-foreground font-bold shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                    ${sidebarCollapsed ? 'justify-center px-2' : ''}
                    `}
                    title={item.label}
                 >
                     <item.icon className="w-5 h-5 shrink-0" />
                     {!sidebarCollapsed && item.label}
                 </button>
             ))}
         </nav>

         <div className="p-4 border-t">
             <div className="flex items-center justify-between mb-4">
                 {!sidebarCollapsed && <span className="text-xs font-medium text-muted-foreground">TEMA</span>}
                 <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                     {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                 </Button>
             </div>
             
             <div className={`flex items-center gap-3 w-full p-2 rounded-lg bg-muted/50 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                 <Avatar className="w-8 h-8 border">
                     <AvatarImage src={adminProfile?.avatar_url} />
                     <AvatarFallback>AD</AvatarFallback>
                 </Avatar>
                 {!sidebarCollapsed && (
                     <div className="text-left overflow-hidden">
                         <p className="text-sm font-bold truncate">{adminProfile?.first_name || 'Admin'}</p>
                         <p className="text-[10px] text-muted-foreground truncate">{adminProfile?.email}</p>
                     </div>
                 )}
             </div>
         </div>
      </aside>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header Mobile/Desktop */}
          <header className="h-16 bg-background border-b flex items-center justify-between px-6 sticky top-0 z-10">
              <div className="lg:hidden">
                  <Sheet>
                      <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu /></Button></SheetTrigger>
                      <SheetContent side="left" className="border-r">
                          <SheetHeader><SheetTitle>Menu Admin</SheetTitle></SheetHeader>
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
                  <div className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                      <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                      <span className="text-xs font-medium text-muted-foreground">{loading ? 'Atualizando...' : 'Sistema Online'}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => navigate('/')}><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-muted/5">
              {/* --- DASHBOARD (OVERVIEW) --- */}
              {activeTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card className="border-0 shadow-sm bg-primary text-primary-foreground">
                              <CardContent className="p-6">
                                  <div className="flex justify-between items-start">
                                      <div><p className="opacity-80 text-sm font-medium">Receita Total</p><h3 className="text-3xl font-bold mt-1">R$ {stats.revenue.toFixed(2)}</h3></div>
                                      <div className="p-2 bg-white/20 rounded-lg"><DollarSign className="w-6 h-6" /></div>
                                  </div>
                              </CardContent>
                          </Card>
                          <Card className="border-0 shadow-sm bg-green-600 text-white">
                              <CardContent className="p-6">
                                  <div className="flex justify-between items-start">
                                      <div><p className="opacity-80 text-sm font-medium">Lucro Líquido</p><h3 className="text-3xl font-bold mt-1">R$ {stats.adminRevenue.toFixed(2)}</h3></div>
                                      <div className="p-2 bg-white/20 rounded-lg"><Wallet className="w-6 h-6" /></div>
                                  </div>
                              </CardContent>
                          </Card>
                          <Card><CardContent className="p-6 flex justify-between"><div><p className="text-muted-foreground text-sm">Corridas Ativas</p><h3 className="text-3xl font-bold">{stats.activeRides}</h3></div><Clock className="w-8 h-8 text-yellow-500 opacity-50" /></CardContent></Card>
                          <Card><CardContent className="p-6 flex justify-between"><div><p className="text-muted-foreground text-sm">Motoristas</p><h3 className="text-3xl font-bold">{stats.drivers}</h3></div><Car className="w-8 h-8 text-blue-500 opacity-50" /></CardContent></Card>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <Card className="col-span-2 shadow-sm">
                              <CardHeader><CardTitle>Fluxo Financeiro (7 dias)</CardTitle></CardHeader>
                              <CardContent className="h-[300px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={chartData}>
                                          <defs>
                                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/><stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                              </linearGradient>
                                          </defs>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                          <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} stroke="#888" />
                                          <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#888" />
                                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#333', color: '#fff' }} />
                                          <Area type="monotone" dataKey="total" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" />
                                      </AreaChart>
                                  </ResponsiveContainer>
                              </CardContent>
                          </Card>
                          <Card className="shadow-sm">
                              <CardHeader><CardTitle>Frota Online</CardTitle></CardHeader>
                              <CardContent className="space-y-4">
                                  {['Disponíveis', 'Em Corrida', 'Offline'].map((label, i) => (
                                      <div key={label} className="flex justify-between items-center p-3 rounded-lg border">
                                          <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${i===0?'bg-green-500':i===1?'bg-blue-500':'bg-gray-400'}`} /><span className="text-sm font-medium">{label}</span></div>
                                          <span className="font-bold">{i===0 ? Math.floor(stats.drivers*0.6) : i===1 ? stats.activeRides : Math.floor(stats.drivers*0.3)}</span>
                                      </div>
                                  ))}
                              </CardContent>
                          </Card>
                      </div>
                  </div>
              )}
              
              {/* --- RIDES TAB --- */}
              {activeTab === 'rides' && (
                  <Card className="animate-in fade-in">
                       <CardHeader className="flex flex-row items-center justify-between">
                           <CardTitle>Histórico de Corridas</CardTitle>
                           <Select value={filterStatus} onValueChange={setFilterStatus}>
                               <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                               <SelectContent><SelectItem value="ALL">Todos</SelectItem><SelectItem value="COMPLETED">Finalizadas</SelectItem><SelectItem value="CANCELLED">Canceladas</SelectItem></SelectContent>
                           </Select>
                       </CardHeader>
                       <CardContent>
                           <Table>
                               <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Passageiro</TableHead><TableHead>Motorista</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                               <TableBody>
                                   {filteredRides.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-4">Nenhuma corrida encontrada</TableCell></TableRow> : filteredRides.map(r => (
                                       <TableRow key={r.id} onClick={()=>setSelectedRide(r)} className="cursor-pointer hover:bg-muted/50">
                                           <TableCell className="font-mono text-xs">{r.id.substring(0,8)}</TableCell>
                                           <TableCell>{r.customer?.first_name || 'Desconhecido'}</TableCell>
                                           <TableCell>{r.driver?.first_name || '-'}</TableCell>
                                           <TableCell>
                                               <Badge variant="outline" className={r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                                                   {r.status}
                                               </Badge>
                                           </TableCell>
                                           <TableCell className="text-right font-bold">R$ {r.price}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                       </CardContent>
                  </Card>
              )}

              {/* --- USERS TAB --- */}
              {activeTab === 'users' && (
                   <Card className="animate-in fade-in">
                       <CardHeader><CardTitle>Usuários ({users.filter(u=>u.role==='client').length})</CardTitle></CardHeader>
                       <CardContent>
                           <Table>
                               <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Saldo</TableHead></TableRow></TableHeader>
                               <TableBody>
                                   {users.filter(u=>u.role==='client').map(u => (
                                       <TableRow key={u.id}>
                                           <TableCell className="font-medium flex items-center gap-2"><Avatar className="w-6 h-6"><AvatarImage src={u.avatar_url}/></Avatar> {u.first_name} {u.last_name}</TableCell>
                                           <TableCell>{u.email || '-'}</TableCell>
                                           <TableCell>{u.phone || '-'}</TableCell>
                                           <TableCell className="font-bold text-green-600">R$ {u.balance?.toFixed(2)}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                       </CardContent>
                   </Card>
              )}
              
              {/* --- DRIVERS TAB --- */}
              {activeTab === 'drivers' && (
                   <Card className="animate-in fade-in">
                       <CardHeader><CardTitle>Motoristas ({users.filter(u=>u.role==='driver').length})</CardTitle></CardHeader>
                       <CardContent>
                           <Table>
                               <TableHeader><TableRow><TableHead>Motorista</TableHead><TableHead>Carro</TableHead><TableHead>Placa</TableHead><TableHead>Viagens</TableHead><TableHead>Saldo</TableHead></TableRow></TableHeader>
                               <TableBody>
                                   {users.filter(u=>u.role==='driver').map(u => (
                                       <TableRow key={u.id}>
                                           <TableCell className="font-medium flex items-center gap-2"><Avatar className="w-6 h-6"><AvatarImage src={u.avatar_url}/></Avatar> {u.first_name} {u.last_name}</TableCell>
                                           <TableCell>{u.car_model || '-'}</TableCell>
                                           <TableCell><Badge variant="secondary">{u.car_plate || '-'}</Badge></TableCell>
                                           <TableCell>{u.total_rides || 0}</TableCell>
                                           <TableCell className="font-bold text-green-600">R$ {u.balance?.toFixed(2)}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                       </CardContent>
                   </Card>
              )}
          </div>
      </main>
      
      {/* Detalhes da Corrida Modal */}
      <Dialog open={!!selectedRide} onOpenChange={(o) => !o && setSelectedRide(null)}>
          <DialogContent>
              <DialogHeader><DialogTitle>Detalhes da Corrida</DialogTitle></DialogHeader>
              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Origem</p>
                          <p className="font-medium">{selectedRide?.pickup_address}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Destino</p>
                          <p className="font-medium">{selectedRide?.destination_address}</p>
                      </div>
                  </div>
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                          <Avatar><AvatarImage src={selectedRide?.driver?.avatar_url} /><AvatarFallback>DR</AvatarFallback></Avatar>
                          <div><p className="font-bold">{selectedRide?.driver?.first_name || 'Sem motorista'}</p><p className="text-xs text-muted-foreground">{selectedRide?.driver?.car_model} • {selectedRide?.driver?.car_plate}</p></div>
                      </div>
                      <div className="text-right">
                          <p className="text-xs text-muted-foreground">Valor Total</p>
                          <p className="text-xl font-black">R$ {selectedRide?.price}</p>
                      </div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;