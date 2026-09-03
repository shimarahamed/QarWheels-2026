'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/firebase';
import { useVendor } from '@/components/vendor/vendor-provider';
import { useConversations } from '@/hooks/use-chat';
import { ConversationList, MessageThread } from '@/components/chat/chat-view';
import type { Conversation, WithId } from '@/lib/types';

export default function VendorMessagesPage() {
  const { user } = useUser();
  const { business, activeBranch } = useVendor();
  // Conversations are addressed to the BRANCH, not to an individual staff
  // member — anyone with access to the branch sees the same inbox.
  const participantId = activeBranch?.id ?? null;
  const { data: conversations, isLoading } = useConversations(participantId);
  const [active, setActive] = useState<WithId<Conversation> | null>(null);

  const activeConversation = active
    ? conversations?.find((c) => c.id === active.id) ?? active
    : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <Badge variant="outline" className="mb-4 h-8 gap-2 bg-primary/5 px-3 text-primary">
          <MessageSquare className="h-3.5 w-3.5" />
          Customer messages
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Keep customers in the loop.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {activeBranch
            ? `Conversations for ${activeBranch.name}. Switch branches in the sidebar to see another inbox.`
            : 'Add a branch to start receiving customer messages.'}
        </p>
      </header>

      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <div className="grid min-h-[560px] md:grid-cols-[320px_1fr]">
          <div className="border-b md:border-b-0 md:border-r">
            <ConversationList
              conversations={conversations}
              isLoading={isLoading}
              activeId={activeConversation?.id ?? null}
              participantId={participantId ?? ''}
              onSelect={setActive}
              emptyHint="No customer conversations for this branch yet."
            />
          </div>
          <MessageThread
            conversation={activeConversation}
            senderId={user?.uid ?? ''}
            senderName={business.displayName}
            senderRole="vendor"
            participantId={participantId ?? ''}
          />
        </div>
      </Card>
    </div>
  );
}
