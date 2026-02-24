import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { MONTHS } from '@/lib/constants';
import { Loader2, Printer, DollarSign, Users, Calendar, CheckCircle, XCircle } from 'lucide-react';

interface CollaboratorOption {
  id: string;
  name: string | null;
  pay_type: string | null;
  base_rate: number | null;
  no_show_rate: number | null;
}

export default function PayrollDashboard() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedCollabId, setSelectedCollabId] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch collaborators
  const { data: collaborators } = useQuery({
    queryKey: ['collaborators-payroll'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, pay_type, base_rate, no_show_rate')
        .eq('role', 'collaborator')
        .eq('business_owner_id', user.id);
      if (error) throw error;
      return data as CollaboratorOption[];
    },
  });

  const selectedCollab = useMemo(() => {
    const c = collaborators?.find((c) => c.id === selectedCollabId);
    if (!c) return null;
    return {
      ...c,
      base_rate: Number(c.base_rate) || 0,
      no_show_rate: Number(c.no_show_rate) || 0,
    };
  }, [collaborators, selectedCollabId]);

  // Reuse the EXACT same query pattern from CollaboratorHistory
  const { data: rawAppointments, isLoading } = useQuery({
    queryKey: ['payroll-history', selectedCollabId],
    queryFn: async () => {
      if (!selectedCollabId) return [];

      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('id, date, time_slot, status, student_id, completed_at, attendance')
        .eq('instructor_id', selectedCollabId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (appError) throw appError;
      if (!appointments || appointments.length === 0) return [];

      const studentIds = [...new Set(appointments.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p.name || 'Aluno'])
      );

      return appointments.map((a) => ({
        ...a,
        studentName: profileMap.get(a.student_id) || 'Aluno',
      }));
    },
    enabled: !!selectedCollabId,
  });

  // Filter by selected month/year using local date parsing to avoid timezone shifts
  const monthFiltered = useMemo(() => {
    if (!rawAppointments) return [];
    return rawAppointments.filter((a) => {
      const [y, m] = a.date.split('-').map(Number);
      return y === selectedYear && m === selectedMonth + 1;
    });
  }, [rawAppointments, selectedMonth, selectedYear]);

  // Group by date+time_slot (class session)
  const grouped = useMemo(() => {
    if (!monthFiltered.length) return [];
    const map = new Map<string, { date: string; timeSlot: string; className: string; students: { name: string; attendance: string }[] }>();
    for (const appt of monthFiltered) {
      const key = `${appt.date}_${appt.time_slot}`;
      if (!map.has(key)) {
        map.set(key, {
          date: appt.date,
          timeSlot: appt.time_slot,
          className: 'Treino',
          students: [],
        });
      }
      map.get(key)!.students.push({
        name: appt.studentName,
        attendance: appt.attendance || 'pending',
      });
    }
    return Array.from(map.values());
  }, [monthFiltered]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!selectedCollab || !grouped.length) return { total: 0, classCount: 0, presentCount: 0, absentCount: 0 };
    const classCount = grouped.length;
    let presentCount = 0;
    let absentCount = 0;
    for (const g of grouped) {
      for (const s of g.students) {
        if (s.attendance === 'present') presentCount++;
        else if (s.attendance === 'absent') absentCount++;
      }
    }

    let total = 0;
    if (selectedCollab.pay_type === 'per_class') {
      total = (selectedCollab.base_rate || 0) * classCount;
    } else {
      total = ((selectedCollab.base_rate || 0) * presentCount) + ((selectedCollab.no_show_rate || 0) * absentCount);
    }

    return { total, classCount, presentCount, absentCount };
  }, [selectedCollab, grouped]);

  const handlePrint = () => {
    window.print();
  };

  // Year options (current and previous)
  const yearOptions = [selectedYear - 1, selectedYear];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <h1 className="font-display text-3xl text-foreground">Fechamento / Pagamentos</h1>
            <p className="text-muted-foreground">Calcule automaticamente o valor a pagar para cada colaborador.</p>
          </div>
          {selectedCollabId && grouped.length > 0 && (
            <Button variant="outline" onClick={handlePrint} className="print:hidden">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Recibo (PDF)
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="print:hidden">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Colaborador</label>
              <Select value={selectedCollabId} onValueChange={setSelectedCollabId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {collaborators?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name || 'Sem nome'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Mês</label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Ano</label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {!selectedCollabId ? (
          <Card>
            <CardContent className="p-12 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Selecione um colaborador para gerar o extrato.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div ref={printRef} className="space-y-6">
            {/* Print header (hidden on screen) */}
            <div className="hidden print:block mb-6 print:border-b print:pb-4">
              <h2 className="text-2xl font-bold">X AXIS</h2>
              <h3 className="text-xl mt-1">Extrato de Pagamento</h3>
              <p className="text-sm mt-2">Colaborador: <strong>{selectedCollab?.name}</strong></p>
              <p className="text-sm">Período: <strong>{MONTHS[selectedMonth]} / {selectedYear}</strong></p>
              <p className="text-sm">Tipo: <strong>{selectedCollab?.pay_type === 'per_class' ? 'Por Aula' : 'Por Aluno'}</strong> — R$ {(selectedCollab?.base_rate || 0).toFixed(2)}{selectedCollab?.pay_type !== 'per_class' ? ` / falta: R$ ${(selectedCollab?.no_show_rate || 0).toFixed(2)}` : ' por aula'}</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-2 border-accent/30 bg-accent/5">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-6 h-6 mx-auto text-accent mb-1" />
                  <p className="text-2xl font-bold text-foreground">
                    R$ {totals.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">TOTAL A PAGAR</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold text-foreground">{totals.classCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Aulas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-6 h-6 mx-auto text-accent mb-1" />
                  <p className="text-2xl font-bold text-foreground">{totals.presentCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Presenças</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="w-6 h-6 mx-auto text-destructive mb-1" />
                  <p className="text-2xl font-bold text-foreground">{totals.absentCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Faltas</p>
                </CardContent>
              </Card>
            </div>

            {/* Pay type info */}
            {selectedCollab && (
              <Card className="print:hidden">
                <CardContent className="p-4 flex items-center gap-3">
                  <Badge variant="secondary">
                    {selectedCollab.pay_type === 'per_class' ? 'Por Aula' : 'Por Aluno'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedCollab.pay_type === 'per_class'
                      ? `R$ ${(selectedCollab.base_rate || 0).toFixed(2)} por aula`
                      : `R$ ${(selectedCollab.base_rate || 0).toFixed(2)}/presença • R$ ${(selectedCollab.no_show_rate || 0).toFixed(2)}/falta`}
                  </span>
                </CardContent>
              </Card>
            )}

            {/* Statement table */}
            {grouped.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Extrato Detalhado</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Aula</TableHead>
                        <TableHead>Alunos</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped.map((g, i) => {
                        const present = g.students.filter((s) => s.attendance === 'present').length;
                        const absent = g.students.filter((s) => s.attendance === 'absent').length;
                        let subtotal = 0;
                        if (selectedCollab?.pay_type === 'per_class') {
                          subtotal = selectedCollab.base_rate || 0;
                        } else {
                          subtotal = ((selectedCollab?.base_rate || 0) * present) + ((selectedCollab?.no_show_rate || 0) * absent);
                        }
                        const dateParts = g.date.split('-');
                        const displayDate = `${dateParts[2]}/${dateParts[1]}`;

                        return (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{displayDate}</TableCell>
                            <TableCell>{g.timeSlot}</TableCell>
                            <TableCell>{g.className}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {g.students.map((s, j) => (
                                  <div key={j} className="flex items-center gap-2 text-sm">
                                    <span className="truncate max-w-[120px]">{s.name}</span>
                                    <Badge
                                      variant={s.attendance === 'present' ? 'default' : 'destructive'}
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {s.attendance === 'present' ? 'Presente' : s.attendance === 'absent' ? 'Falta' : 'Pendente'}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {subtotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma aula encontrada para este período.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
