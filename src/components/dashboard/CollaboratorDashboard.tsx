import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, User, ArrowRight } from 'lucide-react';

export function CollaboratorDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome section */}
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-foreground">
          Olá, {profile?.name?.split(' ')[0] || 'Colaborador'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Confira as tarefas delegadas para você abaixo.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <QuickActionCard
          icon={ClipboardList}
          title="Minhas Tarefas"
          description="Veja e gerencie os treinos delegados a você"
          href="/dashboard/minhas-tarefas"
          accent
        />
        <QuickActionCard
          icon={User}
          title="Meu Perfil"
          description="Atualize suas informações pessoais"
          href="/dashboard/perfil"
        />
      </div>

      {/* Privacy notice */}
      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-display text-lg text-foreground mb-2">🔒 Privacidade</h3>
          <p className="text-sm text-muted-foreground">
            Por questões de privacidade, você só tem acesso aos treinos especificamente 
            delegados a você pelo administrador. Outros colaboradores e suas agendas 
            não são visíveis.
          </p>
        </CardContent>
      </Card>
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
