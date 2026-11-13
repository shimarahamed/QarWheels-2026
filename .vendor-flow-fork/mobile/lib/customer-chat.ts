import { useEffect, useState } from 'react';
import {
  addDoc, collection, doc, FieldPath, getDocFromServer, getDocsFromServer,
  increment, limitToLast, onSnapshot, orderBy, query, serverTimestamp,
  updateDoc, where, writeBatch, type Timestamp,
} from 'firebase/firestore';
import { auth, firestore } from './firebase';

export const MAX_MESSAGE_LENGTH = 2000;

export type CustomerConversation = {
  id: string;
  participants: string[];
  userId: string;
  customerName: string;
  businessId: string;
  branchId: string;
  branchName: string;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  unread: Record<string, number>;
};

export type CustomerMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Timestamp | null;
  pending: boolean;
};

function currentCustomer(expectedUid: string) {
  const user = auth.currentUser;
  if (!user || user.uid !== expectedUid) throw new Error('Sign in again to continue this conversation.');
  return user;
}

function ownsConversation(conversation: CustomerConversation, uid: string) {
  return conversation.userId === uid && Array.isArray(conversation.participants)
    && conversation.participants.includes(uid) && conversation.participants.includes(conversation.branchId);
}

export function customerChatError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code?.replace('firestore/', '');
  switch (code) {
    case 'permission-denied': return 'Chat access was denied. Check your account or try again later.';
    case 'unauthenticated': return 'Your session expired. Sign in again to continue.';
    case 'unavailable': return 'Chat is offline. Check your connection and try again.';
    case 'failed-precondition': return 'Chat is not ready on the server. Please try again later.';
    case 'resource-exhausted': return 'Chat is temporarily busy. Please try again later.';
    default: return error instanceof Error && !code ? error.message : 'Chat could not be loaded or saved. Please try again.';
  }
}

function participantQuery(uid: string) {
  return query(collection(firestore, 'conversations'), where('participants', 'array-contains', uid));
}

// Coalesce repeated opens in this app. The existing backend does not enforce
// uniqueness across devices, so reuse its existing random document IDs.
const opening = new Map<string, Promise<CustomerConversation>>();

export function openCustomerConversation(uid: string, branchId: string): Promise<CustomerConversation> {
  const key = JSON.stringify([uid, branchId]);
  const existing = opening.get(key);
  if (existing) return existing;
  const operation = (async () => {
    currentCustomer(uid);
    if (!branchId || branchId.includes('/')) throw new Error('This garage link is invalid.');
    // An empty offline cache must not be mistaken for proof there is no chat.
    const snapshot = await getDocsFromServer(participantQuery(uid));
    currentCustomer(uid);
    const found = snapshot.docs
      .map((item) => ({ ...item.data(), id: item.id }) as CustomerConversation)
      .filter((item) => ownsConversation(item, uid) && item.branchId === branchId)
      .sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0))[0];
    if (found) return found;

    const branch = await getDocFromServer(doc(firestore, 'branches', branchId));
    const data = branch.data();
    if (!branch.exists() || !data?.isListed || typeof data.businessId !== 'string' || !data.businessId) {
      throw new Error('This garage is unavailable for a new conversation.');
    }
    const user = currentCustomer(uid);
    const conversation = {
      participants: [user.uid, branchId], userId: user.uid,
      customerName: user.displayName?.trim() || 'Customer',
      businessId: data.businessId, branchId,
      branchName: typeof data.name === 'string' ? data.name : 'Garage',
      lastMessage: '', lastMessageAt: serverTimestamp(), lastMessageBy: user.uid,
      unread: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(firestore, 'conversations'), conversation);
    currentCustomer(uid);
    return { ...conversation, id: ref.id, lastMessageAt: null };
  })();
  opening.set(key, operation);
  void operation.finally(() => { opening.delete(key); }).catch(() => {});
  return operation;
}

