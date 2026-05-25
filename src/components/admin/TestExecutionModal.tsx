import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
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

export function TestExecutionModal({ test, open, onOpenChange, onSave }: TestExecutionModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const numericValues = useMemo(() => {
    const out: Record<string, number> = {};
    for (const k of Object.keys(values)) {
      const n = parseFloat(values[k].replace(',', '.'));
      if (!Number.isNaN(n)) out[k] = n;
    }
    return out;
  }, [values]);

  if (!test) return null;

  const handleClose = (v: boolean) => {
    if (!v) {
      setValues({});
      setResult(null);
    }
    onOpenChange(v);
  };

  const handleCalc = () => {
    const r = calculateTestResult(test.id, numericValues);
    setResult(r);
    onSave?.(test.id, numericValues, r);
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

          <div className="space-y-3">
            {test.inputs.map((input) => (
              <div key={input.name} className="space-y-1.5">
                <Label htmlFor={input.name}>{input.label}</Label>
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
              </div>
            ))}
          </div>

          {result && (
            <div className={cn('rounded-lg border p-3 space-y-1', classStyles[result.classification])}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClassIcon className="h-4 w-4" />
                {result.label}: {result.message}
              </div>
              {result.details?.map((d, i) => (
                <p key={i} className="text-xs opacity-80">{d}</p>
              ))}
            </div>
          )}

          <Button onClick={handleCalc} className="w-full" size="lg">
            <Calculator className="h-4 w-4" />
            Calcular / Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}