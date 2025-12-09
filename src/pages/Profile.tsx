import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Loader2, Shield, LogOut, Edit2, Save, X, Smartphone, MapPin, Calendar, Star } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { Badge } from "@/components/ui/badge";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPWA, setShowPWA] = useState(false);
  
  const [profile, setProfile] = useState<any>({
    id: "", first_name: "", last_name: "", email: "", phone: "", bio: "", avatar_url: "", role: "", created_at: "", car_model: "", car_plate: ""
  });

  // Backup para cancelar edição
  const [originalProfile, setOriginalProfile] = useState<any>(null);

  useEffect(() => { getProfile(); }, []);

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          navigate('/login');
          return;
      }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      const finalData = { ...data, email: user.email || "" };
      setProfile(finalData);
      setOriginalProfile(finalData);
    } catch (error: any) { 
        showError(error.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
          first_name: profile.first_name, 
          last_name: profile.last_name, 
          phone: profile.phone, 
          bio: profile.bio, 
          updated_at: new Date().toISOString()
      }).eq('id', profile.id);
      
      if (error) throw error;
      
      showSuccess("Perfil atualizado!");
      setOriginalProfile(profile);
      setIsEditing(false);
    } catch (error: any) { 
        showError(error.message); 
    } finally { 
        setSaving(false); 
    }
  };

  const handleCancel = () => {
      setProfile(originalProfile);
      setIsEditing(false);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      setUploading(true);
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // Salva URL no banco imediatamente
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
      
      setProfile({ ...profile, avatar_url: data.publicUrl });
      setOriginalProfile({ ...originalProfile, avatar_url: data.publicUrl });
      showSuccess("Foto atualizada!");
      
    } catch (error: any) {
      showError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin w-10 h-10 text-yellow-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20 relative overflow-x-hidden">
      <PWAInstallPrompt openForce={showPWA} onCloseForce={() => setShowPWA(false)} />

      {/* Header Cover Style */}
      <div className="h-48 bg-slate-900 w-full relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
         
         <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
             <Button variant="secondary" size="icon" className="rounded-full bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
             </Button>
             {!isEditing ? (
                 <Button onClick={() => setIsEditing(true)} className="rounded-full bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md gap-2">
                     <Edit2 className="w-4 h-4" /> Editar
                 </Button>
             ) : (
                 <div className="flex gap-2">
                     <Button onClick={handleCancel} className="rounded-full bg-red-500/80 hover:bg-red-600 text-white border-0 backdrop-blur-md" size="icon">
                         <X className="w-4 h-4" />
                     </Button>
                     <Button onClick={handleUpdate} disabled={saving} className="rounded-full bg-green-500 hover:bg-green-600 text-white border-0 backdrop-blur-md gap-2">
                         {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> Salvar</>}
                     </Button>
                 </div>
             )}
         </div>
      </div>

      <div className="px-4 -mt-16 relative z-10 max-w-xl mx-auto pb-10">
        {/* Card Principal */}
        <div className="bg-white rounded-[32px] shadow-xl p-6 pt-0 animate-in slide-in-from-bottom duration-500 border border-gray-100">
            
            {/* Avatar Section */}
            <div className="flex justify-between items-end -mt-12 mb-4 px-2">
                <div className="relative group">
                    <Avatar className="w-28 h-28 border-4 border-white shadow-lg ring-4 ring-gray-50 bg-white">
                        <AvatarImage src={profile.avatar_url} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-yellow-500 text-black font-black">{profile.first_name[0]}</AvatarFallback>
                    </Avatar>
                    <Label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-slate-900 text-white p-2.5 rounded-full shadow-lg border-2 border-white cursor-pointer hover:bg-yellow-500 hover:text-black transition-all hover:scale-110">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </Label>
                    <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </div>
                
                {profile.role === 'driver' && (
                    <div className="bg-yellow-50 p-2 rounded-xl border border-yellow-100 text-center mb-1">
                        <p className="text-[10px] font-bold text-yellow-700 uppercase">Avaliação</p>
                        <div className="flex items-center gap-1 font-black text-slate-900">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> 5.0
                        </div>
                    </div>
                )}
            </div>

            <div className="mb-6 px-2">
                <h1 className="text-3xl font-black text-slate-900 leading-tight">{profile.first_name} {profile.last_name}</h1>
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                        {profile.role === 'driver' ? 'Motorista Parceiro' : 'Passageiro Gold'}
                    </Badge>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Desde {new Date(profile.created_at).getFullYear()}
                    </span>
                </div>
            </div>

            {/* Inputs de Edição */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome</Label>
                        <Input 
                            value={profile.first_name} 
                            onChange={(e) => setProfile({...profile, first_name: e.target.value})} 
                            disabled={!isEditing}
                            className={`h-12 rounded-2xl ${isEditing ? 'bg-white border-yellow-500 ring-1 ring-yellow-500' : 'bg-gray-50 border-transparent text-slate-600'}`} 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-400 uppercase ml-1">Sobrenome</Label>
                        <Input 
                            value={profile.last_name} 
                            onChange={(e) => setProfile({...profile, last_name: e.target.value})} 
                            disabled={!isEditing}
                            className={`h-12 rounded-2xl ${isEditing ? 'bg-white border-yellow-500 ring-1 ring-yellow-500' : 'bg-gray-50 border-transparent text-slate-600'}`} 
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefone / WhatsApp</Label>
                    <Input 
                        value={profile.phone} 
                        onChange={(e) => setProfile({...profile, phone: e.target.value})} 
                        disabled={!isEditing}
                        className={`h-12 rounded-2xl ${isEditing ? 'bg-white border-yellow-500 ring-1 ring-yellow-500' : 'bg-gray-50 border-transparent text-slate-600'}`} 
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-400 uppercase ml-1">Email (Login)</Label>
                    <Input 
                        value={profile.email} 
                        disabled
                        className="h-12 bg-gray-100 border-transparent text-gray-400 rounded-2xl cursor-not-allowed" 
                    />
                </div>

                {profile.role === 'driver' && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /> Dados do Veículo</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400 text-xs uppercase">Modelo</p>
                                <p className="font-bold text-slate-800">{profile.car_model}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase">Placa</p>
                                <p className="font-mono font-bold text-slate-800">{profile.car_plate}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Ações Extras */}
            <div className="mt-8 space-y-3">
                <Button 
                    onClick={() => setShowPWA(true)} 
                    className="w-full h-14 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold shadow-lg shadow-yellow-500/20"
                >
                    <Smartphone className="mr-2 w-5 h-5" /> Instalar App
                </Button>

                <Button 
                    onClick={handleLogout} 
                    variant="outline"
                    className="w-full h-14 rounded-2xl border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                >
                    <LogOut className="mr-2 w-5 h-5" /> Sair da Conta
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;