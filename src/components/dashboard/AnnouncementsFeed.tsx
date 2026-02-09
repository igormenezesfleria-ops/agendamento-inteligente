import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare, Megaphone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AnnouncementsFeed() {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['student-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, created_at')
        .eq('is_broadcast', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-accent" />
            Mural de Avisos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-accent" />
            Mural de Avisos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum aviso no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-accent" />
          Mural de Avisos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-sm text-foreground">{a.title}</h4>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(parseISO(a.created_at), "d MMM", { locale: ptBR })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
