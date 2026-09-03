'use client';

import { useEffect, useRef, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMessages, useChatActions } from '@/hooks/use-chat';
import type { Conversation, FirestoreDate, WithId } from '@/lib/types';

function toDate(value: FirestoreDate | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function ConversationList({
  conversations,
  isLoading,
  activeId,
  participantId,
  onSelect,
  emptyHint,
}: {
  conversations: WithId<Conversation>[] | null;
  isLoading: boolean;
  activeId: string | null;
  participantId: string;
  onSelect: (conversation: WithId<Conversation>) => void;
  emptyHint: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <MessageSquare className="h-8 w-8 text-primary/40" />
        <p>{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((c) => {
        const unread = c.unread?.[participantId] ?? 0;
        const at = toDate(c.lastMessageAt);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/60 ${
              activeId === c.id ? 'bg-muted' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold">{c.branchName || c.customerName}</p>
                {at && <span className="shrink-0 text-[11px] text-muted-foreground">{format(at, 'MMM d')}</span>}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {c.lastMessage || 'No messages yet'}
              </p>
            </div>
            {unread > 0 && (
              <Badge className="shrink-0 bg-destructive px-1.5 text-[10px] hover:bg-destructive">{unread}</Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function MessageThread({
  conversation,
  senderId,
  senderName,
  senderRole,
  participantId,
}: {
  conversation: WithId<Conversation> | null;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'vendor';
  participantId: string;
}) {
  const { data: messages, isLoading } = useMessages(conversation?.id ?? null);
  const { sendMessage, markRead } = useChatActions();
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Clear this side's unread badge whenever a conversation is opened.
  useEffect(() => {
    if (conversation && (conversation.unread?.[participantId] ?? 0) > 0) {
      void markRead(conversation.id, participantId);
    }
  }, [conversation, participantId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <MessageSquare className="h-10 w-10 text-primary/30" />
        <p>Select a conversation to start reading.</p>
      </div>
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!conversation || !draft.trim() || isSending) return;
    setIsSending(true);
    const body = draft;
    setDraft('');
    try {
      await sendMessage({ conversation, senderId, senderName, senderRole, body });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b p-4">
        <p className="font-bold">{senderRole === 'customer' ? conversation.branchName : conversation.customerName}</p>
        {senderRole === 'vendor' && (
          <p className="text-xs text-muted-foreground">{conversation.branchName}</p>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-2/3 rounded-2xl" />)}
        {!isLoading && messages?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet — say hello.
          </p>
        )}
        {messages?.map((m) => {
          const mine = m.senderId === senderId;
          const at = toDate(m.createdAt);
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine ? 'bg-primary text-primary-foreground' : 'border bg-card'
                }`}
              >
                {!mine && <p className="mb-0.5 text-[11px] font-bold opacity-70">{m.senderName}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {at && (
                  <p className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(at, 'h:mm a')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          disabled={isSending}
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
