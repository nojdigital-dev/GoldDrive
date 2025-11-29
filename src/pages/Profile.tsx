import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Camera, Loader2, Save, User, Phone, Mail, Shield } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    id: "",
    first_name: "",
    last_name: "",
    email: "", // Read only from auth
    phone: "",
    bio: "",
    avatar_url: "",
    role: ""
  });

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        email: user.email || "",
        phone: data.phone || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || ""
      });
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      showSuccess("Perfil atualizado com sucesso!");
    } catch (error: any) {
      showError("Erro ao atualizar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (profile.role === 'admin') navigate('/admin');
    else if (profile.role === 'driver') navigate('/driver');
    else navigate('/client');
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-gray-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-10">
      {/* Header com gradiente */}
      <div className="h-48 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 w-full relative">
        <Button 
            variant="secondary" 
            size="icon" 
            className="absolute top-4 left-4 rounded-full bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md"
            onClick={goBack}
        >
            <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>

      <div className="container max-w-4xl mx-auto px-4 -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row gap-6">
            
            {/* Cartão Lateral - Avatar */}
            <Card className="w-full md:w-1/3 h-fit border-0 shadow-lg">
                <CardContent className="pt-6 flex flex-col items-center text-center">
                    <div className="relative group cursor-pointer mb-4">
                        <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                            <AvatarImage src={profile.avatar_url} className="object-cover" />
                            <AvatarFallback className="text-4xl bg-slate-100">{profile.first_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white w-8 h-8" />
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900">{profile.first_name} {profile.last_name}</h2>
                    <p className="text-sm text-gray-500 font-medium mb-4 flex items-center gap-1 justify-center capitalize">
                        <Shield className="w-3 h-3" /> {profile.role === 'client' ? 'Passageiro' : profile.role === 'driver' ? 'Motorista' : 'Administrador'}
                    </p>

                    <div className="w-full space-y-2 mt-4">
                        <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">URL da Foto</div>
                        <Input 
                            value={profile.avatar_url} 
                            onChange={(e) => setProfile({...profile, avatar_url: e.target.value})}
                            placeholder="https://..."
                            className="text-xs bg-gray-50"
                        />
                        <p className="text-[10px] text-gray-400 text-left">Cole um link de imagem (ex: imgur, github)</p>
                    </div>
                </CardContent>
            </Card>

            {/* Cartão Principal - Dados */}
            <Card className="flex-1 border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>Gerencie seus dados e preferências de contato.</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Nome</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input 
                                    id="firstName" 
                                    className="pl-9" 
                                    value={profile.first_name}
                                    onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Sobrenome</Label>
                            <Input 
                                id="lastName" 
                                value={profile.last_name}
                                onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input id="email" className="pl-9 bg-gray-100" value={profile.email} disabled />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input 
                                    id="phone" 
                                    className="pl-9" 
                                    placeholder="(00) 00000-0000"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Biografia</Label>
                        <Textarea 
                            id="bio" 
                            placeholder="Conte um pouco sobre você..." 
                            className="min-h-[100px] resize-none"
                            value={profile.bio}
                            onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button 
                            size="lg" 
                            className="w-full md:w-auto bg-slate-900 hover:bg-slate-800"
                            onClick={handleUpdate}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Alterações
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;