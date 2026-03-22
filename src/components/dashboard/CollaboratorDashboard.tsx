import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ClipboardList, User, ArrowRight, CalendarCheck, History } from 'lucide-react';

export function CollaboratorDashboard() {
  const { profile } = useAuth();

  const firstName = profile?.name?.split(' ')[0] || 'Colaborador';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      {/* Greeting */}
      <div className="text-center space-y-1 pt-2">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Olá, {displayName}! 👋
        </h1>
        <p className="text-slate-500 text-sm">
          Confira suas tarefas e treinos delegados.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <QuickActionCard
          icon={ClipboardList}
          title="Minhas Tarefas"
          description="Veja e gerencie os treinos delegados a você"
          href="/dashboard/minhas-tarefas"
          accent
        />
        <QuickActionCard
          icon={CalendarCheck}
          title="Meus Treinos"
          description="Visualize sua agenda de treinos"
          href="/dashboard/meus-treinos"
        />
        <QuickActionCard
          icon={History}
          title="Histórico"
          description="Seus treinos concluídos e registros"
          href="/dashboard/collaborator/historico"
        />
        <QuickActionCard
          icon={User}
          title="Meu Perfil"
          description="Atualize suas informações pessoais"
          href="/dashboard/perfil"
        />
      </div>

      {/* Privacy notice */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">🔒 Privacidade</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Por questões de privacidade, você só tem acesso aos treinos especificamente 
          delegados a você pelo administrador.
        </p>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  accent?: boolean;
}

function QuickActionCard({ icon: Icon, title, description, href, accent }: QuickActionCardProps) {
  return (
    <Link
      to={href}
      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-accent/30 transition-all group block"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accent ? 'bg-accent text-accent-foreground' : 'bg-slate-50'}`}>
        <Icon className={`w-6 h-6 ${accent ? '' : 'text-slate-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
