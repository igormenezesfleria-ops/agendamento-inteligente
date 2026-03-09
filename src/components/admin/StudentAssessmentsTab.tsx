import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ShieldCheck, Send, Loader2, FileCheck, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentAssessmentsTabProps {
  studentId: string;
  studentName: string | null;
  age: number | null;
  hasInjury: boolean;
  injuryDetails: string | null;
}

const AVAILABLE_TESTS = [
  { type: 'PAR-Q+', label: 'PAR-Q+', description: 'Liberação para atividade física' },
  { type: 'SARC-F', label: 'SARC-F', description: 'Rastreio de sarcopenia' },
  { type: 'HOOPER', label: 'Hooper (Pré-Treino)', description: 'Fadiga, estresse e dor muscular' },
  { type: 'FES-I', label: 'FES-I', description: 'Risco de quedas (medo de cair)' },
  { type: 'ANAMNESE_ORTO', label: 'Anamnese Ortopédica', description: 'Avaliação detalhada de lesão' },
];

export function StudentAssessmentsTab({ studentId, studentName, age, hasInjury, injuryDetails }: StudentAssessmentsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendingType, setSendingType] = useState<string | null>(null);

  const { data: sentQuestionnaires, isLoading } = useQuery({
    queryKey: ['sent-questionnaires', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sent_questionnaires')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (type: string) => {
      setSendingType(type);
      const { error } = await supabase
        .from('sent_questionnaires')
        .insert({ student_id: studentId, type, status: 'pending' });
      if (error) throw error;
    },
    onSuccess: (_, type) => {
      toast({ title: '✅ Questionário enviado!', description: `${type} enviado para o aplicativo do aluno.` });
      queryClient.invalidateQueries({ queryKey: ['sent-questionnaires', studentId] });
      setSendingType(null);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível enviar o questionário.', variant: 'destructive' });
      setSendingType(null);
    },
  });

  return (
    <div className="space-y-5">
      {/* Smart Recommendations */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">🧠 Recomendações do Sistema</h4>

        {age !== null && age >= 60 && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400 text-sm font-semibold">Faixa etária ≥ 60 anos</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              Recomendação: Enviar questionário <strong>SARC-F</strong> e <strong>Risco de Quedas (FES-I)</strong> devido à faixa etária.
            </AlertDescription>
          </Alert>
        )}

        {hasInjury && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">Relato de Dor / Lesão</AlertTitle>
            <AlertDescription className="text-sm">
              Recomendação: Enviar <strong>Anamnese Ortopédica</strong> detalhada devido ao relato de dor/lesão.
              {injuryDetails && <span className="block mt-1 text-xs opacity-80">"{injuryDetails}"</span>}
            </AlertDescription>
          </Alert>
        )}

        <Alert className="border-accent/30 bg-accent/5">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <AlertTitle className="text-accent text-sm font-semibold">Recomendação Padrão</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            Enviar <strong>PAR-Q+</strong> para liberação de atividade física.
          </AlertDescription>
        </Alert>
      </div>

      {/* Sent questionnaires history */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      ) : sentQuestionnaires && sentQuestionnaires.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">📋 Questionários Enviados</h4>
          <div className="space-y-2">
            {sentQuestionnaires.map((q) => (
              <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  {q.status === 'completed' ? (
                    <FileCheck className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{q.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(q.created_at), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Badge variant={q.status === 'completed' ? 'confirmed' : 'outline'}>
                  {q.status === 'completed' ? 'Respondido' : 'Pendente'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Available tests shelf */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">📦 Prateleira de Avaliações</h4>
        <div className="grid gap-2">
          {AVAILABLE_TESTS.map((test) => (
            <div key={test.type} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{test.label}</p>
                <p className="text-xs text-muted-foreground">{test.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 ml-3"
                disabled={sendMutation.isPending}
                onClick={() => sendMutation.mutate(test.type)}
              >
                {sendingType === test.type ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <><Send className="w-3.5 h-3.5 mr-1.5" /> Enviar</>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
