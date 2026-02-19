import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ClipboardList, User, ArrowRight } from 'lucide-react';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { StudioLinkCard } from '@/components/student/StudioLinkCard';
import { StudentWorkoutHistory } from '@/components/dashboard/StudentWorkoutHistory';

export function StudentDashboard() {
  const { profile } = useAuth();

  // If student is not linked to a trainer, show linking flow
  if (profile && !profile.business_owner_id) {
    return <StudioLinkCard />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome section */}
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-foreground">
          Olá, {profile?.name?.split(' ')[0] || 'Aluno'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Pronto para mais um treino? Confira suas opções abaixo.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <QuickActionCard
          icon={Calendar}
          title="Agendar Treino"
          description="Reserve seu próximo horário de treino"
          href="/dashboard/agendar"
          accent
        />
        <QuickActionCard
          icon={ClipboardList}
          title="Meus Agendamentos"
          description="Visualize e gerencie suas reservas"
          href="/dashboard/meus-agendamentos"
        />
        <QuickActionCard
          icon={User}
          title="Meu Perfil"
          description="Atualize suas informações pessoais"
          href="/dashboard/perfil"
        />
      </div>

      {/* Workout History */}
      <StudentWorkoutHistory />

      {/* Announcements */}
      <AnnouncementsFeed />

      {/* Info cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horários de Funcionamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Segunda a Sexta:</strong></p>
            <p>Manhã: 09:00 - 12:00</p>
            <p>Tarde/Noite: 16:00 - 20:00</p>
            <p className="text-xs mt-4">Máximo de 4 alunos por horário</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Regras de Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Agende até <strong>2 horas antes</strong> do horário</p>
            <p>• Cancele até <strong>1 hora antes</strong> do horário</p>
            <p>• Reservas disponíveis para os próximos <strong>31 dias</strong></p>
          </CardContent>
        </Card>
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
    <Card className="card-hover group">
      <CardContent className="p-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${accent ? 'accent-gradient' : 'bg-secondary'}`}>
          <Icon className={`w-6 h-6 ${accent ? 'text-accent-foreground' : 'text-secondary-foreground'}`} />
        </div>
        <h3 className="font-display text-lg text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Button asChild variant={accent ? 'accent' : 'outline'} className="w-full group-hover:translate-x-0">
          <Link to={href}>
            Acessar
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
