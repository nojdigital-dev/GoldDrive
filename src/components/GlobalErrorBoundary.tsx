import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Dispara a notificação visual que você pediu
    showError(`Erro Crítico: ${error.message}`);
  }

  public handleReload = () => {
    window.location.href = '/'; // Força um reload limpo para a home
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Ops! Algo deu errado.</h1>
          <p className="text-gray-500 max-w-md mb-8">
            O sistema encontrou um erro inesperado. O erro já foi registrado nas notificações.
          </p>
          
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-8 max-w-lg w-full overflow-hidden text-left">
            <p className="text-xs font-bold text-red-800 uppercase mb-1">Detalhe técnico:</p>
            <code className="text-xs text-red-600 break-all font-mono">
                {this.state.error?.message || "Erro desconhecido"}
            </code>
          </div>

          <Button 
            onClick={this.handleReload} 
            className="h-12 px-8 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
          >
            <RefreshCw className="mr-2 w-4 h-4" /> Reiniciar Aplicação
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;