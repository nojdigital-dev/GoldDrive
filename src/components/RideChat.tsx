import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, X, Minimize2, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface RideChatProps {
  rideId: string;
  currentUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  role: 'client' | 'driver';
}

const QUICK_MESSAGES = {
  client: ["Estou no local", "Estou descendo", "Qual seu carro?", "Obrigado!"],
  driver: ["Estou chegando", "Cheguei no local", "Trânsito intenso", "Estou aguardando"]
};

const RideChat = ({ rideId, currentUserId, otherUserName, otherUserAvatar, role }: RideChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Polling para atualização em tempo real (1s)
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 1000);
    return () => clearInterval(interval);
  }, [rideId]);

  // Auto-scroll para baixo
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });

    if (data) {
        // Verifica novas mensagens para notificação
        if (data.length > messages.length && !isOpen) {
            setUnreadCount(prev => prev + (data.length - messages.length));
        }
        // Evita re-render desnecessário se não mudou
        if (JSON.stringify(data) !== JSON.stringify(messages)) {
            setMessages(data);
        }
    }
  };

  const handleSend = async (text: string = newMessage) => {
    if (!text.trim()) return;
    
    // Optimistic update
    const tempMsg = {
        id: Math.random().toString(),
        sender_id: currentUserId,
        content: text,
        created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");

    await supabase.from('messages').insert({
        ride_id: rideId,
        sender_id: currentUserId,
        content: text
    });
    
    fetchMessages();
  };

  const openChat = () => {
      setIsOpen(true);
      setUnreadCount(0);
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={openChat}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl bg-black hover:bg-zinc-800 text-white z-[150] animate-in zoom-in duration-300"
      >
        <MessageCircle className="w-7 h-7" />
        {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                {unreadCount}
            </span>
        )}
      </Button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 w-[90%] md:w-96 h-[500px] max-h-[70vh] bg-white rounded-[24px] shadow-2xl border border-gray-100 flex flex-col z-[150] animate-in slide-in-from-bottom-10 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                  <AvatarImage src={otherUserAvatar} />
                  <AvatarFallback className="text-black font-bold">{otherUserName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                  <h4 className="font-bold text-sm">{otherUserName}</h4>
                  <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-xs text-slate-300">Online na corrida</span>
                  </div>
              </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
          </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-gray-50 p-4 overflow-y-auto" ref={scrollRef}>
          <div className="space-y-4">
              <div className="text-center text-xs text-gray-400 my-4">Chat iniciado • A conversa é gravada para sua segurança</div>
              {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div 
                            className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                                isMe 
                                ? 'bg-slate-900 text-white rounded-br-none' 
                                : 'bg-white text-slate-800 border border-gray-100 rounded-bl-none'
                            }`}
                          >
                              {msg.content}
                              <span className={`text-[10px] block text-right mt-1 opacity-60 ${isMe ? 'text-gray-300' : 'text-gray-400'}`}>
                                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Quick Replies */}
      <div className="bg-white border-t border-gray-100 p-2 overflow-x-auto whitespace-nowrap custom-scrollbar">
          <div className="flex gap-2 px-2">
              {QUICK_MESSAGES[role].map((txt) => (
                  <Badge 
                    key={txt} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-yellow-100 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl font-normal transition-colors"
                    onClick={() => handleSend(txt)}
                  >
                      {txt}
                  </Badge>
              ))}
          </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
          <Input 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua mensagem..." 
            className="rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all"
          />
          <Button 
            onClick={() => handleSend()} 
            size="icon" 
            className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl shrink-0"
            disabled={!newMessage.trim()}
          >
              <Send className="w-5 h-5" />
          </Button>
      </div>
    </div>
  );
};

export default RideChat;