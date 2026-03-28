import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function BottomTabBar() {
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile?.role || 'student';

  const homeRoute = role === 'admin' ? '/dashboard/admin' : role === 'collaborator' ? '/dashboard/collaborator' : '/dashboard/student';
  const agendaRoute = role === 'admin' ? '/dashboard/agenda' : role === 'collaborator' ? '/dashboard/meus-treinos' : '/dashboard/agendar';

  const tabs = [
    { label: 'Início', icon: Home, href: homeRoute },
    { label: 'Agenda', icon: Calendar, href: agendaRoute },
    { label: 'Chat', icon: MessageCircle, href: '/dashboard/chat', badge: true },
    { label: 'Perfil', icon: User, href: '/dashboard/perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border lg:hidden print:hidden">
      <div className="flex items-center justify-around py-2 pb-safe max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href || location.pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 relative transition-colors',
                isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.badge && (
                <span className="absolute top-0 right-1 w-2 h-2 bg-accent rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
