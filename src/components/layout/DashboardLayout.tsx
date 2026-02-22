import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/constants';
import {
  Dumbbell, Calendar, User, LogOut, Menu, X, Home, Users, Bell,
  ClipboardList, Lock, History, MessageSquare, Settings, CalendarCheck, GraduationCap, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const role = profile?.role || 'student';

  const navItems = getNavItems(role);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border print:hidden">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-display text-lg text-sidebar-foreground">Personal Studio</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-sidebar-foreground"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 print:hidden',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-display text-xl text-sidebar-foreground">Personal Studio</span>
          </div>

          {/* User info */}
          <div className="px-4 py-4 mt-16 lg:mt-0">
            <div className="bg-sidebar-accent rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-sidebar-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sidebar-foreground truncate">
                    {profile?.name || 'Usuário'}
                  </p>
                  <Badge variant={role as any} className="text-xs mt-1">
                    {ROLE_LABELS[role]}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sign out */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden print:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen print:ml-0 print:pt-0">
        <div className="p-6 lg:p-8 print:p-4">{children}</div>
      </main>
    </div>
  );
}

function getNavItems(role: string) {
  const studentItems = [
    { href: '/dashboard/student', label: 'Início', icon: Home },
    { href: '/dashboard/agendar', label: 'Agendar Treino', icon: Calendar },
    { href: '/dashboard/meus-agendamentos', label: 'Meus Agendamentos', icon: ClipboardList },
    { href: '/dashboard/historico-treinos', label: 'Histórico de Treinos', icon: History },
    { href: '/dashboard/perfil', label: 'Meu Perfil', icon: User },
  ];

  const adminItems = [
    { href: '/dashboard/admin', label: 'Início', icon: Home },
    { href: '/dashboard/solicitacoes', label: 'Solicitações', icon: Bell },
    { href: '/dashboard/minha-agenda', label: 'Minha Agenda', icon: CalendarCheck },
    { href: '/dashboard/agenda', label: 'Agenda Completa', icon: Calendar },
    { href: '/dashboard/configurar-horarios', label: 'Configurar Horários', icon: Settings },
    { href: '/dashboard/equipe', label: 'Equipe', icon: Users },
    { href: '/dashboard/meus-alunos', label: 'Meus Alunos', icon: GraduationCap },
    { href: '/dashboard/trancamentos', label: 'Trancamentos', icon: Lock },
    { href: '/dashboard/historico', label: 'Histórico', icon: History },
    { href: '/dashboard/comunicados', label: 'Comunicados', icon: MessageSquare },
    { href: '/dashboard/admin/fechamento', label: 'Fechamento / Pagamentos', icon: DollarSign },
    { href: '/dashboard/perfil', label: 'Meu Perfil', icon: User },
  ];

  const collaboratorItems = [
    { href: '/dashboard/collaborator', label: 'Início', icon: Home },
    { href: '/dashboard/meus-treinos', label: 'Meus Treinos', icon: CalendarCheck },
    { href: '/dashboard/minhas-tarefas', label: 'Minhas Tarefas', icon: ClipboardList },
    { href: '/dashboard/collaborator/historico', label: 'Histórico de Treinos', icon: History },
    { href: '/dashboard/perfil', label: 'Meu Perfil', icon: User },
  ];

  switch (role) {
    case 'admin':
      return adminItems;
    case 'collaborator':
      return collaboratorItems;
    default:
      return studentItems;
  }
}
