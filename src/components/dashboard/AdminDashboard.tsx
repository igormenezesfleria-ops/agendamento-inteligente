import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Calendar, Users, Lock, History, ArrowRight, MessageSquare, Loader2, Settings, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';

export function AdminDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: pendingCount = 0, isLoading: loadingPending } = useQuery({
    queryKey: ['admin-stat-pending'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: todayCount = 0, isLoading: loadingToday } = useQuery({
    queryKey: ['admin-stat-today'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'confirmed');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: collabCount = 0, isLoading: loadingCollab } = useQuery({
    queryKey: ['admin-stat-collaborators'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'collaborator');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: lockedCount = 0, isLoading: loadingLocked } = useQuery({
    queryKey: ['admin-stat-locked'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('locked_slots')
        .select('*', { count: 'exact', head: true })
        .gte('date', today);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const isLoading = loadingPending || loadingToday || loadingCollab || loadingLocked;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-foreground">
          Painel Administrativo
        </h1>
        <p className="text-muted-foreground">
          Gerencie solicitações, equipe e horários do studio.
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Solicitações Pendentes" value={isLoading ? '...' : String(pendingCount)} icon={Bell} />
        <StatCard title="Treinos Hoje" value={isLoading ? '...' : String(todayCount)} icon={Calendar} />
        <StatCard title="Colaboradores" value={isLoading ? '...' : String(collabCount)} icon={Users} />
        <StatCard title="Horários Trancados" value={isLoading ? '...' : String(lockedCount)} icon={Lock} />
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
          icon={CalendarCheck}
          title="Minha Agenda"
          description="Seus treinos confirmados"
          href="/dashboard/minha-agenda"
        />
        <QuickActionCard
          icon={Calendar}
          title="Agenda Completa"
          description="Visualize todos os agendamentos"
          href="/dashboard/agenda"
        />
        <QuickActionCard
          icon={Settings}
          title="Configurar Horários"
          description="Defina seus horários semanais"
          href="/dashboard/configurar-horarios"
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
