import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, Clock, ArrowRight, Dumbbell, Info, BarChart3 } from 'lucide-react';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { StudioLinkCard } from '@/components/student/StudioLinkCard';
import { StudentWorkoutHistory } from '@/components/dashboard/StudentWorkoutHistory';
import { PerformanceReceipt } from '@/components/student/PerformanceReceipt';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function StudentDashboard() {
  const { profile, user } = useAuth();
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { data: nextAppointment, isLoading } = useQuery({
    queryKey: ['next-appointment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const nowTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      // Fetch upcoming confirmed/pending appointments
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, class_schedule_id')
        .eq('student_id', user.id)
        .in('status', ['confirmed', 'pending'])
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true })
        .limit(5);

      if (error || !data || data.length === 0) return null;

      // Filter out past slots for today
      const upcoming = data.filter((a) => {
        if (a.date > todayStr) return true;
        return a.time_slot >= nowTime;
      });

      if (upcoming.length === 0) return null;

      const appt = upcoming[0];

      // Fetch class name
      if (appt.class_schedule_id) {
        const { data: schedule } = await supabase
          .from('class_schedules')
          .select('class_name')
          .eq('id', appt.class_schedule_id)
          .single();
        return { ...appt, className: schedule?.class_name || 'Treino' };
      }

      return { ...appt, className: 'Treino' };
    },
    enabled: !!user?.id && !!profile?.business_owner_id,
  });

  if (profile && !profile.business_owner_id) {
    return <StudioLinkCard />;
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">
          Olá, {profile?.name?.split(' ')[0] || 'Aluno'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Pronto para mais um treino?
        </p>
      </div>

      {/* Performance Receipt Card */}
      <Card className="border-0 bg-slate-900 text-white overflow-hidden relative">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white">Extrato de Desempenho</p>
            <p className="text-xs text-slate-400">Mostre sua evolução nos Stories!</p>
          </div>
          <Button
            onClick={() => setReceiptOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shrink-0"
            size="sm"
          >
            📊 Compartilhar
          </Button>
        </CardContent>
      </Card>

      {/* Primary CTA */}
      <Button asChild variant="accent" size="lg" className="w-full">
        <Link to="/dashboard/agendar">
          <Dumbbell className="w-5 h-5 mr-2" />
          Agendar Novo Treino
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </Button>

      {/* Next Class Highlight */}
      {!isLoading && (
        nextAppointment ? (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">
                Próximo Treino
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-lg text-foreground truncate">
                    {nextAppointment.className}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {formatDate(nextAppointment.date)} · {nextAppointment.time_slot}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-5 text-center">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Você não tem treinos agendados. Bora treinar? 💪
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* Workout History */}
      <StudentWorkoutHistory />

      {/* Announcements */}
      <AnnouncementsFeed />

      {/* Info Accordion */}
      <Accordion type="multiple" className="rounded-lg border bg-card">
        <AccordionItem value="hours" className="border-b px-4">
          <AccordionTrigger className="text-sm font-semibold gap-2">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              Horários de Funcionamento
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-1 pb-4">
            <p><strong>Segunda a Sexta:</strong></p>
            <p>Manhã: 09:00 – 12:00</p>
            <p>Tarde/Noite: 16:00 – 20:00</p>
            <p className="text-xs mt-2">Máximo de 4 alunos por horário</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="rules" className="px-4 border-b-0">
          <AccordionTrigger className="text-sm font-semibold gap-2">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              Regras de Agendamento
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-1 pb-4">
            <p>• Agende até <strong>2 horas antes</strong> do horário</p>
            <p>• Cancele até <strong>1 hora antes</strong> do horário</p>
            <p>• Reservas disponíveis para os próximos <strong>31 dias</strong></p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Receipt Modal */}
      <PerformanceReceipt open={receiptOpen} onOpenChange={setReceiptOpen} />
    </div>
  );
}
