import React, { useEffect, useState } from "react";
import { 
  LayoutDashboard, Users, Car, Settings, Wallet, 
  Map as MapIcon, LogOut, RefreshCw, Shield,
  Sun, Moon, PanelLeftClose, PanelLeftOpen, DollarSign, Clock, 
  CheckCircle, TrendingUp, Trash2, Edit, Mail, Search,
  CreditCard, BellRing, Save, AlertTriangle, Smartphone, Globe,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { useTheme } from "@/components/theme-provider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Dados Principais
  const [stats, setStats] = useState({ revenue: 0, adminRevenue: 0, ridesToday: 0, activeRides: 0 });
  const [rides, setRides] = useState<any[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Estados de Gerenciamento
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ first_name: "", last_name: "", phone: "" });

  // Configurações
  const [config, setConfig] = useState({
      platformFee: "20",
      maintenanceMode: false,
      allowRegistrations: true,
      minRidePrice: "10.00"
  });

  // Filtros
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setAdminProfile(data);
            if (data?.role !== 'admin') {
                showError("Acesso restrito.");
                navigate('/');
                return;
            }
        }

        // 1. Buscar Corridas
        const { data: ridesData, error: rideError } = await supabase
            .from('rides')
            .select(`*, driver:profiles!public_rides_driver_id_fkey(*), customer:profiles!public_rides_customer_id_fkey(*)`)
            .order('created_at', { ascending: false });

        if (rideError) throw rideError;
        const currentRides = ridesData || [];
        setRides(currentRides);

        // 2. Buscar Perfis (Queries separadas para evitar travamento)
        const { data: clientsData } = await supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false });
        const { data: driversData } = await supabase.from('profiles').select('*').eq('role', 'driver').order('created_at', { ascending: false });
        
        setPassengers(clientsData || []);
        setDrivers(driversData || []);

        // 3. Stats
        const today = new Date().toDateString();
        const ridesTodayCount = currentRides.filter(r => new Date(r.created_at).toDateString() === today).length;
        const totalRevenue = currentRides.filter(r => r.status === 'COMPLETED').reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
        const adminRev = currentRides.reduce((acc, curr) => acc + (Number(curr.platform_fee) || 0), 0);
        const activeCount = currentRides.filter(r => ['SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(r.status)).length;

        // Gráfico
        const chartMap = new Map();
        for(let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            chartMap.set(dateStr, { date: dateStr, total: 0 });
        }
        currentRides.forEach(r => {
            if (r.status === 'COMPLETED') {
                const date = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                if(chartMap.has(date)) {
                    const curr = chartMap.get(date);
                    curr.total += Number(r.price || 0);
                }
            }
        });
        setChartData(Array.from(chartMap.values()));
        
        setStats({ revenue: totalRevenue, adminRevenue: adminRev, ridesToday: ridesTodayCount, activeRides: activeCount });

        // Mock Transactions (Baseado em dados reais)
        const recentTrans = currentRides.slice(0, 15).map(r => ({
            id: r.id, 
            date: r.created_at, 
            amount: Number(r.platform_fee || 0), 
            description: `Taxa da Corrida`,
            status: 'completed',
            user: r.driver?.first_name || 'Motorista'
        }));
        setTransactions(recentTrans);

    } catch (e: any) {
        console.error(e);
        showError("Erro interno ao carregar dados. Verifique a conexão.");
    } finally {
        setLoading(false);
    }
  };

  // Actions
  const openEditUser = (user: any) => {
      setSelectedUser(user);
      setEditFormData({ first_name: user.first_name || "", last_name: user.last_name || "", phone: user.phone || "" });
      setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
      if (!selectedUser) return;
      try {
          const { error } = await supabase.from('profiles').update(editFormData).eq('id', selectedUser.id);
          if (error) throw error;
          showSuccess("Usuário atualizado!");
          setIsEditDialogOpen(false);
          fetchData();
      } catch (e: any) { showError(e.message); }
  };

  const handleDeleteUser = async () => {
      if (!selectedUser) return;
      try {
          const { error } = await supabase.from('profiles').delete().eq('id', selectedUser.id);
          if (error) throw error;
          showSuccess("Perfil removido.");
          setIsDeleteDialogOpen(false);
          fetchData();
      } catch (e: any) { showError(e.message); }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-foreground overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col z-20 transition-all duration-300 border-r border-border/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
         <div className="p-6 flex items-center justify-between">
             {!sidebarCollapsed && <div className="flex items-center gap-2 text-2xl font-black tracking-tighter">Gold<span className="text-yellow-500">Admin</span></div>}
             <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="ml-auto">{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
         </div>
         <nav className="flex-1 px-4 space-y-2 mt-4">
             {[
                 { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
                 { id: 'rides', label: 'Corridas', icon: MapIcon },
                 { id: 'users', label: 'Passageiros', icon: Users },
                 { id: 'drivers', label: 'Motoristas', icon: Car },
                 { id: 'finance', label: 'Financeiro', icon: Wallet },
                 { id: 'config', label: 'Configurações', icon: Settings },
             ].map(item => (
                 <button key={item.id} onClick={() => setActiveTab(item.id)} className={`relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group overflow-hidden ${activeTab === item.id ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg shadow-slate-900/20' : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground'} ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
                     <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-yellow-500' : ''}`} />
                     {!sidebarCollapsed && <span>{item.label}</span>}
                 </button>
             ))}
         </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
          <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar">
              <div className="max-w-7xl mx-auto space-y-8 pb-20">
                  <div className="flex justify-between items-center">
                      <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white capitalize">{activeTab === 'overview' ? 'Visão Geral' : activeTab === 'rides' ? 'Corridas' : activeTab === 'users' ? 'Passageiros' : activeTab === 'drivers' ? 'Motoristas' : activeTab === 'finance' ? 'Financeiro' : 'Configurações'}</h1>
                      <Button onClick={fetchData}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar</Button>
                  </div>

                  {activeTab === 'overview' && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <Card className="bg-green-500 text-white"><CardContent className="p-6"><p className="text-sm font-bold uppercase opacity-80">Receita Total</p><h3 className="text-3xl font-black">R$ {stats.revenue.toFixed(2)}</h3></CardContent></Card>
                          <Card className="bg-blue-500 text-white"><CardContent className="p-6"><p className="text-sm font-bold uppercase opacity-80">Lucro Plataforma</p><h3 className="text-3xl font-black">R$ {stats.adminRevenue.toFixed(2)}</h3></CardContent></Card>
                          <Card className="bg-red-500 text-white"><CardContent className="p-6"><p className="text-sm font-bold uppercase opacity-80">Corridas Hoje</p><h3 className="text-3xl font-black">{stats.ridesToday}</h3></CardContent></Card>
                          <Card className="bg-yellow-500 text-white"><CardContent className="p-6"><p className="text-sm font-bold uppercase opacity-80">Ativos Agora</p><h3 className="text-3xl font-black">{stats.activeRides}</h3></CardContent></Card>
                      </div>
                  )}

                  {activeTab === 'rides' && (
                      <Card className="border-0 shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[32px] overflow-hidden">
                           <CardContent className="p-0">
                               <Table>
                                   <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50"><TableRow><TableHead className="pl-8">ID</TableHead><TableHead>Passageiro</TableHead><TableHead>Motorista</TableHead><TableHead>Status</TableHead><TableHead>Taxa (Lucro)</TableHead><TableHead className="text-right pr-8">Total</TableHead></TableRow></TableHeader>
                                   <TableBody>
                                       {rides.map(r => (
                                           <TableRow key={r.id} onClick={()=>setSelectedRide(r)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                               <TableCell className="pl-8 font-mono text-xs opacity-50">#{r.id.substring(0,6)}</TableCell>
                                               <TableCell>{r.customer?.first_name || 'Usuário'}</TableCell>
                                               <TableCell>{r.driver?.first_name || '--'}</TableCell>
                                               <TableCell><Badge className={r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>{r.status}</Badge></TableCell>
                                               <TableCell className="font-bold text-green-600">+ R$ {Number(r.platform_fee || 0).toFixed(2)}</TableCell>
                                               <TableCell className="text-right pr-8 font-bold">R$ {Number(r.price).toFixed(2)}</TableCell>
                                           </TableRow>
                                       ))}
                                   </TableBody>
                               </Table>
                           </CardContent>
                      </Card>
                  )}
              </div>
          </div>
      </main>

      {/* Modal Detalhes Corrida */}
      <Dialog open={!!selectedRide} onOpenChange={(o) => !o && setSelectedRide(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-[32px] border-0 shadow-2xl">
              <DialogHeader><DialogTitle>Detalhes Financeiros</DialogTitle></DialogHeader>
              <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4 text-center mb-4">
                      <div className="bg-slate-50 p-3 rounded-xl"><p className="text-xs uppercase font-bold text-gray-400">Data</p><p className="font-bold">{selectedRide ? new Date(selectedRide.created_at).toLocaleDateString() : ''}</p></div>
                      <div className="bg-slate-50 p-3 rounded-xl"><p className="text-xs uppercase font-bold text-gray-400">Horário</p><p className="font-bold">{selectedRide ? new Date(selectedRide.created_at).toLocaleTimeString() : ''}</p></div>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="flex justify-between items-center"><span className="text-gray-500">Valor Total da Corrida</span><span className="font-bold text-xl">R$ {Number(selectedRide?.price).toFixed(2)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-gray-500">Repasse Motorista</span><span className="font-bold">R$ {Number(selectedRide?.driver_earnings).toFixed(2)}</span></div>
                      <Separator />
                      <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl"><span className="text-green-700 font-bold uppercase">Lucro da Plataforma</span><span className="font-black text-2xl text-green-700">+ R$ {Number(selectedRide?.platform_fee).toFixed(2)}</span></div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;