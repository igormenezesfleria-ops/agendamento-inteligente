import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MONTHS } from '@/lib/constants';
import { SmartConsultant } from '@/components/financial/SmartConsultant';
import { PayrollSection } from '@/components/financial/PayrollSection';
import {
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  FileText,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Expense {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  is_fixed: boolean;
  category: string;
  created_at: string;
}

interface CollabPayroll {
  id: string;
  name: string | null;
  pay_type: string | null;
  base_rate: number | null;
  no_show_rate: number | null;
  fixed_monthly_rate: number | null;
}

const EXPENSE_CATEGORIES = [
  'Aluguel',
  'Energia',
  'Água',
  'Internet',
  'Equipamentos',
  'Manutenção',
  'Marketing',
  'Impostos',
  'Outros',
];

type DialogMode = 'expense' | 'revenue' | null;

export default function FinancialDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [grossRevenue, setGrossRevenue] = useState('');
  const [revenueDraft, setRevenueDraft] = useState('');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [newExpense, setNewExpense] = useState({ name: '', amount: '', due_date: '', category: 'Outros', is_fixed: false });

  const yearOptions = [selectedYear - 1, selectedYear, selectedYear + 1];

  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data as Expense[]).filter((e) => {
        if (e.is_fixed) return true;
        const [y, m] = e.due_date.split('-').map(Number);
        return y === selectedYear && m === selectedMonth + 1;
      });
    },
  });

  const { data: collaborators } = useQuery({
    queryKey: ['collabs-financial'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, pay_type, base_rate, no_show_rate, fixed_monthly_rate')
        .eq('role', 'collaborator')
        .eq('business_owner_id', user.id);
      if (error) throw error;
      return data as CollabPayroll[];
    },
  });

  const { data: completedAppointments } = useQuery({
    queryKey: ['payroll-appointments', selectedMonth, selectedYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, time_slot, instructor_id, attendance, status')
        .eq('status', 'completed')
        .order('date');
      if (error) throw error;
      return (data || []).filter((a) => {
        const [y, m] = a.date.split('-').map(Number);
        return y === selectedYear && m === selectedMonth + 1;
      });
    },
  });

  const payrollTotal = useMemo(() => {
    if (!collaborators || !completedAppointments) return 0;
    let total = 0;
    for (const collab of collaborators) {
      const rate = Number(collab.base_rate) || 0;
      const noShowRate = Number(collab.no_show_rate) || 0;
      const fixedMonthly = Number(collab.fixed_monthly_rate) || 0;

      if (collab.pay_type === 'fixed_monthly') {
        total += fixedMonthly;
        continue;
      }
      const collabAppts = completedAppointments.filter((a) => a.instructor_id === collab.id);
      if (collab.pay_type === 'per_class') {
        const sessions = new Set(collabAppts.map((a) => `${a.date}_${a.time_slot}`));
        total += rate * sessions.size;
      } else {
        const present = collabAppts.filter((a) => a.attendance === 'present').length;
        const absent = collabAppts.filter((a) => a.attendance === 'absent').length;
        total += (rate * present) + (noShowRate * absent);
      }
    }
    return total;
  }, [collaborators, completedAppointments]);

  const allExpensesTotal = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const revenue = parseFloat(grossRevenue) || 0;
  const totalOutflow = allExpensesTotal + payrollTotal;
  const netBalance = revenue - totalOutflow;

  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const dueDate = newExpense.due_date || `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-15`;
      const { error } = await supabase.from('expenses').insert({
        admin_id: user.id,
        name: newExpense.name,
        amount: parseFloat(newExpense.amount) || 0,
        due_date: dueDate,
        category: newExpense.category,
        is_fixed: newExpense.is_fixed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Despesa adicionada' });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setNewExpense({ name: '', amount: '', due_date: '', category: 'Outros', is_fixed: false });
      setDialogMode(null);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível adicionar a despesa.', variant: 'destructive' });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await supabase.from('expenses').update({ is_paid }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Despesa removida' });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSaveRevenue = () => {
    setGrossRevenue(revenueDraft);
    setDialogMode(null);
    toast({ title: 'Receita atualizada' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in print-area max-w-2xl mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Caixa do mês de {MONTHS[selectedMonth]}.</p>
          </div>
          <Button variant="ghost" size="sm" className="no-print" onClick={() => window.print()}>
            <FileText className="w-4 h-4 mr-1.5" />
            Relatório
          </Button>
        </div>

        {/* Period filter — minimal pill */}
        <div className="flex items-center gap-2 no-print">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="h-9 rounded-full bg-muted/50 border-0 text-sm font-medium px-4 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="h-9 rounded-full bg-muted/50 border-0 text-sm font-medium px-4 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* MASTER BALANCE — fintech hero card */}
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl p-6 sm:p-8 text-center shadow-lg',
            'bg-gradient-to-br from-foreground to-foreground/85 text-background',
          )}
        >
          <p className="text-xs font-medium uppercase tracking-widest text-background/60 mb-2">
            Saldo Líquido
          </p>
          <p className="text-4xl sm:text-5xl font-bold tracking-tight mb-1">
            {formatCurrency(netBalance)}
          </p>
          <p className="text-xs text-background/50 mb-6">{MONTHS[selectedMonth]} de {selectedYear}</p>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-background/15">
            <div className="text-left">
              <div className="flex items-center gap-1.5 text-background/70 text-[11px] uppercase tracking-wider">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                Receitas
              </div>
              <p className="text-base sm:text-lg font-semibold mt-1 text-emerald-400">
                {formatCurrency(revenue)}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-background/70 text-[11px] uppercase tracking-wider">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                Saídas
              </div>
              <p className="text-base sm:text-lg font-semibold mt-1 text-rose-400">
                {formatCurrency(totalOutflow)}
              </p>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS — pill buttons */}
        <div className="grid grid-cols-2 gap-3 no-print">
          <button
            onClick={() => {
              setRevenueDraft(grossRevenue);
              setDialogMode('revenue');
            }}
            className="flex items-center justify-center gap-2 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 font-semibold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Receita
          </button>
          <button
            onClick={() => setDialogMode('expense')}
            className="flex items-center justify-center gap-2 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 font-semibold text-sm hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Despesa
          </button>
        </div>

        {/* CONTAS A PAGAR — bank-style transaction list */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Contas a Pagar
            </h2>
            <span className="text-xs text-muted-foreground">{expenses?.length || 0} {(expenses?.length || 0) === 1 ? 'item' : 'itens'}</span>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {loadingExpenses ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
            ) : expenses && expenses.length > 0 ? (
              <ul className="divide-y divide-border">
                {expenses.map((expense) => {
                  const [y, m, d] = expense.due_date.split('-');
                  const displayDate = `${d}/${m}`;
                  return (
                    <li
                      key={expense.id}
                      className="group flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                    >
                      {/* Status check circle */}
                      <button
                        type="button"
                        onClick={() => togglePaidMutation.mutate({ id: expense.id, is_paid: !expense.is_paid })}
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-colors',
                          expense.is_paid
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted border-border text-muted-foreground hover:bg-accent/10',
                        )}
                        aria-label={expense.is_paid ? 'Marcar como não paga' : 'Marcar como paga'}
                      >
                        {expense.is_paid ? <Check className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          expense.is_paid ? 'text-muted-foreground line-through' : 'text-foreground',
                        )}>
                          {expense.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span>{expense.category}</span>
                          <span>·</span>
                          <span>Vence {displayDate}</span>
                          {expense.is_fixed && <><span>·</span><span>Fixa</span></>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <p className={cn(
                          'text-sm font-semibold tabular-nums',
                          expense.is_paid ? 'text-muted-foreground' : 'text-foreground',
                        )}>
                          {formatCurrency(Number(expense.amount))}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity no-print"
                          onClick={() => deleteMutation.mutate(expense.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-10 px-6">
                <p className="text-sm text-muted-foreground">Nenhuma despesa neste mês.</p>
                <button
                  onClick={() => setDialogMode('expense')}
                  className="text-sm font-medium text-accent mt-2 hover:underline no-print"
                >
                  Adicionar a primeira
                </button>
              </div>
            )}
          </div>
        </section>

        {/* FOLHA DE PAGAMENTO */}
        <PayrollSection
          collaborators={collaborators}
          appointments={completedAppointments}
          isLoading={!collaborators}
          formatCurrency={formatCurrency}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

        {/* SMART CONSULTANT */}
        <SmartConsultant netIncome={netBalance} formatCurrency={formatCurrency} />
      </div>

      {/* EXPENSE DIALOG */}
      <Dialog open={dialogMode === 'expense'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>Registre uma nova despesa avulsa ou recorrente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Aluguel do espaço"
                value={newExpense.name}
                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={newExpense.due_date}
                  onChange={(e) => setNewExpense({ ...newExpense, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="space-y-0.5">
                <Label>Conta Fixa</Label>
                <p className="text-xs text-muted-foreground">Repete todo mês.</p>
              </div>
              <Switch
                checked={newExpense.is_fixed}
                onCheckedChange={(checked) => setNewExpense({ ...newExpense, is_fixed: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancelar</Button>
            <Button
              variant="accent"
              onClick={() => addExpenseMutation.mutate()}
              disabled={addExpenseMutation.isPending || !newExpense.name || !newExpense.amount}
            >
              {addExpenseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REVENUE DIALOG */}
      <Dialog open={dialogMode === 'revenue'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receita Bruta do Mês</DialogTitle>
            <DialogDescription>
              Informe o faturamento total de {MONTHS[selectedMonth]} de {selectedYear}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={revenueDraft}
              onChange={(e) => setRevenueDraft(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancelar</Button>
            <Button variant="accent" onClick={handleSaveRevenue}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
