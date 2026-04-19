import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Loader2, FileText } from 'lucide-react';
import { CollaboratorReceiptDialog } from './CollaboratorReceiptDialog';

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
  selectedMonth: number;
  selectedYear: number;
}

const PAY_TYPE_LABELS: Record<string, string> = {
  per_student: 'Por Aluno',
  per_class: 'Por Aula',
  fixed_monthly: 'Salário Fixo',
};

export function PayrollSection({ collaborators, appointments, isLoading, formatCurrency, selectedMonth, selectedYear }: PayrollSectionProps) {
  const [receiptCollab, setReceiptCollab] = useState<CollabPayroll | null>(null);

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
    <>
      <section className="space-y-3 print-section">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            Folha de Pagamento
          </h2>
          <span className="text-xs text-muted-foreground">{breakdowns.length} {breakdowns.length === 1 ? 'membro' : 'membros'}</span>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {breakdowns.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">Nenhum colaborador encontrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {breakdowns.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 text-sm font-semibold">
                    {(b.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.name || 'Sem nome'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {PAY_TYPE_LABELS[b.pay_type || 'per_class'] || b.pay_type} · {b.detail}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(b.total)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-accent no-print"
                      onClick={() => setReceiptCollab(b)}
                      aria-label="Ver recibo"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {receiptCollab && (
        <CollaboratorReceiptDialog
          open={!!receiptCollab}
          onOpenChange={(open) => !open && setReceiptCollab(null)}
          collaborator={receiptCollab}
          appointments={appointments || []}
          month={selectedMonth}
          year={selectedYear}
          formatCurrency={formatCurrency}
        />
      )}
    </>
  );
}
