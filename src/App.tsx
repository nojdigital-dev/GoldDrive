import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RideProvider } from "@/context/RideContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import { showError } from "@/utils/toast";

import Index from "./pages/Index";
import LoginClient from "./pages/LoginClient";
import LoginDriver from "./pages/LoginDriver";
import LoginAdmin from "./pages/LoginAdmin";
import ClientDashboard from "./pages/ClientDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";
import DriverPending from "./pages/DriverPending";

const queryClient = new QueryClient();

const App = () => {
  // Listener Global de Erros (Promises e JS)
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Promise Rejection:", event.reason);
      if (event.reason?.message?.includes("ResizeObserver")) return;
      const msg = event.reason?.message || event.reason || "Erro de conexão ou lógica";
      showError(`Sistema: ${msg}`);
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Global Error:", event.error);
      if (event.message?.includes("ResizeObserver")) return;
      showError(`Erro: ${event.message}`);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" closeButton richColors theme="light" />
          <BrowserRouter>
            <RideProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                
                {/* Rotas de Login Separadas */}
                <Route path="/login" element={<LoginClient />} />
                <Route path="/login/driver" element={<LoginDriver />} />
                <Route path="/login/admin" element={<LoginAdmin />} />
                
                {/* Rota de Pendência (Acessível se autenticado, mas status pending) */}
                <Route path="/driver-pending" element={<DriverPending />} />

                {/* Rotas Protegidas */}
                <Route path="/client" element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/driver" element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <DriverDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                {/* Rotas Comuns */}
                <Route path="/profile" element={
                  <ProtectedRoute allowedRoles={['client', 'driver', 'admin']}>
                    <Profile />
                  </ProtectedRoute>
                } />
                
                <Route path="/wallet" element={
                  <ProtectedRoute allowedRoles={['client', 'driver', 'admin']}>
                    <Wallet />
                  </ProtectedRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </RideProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;