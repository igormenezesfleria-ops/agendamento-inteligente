import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/constants';
import {
  Dumbbell, Calendar, User, LogOut, Menu, X, Home, Users,
  ClipboardList, Lock, History, MessageSquare, Settings, CalendarCheck, GraduationCap, DollarSign, CreditCard, Package, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { usePushPermission } from '@/hooks/usePushPermission';

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
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border print:hidden">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="w-10" />
          <Link to="/dashboard" className="bg-white rounded-full px-6 py-1.5 shadow-sm flex items-center justify-center">
            <img src="/logo-synton.png" alt="Synton" className="h-6 w-auto object-contain" />
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
          <div className="hidden lg:flex items-center justify-center px-6 h-16 border-b border-sidebar-border">
            <Link to="/dashboard" className="bg-white rounded-full px-6 py-1.5 shadow-sm flex items-center justify-center">
              <img src="/logo-synton.png" alt="Synton" className="h-7 w-auto object-contain" />
            </Link>
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
            {navItems.map((item, idx) => {
              if ('section' in item) {
                return (
                  <p key={`section-${idx}`} className="text-[10px] font-bold tracking-widest text-sidebar-foreground/40 uppercase pt-5 pb-1 px-4">
                    {(item as any).section}
                  </p>
                );
              }
              const navItem = item as { href: string; label: string; icon: React.ElementType };
              const isActive = location.pathname === navItem.href;
              return (
                <Link
                  key={navItem.href}
                  to={navItem.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <navItem.icon className="w-5 h-5" />
                  {navItem.label}
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
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen w-full overflow-x-hidden print:ml-0 print:pt-0">
        <div className="p-4 md:p-8 print:p-4">{children}</div>
      </main>
    </div>
  );
}

function getNavItems(role: string) {
  const studentItems = [
    { href: '/dashboard/student', label: 'Início', icon: Home },
    { href: '/dashboard/agendar', label: 'Agendar Treino', icon: Calendar },
    { href: '/dashboard/meus-agendamentos', label: 'Meus Agendamentos', icon: ClipboardList },
    { href: '/dashboard/questionarios', label: 'Questionários', icon: GraduationCap },
    { href: '/dashboard/historico-treinos', label: 'Histórico de Treinos', icon: History },
    { href: '/dashboard/student/plans', label: 'Planos e Pacotes', icon: Package },
    { href: '/dashboard/perfil', label: 'Meu Perfil', icon: User },
  ];

  const adminItems: Array<{ href: string; label: string; icon: React.ElementType } | { section: string }> = [
    { href: '/dashboard/admin', label: 'Início', icon: Home },
    { section: 'Operação' },
    { href: '/dashboard/solicitacoes', label: 'Solicitações', icon: Bell },
    { href: '/dashboard/minha-agenda', label: 'Minhas Tarefas', icon: ClipboardList },
    { href: '/dashboard/agenda', label: 'Agenda Completa', icon: Calendar },
    { section: 'Gestão' },
    { href: '/dashboard/meus-alunos', label: 'Meus Alunos', icon: GraduationCap },
    { href: '/dashboard/questionarios', label: 'Questionários', icon: ClipboardList },
    { href: '/dashboard/equipe', label: 'Equipe', icon: Users },
    { href: '/dashboard/historico', label: 'Histórico', icon: History },
    { href: '/dashboard/admin/financeiro', label: 'Gestão Financeira', icon: DollarSign },
    { href: '/dashboard/admin/pagamentos', label: 'Pagamentos', icon: CreditCard },
    { href: '/dashboard/admin/plans', label: 'Planos & Preços', icon: Package },
    { section: 'Ajustes' },
    { href: '/dashboard/configurar-horarios', label: 'Configurar Horários', icon: Settings },
    { href: '/dashboard/trancamentos', label: 'Trancamentos', icon: Lock },
    { href: '/dashboard/comunicados', label: 'Comunicados', icon: MessageSquare },
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
