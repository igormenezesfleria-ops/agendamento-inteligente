import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="border-2 border-accent/20 print-section">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-accent" />
          Consultor Financeiro Inteligente
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribuição sugerida do seu saldo líquido baseada na regra 10/10/20/60.
        </p>
      </CardHeader>
      <CardContent>
        {netIncome <= 0 ? (
          <p className="text-center text-muted-foreground py-6">
            O saldo líquido precisa ser positivo para gerar sugestões.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {ALLOCATIONS.map((a) => {
              const value = safeIncome * (a.percent / 100);
              const Icon = a.icon;
              return (
                <div
                  key={a.label}
                  className={`rounded-xl border p-4 space-y-3 ${
                    a.highlight
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: a.color }} />
                      <span className="text-sm font-semibold text-foreground">{a.label}</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{a.percent}%</span>
                  </div>
                  <Progress
                    value={a.percent}
                    className="h-2"
                    style={{ '--progress-color': a.color } as React.CSSProperties}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{a.hint}</p>
                    <p className="text-sm font-bold text-foreground whitespace-nowrap ml-2">
                      {formatCurrency(value)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
