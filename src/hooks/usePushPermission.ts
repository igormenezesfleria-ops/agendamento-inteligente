import { useEffect } from 'react';
import { toast } from 'sonner';

export function usePushPermission() {
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    // Small delay so the dashboard loads first
    const timer = setTimeout(() => {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast.success('Notificações ativadas!', {
            description: 'Você receberá alertas de aulas e treinos.',
          });
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);
}
