import { Progress } from '@/components/ui/progress';
import { Lightbulb, PiggyBank, Wrench, TrendingUp, Wallet } from 'lucide-react';

interface SmartConsultantProps {
  netIncome: number;
  formatCurrency: (val: number) => string;
}

const ALLOCATIONS = [
  {
    label: 'Reserva / Férias',
    percent: 10,
    icon: PiggyBank,
    color: 'hsl(var(--success))',
    hint: 'Guarde para emergências e descanso merecido.',
  },
  {
    label: 'Manutenção do Studio',
    percent: 10,
    icon: Wrench,
    color: 'hsl(var(--warning))',
    hint: 'Reparos, limpeza e melhorias no espaço.',
  },
  {
    label: 'Investimentos',
    percent: 20,
    icon: TrendingUp,
    color: 'hsl(var(--accent))',
    hint: 'Sugestão para investir no seu futuro.',
  },
  {
    label: 'Livre / Pessoal (Pró-labore)',
    percent: 60,
    icon: Wallet,
    color: 'hsl(var(--primary))',
    hint: 'Seu rendimento pessoal como dono(a) do studio.',
    highlight: true,
  },
];

export function SmartConsultant({ netIncome, formatCurrency }: SmartConsultantProps) {
  const safeIncome = Math.max(netIncome, 0);

  return (
    <section className="rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-5 sm:p-6 print-section">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Insight Financeiro</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Distribuição sugerida do saldo líquido pela regra 10/10/20/60.
          </p>
        </div>
      </div>

      {netIncome <= 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          O saldo líquido precisa ser positivo para gerar sugestões.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ALLOCATIONS.map((a) => {
            const value = safeIncome * (a.percent / 100);
            const Icon = a.icon;
            return (
              <div
                key={a.label}
                className="rounded-xl bg-background/70 dark:bg-background/40 backdrop-blur p-3.5 space-y-2.5 border border-indigo-100/60 dark:border-indigo-900/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: a.color }} />
                    <span className="text-xs font-semibold text-foreground truncate">{a.label}</span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0">{a.percent}%</span>
                </div>
                <Progress
                  value={a.percent}
                  className="h-1.5"
                  style={{ '--progress-color': a.color } as React.CSSProperties}
                />
                <p className="text-sm font-bold text-foreground tabular-nums">
                  {formatCurrency(value)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
