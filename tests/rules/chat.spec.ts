import { afterAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { asCustomer, asUserWithClaims, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

const BIZ_A = 'biz_aab_auto';
const BRANCH_A1 = 'brn_aab_industrial';
const BRANCH_A2 = 'brn_aab_west_bay';
const CUSTOMER = 'uid_customer_1';

describe('Phase 3 chat: conversations and messages', () => {
  beforeEach(async () => {
    const env = await getTestEnv();
    await env.clearFirestore();
    await seedWithoutRules(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'conversations', 'conv_1'), {
        participants: [CUSTOMER, BRANCH_A1],
        userId: CUSTOMER, customerName: 'Walid',
        businessId: BIZ_A, branchId: BRANCH_A1, branchName: 'AAB — Industrial',
        lastMessage: 'Hello', lastMessageAt: new Date(), lastMessageBy: CUSTOMER,
        unread: {}, createdAt: new Date(), updatedAt: new Date(),
      });
      await setDoc(doc(db, 'messages', 'msg_1'), {
        conversationId: 'conv_1', senderId: CUSTOMER, senderName: 'Walid',
        senderRole: 'customer', body: 'Hello', createdAt: new Date(),
      });
    });
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  it('the customer in the conversation CAN read it and its messages', async () => {
    const ctx = await asCustomer(CUSTOMER);
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'conversations', 'conv_1')));
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'messages', 'msg_1')));
  });

  it('branch staff at the conversation’s branch CAN read it', async () => {
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'conversations', 'conv_1')));
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'messages', 'msg_1')));
  });

  it('staff at a DIFFERENT branch of the same business cannot read the conversation', async () => {
    const ctx = await asUserWithClaims('uid_staff_a2', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A2] });
    await assertFails(getDoc(doc(ctx.firestore(), 'conversations', 'conv_1')));
    await assertFails(getDoc(doc(ctx.firestore(), 'messages', 'msg_1')));
  });

  it('an unrelated customer cannot read someone else’s conversation or messages', async () => {
    const ctx = await asCustomer('uid_nosy_customer');
    await assertFails(getDoc(doc(ctx.firestore(), 'conversations', 'conv_1')));
    await assertFails(getDoc(doc(ctx.firestore(), 'messages', 'msg_1')));
  });

  it('a participant CAN send a message', async () => {
    const ctx = await asCustomer(CUSTOMER);
    await assertSucceeds(addDoc(collection(ctx.firestore(), 'messages'), {
      conversationId: 'conv_1', senderId: CUSTOMER, senderName: 'Walid',
      senderRole: 'customer', body: 'Any update on my car?', createdAt: new Date(),
    }));
  });

  it('a non-participant cannot send a message into the conversation', async () => {
    const ctx = await asCustomer('uid_nosy_customer');
    await assertFails(addDoc(collection(ctx.firestore(), 'messages'), {
      conversationId: 'conv_1', senderId: 'uid_nosy_customer', senderName: 'Nosy',
      senderRole: 'customer', body: 'Injecting myself into this chat', createdAt: new Date(),
    }));
  });

  it('a participant cannot send a message impersonating someone else', async () => {
    const ctx = await asCustomer(CUSTOMER);
    await assertFails(addDoc(collection(ctx.firestore(), 'messages'), {
      conversationId: 'conv_1', senderId: 'uid_staff_a1', senderName: 'Garage',
      senderRole: 'vendor', body: 'Your bill is now QAR 5000', createdAt: new Date(),
    }));
  });

  it('messages are immutable — even the sender cannot edit one', async () => {
    const ctx = await asCustomer(CUSTOMER);
    await assertFails(updateDoc(doc(ctx.firestore(), 'messages', 'msg_1'), { body: 'Rewritten history' }));
  });

  it('an empty or oversized message body is rejected', async () => {
    const ctx = await asCustomer(CUSTOMER);
    await assertFails(addDoc(collection(ctx.firestore(), 'messages'), {
      conversationId: 'conv_1', senderId: CUSTOMER, senderName: 'Walid',
      senderRole: 'customer', body: '', createdAt: new Date(),
    }));
    await assertFails(addDoc(collection(ctx.firestore(), 'messages'), {
      conversationId: 'conv_1', senderId: CUSTOMER, senderName: 'Walid',
      senderRole: 'customer', body: 'x'.repeat(2001), createdAt: new Date(),
    }));
  });

  it('a customer cannot open a conversation on someone else’s behalf', async () => {
    const ctx = await asCustomer(CUSTOMER);
    await assertFails(addDoc(collection(ctx.firestore(), 'conversations'), {
      participants: ['uid_someone_else', BRANCH_A1],
      userId: 'uid_someone_else', customerName: 'Someone',
      businessId: BIZ_A, branchId: BRANCH_A1, branchName: 'AAB — Industrial',
      lastMessage: '', lastMessageAt: new Date(), lastMessageBy: CUSTOMER,
      unread: {}, createdAt: new Date(), updatedAt: new Date(),
    }));
  });

  it('a participant cannot re-point a conversation at another branch', async () => {
    const ctx = await asCustomer(CUSTOMER);
    await assertFails(updateDoc(doc(ctx.firestore(), 'conversations', 'conv_1'), {
      branchId: BRANCH_A2,
    }));
  });

  it('a participant cannot rewrite the display fields (customerName, branchName) via update', async () => {
    const ctx = await asCustomer(CUSTOMER);
    await assertFails(updateDoc(doc(ctx.firestore(), 'conversations', 'conv_1'), {
      customerName: 'Someone Else',
    }));
    await assertFails(updateDoc(doc(ctx.firestore(), 'conversations', 'conv_1'), {
      branchName: 'A Different Garage',
    }));
  });

  it('a participant CAN update lastMessage and unread counters (the whitelisted fields)', async () => {
    const ctx = await asCustomer(CUSTOMER);
    await assertSucceeds(updateDoc(doc(ctx.firestore(), 'conversations', 'conv_1'), {
      lastMessage: 'Any update?', lastMessageAt: new Date(), lastMessageBy: CUSTOMER,
      unread: { [BRANCH_A1]: 1 }, updatedAt: new Date(),
    }));
  });
});
