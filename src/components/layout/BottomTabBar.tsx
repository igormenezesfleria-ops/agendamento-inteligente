import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// Placeholder until we wire the real Personal phone number from the linked trainer
const PERSONAL_WHATSAPP_NUMBER = '5511999999999';

// Official-style WhatsApp glyph (inline SVG so we can color it via currentColor)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.328 1.79.789 2.65 1.135 2.064 2.588 3.778 4.722 4.81.74.36 2.123.967 2.943.967.36 0 .603-.066.803-.23.158-.13.31-.27.46-.42.224-.225.444-.45.444-.78 0-.4-.215-.674-.6-.815zM27.65 4.35A14.45 14.45 0 0 0 16.04.04C8 .04 1.46 6.58 1.46 14.62c0 2.572.673 5.082 1.953 7.297L1.4 28.83l7.025-1.84a14.51 14.51 0 0 0 7.61 2.157h.005c8.04 0 14.92-6.54 14.92-14.58 0-3.866-1.66-7.49-4.31-10.215zM16.04 26.69h-.004a12.07 12.07 0 0 1-6.156-1.687l-.44-.262-4.566 1.198 1.218-4.456-.286-.456a12.07 12.07 0 0 1-1.85-6.395c0-6.69 5.443-12.13 12.137-12.13 3.243 0 6.29 1.263 8.582 3.557a12.06 12.06 0 0 1 3.555 8.583c0 6.694-5.443 12.13-12.137 12.13z" />
    </svg>
  );
}

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role || 'student';

  const homeRoute =
    role === 'admin'
      ? '/dashboard/admin'
      : role === 'collaborator'
      ? '/dashboard/collaborator'
      : '/dashboard/student';

  // Student-specific: Início | Treino | WhatsApp | Perfil
  if (role === 'student') {
    const tabs: Array<
      | {
          kind: 'link';
          label: string;
          icon: React.ElementType;
          href: string;
          match?: (path: string) => boolean;
        }
      | {
          kind: 'action';
          label: string;
          icon: React.ElementType;
          onClick: () => void;
        }
      | {
          kind: 'external';
          label: string;
          icon: React.ElementType;
          href: string;
        }
    > = [
      { kind: 'link', label: 'Início', icon: Home, href: homeRoute },
      {
        kind: 'action',
        label: 'Treino',
        icon: ClipboardList,
        onClick: () => {
          if (location.pathname !== homeRoute) {
            navigate(homeRoute);
            // Defer until dashboard mounts
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-active-workout'));
            }, 250);
          } else {
            window.dispatchEvent(new CustomEvent('open-active-workout'));
          }
        },
      },
      {
        kind: 'external',
        label: 'WhatsApp',
        icon: WhatsAppIcon,
        href: `https://wa.me/${PERSONAL_WHATSAPP_NUMBER}`,
      },
      { kind: 'link', label: 'Perfil', icon: User, href: '/dashboard/perfil' },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border lg:hidden print:hidden">
        <div className="flex items-center justify-around py-2 pb-safe max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive =
              tab.kind === 'link' &&
              (location.pathname === tab.href ||
                location.pathname.startsWith(tab.href + '/'));
            const className = cn(
              'flex flex-col items-center gap-1 px-3 py-1 relative transition-colors',
              isActive
                ? 'text-accent'
                : 'text-muted-foreground hover:text-foreground'
            );
            const Icon = tab.icon;

            if (tab.kind === 'link') {
              return (
                <Link key={tab.label} to={tab.href} className={className}>
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </Link>
              );
            }
            if (tab.kind === 'external') {
              return (
                <a
                  key={tab.label}
                  href={tab.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </a>
              );
            }
            return (
              <button
                key={tab.label}
                onClick={tab.onClick}
                className={className}
                type="button"
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Admin/Collaborator: keep prior behavior (Início | Agenda | Chat | Perfil)
  const agendaRoute =
    role === 'admin' ? '/dashboard/agenda' : '/dashboard/meus-treinos';

  const tabs = [
    { label: 'Início', icon: Home, href: homeRoute },
    { label: 'Agenda', icon: ClipboardList, href: agendaRoute },
    { label: 'Chat', icon: User, href: '/dashboard/chat', badge: true },
    { label: 'Perfil', icon: User, href: '/dashboard/perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border lg:hidden print:hidden">
      <div className="flex items-center justify-around py-2 pb-safe max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.href ||
            location.pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 relative transition-colors',
                isActive
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
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
