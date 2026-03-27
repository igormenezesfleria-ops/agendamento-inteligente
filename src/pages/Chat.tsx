import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChatInbox } from '@/components/chat/ChatInbox';
import { ChatRoom } from '@/components/chat/ChatRoom';

export default function Chat() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activePeer, setActivePeer] = useState<{ id: string; name: string; photo_url: string | null } | null>(null);

  if (activeConversationId && activePeer) {
    return (
      <ChatRoom
        conversationId={activeConversationId}
        peer={activePeer}
        onBack={() => {
          setActiveConversationId(null);
          setActivePeer(null);
        }}
      />
    );
  }

  return (
    <DashboardLayout>
      <ChatInbox
        onOpenThread={(conversationId, peer) => {
          setActiveConversationId(conversationId);
          setActivePeer(peer);
        }}
      />
    </DashboardLayout>
  );
}
