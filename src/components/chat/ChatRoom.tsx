import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Paperclip, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatRoomProps {
  conversationId: string;
  peer: { id: string; name: string; photo_url: string | null };
  onBack: () => void;
}

export function ChatRoom({ conversationId, peer, onBack }: ChatRoomProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
    markAsRead();

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id) {
            markAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
  };

  const markAsRead = async () => {
    if (!user) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Room Header */}
      <header className="bg-card/90 backdrop-blur-md border-b border-border p-4 flex items-center gap-3 z-40 shrink-0">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {peer.photo_url ? (
          <img src={peer.photo_url} alt={peer.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <span className="text-accent font-bold">{peer.name.charAt(0).toUpperCase()}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate">{peer.name}</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-muted-foreground">Online</span>
          </div>
        </div>
      </header>

      {/* Chat Canvas */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-28 flex flex-col gap-3 bg-secondary/30">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda. Diga olá! 👋</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] p-3 text-sm shadow-sm ${
                  isMine
                    ? 'bg-accent text-accent-foreground rounded-2xl rounded-tr-sm shadow-md'
                    : 'bg-card border border-border text-foreground rounded-2xl rounded-tl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <span
                  className={`text-[10px] mt-1 block text-right ${
                    isMine ? 'opacity-70' : 'text-muted-foreground'
                  }`}
                >
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-50 flex items-end gap-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button className="text-muted-foreground p-2 shrink-0 hover:text-foreground transition-colors">
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem..."
          rows={1}
          className="bg-secondary rounded-3xl px-4 py-3 w-full text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 placeholder:text-muted-foreground resize-none max-h-32"
          style={{ minHeight: '44px' }}
        />

        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-accent-foreground shadow-md shrink-0 disabled:opacity-50 transition-opacity"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>
    </div>
  );
}
