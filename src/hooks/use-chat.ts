'use client';

import { useCallback } from 'react';
import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Firestore,
} from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase, safeAddDoc, safeUpdateDoc } from '@/firebase';
import type { Conversation, Message, WithId } from '@/lib/types';

/**
 * Conversations for one participant. `participantId` is the customer's uid
 * on the customer side, or a branchId on the vendor side — `participants`
 * holds both, so one array-contains query serves both inboxes.
 */
export function useConversations(participantId: string | null) {
  const { firestore } = useFirebase();
  const conversationsQuery = useMemoFirebase(
    () =>
      participantId
        ? query(
            collection(firestore, 'conversations'),
            where('participants', 'array-contains', participantId),
            orderBy('lastMessageAt', 'desc'),
            limit(50),
          )
        : null,
    [firestore, participantId],
  );
  return useCollection<WithId<Conversation>>(conversationsQuery);
}

export function useMessages(conversationId: string | null) {
  const { firestore } = useFirebase();
  const messagesQuery = useMemoFirebase(
    () =>
      conversationId
        ? query(
            collection(firestore, 'messages'),
            where('conversationId', '==', conversationId),
            orderBy('createdAt', 'asc'),
            limit(200),
          )
        : null,
    [firestore, conversationId],
  );
  return useCollection<WithId<Message>>(messagesQuery);
}

async function bumpConversation(
  firestore: Firestore,
  conversationId: string,
  body: string,
  senderId: string,
  recipientId: string,
  currentUnread: number,
) {
  await safeUpdateDoc(doc(firestore, 'conversations', conversationId), {
    lastMessage: body.slice(0, 140),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
    // Only the recipient's counter moves; the sender has obviously read it.
    [`unread.${recipientId}`]: currentUnread + 1,
    updatedAt: serverTimestamp(),
  });
}

export function useChatActions() {
  const { firestore } = useFirebase();

  const sendMessage = useCallback(
    async (params: {
      conversation: WithId<Conversation>;
      senderId: string;
      senderName: string;
      senderRole: 'customer' | 'vendor';
      body: string;
    }) => {
      const { conversation, senderId, senderName, senderRole, body } = params;
      const trimmed = body.trim();
      if (!trimmed) return;

      // The other participant is whichever of the two isn't the sender. For
      // a vendor the sender is a uid but the participant entry is the
      // branchId, so fall back to the branch.
      const recipientId =
        senderRole === 'customer'
          ? conversation.branchId
          : conversation.userId;

      await safeAddDoc(collection(firestore, 'messages'), {
        conversationId: conversation.id,
        senderId,
        senderName,
        senderRole,
        body: trimmed,
        createdAt: serverTimestamp(),
      });

      await bumpConversation(
        firestore,
        conversation.id,
        trimmed,
        senderId,
        recipientId,
        conversation.unread?.[recipientId] ?? 0,
      );
    },
    [firestore],
  );

  /** Clears the caller's own unread counter — safe to call on open. */
  const markRead = useCallback(
    async (conversationId: string, participantId: string) => {
      await safeUpdateDoc(doc(firestore, 'conversations', conversationId), {
        [`unread.${participantId}`]: 0,
      });
    },
    [firestore],
  );

  /**
   * Finds the existing conversation for this customer+branch or creates it.
   * Rules only permit the customer to create one, so this is customer-side.
   */
  const openConversation = useCallback(
    async (params: {
      existing: WithId<Conversation>[] | null;
      userId: string;
      customerName: string;
      businessId: string;
      branchId: string;
      branchName: string;
    }): Promise<string> => {
      const { existing, userId, customerName, businessId, branchId, branchName } = params;
      const found = existing?.find((c) => c.branchId === branchId);
      if (found) return found.id;

      const ref = await safeAddDoc(collection(firestore, 'conversations'), {
        participants: [userId, branchId],
        userId,
        customerName,
        businessId,
        branchId,
        branchName,
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        lastMessageBy: userId,
        unread: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },
    [firestore],
  );

  return { sendMessage, markRead, openConversation };
}
