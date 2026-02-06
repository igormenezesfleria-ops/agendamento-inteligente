import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import MyAppointments from "./pages/MyAppointments";
import Profile from "./pages/Profile";
import AdminRequests from "./pages/AdminRequests";
import TeamManagement from "./pages/TeamManagement";
import CollaboratorTasks from "./pages/CollaboratorTasks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Signup />} />

            {/* Protected routes - All authenticated users */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/perfil"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Student routes */}
            <Route
              path="/dashboard/agendar"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Booking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/meus-agendamentos"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <MyAppointments />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/dashboard/solicitacoes"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/equipe"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <TeamManagement />
                </ProtectedRoute>
              }
            />

            {/* Collaborator routes */}
            <Route
              path="/dashboard/minhas-tarefas"
              element={
                <ProtectedRoute allowedRoles={['collaborator']}>
                  <CollaboratorTasks />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
