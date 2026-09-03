'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
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
      <PageHeader
        eyebrow="Customer messages"
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        title="Keep customers in the loop."
        description={
          activeBranch
            ? `Conversations for ${activeBranch.name}. Switch branches in the sidebar to see another inbox.`
            : 'Add a branch to start receiving customer messages.'
        }
      />

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
