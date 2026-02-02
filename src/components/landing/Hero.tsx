import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dumbbell, Calendar, Users, ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen hero-gradient overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-[100px] animate-pulse-subtle" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse-subtle" style={{ animationDelay: '1s' }} />

      <div className="container relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20 text-center">
        {/* Logo/Brand */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl accent-gradient shadow-accent mb-4">
            <Dumbbell className="w-10 h-10 text-accent-foreground" />
          </div>
          <h2 className="text-accent font-display text-xl font-bold tracking-wider uppercase">
            Personal Studio
          </h2>
        </div>

        {/* Main headline */}
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-primary-foreground mb-6 max-w-4xl animate-slide-up">
          Transforme Seu
          <span className="block text-gradient">Corpo e Mente</span>
        </h1>

        {/* Subtitle */}
        <p className="text-primary-foreground/70 text-lg md:text-xl max-w-2xl mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Agende seus treinos personalizados com facilidade. 
          Acompanhamento profissional e resultados reais.
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
            description="Reserve seus horários em poucos cliques"
          />
          <FeatureCard 
            icon={Users}
            title="Turmas Reduzidas"
            description="Máximo de 4 alunos por horário"
          />
          <FeatureCard 
            icon={Dumbbell}
            title="Treino Personalizado"
            description="Acompanhamento individual do seu progresso"
          />
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
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
    <div className="glass-dark rounded-2xl p-6 text-left card-hover">
      <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-accent-foreground" />
      </div>
      <h3 className="font-display text-lg text-primary-foreground mb-2">{title}</h3>
      <p className="text-primary-foreground/60 text-sm">{description}</p>
    </div>
  );
}
