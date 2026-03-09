import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Printer, DollarSign, BookOpen, UserCheck, UserX } from 'lucide-react';
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
  className: string;
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
  const { total, classCount, presentCount, absentCount, rows } = useMemo(() => {
    const rate = Number(collaborator.base_rate) || 0;
    const noShowRate = Number(collaborator.no_show_rate) || 0;
    const fixedMonthly = Number(collaborator.fixed_monthly_rate) || 0;
    const collabAppts = appointments.filter((a) => a.instructor_id === collaborator.id);

    if (collaborator.pay_type === 'fixed_monthly') {
      return {
        total: fixedMonthly,
        classCount: 0,
        presentCount: 0,
        absentCount: 0,
        rows: [] as SessionRow[],
      };
    }

    // Group by session (date + time_slot)
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
        // per_student
        const pres = appts.filter((a) => a.attendance === 'present').length;
        const abs = appts.filter((a) => a.attendance === 'absent').length;
        subtotal = (rate * pres) + (noShowRate * abs);
      }

      calculatedTotal += subtotal;

      sessionRows.push({
        date: displayDate,
        time: first.time_slot,
        className: 'Aula',
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto receipt-print-area p-0">
        <div className="p-6 space-y-5">
          {/* HEADER */}
          <div className="text-center space-y-1">
            <h2 className="font-display text-xl font-bold text-foreground">Personal Studio</h2>
            <p className="text-sm text-muted-foreground">Extrato de Pagamento</p>
          </div>

          <Separator />

          {/* SUBHEADER */}
          <div className="text-sm text-muted-foreground text-center space-y-0.5">
            <p>
              <span className="font-medium text-foreground">Colaborador:</span>{' '}
              {collaborator.name || 'Sem nome'}
              {' | '}
              <span className="font-medium text-foreground">Período:</span>{' '}
              {MONTHS[month]} / {year}
            </p>
            <p>
              <span className="font-medium text-foreground">Tipo:</span>{' '}
              {PAY_TYPE_LABELS[collaborator.pay_type || 'per_class'] || collaborator.pay_type}
            </p>
          </div>

          <Separator />

          {/* 2x2 SUMMARY GRID */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto text-accent mb-1" />
              <p className="text-lg font-bold text-accent">{formatCurrency(total)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">TOTAL A PAGAR</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <BookOpen className="w-5 h-5 mx-auto text-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{classCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">AULAS</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <UserCheck className="w-5 h-5 mx-auto text-success mb-1" />
              <p className="text-lg font-bold text-foreground">{presentCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">PRESENÇAS</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <UserX className="w-5 h-5 mx-auto text-destructive mb-1" />
              <p className="text-lg font-bold text-foreground">{absentCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">FALTAS</p>
            </div>
          </div>

          {/* DETAILED TABLE */}
          {rows.length > 0 && (
            <>
              <Separator />
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">Data</TableHead>
                      <TableHead className="text-xs font-semibold">Horário</TableHead>
                      <TableHead className="text-xs font-semibold">Aula</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Alunos</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{row.date}</TableCell>
                        <TableCell className="text-sm">{row.time}</TableCell>
                        <TableCell className="text-sm">{row.className}</TableCell>
                        <TableCell className="text-sm text-center">{row.students}</TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          {formatCurrency(row.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell colSpan={4} className="text-sm text-right">
                        Total
                      </TableCell>
                      <TableCell className="text-sm text-right text-accent font-bold">
                        {formatCurrency(total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {collaborator.pay_type === 'fixed_monthly' && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Salário fixo mensal — sem detalhamento por aula.
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 no-print pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button variant="accent" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Recibo (PDF)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
