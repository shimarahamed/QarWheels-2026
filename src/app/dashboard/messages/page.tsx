'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useUser } from '@/firebase';
import { useConversations } from '@/hooks/use-chat';
import { ConversationList, MessageThread } from '@/components/chat/chat-view';
import type { Conversation, WithId } from '@/lib/types';

export default function CustomerMessagesPage() {
  const { user } = useUser();
  const { data: conversations, isLoading } = useConversations(user?.uid ?? null);
  const [active, setActive] = useState<WithId<Conversation> | null>(null);

  // Keep the selected conversation in step with live updates (unread counts,
  // last message) rather than holding a stale snapshot from selection time.
  const activeConversation = active
    ? conversations?.find((c) => c.id === active.id) ?? active
    : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Messages"
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        title="Talk directly to your garage."
        description="Ask about progress, share details, and keep everything about a job in one thread."
      />

      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="grid min-h-[560px] md:grid-cols-[320px_1fr]">
          <div className="border-b md:border-b-0 md:border-r">
            <ConversationList
              conversations={conversations}
              isLoading={isLoading}
              activeId={activeConversation?.id ?? null}
              participantId={user?.uid ?? ''}
              onSelect={setActive}
              emptyHint="No conversations yet. Open a garage and start a chat to see it here."
            />
          </div>
          <MessageThread
            conversation={activeConversation}
            senderId={user?.uid ?? ''}
            senderName={user?.displayName || 'You'}
            senderRole="customer"
            participantId={user?.uid ?? ''}
          />
        </div>
      </Card>
    </div>
  );
}
