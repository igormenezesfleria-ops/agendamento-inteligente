import { useState } from 'react';
import { ChevronRight, Dumbbell, HeartPulse, Activity, Zap, Ruler } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  PHYSICAL_ASSESSMENTS,
  groupAssessmentsByCategory,
  type AssessmentTest,
} from '@/lib/physicalAssessments';
import { TestExecutionModal } from './TestExecutionModal';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Força e Dinâmica': Dumbbell,
  Cardiorrespiratório: HeartPulse,
  Sarcopenia: Ruler,
  Potência: Zap,
};

export function PhysicalAssessmentShelf() {
  const grouped = groupAssessmentsByCategory(PHYSICAL_ASSESSMENTS);
  const [active, setActive] = useState<AssessmentTest | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">🧪 Prateleira de Avaliações Físicas</h4>
        <p className="text-xs text-muted-foreground">Protocolos científicos com cálculo automático.</p>
      </div>

      {Object.entries(grouped).map(([category, tests]) => {
        const Icon = CATEGORY_ICONS[category] ?? Activity;
        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-accent" />
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h5>
            </div>
            <ul className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
              {tests.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActive(t)}
                    className="w-full flex items-center justify-between px-3 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{t.reference}</p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                      {t.inputs.length} {t.inputs.length === 1 ? 'campo' : 'campos'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <TestExecutionModal
        test={active}
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
      />
    </div>
  );
}