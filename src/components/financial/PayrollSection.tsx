import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';

interface CollabPayroll {
  id: string;
  name: string | null;
  pay_type: string | null;
  base_rate: number | null;
  no_show_rate: number | null;
  fixed_monthly_rate: number | null;
}

interface Appointment {
  id: string;
  date: string;
  time_slot: string;
  instructor_id: string | null;
  attendance: string | null;
  status: string;
}

interface PayrollSectionProps {
  collaborators: CollabPayroll[] | undefined;
  appointments: Appointment[] | undefined;
  isLoading: boolean;
  formatCurrency: (val: number) => string;
}

const PAY_TYPE_LABELS: Record<string, string> = {
  per_student: 'Por Aluno',
  per_class: 'Por Aula',
  fixed_monthly: 'Salário Fixo',
};

export function PayrollSection({ collaborators, appointments, isLoading, formatCurrency }: PayrollSectionProps) {
  const breakdowns = useMemo(() => {
    if (!collaborators) return [];

    return collaborators.map((collab) => {
      const rate = Number(collab.base_rate) || 0;
      const noShowRate = Number(collab.no_show_rate) || 0;
      const fixedMonthly = Number(collab.fixed_monthly_rate) || 0;
      const collabAppts = (appointments || []).filter((a) => a.instructor_id === collab.id);

      let total = 0;
      let detail = '';

      if (collab.pay_type === 'fixed_monthly') {
        total = fixedMonthly;
        detail = `Salário fixo mensal`;
      } else if (collab.pay_type === 'per_class') {
        const sessions = new Set(collabAppts.map((a) => `${a.date}_${a.time_slot}`));
        total = rate * sessions.size;
        detail = `${sessions.size} aula(s) × ${formatCurrency(rate)}`;
      } else {
        const present = collabAppts.filter((a) => a.attendance === 'present').length;
        const absent = collabAppts.filter((a) => a.attendance === 'absent').length;
        total = (rate * present) + (noShowRate * absent);
        detail = `${present} presente(s) × ${formatCurrency(rate)}`;
        if (absent > 0) detail += ` + ${absent} falta(s) × ${formatCurrency(noShowRate)}`;
      }

      return { ...collab, total, detail };
    });
  }, [collaborators, appointments, formatCurrency]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="print-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Folha de Pagamento (Equipe)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {breakdowns.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Nenhum colaborador encontrado.</p>
        ) : (
          <div className="space-y-3">
            {breakdowns.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{b.name || 'Sem nome'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {PAY_TYPE_LABELS[b.pay_type || 'per_class'] || b.pay_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{b.detail}</span>
                  </div>
                </div>
                <p className="font-bold text-sm sm:text-base text-foreground whitespace-nowrap">
                  {formatCurrency(b.total)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
