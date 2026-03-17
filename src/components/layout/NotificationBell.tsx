import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, type, is_read, created_at')
      .or(`user_id.eq.${user.id},and(is_broadcast.eq.true)`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    const target = notifications.find(n => n.id === id);
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (target && !target.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    const ids = notifications.map(n => n.id);
    await supabase.from('notifications').delete().in('id', ids);
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment_confirmed': return '✅';
      case 'appointment_delegated': return '🔄';
      case 'appointment_cancelled': return '❌';
      case 'new_request': return '📩';
      case 'collaborator_declined': return '⚠️';
      case 'reminder': return '⏰';
      default: return '🔔';
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-sidebar-foreground/70 hover:text-sidebar-foreground">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Notificações</SheetTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={markAllAsRead}>
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-accent font-medium hover:text-accent" onClick={clearAll}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar todas
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'w-full text-left px-6 py-4 transition-colors hover:bg-muted/50 flex gap-3 items-start',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <button
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className="flex gap-3 flex-1 min-w-0 text-left"
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{getIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-medium', !n.is_read && 'text-foreground', n.is_read && 'text-muted-foreground')}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="flex-shrink-0 mt-1 p-1 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Excluir notificação"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}