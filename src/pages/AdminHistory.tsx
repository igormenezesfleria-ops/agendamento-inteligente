import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, User, Inbox, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS } from '@/lib/constants';

interface HistoryAppointment {
  id: string;
  date: string;
  time_slot: string;
  status: string;
  student_id: string;
  instructor_id: string | null;
  completed_at: string | null;
  attendance: string | null;
  notes: string | null;
  studentName: string;
}

interface ClassGroup {
  key: string;
  date: string;
  timeSlot: string;
  students: HistoryAppointment[];
}

export default function AdminHistory() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['admin-history-grouped'],
    queryFn: async () => {
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, instructor_id, completed_at, attendance, notes')
        .in('status', ['completed', 'cancelled', 'rejected'])
        .order('date', { ascending: false })
        .order('time_slot', { ascending: true })
        .limit(200);

      if (appError) throw appError;
      if (!appointments || appointments.length === 0) return [];

      const studentIds = [...new Set(appointments.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.name || 'Aluno']));

      const enriched: HistoryAppointment[] = appointments.map((a) => ({
        ...a,
        studentName: profileMap.get(a.student_id) || 'Aluno',
      }));

      // Group by date + time_slot
      const groupMap = new Map<string, ClassGroup>();
      enriched.forEach((apt) => {
        const key = `${apt.date}_${apt.time_slot}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, { key, date: apt.date, timeSlot: apt.time_slot, students: [] });
        }
        groupMap.get(key)!.students.push(apt);
      });

      return Array.from(groupMap.values());
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-foreground">Histórico de Aulas</h1>
          <p className="text-muted-foreground">
            Aulas agrupadas por dia e horário, com detalhes de cada aluno.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">Sem histórico</h3>
            <p className="text-muted-foreground">Nenhuma aula finalizada ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const formattedDate = format(
                parseISO(group.date + 'T12:00:00'),
                "EEEE, d 'de' MMMM",
                { locale: ptBR }
              );

              return (
                <Card key={group.key}>
                  <CardContent className="p-5">
                    {/* Class header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                          <Calendar className="w-4 h-4 text-accent" />
                          <span className="capitalize">{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{group.timeSlot}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {group.students.length} aluno{group.students.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {/* Students list */}
                    <div className="space-y-2">
                      {group.students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{student.studentName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {student.attendance === 'present' && <Badge variant="confirmed">Presente</Badge>}
                            {student.attendance === 'absent' && <Badge variant="destructive">Faltou</Badge>}
                            {student.status === 'cancelled' && (
                              <Badge variant="destructive">
                                {STATUS_LABELS.cancelled}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes from any student */}
                    {group.students.some((s) => s.notes) && (
                      <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
                        <p className="text-xs font-medium text-accent mb-1">Observações:</p>
                        {group.students
                          .filter((s) => s.notes)
                          .map((s) => (
                            <p key={s.id} className="text-xs text-muted-foreground">
                              <strong>{s.studentName}:</strong> {s.notes}
                            </p>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
