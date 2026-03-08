import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

export function CollaboratorReceiptDialog({
  open,
  onOpenChange,
  collaborator,
  appointments,
  month,
  year,
  formatCurrency,
}: Props) {
  const breakdown = useMemo(() => {
    const rate = Number(collaborator.base_rate) || 0;
    const noShowRate = Number(collaborator.no_show_rate) || 0;
    const fixedMonthly = Number(collaborator.fixed_monthly_rate) || 0;
    const collabAppts = appointments.filter((a) => a.instructor_id === collaborator.id);

    if (collaborator.pay_type === 'fixed_monthly') {
      return {
        type: 'fixed_monthly',
        total: fixedMonthly,
        lines: [{ label: 'Salário fixo mensal', value: fixedMonthly }],
      };
    }

    if (collaborator.pay_type === 'per_class') {
      const sessions = new Set(collabAppts.map((a) => `${a.date}_${a.time_slot}`));
      const total = rate * sessions.size;
      return {
        type: 'per_class',
        total,
        lines: [
          { label: `Aulas ministradas`, value: sessions.size, isCount: true },
          { label: `Valor por aula`, value: rate, isRate: true },
          { label: `Subtotal`, value: total },
        ],
      };
    }

    // per_student
    const present = collabAppts.filter((a) => a.attendance === 'present').length;
    const absent = collabAppts.filter((a) => a.attendance === 'absent').length;
    const presentTotal = rate * present;
    const absentTotal = noShowRate * absent;
    const total = presentTotal + absentTotal;

    return {
      type: 'per_student',
      total,
      lines: [
        { label: `Alunos presentes`, value: present, isCount: true },
        { label: `Taxa por presença`, value: rate, isRate: true },
        { label: `Subtotal presenças`, value: presentTotal },
        ...(absent > 0
          ? [
              { label: `Alunos ausentes`, value: absent, isCount: true },
              { label: `Taxa por falta`, value: noShowRate, isRate: true },
              { label: `Subtotal faltas`, value: absentTotal },
            ]
          : []),
        { label: `Total`, value: total },
      ],
    };
  }, [collaborator, appointments]);

  const handlePrint = () => {
    document.body.classList.add('printing-receipt');
    window.print();
    document.body.classList.remove('printing-receipt');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md receipt-print-area">
        <DialogHeader>
          <DialogTitle className="text-lg">Recibo de Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground text-base">
                {collaborator.name || 'Sem nome'}
              </p>
              <Badge variant="secondary" className="text-[10px] mt-1">
                {PAY_TYPE_LABELS[collaborator.pay_type || 'per_class'] || collaborator.pay_type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {MONTHS[month]} / {year}
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            {breakdown.lines.map((line, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{line.label}</span>
                <span className="font-medium text-foreground">
                  {(line as any).isCount
                    ? line.value
                    : (line as any).isRate
                      ? formatCurrency(line.value)
                      : formatCurrency(line.value)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">Total a Pagar</span>
            <span className="text-lg font-bold text-accent">
              {formatCurrency(breakdown.total)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="no-print">
            Fechar
          </Button>
          <Button variant="accent" onClick={handlePrint} className="no-print">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
