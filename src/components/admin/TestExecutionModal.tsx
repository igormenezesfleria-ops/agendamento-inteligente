import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, CheckCircle2, AlertTriangle, Info, Camera, TrendingUp, TrendingDown, Minus, Save, History } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  type AssessmentTest,
  type AssessmentResult,
  calculateTestResult,
} from '@/lib/physicalAssessments';

interface TestExecutionModalProps {
  test: AssessmentTest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave?: (testId: string, values: Record<string, number>, result: AssessmentResult) => void;
  /** Scope key for the history (e.g. student id). Falls back to "global". */
  scopeKey?: string;
}

type HistoryEntry = {
  date: string; // ISO
  values: Record<string, number>;
  result: AssessmentResult;
  scope?: string; // e.g. exerciseName for load_cell
  extra?: Record<string, string>; // non-numeric inputs (select/text)
};

function historyStorageKey(testId: string, scopeKey: string) {
  return `assessment_history::${scopeKey}::${testId}`;
}

function loadHistory(testId: string, scopeKey: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyStorageKey(testId, scopeKey));
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(testId: string, scopeKey: string, list: HistoryEntry[]) {
  try {
    localStorage.setItem(historyStorageKey(testId, scopeKey), JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

function renderInstructions(md: string) {
  return md.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    const html = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>');
    return (
      <p
        key={i}
        className="text-sm text-muted-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

export function TestExecutionModal({ test, open, onOpenChange, onSave, scopeKey = 'global' }: TestExecutionModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (test && open) setHistory(loadHistory(test.id, scopeKey));
  }, [test, open, scopeKey]);

  const numericValues = useMemo(() => {
    const out: Record<string, number> = {};
    for (const k of Object.keys(values)) {
      // Skip non-number-like values
      if (values[k] === '' || values[k] == null) continue;
      const n = parseFloat(values[k].replace(',', '.'));
      if (!Number.isNaN(n)) out[k] = n;
    }
    return out;
  }, [values]);

  const scopeField = test?.historyScopeField;
  const rawScope = scopeField ? (values[scopeField] ?? '') : undefined;
  const customScope = scopeField ? (values[`${scopeField}__custom`] ?? '').trim() : '';
  const currentScope = scopeField
    ? (rawScope === 'Outro' ? customScope : rawScope)
    : undefined;

  const extras = useMemo(() => {
    const out: Record<string, string> = {};
    if (!test) return out;
    for (const input of test.inputs) {
      if (input.type !== 'number' && values[input.name]) {
        out[input.name] = input.name === scopeField && values[input.name] === 'Outro' && customScope
          ? customScope
          : values[input.name];
      }
    }
    return out;
  }, [test, values, scopeField, customScope]);

  const scopedHistory = useMemoScoped(history, scopeField, currentScope);

  const previousEntry = scopedHistory[0]; // most recent past

  const delta = useMemo(() => {
    if (!result || result.value == null || !previousEntry || previousEntry.result.value == null) return null;
    const prev = previousEntry.result.value;
    const curr = result.value;
    const diff = curr - prev;
    const pct = prev !== 0 ? (diff / prev) * 100 : 0;
    return { diff, pct, prev, prevDate: previousEntry.date };
  }, [result, previousEntry]);

  if (!test) return null;

  const handleClose = (v: boolean) => {
    if (!v) {
      setValues({});
      setResult(null);
    }
    onOpenChange(v);
  };

  const handleCalc = () => {
    if (scopeField && !currentScope) {
      toast.error(`Selecione o campo "${test.inputs.find(i => i.name === scopeField)?.label}" antes de calcular.`);
      return;
    }
    const r = calculateTestResult(test.id, numericValues, extras);
    setResult(r);
    onSave?.(test.id, numericValues, r);
  };

  const handleSaveEntry = () => {
    if (!result) return;
    const entry: HistoryEntry = {
      date: new Date().toISOString(),
      values: numericValues,
      result,
      scope: currentScope || undefined,
      extra: extras,
    };
    const next = [entry, ...history];
    setHistory(next);
    saveHistory(test.id, scopeKey, next);
    toast.success('Avaliação salva no histórico.');
  };

  const handleCameraAssist = () => {
    toast('📷 Módulo de visão computacional em breve');
  };

  const classStyles: Record<AssessmentResult['classification'], string> = {
    good: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
    attention: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
    risk: 'bg-destructive/10 border-destructive/30 text-destructive',
    info: 'bg-muted border-border text-foreground',
  };

  const ClassIcon =
    result?.classification === 'good'
      ? CheckCircle2
      : result?.classification === 'risk' || result?.classification === 'attention'
        ? AlertTriangle
        : Info;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <Badge variant="outline" className="w-fit mb-1">{test.category}</Badge>
          <DialogTitle>{test.title}</DialogTitle>
          <DialogDescription className="text-xs">Referência: {test.reference}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            {renderInstructions(test.instructions)}
          </div>

          {test.cameraAssist && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-accent/40 bg-accent/5 hover:bg-accent/10"
              onClick={handleCameraAssist}
            >
              <Camera className="h-4 w-4" />
              📷 Medir com Câmera do iPhone
            </Button>
          )}

          <div className="space-y-3">
            {test.inputs.map((input) => (
              <div key={input.name} className="space-y-1.5">
                <Label htmlFor={input.name}>{input.label}</Label>
                {input.type === 'select' ? (
                  <>
                    <Select
                      value={values[input.name] ?? ''}
                      onValueChange={(v) => setValues((s) => ({ ...s, [input.name]: v }))}
                    >
                      <SelectTrigger id={input.name}>
                        <SelectValue placeholder={input.placeholder ?? 'Selecione...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {input.options?.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {values[input.name] === 'Outro' && (
                      <Input
                        type="text"
                        placeholder="Digite o nome do exercício (ex: Adução de Quadril 45º)"
                        value={values[`${input.name}__custom`] ?? ''}
                        onChange={(e) =>
                          setValues((s) => ({ ...s, [`${input.name}__custom`]: e.target.value }))
                        }
                        className="mt-2"
                      />
                    )}
                  </>
                ) : (
                  <div className="relative">
                  <Input
                    id={input.name}
                    type={input.type === 'number' ? 'number' : 'text'}
                    inputMode={input.type === 'number' ? 'decimal' : undefined}
                    step={input.step}
                    placeholder={input.placeholder ?? '0'}
                    value={values[input.name] ?? ''}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [input.name]: e.target.value }))
                    }
                  />
                  {input.unit && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {input.unit}
                    </span>
                  )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {result && (
            <div className={cn('rounded-lg border p-3 space-y-2', classStyles[result.classification])}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClassIcon className="h-4 w-4" />
                {result.label}: {result.message}
              </div>
              {result.details?.map((d, i) => (
                <p key={i} className="text-xs opacity-80">{d}</p>
              ))}
              {delta && <DeltaBadge delta={delta} unit={inferUnit(test)} />}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCalc} className="flex-1" size="lg" variant="secondary">
              <Calculator className="h-4 w-4" />
              Calcular
            </Button>
            <Button
              onClick={handleSaveEntry}
              className="flex-1"
              size="lg"
              disabled={!result}
            >
              <Save className="h-4 w-4" />
              Salvar Avaliação
            </Button>
          </div>

          <HistorySection
            history={scopedHistory}
            scopeField={scopeField}
            currentScope={currentScope}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function useMemoScoped(history: HistoryEntry[], scopeField?: string, currentScope?: string) {
  return useMemo(() => {
    const filtered = scopeField && currentScope
      ? history.filter((h) => (h.scope ?? '') === currentScope)
      : scopeField
        ? [] // require a scope selection for scoped tests
        : history;
    return [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [history, scopeField, currentScope]);
}

function DeltaBadge({
  delta,
  unit,
}: {
  delta: { diff: number; pct: number; prev: number; prevDate: string };
  unit: string;
}) {
  const improved = delta.diff > 0;
  const same = delta.diff === 0;
  const Icon = same ? Minus : improved ? TrendingUp : TrendingDown;
  const color = same
    ? 'text-muted-foreground bg-muted'
    : improved
      ? 'text-green-700 dark:text-green-400 bg-green-500/10 border border-green-500/30'
      : 'text-destructive bg-destructive/10 border border-destructive/30';
  const sign = delta.diff > 0 ? '+' : '';
  const arrow = same ? '→' : improved ? '↑' : '↓';
  return (
    <div className={cn('mt-1 rounded-md px-2 py-1.5 text-xs flex items-start gap-2', color)}>
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div className="leading-tight">
        <div className="font-semibold">
          Evolução: {sign}{delta.diff.toFixed(1)} {unit} ({arrow} {Math.abs(delta.pct).toFixed(1)}%)
        </div>
        <div className="opacity-80">
          comparado a {format(parseISO(delta.prevDate), "d MMM yyyy", { locale: ptBR })} ({delta.prev.toFixed(1)} {unit})
        </div>
      </div>
    </div>
  );
}

function HistorySection({
  history,
  scopeField,
  currentScope,
}: {
  history: HistoryEntry[];
  scopeField?: string;
  currentScope?: string;
}) {
  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <History className="h-4 w-4" />
        Histórico de Avaliações
        {scopeField && currentScope && (
          <Badge variant="outline" className="ml-1 text-[10px]">{currentScope}</Badge>
        )}
      </div>
      {scopeField && !currentScope ? (
        <p className="text-xs text-muted-foreground">Selecione o exercício para ver o histórico correspondente.</p>
      ) : history.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma avaliação anterior registrada.</p>
      ) : (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
          {history.map((h, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
            >
              <span className="text-muted-foreground">
                {format(parseISO(h.date), "d MMM yyyy", { locale: ptBR })}
              </span>
              <span className="font-semibold text-foreground">{h.result.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function inferUnit(test: AssessmentTest): string {
  const firstUnit = test.inputs.find((i) => i.unit)?.unit;
  return firstUnit ?? '';
}