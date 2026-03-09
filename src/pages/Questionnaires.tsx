import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ClipboardList, Eye, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Json } from '@/integrations/supabase/types';

export default function Questionnaires() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [answersModal, setAnswersModal] = useState<{ open: boolean; data: Json | null; type: string }>({
    open: false,
    data: null,
    type: '',
  });

  // Fetch students for admin filter
  const { data: students } = useQuery({
    queryKey: ['admin-students-list', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('business_owner_id', user!.id)
        .eq('role', 'student')
        .order('name');
      return data || [];
    },
    enabled: isAdmin && !!user?.id,
  });

  // Fetch completed questionnaires
  const { data: questionnaires, isLoading } = useQuery({
    queryKey: ['questionnaires-history', user?.id, isAdmin, selectedStudentId],
    queryFn: async () => {
      let query = supabase
        .from('sent_questionnaires')
        .select('id, student_id, type, status, result_score, answers_data, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('student_id', user!.id);
      } else if (selectedStudentId !== 'all') {
        query = query.eq('student_id', selectedStudentId);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Hooper chart data
  const hooperData = (questionnaires || [])
    .filter((q) => q.type === 'HOOPER')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((q) => {
      const score = q.result_score ? parseInt(q.result_score.split('/')[0]) : 0;
      return {
        date: format(parseISO(q.created_at), 'dd/MM', { locale: ptBR }),
        score,
      };
    });

  const getStudentName = (studentId: string) => {
    if (!isAdmin) return profile?.name || 'Você';
    return students?.find((s) => s.id === studentId)?.name || 'Aluno';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PAR-Q': return 'PAR-Q+';
      case 'HOOPER': return 'Índice de Hooper';
      case 'SARC-F': return 'SARC-F';
      case 'FES-I': return 'FES-I Curto';
      default: return type;
    }
  };

  const renderAnswersDetail = (data: Json | null, type: string) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return <p className="text-sm text-muted-foreground">Sem dados disponíveis.</p>;
    }

    const obj = data as Record<string, Json | undefined>;

    if (type === 'HOOPER' && obj.scales) {
      const scales = obj.scales as Record<string, number>;
      const labels: Record<string, string> = {
        sleep: 'Qualidade do Sono',
        stress: 'Nível de Estresse',
        fatigue: 'Fadiga Geral',
        pain: 'Dor Muscular',
      };
      return (
        <div className="space-y-3">
          {Object.entries(scales).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center border-b border-border pb-2">
              <span className="text-sm font-medium">{labels[key] || key}</span>
              <Badge variant={val >= 5 ? 'destructive' : 'secondary'}>{val}/7</Badge>
            </div>
          ))}
        </div>
      );
    }

    if ((type === 'PAR-Q' || type === 'SARC-F' || type === 'FES-I') && Array.isArray(obj.questions)) {
      const questions = obj.questions as Array<Record<string, Json | undefined>>;
      return (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="border-b border-border pb-3">
              <p className="text-sm font-medium mb-1">{i + 1}. {String(q.question || '')}</p>
              <Badge variant={
                (type === 'PAR-Q' && q.answer === 'sim') || ((type === 'SARC-F' || type === 'FES-I') && Number(q.score) > 0)
                  ? 'destructive'
                  : 'secondary'
              }>
                {type === 'PAR-Q'
                  ? (q.answer === 'sim' ? 'Sim ⚠️' : 'Não ✅')
                  : `${q.score} ponto(s)`}
              </Badge>
            </div>
          ))}
        </div>
      );
    }

    // Anamnese Ortopédica
    if ((type === 'ANAMNESE_ORTO' || type === 'ANAMNESE') && obj.location !== undefined) {
      const locationLabels: Record<string, string> = {
        'Ombro': '💪 Ombro',
        'Coluna': '🦴 Coluna',
        'Quadril': '🦵 Quadril',
        'Joelho': '🦿 Joelho',
        'Tornozelo/Pé': '🦶 Tornozelo/Pé',
        'Outro': '📍 Outro',
      };
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-sm font-medium">Local da dor/lesão</span>
            <Badge variant="secondary">{locationLabels[String(obj.location)] || String(obj.location)}</Badge>
          </div>
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-sm font-medium">Nível de dor</span>
            <Badge variant={Number(obj.pain_level) >= 5 ? 'destructive' : 'secondary'}>{obj.pain_level}/10</Badge>
          </div>
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-sm font-medium">Dor piora com movimento?</span>
            <Badge variant={obj.pain_worsens_with_movement === 'sim' ? 'destructive' : 'secondary'}>
              {obj.pain_worsens_with_movement === 'sim' ? 'Sim ⚠️' : 'Não ✅'}
            </Badge>
          </div>
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-sm font-medium">Cirurgia prévia?</span>
            <Badge variant={obj.previous_surgery === 'sim' ? 'destructive' : 'secondary'}>
              {obj.previous_surgery === 'sim' ? 'Sim ⚠️' : 'Não ✅'}
            </Badge>
          </div>
          <div className="flex justify-between items-center border-b border-border pb-2">
            <span className="text-sm font-medium">Liberação médica/laudo?</span>
            <Badge variant="secondary">{String(obj.medical_clearance)}</Badge>
          </div>
        </div>
      );
    }

    return <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-foreground">Questionários</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Histórico de avaliações dos seus alunos' : 'Seu histórico de avaliações'}
            </p>
          </div>
          <ClipboardList className="w-8 h-8 text-muted-foreground/30" />
        </div>

        {/* Admin student filter */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Filtrar aluno:</span>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Todos os alunos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os alunos</SelectItem>
                {students?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name || 'Sem nome'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Hooper Chart */}
        {hooperData.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Evolução — Índice de Hooper (Recuperação)
              </CardTitle>
              <p className="text-xs text-muted-foreground">Quanto menor o score, melhor a recuperação do aluno.</p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hooperData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[4, 28]} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                      formatter={(value: number) => [`${value}/28`, 'Score Hooper']}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico de Avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : !questionnaires || questionnaires.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma avaliação completada ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      {isAdmin && <TableHead>Aluno</TableHead>}
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questionnaires.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(q.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-sm font-medium">
                            {getStudentName(q.student_id)}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(q.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {q.result_score || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAnswersModal({ open: true, data: q.answers_data, type: q.type })}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver Respostas
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Answers Detail Modal */}
      <Dialog open={answersModal.open} onOpenChange={(open) => setAnswersModal((p) => ({ ...p, open }))}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Respostas — {getTypeLabel(answersModal.type)}</DialogTitle>
          </DialogHeader>
          {renderAnswersDetail(answersModal.data, answersModal.type)}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
