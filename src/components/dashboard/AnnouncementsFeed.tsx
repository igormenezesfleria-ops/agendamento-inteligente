import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageSquare, Megaphone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AnnouncementsFeed() {
  const { profile } = useAuth();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['student-announcements', profile?.business_owner_id],
    queryFn: async () => {
      if (!profile?.business_owner_id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, created_at')
        .eq('is_broadcast', true)
        .eq('creator_id', profile.business_owner_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.business_owner_id,
  });

  if (isLoading) {
    return (
      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            Mural de Avisos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            Mural de Avisos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Nenhum aviso no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-orange-500" />
          Mural de Avisos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-sm text-slate-900">{a.title}</h4>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {format(parseISO(a.created_at), "d MMM", { locale: ptBR })}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{a.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
