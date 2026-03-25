import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function CheckinQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: checkins = [] } = useQuery({
    queryKey: ['checkin-queue', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Fetch appointments that have checkin_at set but attendance still pending
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, student_id, checkin_at')
        .not('checkin_at', 'is', null)
        .eq('attendance', 'pending')
        .in('status', ['confirmed', 'delegated'])
        .eq('date', todayStr)
        .order('checkin_at', { ascending: true });

      if (error || !data) return [];

      // Fetch student names
      const studentIds = [...new Set(data.map(a => a.student_id))];
      if (studentIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const nameMap = new Map((profiles || []).map(p => [p.id, p.name]));

      return data.map(a => ({
        ...a,
        studentName: nameMap.get(a.student_id) || 'Aluno',
      }));
    },
    enabled: !!user?.id,
    refetchInterval: 15_000,
  });

  const handleValidate = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ attendance: 'present', status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', appointmentId);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível validar.', variant: 'destructive' });
      return;
    }
    toast({ title: '✅ Presença validada!' });
    queryClient.invalidateQueries({ queryKey: ['checkin-queue'] });
  };

  const handleReject = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ attendance: 'absent', checkin_at: null })
      .eq('id', appointmentId);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível rejeitar.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Check-in rejeitado.' });
    queryClient.invalidateQueries({ queryKey: ['checkin-queue'] });
  };

  if (checkins.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-accent" />
        <p className="text-xs font-bold text-accent uppercase tracking-wider">
          Fila de Check-ins ({checkins.length})
        </p>
      </div>
      {checkins.map((c) => (
        <div
          key={c.id}
          className="bg-card rounded-2xl p-4 border-l-4 border-accent shadow-sm flex justify-between items-center"
        >
          <div className="min-w-0">
            <p className="font-bold text-foreground text-sm truncate">{c.studentName}</p>
            <p className="text-xs text-muted-foreground">{c.time_slot}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleReject(c.id)}
              className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
            >
              <XCircle className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => handleValidate(c.id)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Validar Entrada
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
