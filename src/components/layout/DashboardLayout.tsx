import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/constants';
import {
  Dumbbell, Calendar, User, LogOut, Menu, X, Home, Users, Bell,
  ClipboardList, Lock, History, MessageSquare, Settings, CalendarCheck, GraduationCap, DollarSign, CreditCard, Package, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { usePushPermission } from '@/hooks/usePushPermission';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  usePushPermission();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const role = profile?.role || 'student';

  const navItems = getNavItems(role);

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      {/* Mobile header — light theme, expanded for premium logo presence */}
      <header className="lg:hidden sticky top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="flex items-center justify-between px-4 py-4 min-h-[80px] bg-transparent">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="text-slate-800 hover:text-slate-900 hover:bg-slate-100 shrink-0"
          >
            <Menu className="w-7 h-7" />
          </Button>
          <Link to="/dashboard" className="bg-transparent flex items-center justify-center flex-1">
            <img src="/logo-synton-horizontal-dark.png" alt="Synton" className="h-10 w-auto object-contain shrink-0 bg-transparent" />
          </Link>
          <span className="text-slate-800 shrink-0">
            <NotificationBell />
          </span>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[100] w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 print:hidden',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header — close button on mobile, logo on desktop */}
          <div className="flex items-center justify-between px-6 min-h-[96px] py-4 border-b border-sidebar-border bg-transparent">
            <Link to="/dashboard" className="flex items-center bg-transparent">
              <img src="/logo-synton-sidebar.png" alt="Synton" className="h-14 w-auto object-contain bg-transparent" />
            </Link>
            <div className="flex items-center gap-1">
              <span className="hidden lg:block"><NotificationBell /></span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* User info */}
          <div className="px-4 py-4">
            <div className="rounded-xl p-3">
              <div className="flex items-center gap-3">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-sidebar-primary/30" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-sidebar-primary/15 flex items-center justify-center">
                    <User className="w-4 h-4 text-sidebar-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-sidebar-foreground truncate">
                    {profile?.name || 'Usuário'}
                  </p>
                  <span className="inline-block mt-0.5 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-sidebar-primary/20 text-sidebar-primary">
                    {ROLE_LABELS[role]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
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
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'text-sidebar-primary border-l-4 border-sidebar-primary bg-sidebar-accent'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent border-l-4 border-transparent'
                  )}
                >
                  <navItem.icon className="w-[18px] h-[18px]" />
                  {navItem.label}
                </Link>
              );
            })}
          </nav>

          {/* Sign out */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
          className="fixed inset-0 bg-black/50 z-[99] lg:hidden print:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar />

      {/* Main content */}
      <main className="lg:ml-64 lg:pt-0 min-h-screen w-full overflow-x-hidden print:ml-0 print:pt-0">
        <div className="p-4 md:p-8 pb-28 lg:pb-8 print:p-4 print:pb-4 max-w-lg mx-auto lg:max-w-4xl">{children}</div>
      </main>
    </div>
  );
}

function getNavItems(role: string) {
  const studentItems = [
    { href: '/dashboard/student', label: 'Início', icon: Home },
    { href: '/dashboard/chat', label: 'Mensagens', icon: MessageSquare },
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
    { href: '/dashboard/chat', label: 'Mensagens', icon: MessageSquare },
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
