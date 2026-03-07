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
import AdminSchedule from "./pages/AdminSchedule";
import AdminScheduleManager from "./pages/AdminScheduleManager";
import AdminHistory from "./pages/AdminHistory";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import TeamManagement from "./pages/TeamManagement";
import MyStudents from "./pages/MyStudents";
import LockSlots from "./pages/LockSlots";
import CollaboratorTasks from "./pages/CollaboratorTasks";
import CollaboratorHistoryPage from "./pages/CollaboratorHistoryPage";
import MySchedule from "./pages/MySchedule";
import StudentHistory from "./pages/StudentHistory";
import Onboarding from "./pages/Onboarding";
import Subscription from "./pages/Subscription";
import PaymentSuccess from "./pages/PaymentSuccess";
import PayrollDashboard from "./pages/PayrollDashboard";
import FinancialDashboard from "./pages/FinancialDashboard";
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
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
              </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-success"
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />

            {/* Protected routes - Redirect based on role */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Role-specific dashboard routes */}
            <Route
              path="/dashboard/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/collaborator"
              element={
                <ProtectedRoute allowedRoles={['collaborator']}>
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
            <Route
              path="/dashboard/historico-treinos"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentHistory />
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
            <Route
              path="/dashboard/meus-alunos"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MyStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/trancamentos"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <LockSlots />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/agenda"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminSchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/historico"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/comunicados"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAnnouncements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/configurar-horarios"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminScheduleManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/minha-agenda"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MySchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/fechamento"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PayrollDashboard />
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
            <Route
              path="/dashboard/meus-treinos"
              element={
                <ProtectedRoute allowedRoles={['collaborator']}>
                  <MySchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/collaborator/historico"
              element={
                <ProtectedRoute allowedRoles={['collaborator']}>
                  <CollaboratorHistoryPage />
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
