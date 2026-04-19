import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { MONTHS } from '@/lib/constants';

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: CollabPayroll;
  appointments: Appointment[];
  month: number;
  year: number;
  formatCurrency: (val: number) => string;
}

const PAY_TYPE_LABELS: Record<string, string> = {
  per_student: 'Por Aluno',
  per_class: 'Por Aula',
  fixed_monthly: 'Salário Fixo',
};

interface SessionRow {
  date: string;
  time: string;
  students: number;
  subtotal: number;
}

export function CollaboratorReceiptDialog({
  open,
  onOpenChange,
  collaborator,
  appointments,
  month,
  year,
  formatCurrency,
}: Props) {
  const { total, classCount, presentCount, absentCount, rows, baseRate, noShowRate, grossTotal, deductions } = useMemo(() => {
    const rate = Number(collaborator.base_rate) || 0;
    const noShow = Number(collaborator.no_show_rate) || 0;
    const fixedMonthly = Number(collaborator.fixed_monthly_rate) || 0;
    const collabAppts = appointments.filter((a) => a.instructor_id === collaborator.id);

    if (collaborator.pay_type === 'fixed_monthly') {
      return {
        total: fixedMonthly,
        classCount: 0,
        presentCount: 0,
        absentCount: 0,
        rows: [] as SessionRow[],
        baseRate: rate,
        noShowRate: noShow,
        grossTotal: fixedMonthly,
        deductions: 0,
      };
    }

    const sessionMap = new Map<string, Appointment[]>();
    for (const a of collabAppts) {
      const key = `${a.date}_${a.time_slot}`;
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key)!.push(a);
    }

    const present = collabAppts.filter((a) => a.attendance === 'present').length;
    const absent = collabAppts.filter((a) => a.attendance === 'absent').length;

    let calculatedTotal = 0;
    const sessionRows: SessionRow[] = [];

    const sortedSessions = Array.from(sessionMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    for (const [, appts] of sortedSessions) {
      const first = appts[0];
      const [y, m, d] = first.date.split('-');
      const displayDate = `${d}/${m}/${y}`;
      const studentCount = appts.length;

      let subtotal = 0;
      if (collaborator.pay_type === 'per_class') {
        subtotal = rate;
      } else {
        const pres = appts.filter((a) => a.attendance === 'present').length;
        const abs = appts.filter((a) => a.attendance === 'absent').length;
        subtotal = (rate * pres) + (noShow * abs);
      }

      calculatedTotal += subtotal;

      sessionRows.push({
        date: displayDate,
        time: first.time_slot,
        students: studentCount,
        subtotal,
      });
    }

    return {
      total: calculatedTotal,
      classCount: sessionMap.size,
      presentCount: present,
      absentCount: absent,
      rows: sessionRows,
      baseRate: rate,
      noShowRate: noShow,
      grossTotal: calculatedTotal,
      deductions: 0,
    };
  }, [collaborator, appointments]);

  const handlePrint = () => {
    document.body.classList.add('printing-receipt');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto receipt-print-area p-0 bg-muted/30">
        <div className="p-5">
          {/* INVOICE CARD */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
            {/* HEADER */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Recibo de Pagamento
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {MONTHS[month]} / {year}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Colaborador</p>
                <p className="text-sm font-semibold text-foreground">
                  {collaborator.name || 'Sem nome'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {PAY_TYPE_LABELS[collaborator.pay_type || 'per_class'] || collaborator.pay_type}
                </p>
              </div>
            </div>

            {/* SUMMARY ROW */}
            {collaborator.pay_type !== 'fixed_monthly' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Aulas Dadas
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">{classCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {presentCount} presença(s)
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Faltas
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">{absentCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {noShowRate > 0 ? `${formatCurrency(noShowRate)} cada` : 'sem cobrança'}
                  </p>
                </div>
              </div>
            )}

            {/* BREAKDOWN LIST */}
            <div className="space-y-2.5">
              {collaborator.pay_type === 'fixed_monthly' ? (
                <div className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">Salário Fixo Mensal</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {formatCurrency(grossTotal)}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm py-1">
                    <span className="text-muted-foreground">
                      Valor por {collaborator.pay_type === 'per_class' ? 'Aula' : 'Aluno'}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatCurrency(baseRate)}
                    </span>
                  </div>
                  {collaborator.pay_type === 'per_student' && noShowRate > 0 && (
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-muted-foreground">Valor por Falta</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatCurrency(noShowRate)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm py-1">
                    <span className="text-muted-foreground">Total Bruto</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatCurrency(grossTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm py-1">
                    <span className="text-muted-foreground">Descontos</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatCurrency(deductions)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* TOTAL ROW */}
            <div className="flex items-center justify-between pt-4 border-t-2 border-border">
              <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Total a Receber
              </span>
              <span className="text-2xl font-bold text-accent tabular-nums">
                {formatCurrency(total)}
              </span>
            </div>

            {/* DETAIL TABLE - sessions */}
            {rows.length > 0 && (
              <div className="pt-4 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                  Detalhamento das Sessões
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {rows.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground tabular-nums">{row.date}</span>
                        <span className="text-muted-foreground tabular-nums">{row.time}</span>
                        <span className="text-muted-foreground">
                          {row.students} aluno{row.students !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatCurrency(row.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2 no-print pt-4">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button variant="accent" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
