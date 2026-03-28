import { useState, useEffect } from 'react';
import { Search, MessageCircle, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Peer {
  id: string;
  name: string;
  photo_url: string | null;
}

interface ConversationThread {
  id: string;
  peer: Peer;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ChatInboxProps {
  onOpenThread: (conversationId: string, peer: Peer) => void;
}

const MOCK_THREADS: ConversationThread[] = [
  {
    id: 'mock-1',
    peer: { id: 'mock-peer-1', name: 'Gabriela Nassar', photo_url: null },
    lastMessage: 'Professor, a carga do agachamento está pesada...',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 1,
  },
  {
    id: 'mock-2',
    peer: { id: 'mock-peer-2', name: 'Luis Carlos (Admin)', photo_url: null },
    lastMessage: 'Beleza, te vejo no treino amanhã!',
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    unreadCount: 0,
  },
];

export function ChatInbox({ onOpenThread }: ChatInboxProps) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadThreads();
  }, [user]);

  const loadThreads = async () => {
    if (!user) return;
    setLoading(true);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (!conversations || conversations.length === 0) {
      // Show mock threads when no real conversations exist
      setThreads(MOCK_THREADS);
      setLoading(false);
      return;
    }

    const peerIds = conversations.map((c) =>
      c.participant_one === user.id ? c.participant_two : c.participant_one
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, photo_url')
      .in('id', peerIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const threadPromises = conversations.map(async (conv) => {
      const peerId = conv.participant_one === user.id ? conv.participant_two : conv.participant_one;
      const peerProfile = profileMap.get(peerId);

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      return {
        id: conv.id,
        peer: {
          id: peerId,
          name: peerProfile?.name || 'Usuário',
          photo_url: peerProfile?.photo_url || null,
        },
        lastMessage: lastMsg?.content || '',
        lastMessageAt: lastMsg?.created_at || conv.created_at,
        unreadCount: count || 0,
      } as ConversationThread;
    });

    const results = await Promise.all(threadPromises);
    setThreads(results.length > 0 ? results : MOCK_THREADS);
    setLoading(false);
  };

  const filtered = threads.filter((t) =>
    t.peer.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return format(date, 'HH:mm');
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 7) return format(date, 'EEE', { locale: ptBR });
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return '';
    }
  };

  return (
    <div className="pb-32">
      <h1 className="text-2xl font-bold text-foreground mb-4">Mensagens</h1>

      {/* Search bar */}
      <div className="bg-secondary border border-border rounded-xl px-4 py-3 flex items-center gap-2 text-muted-foreground mb-6">
        <Search className="w-4 h-4 shrink-0" />
        <input
          type="text"
          placeholder="Buscar conversa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent w-full text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card p-4 rounded-xl animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma conversa encontrada</p>
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onOpenThread(thread.id, thread.peer)}
              className="bg-card p-4 border-b border-border flex items-center gap-4 hover:bg-secondary cursor-pointer transition-colors w-full text-left"
            >
              {/* Avatar */}
              {thread.peer.photo_url ? (
                <img
                  src={thread.peer.photo_url}
                  alt={thread.peer.name}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-accent font-bold text-lg">
                    {thread.peer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm truncate">{thread.peer.name}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {formatTime(thread.lastMessageAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{thread.lastMessage}</p>
              </div>

              {/* Unread badge */}
              {thread.unreadCount > 0 && (
                <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-accent-foreground font-bold">{thread.unreadCount}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Floating Action Button - New Message */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-accent rounded-full shadow-accent flex justify-center items-center text-accent-foreground hover:scale-105 transition-transform z-[60]">
        <Pencil className="w-6 h-6" />
      </button>
    </div>
  );
}