export async function sendCustomerMessage(uid: string, conversation: CustomerConversation, body: string) {
  const user = currentCustomer(uid);
  if (!ownsConversation(conversation, user.uid)) throw new Error('This conversation does not belong to your account.');
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Enter a message before sending.');
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw new Error('Messages must be 2,000 characters or fewer.');
  const batch = writeBatch(firestore);
  batch.set(doc(collection(firestore, 'messages')), {
    conversationId: conversation.id, senderId: user.uid,
    senderName: user.displayName?.trim() || 'Customer', senderRole: 'customer',
    body: trimmed, createdAt: serverTimestamp(),
  });
  batch.update(doc(firestore, 'conversations', conversation.id),
    'lastMessage', trimmed.slice(0, 140),
    'lastMessageAt', serverTimestamp(),
    'lastMessageBy', user.uid,
    new FieldPath('unread', conversation.branchId), increment(1),
    'updatedAt', serverTimestamp(),
  );
  await batch.commit();
}

export async function markCustomerConversationRead(uid: string, conversation: CustomerConversation) {
  currentCustomer(uid);
  if (!ownsConversation(conversation, uid)) throw new Error('This conversation does not belong to your account.');
  await updateDoc(doc(firestore, 'conversations', conversation.id), new FieldPath('unread', uid), 0);
}

export function useCustomerConversations(uid: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    uid: string | null; conversations: CustomerConversation[]; loading: boolean; error: string | null;
  }>({ uid: null, conversations: [], loading: false, error: null });

  useEffect(() => {
    if (!uid) return;
    let active = true;
    setState({ uid, conversations: [], loading: true, error: null });
    const unsubscribe = onSnapshot(participantQuery(uid), (snapshot) => {
      if (!active) return;
      const conversations = snapshot.docs
        .map((item) => ({ ...item.data(), id: item.id }) as CustomerConversation)
        .filter((item) => ownsConversation(item, uid) && Boolean(item.branchId))
        .sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0));
      setState({ uid, conversations, loading: false, error: null });
    }, (error) => {
      if (active) setState({ uid, conversations: [], loading: false, error: customerChatError(error) });
    });
    return () => { active = false; unsubscribe(); };
  }, [uid, attempt]);

  return {
    ...(state.uid === uid && uid ? state : { conversations: [], loading: !!uid, error: null }),
    retry: () => setAttempt((value) => value + 1),
  };
}

export function useCustomerChat(uid: string, branchId: string, active: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [conversation, setConversation] = useState<CustomerConversation | null>(null);
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setConversation(null);
    setMessages([]);
    setLoading(true);
    setError(null);
    setReadError(null);
    void openCustomerConversation(uid, branchId).then((opened) => {
      if (cancelled) return;
      setConversation(opened);
      unsubscribe = onSnapshot(query(collection(firestore, 'messages'),
        where('conversationId', '==', opened.id), orderBy('createdAt', 'asc'), limitToLast(200)),
      { includeMetadataChanges: true }, (snapshot) => {
        if (cancelled) return;
        setMessages(snapshot.docs.map((item) => ({
          ...item.data(), id: item.id, pending: item.metadata.hasPendingWrites,
        }) as CustomerMessage));
        setLoading(false);
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
          void markCustomerConversationRead(uid, opened).then(() => {
            if (!cancelled) setReadError(null);
          }).catch((reason) => {
            if (!cancelled) setReadError(`Could not mark messages as read. ${customerChatError(reason)}`);
          });
        }
      }, (reason) => {
        if (!cancelled) { setMessages([]); setError(customerChatError(reason)); setLoading(false); }
      });
    }).catch((reason) => {
      if (!cancelled) { setError(customerChatError(reason)); setLoading(false); }
    });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [uid, branchId, active, attempt]);

  return { conversation, messages, loading, error, readError, retry: () => setAttempt((value) => value + 1) };
}
