import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Link2, Dumbbell } from 'lucide-react';

export function StudioLinkCard() {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      toast.error('Digite o código do studio.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('link_student_to_trainer', {
        p_studio_code: trimmed,
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string };
      if (!result.success) {
        toast.error(result.message || 'Erro ao vincular.');
        return;
      }

      toast.success('Vinculado com sucesso! Bem-vindo ao studio.');
      await refreshProfile();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao vincular. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-foreground mb-2">Vincule-se ao seu Personal</h2>
            <p className="text-muted-foreground text-sm">
              Peça o código do studio ao seu personal trainer e digite abaixo para acessar seus horários e agendar treinos.
            </p>
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="studio-code">Código do Studio</Label>
            <Input
              id="studio-code"
              placeholder="Ex: FIT-9X2A"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg tracking-widest"
              maxLength={10}
            />
          </div>
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={handleLink}
            disabled={loading || !code.trim()}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Vinculando...</>
            ) : (
              <><Link2 className="w-4 h-4 mr-2" /> Vincular</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
