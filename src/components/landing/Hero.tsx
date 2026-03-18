import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Users, ArrowRight, BarChart3 } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen bg-secondary overflow-hidden">
      <div className="container relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20 text-center">
        {/* Logo — free, no pill */}
        <div className="mt-12 mb-8 animate-fade-in">
          <img src="/logo-synton-dark.png" alt="Synton" className="h-20 w-auto object-contain mx-auto" />
        </div>

        {/* Main headline */}
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-foreground mb-6 max-w-4xl animate-slide-up">
          Gestão e Agendamento
          <span className="block text-gradient">Inteligente</span>
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          O app de agendamentos e gestão do Personal. Simplifique seus agendamentos, acesse históricos de aulas e tenha a gestão completa do seu desempenho em um só lugar.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <Button asChild variant="hero" size="xl">
            <Link to="/cadastro">
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <Button asChild variant="heroOutline" size="xl">
            <Link to="/login">
              Já tenho conta
            </Link>
          </Button>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-4xl animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <FeatureCard 
            icon={Calendar}
            title="Agendamento Fácil"
            description="Reserve e gerencie seus horários com seu Personal em poucos cliques."
          />
          <FeatureCard 
            icon={Users}
            title="Solicite Seu Horário"
            description="Solicite e marque seu horário de treino diretamente com o Personal, de forma rápida e organizada."
          />
          <FeatureCard 
            icon={BarChart3}
            title="Gestão e Histórico"
            description="Gerencie suas aulas, veja o histórico completo de aulas ministradas e acompanhe todos os treinos realizados."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-card rounded-2xl p-6 text-left card-hover shadow-card border border-border">
      <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-accent-foreground" />
      </div>
      <h3 className="font-display text-lg text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
