import { useEffect, useState } from 'react';
import {
  collection, doc, FieldPath, getDocFromServer, getDocsFromServer, increment,
  limit, limitToLast, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { auth, firestore } from './firebase';
import { useAuthContext } from './AuthContext';
import { customerChatError, MAX_MESSAGE_LENGTH, type CustomerConversation, type CustomerMessage } from './customer-chat';
import { canAccess, isBusinessWideRole } from './permissions';
import { readQwClaims, type QwClaims } from './roles';

export function canUseVendorConversation(claims: QwClaims | null, conversation: CustomerConversation): boolean {
  if (!claims || !('b' in claims) || !canAccess(claims.r, 'messages', 'write')) return false;
  return conversation.businessId === claims.b
    && (isBusinessWideRole(claims.r) || claims.br.includes(conversation.branchId))
    && !!conversation.userId && !!conversation.branchId
    && Array.isArray(conversation.participants)
    && conversation.participants.includes(conversation.userId)
    && conversation.participants.includes(conversation.branchId);
}

async function requireConversationAccess(uid: string, conversation: CustomerConversation) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error('Sign in again to continue.');
  const token = await user.getIdTokenResult();
  if (auth.currentUser?.uid !== uid || !canUseVendorConversation(readQwClaims(token.claims), conversation)) {
    throw new Error('This conversation is not available to your account.');
  }
  return user;
}

export async function sendVendorMessage(uid: string, conversation: CustomerConversation, body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) throw new Error('Enter a message of 1 to 2,000 characters.');
  const user = await requireConversationAccess(uid, conversation);
  const batch = writeBatch(firestore);
  batch.set(doc(collection(firestore, 'messages')), {
    conversationId: conversation.id, senderId: uid,
    senderName: user.displayName?.trim() || 'Workshop team', senderRole: 'vendor',
    body: trimmed, createdAt: serverTimestamp(),
  });
  batch.update(doc(firestore, 'conversations', conversation.id),
    'lastMessage', trimmed.slice(0, 140), 'lastMessageAt', serverTimestamp(),
    'lastMessageBy', uid, new FieldPath('unread', conversation.userId), increment(1),
    'updatedAt', serverTimestamp());
  await batch.commit();
}

async function markVendorConversationRead(uid: string, conversation: CustomerConversation) {
  await requireConversationAccess(uid, conversation);
  await updateDoc(doc(firestore, 'conversations', conversation.id), new FieldPath('unread', conversation.branchId), 0);
}

type ChatState = {
  scope: string; customerName: string; conversation: CustomerConversation | null;
  messages: CustomerMessage[]; loading: boolean; error: string | null; readError: string | null;
};
const empty = { customerName: '', conversation: null, messages: [], error: null, readError: null };

export function useVendorBookingChat(bookingId: string) {
  const { user, claims, claimsLoading } = useAuthContext();
  const scope = JSON.stringify([user?.uid, claims, claimsLoading, bookingId]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ChatState>({ ...empty, scope: '', loading: true });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    if (claimsLoading) return;
    if (!user || !claims || !('b' in claims) || !canAccess(claims.r, 'messages') || !bookingId || bookingId.includes('/')) {
      setState({ ...empty, scope, loading: false, error: 'This conversation is not available to your account.' });
      return;
    }
    setState({ ...empty, scope, loading: true });
    const deadline = setTimeout(() => {
      if (active) setState((current) => ({ ...current, loading: false, error: 'Chat took too long to load. Please retry.' }));
    }, 15_000);
    const fail = (reason: unknown) => {
      clearTimeout(deadline);
      if (active) setState({ ...empty, scope, loading: false, error: customerChatError(reason) });
    };
    void (async () => {
      const booking = await getDocFromServer(doc(firestore, 'bookings', bookingId));
      if (!active) return;
      const data = booking.data();
      if (!booking.exists() || data?.businessId !== claims.b || typeof data.branchId !== 'string'
        || typeof data.userId !== 'string' || !data.userId
        || (!isBusinessWideRole(claims.r) && !claims.br.includes(data.branchId))) {
        throw new Error('This booking is not available to your account.');
      }
      const conversations = await getDocsFromServer(query(collection(firestore, 'conversations'),
        where('businessId', '==', claims.b), where('branchId', '==', data.branchId),
        where('userId', '==', data.userId), limit(1)));
      if (!active) return;
      const item = conversations.docs[0];
      const conversation = item ? { ...item.data(), id: item.id } as CustomerConversation : null;
      if (conversation && !canUseVendorConversation(claims, conversation)) throw new Error('Chat access was denied.');
      const customerName = typeof data.customerName === 'string' ? data.customerName : 'Customer';
      if (!conversation) {
        clearTimeout(deadline);
        setState({ ...empty, scope, customerName, loading: false });
        return;
      }
      unsubscribe = onSnapshot(query(collection(firestore, 'messages'),
        where('conversationId', '==', conversation.id), orderBy('createdAt', 'asc'), limitToLast(200)),
      { includeMetadataChanges: true }, (snapshot) => {
        if (!active) return;
        clearTimeout(deadline);
        const messages = snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id,
          pending: entry.metadata.hasPendingWrites }) as CustomerMessage);
        setState({ ...empty, scope, customerName, conversation, messages, loading: false });
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
          void markVendorConversationRead(user.uid, conversation).catch(() => {
            if (active) setState((current) => ({ ...current, readError: 'Could not mark messages as read.' }));
          });
        }
      }, fail);
    })().catch(fail);
    return () => { active = false; clearTimeout(deadline); unsubscribe?.(); };
  }, [scope, attempt]);

  return { ...(state.scope === scope ? state : { ...empty, scope, loading: true }),
    retry: () => setAttempt((value) => value + 1) };
}
