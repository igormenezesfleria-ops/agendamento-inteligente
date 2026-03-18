import { Link } from 'react-router-dom';
import { Calendar, Users, BarChart3 } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen bg-[#101318] overflow-hidden pb-40">
      <div className="container relative z-10 flex flex-col items-center px-4 py-20 text-center">
        {/* Logo — free, no pill */}
        <div className="mt-12 mb-8 animate-fade-in">
          <img src="/logo-synton.png" alt="Synton" className="h-20 w-auto object-contain mx-auto" />
        </div>

        {/* Main headline */}
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white text-center tracking-tight mt-8 animate-slide-up">
          A evolução da sua
          <span className="block text-accent">gestão.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base text-slate-400 text-center max-w-sm mx-auto mt-4 px-4 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Simplifique agendamentos, acesse históricos e tenha o controle total do seu desempenho em um só lugar.
        </p>

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

      {/* Sticky Bottom Action Zone */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0d12]/90 backdrop-blur-md border-t border-white/5 p-6 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <Link
          to="/cadastro"
          className="block w-full py-4 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg text-center shadow-md transition-all"
        >
          Começar Agora
        </Link>
        <Link to="/login" className="block w-full text-center mt-4 text-slate-400 font-medium text-sm">
          Já tem uma conta? <span className="text-accent font-bold">Entrar</span>
        </Link>
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
    <div className="bg-white/5 rounded-2xl p-6 text-left card-hover border border-white/10 shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-accent" />
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{description}</p>
    </div>
  );
}
