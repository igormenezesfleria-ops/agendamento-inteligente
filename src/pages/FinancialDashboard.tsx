import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MONTHS } from '@/lib/constants';
import { SmartConsultant } from '@/components/financial/SmartConsultant';
import { PayrollSection } from '@/components/financial/PayrollSection';
import {
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Trash2,
  Receipt,
  FileText,
} from 'lucide-react';

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

export default function FinancialDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [grossRevenue, setGrossRevenue] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ name: '', amount: '', due_date: '', category: 'Outros', is_fixed: false });

  const yearOptions = [selectedYear - 1, selectedYear, selectedYear + 1];

  // Fetch expenses for period (variable for selected month + all fixed)
  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', selectedMonth, selectedYear],
    queryFn: async () => {
      const mm = String(selectedMonth + 1).padStart(2, '0');
      const startDate = `${selectedYear}-${mm}-01`;
      const endMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
      const endYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
      const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

      // Fetch variable expenses for the month AND all fixed expenses
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .or(`and(due_date.gte.${startDate},due_date.lt.${endDate}),is_fixed.eq.true`)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Expense[];
    },
  });

  // Fetch collaborators for payroll calc
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

  // Fetch completed appointments for payroll calc
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

      // Filter by month/year
      return (data || []).filter((a) => {
        const [y, m] = a.date.split('-').map(Number);
        return y === selectedYear && m === selectedMonth + 1;
      });
    },
  });

  // Calculate payroll totals per collaborator
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
        // Count unique sessions
        const sessions = new Set(collabAppts.map((a) => `${a.date}_${a.time_slot}`));
        total += rate * sessions.size;
      } else {
        // per_student
        const present = collabAppts.filter((a) => a.attendance === 'present').length;
        const absent = collabAppts.filter((a) => a.attendance === 'absent').length;
        total += (rate * present) + (noShowRate * absent);
      }
    }
    return total;
  }, [collaborators, completedAppointments]);

  // Expenses totals
  const unpaidExpensesTotal = useMemo(() => {
    if (!expenses) return 0;
    return expenses.filter((e) => !e.is_paid).reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const allExpensesTotal = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const revenue = parseFloat(grossRevenue) || 0;
  const netBalance = revenue - allExpensesTotal - payrollTotal;

  // Add expense
  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      // Use a date strictly in the selected month to avoid timezone shifts
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
      toast({ title: 'Conta adicionada!' });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setNewExpense({ name: '', amount: '', due_date: '', category: 'Outros', is_fixed: false });
      setAddDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível adicionar a conta.', variant: 'destructive' });
    },
  });

  // Toggle paid
  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ is_paid })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  // Delete expense
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Conta removida.' });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in print-area">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-3xl text-foreground">Gestão Financeira</h1>
            <p className="text-muted-foreground">Visão geral de receitas, despesas e folha de pagamento.</p>
          </div>
          <Button
            variant="outline"
            className="no-print"
            onClick={() => window.print()}
          >
            <FileText className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
        </div>

        {/* Period filter */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-muted-foreground text-sm">Mês</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-muted-foreground text-sm">Ano</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-muted-foreground text-sm">Receita Bruta (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={grossRevenue}
                onChange={(e) => setGrossRevenue(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-accent/30 bg-accent/5">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-accent mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(revenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">Receitas Brutas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-6 h-6 mx-auto text-destructive mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(unpaidExpensesTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">Contas a Pagar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Receipt className="w-6 h-6 mx-auto text-orange-500 mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(payrollTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">Folha de Pagamento</p>
            </CardContent>
          </Card>
          <Card className={netBalance >= 0 ? 'border-2 border-accent/30 bg-accent/5' : 'border-2 border-destructive/30 bg-destructive/5'}>
            <CardContent className="p-4 text-center">
              <Wallet className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(netBalance)}</p>
              <p className="text-xs text-muted-foreground mt-1">Saldo Líquido</p>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              Contas a Pagar — {MONTHS[selectedMonth]}
            </CardTitle>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="accent" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conta</DialogTitle>
                  <DialogDescription>Registre uma nova despesa recorrente ou avulsa.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      placeholder="Ex: Aluguel do espaço"
                      value={newExpense.name}
                      onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <Label>Conta Fixa (Repete todo mês)</Label>
                      <p className="text-xs text-muted-foreground">Aparecerá automaticamente em todos os meses.</p>
                    </div>
                    <Switch
                      checked={newExpense.is_fixed}
                      onCheckedChange={(checked) => setNewExpense({ ...newExpense, is_fixed: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
                  <Button
                    variant="accent"
                    onClick={() => addExpenseMutation.mutate()}
                    disabled={addExpenseMutation.isPending || !newExpense.name || !newExpense.amount || !newExpense.due_date}
                  >
                    {addExpenseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingExpenses ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : expenses && expenses.length > 0 ? (
              <div className="space-y-3">
                {expenses.map((expense) => {
                  const [y, m, d] = expense.due_date.split('-');
                  const displayDate = `${d}/${m}/${y}`;
                  return (
                    <div
                      key={expense.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                        expense.is_paid
                          ? 'bg-accent/5 border-accent/20'
                          : 'bg-background border-border'
                      }`}
                    >
                      <Switch
                        checked={expense.is_paid}
                        onCheckedChange={(checked) =>
                          togglePaidMutation.mutate({ id: expense.id, is_paid: checked })
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${expense.is_paid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {expense.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">{expense.category}</Badge>
                          <span className="text-xs text-muted-foreground">Vence: {displayDate}</span>
                        </div>
                      </div>
                      <p className={`font-bold text-sm sm:text-base whitespace-nowrap ${expense.is_paid ? 'text-accent' : 'text-foreground'}`}>
                        {formatCurrency(Number(expense.amount))}
                      </p>
                      {expense.is_paid && (
                        <Badge variant="default" className="text-[10px] bg-accent text-accent-foreground shrink-0">Pago</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteMutation.mutate(expense.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma despesa registrada para este mês.</p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Payroll Breakdown */}
        <PayrollSection
          collaborators={collaborators}
          appointments={completedAppointments}
          isLoading={!collaborators}
          formatCurrency={formatCurrency}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
        {/* Smart Consultant */}
        <SmartConsultant netIncome={netBalance} formatCurrency={formatCurrency} />
      </div>
    </DashboardLayout>
  );
}
