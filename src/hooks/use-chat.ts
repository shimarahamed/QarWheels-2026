'use client';

import { useCallback } from 'react';
import {
  collection,
  doc,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  where,
} from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase, safeAddDoc, safeUpdateDoc } from '@/firebase';
import type { Conversation, Message, WithId } from '@/lib/types';

/**
 * Conversations for one participant.
 *
 * The customer and vendor sides need different filters because the
 * Firestore rules' `list` check can only be proven against fields the
 * query itself filters on:
 *  - Customer side: `participants` holds [customerUid, branchId], and the
 *    rule's `isConversationParticipant` checks
 *    `participants.hasAny([request.auth.uid])` — an array-contains query on
 *    `participants` binds directly to that.
 *  - Vendor side: the rule instead checks `isMessenger(businessId, branchId)`
 *    for a vendor participant, which reads `branchId` as a plain field, not
 *    through `participants`. An array-contains query on `participants`
 *    doesn't let Firestore relate the filtered value to `convo.branchId`,
 *    so that query is rejected as unprovable — filtering on the `branchId`
 *    field directly is what the rule can actually verify.
 */
export function useConversations(
  participantId: string | null,
  as: 'customer' | 'vendor' = 'customer',
) {
  const { firestore } = useFirebase();
  const conversationsQuery = useMemoFirebase(
    () =>
      participantId
        ? query(
            collection(firestore, 'conversations'),
            as === 'vendor'
              ? where('branchId', '==', participantId)
              : where('participants', 'array-contains', participantId),
            orderBy('lastMessageAt', 'desc'),
            limit(50),
          )
        : null,
    [firestore, participantId, as],
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

      const batch = writeBatch(firestore);
      batch.set(doc(collection(firestore, 'messages')), {
        conversationId: conversation.id,
        senderId,
        senderName,
        senderRole,
        body: trimmed,
        createdAt: serverTimestamp(),
      });

      batch.update(doc(firestore, 'conversations', conversation.id), {
        lastMessage: trimmed.slice(0, 140),
        lastMessageAt: serverTimestamp(),
        lastMessageBy: senderId,
        [`unread.${recipientId}`]: increment(1),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
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
