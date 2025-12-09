import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Share, MoreVertical, PlusSquare, Smartphone, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PWAProps {
    openForce?: boolean;
    onCloseForce?: () => void;
}

const PWAInstallPrompt = ({ openForce, onCloseForce }: PWAProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detecta se é iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Verifica se já foi dispensado (apenas se não for forçado via Profile)
    const hasDismissed = localStorage.getItem('pwa_install_dismissed');
    
    if (openForce) {
        setIsOpen(true);
    } else if (!hasDismissed) {
        // Delay para não aparecer imediatamente ao carregar o app
        const timer = setTimeout(() => setIsOpen(true), 3000);
        return () => clearTimeout(timer);
    }
  }, [openForce]);

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', 'true');
    setIsOpen(false);
    if (onCloseForce) onCloseForce();
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent className="bg-white rounded-t-[32px]">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-center pt-8">
            <div className="w-16 h-16 bg-yellow-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Smartphone className="w-8 h-8 text-black" />
            </div>
            <DrawerTitle className="text-2xl font-black text-slate-900">Instale o App</DrawerTitle>
            <DrawerDescription className="text-base mt-2">
              Tenha a melhor experiência adicionando o Gold Mobile à sua tela inicial.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4">
            <Tabs defaultValue={isIOS ? "ios" : "android"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="ios">iPhone (iOS)</TabsTrigger>
                <TabsTrigger value="android">Android</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ios" className="space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-500">
                          <Share className="w-5 h-5" />
                      </div>
                      <p className="text-sm text-slate-600 font-medium">1. Toque no botão <span className="font-bold text-slate-900">Compartilhar</span> na barra inferior.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                          <PlusSquare className="w-5 h-5" />
                      </div>
                      <p className="text-sm text-slate-600 font-medium">2. Role para baixo e selecione <span className="font-bold text-slate-900">Adicionar à Tela de Início</span>.</p>
                  </div>
              </TabsContent>

              <TabsContent value="android" className="space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                          <MoreVertical className="w-5 h-5" />
                      </div>
                      <p className="text-sm text-slate-600 font-medium">1. Toque nos <span className="font-bold text-slate-900">três pontos</span> no canto superior direito.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                          <Smartphone className="w-5 h-5" />
                      </div>
                      <p className="text-sm text-slate-600 font-medium">2. Selecione <span className="font-bold text-slate-900">Instalar aplicativo</span> ou <span className="font-bold text-slate-900">Adicionar à tela inicial</span>.</p>
                  </div>
              </TabsContent>
            </Tabs>
          </div>

          <DrawerFooter className="pt-2 pb-8">
            <Button onClick={handleDismiss} className="h-14 rounded-2xl bg-slate-900 text-white font-bold text-lg">
                Entendi, fechar
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PWAInstallPrompt;