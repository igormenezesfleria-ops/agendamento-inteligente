import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Calendar, Users, Lock, History, ArrowRight, MessageSquare } from 'lucide-react';

export function AdminDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome section */}
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-foreground">
          Painel Administrativo
        </h1>
        <p className="text-muted-foreground">
          Gerencie solicitações, equipe e horários do studio.
        </p>
      </div>

      {/* Stats overview - placeholder */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Solicitações Pendentes" value="--" icon={Bell} />
        <StatCard title="Treinos Hoje" value="--" icon={Calendar} />
        <StatCard title="Colaboradores" value="--" icon={Users} />
        <StatCard title="Horários Trancados" value="--" icon={Lock} />
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <QuickActionCard
          icon={Bell}
          title="Solicitações"
          description="Aprovar ou delegar agendamentos"
          href="/dashboard/solicitacoes"
          accent
        />
        <QuickActionCard
          icon={Calendar}
          title="Agenda Completa"
          description="Visualize todos os agendamentos"
          href="/dashboard/agenda"
        />
        <QuickActionCard
          icon={Users}
          title="Gerenciar Equipe"
          description="Adicionar ou remover colaboradores"
          href="/dashboard/equipe"
        />
        <QuickActionCard
          icon={Lock}
          title="Trancamentos"
          description="Bloquear horários específicos"
          href="/dashboard/trancamentos"
        />
        <QuickActionCard
          icon={History}
          title="Histórico"
          description="Ver treinos concluídos"
          href="/dashboard/historico"
        />
        <QuickActionCard
          icon={MessageSquare}
          title="Comunicados"
          description="Enviar mensagem para todos os alunos"
          href="/dashboard/comunicados"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
}

function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-accent" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
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
    <Card className="card-hover group">
      <CardContent className="p-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${accent ? 'accent-gradient' : 'bg-secondary'}`}>
          <Icon className={`w-6 h-6 ${accent ? 'text-accent-foreground' : 'text-secondary-foreground'}`} />
        </div>
        <h3 className="font-display text-lg text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Button asChild variant={accent ? 'accent' : 'outline'} className="w-full">
          <Link to={href}>
            Acessar
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
