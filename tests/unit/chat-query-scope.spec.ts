import { beforeEach, describe, expect, it, vi } from 'vitest';
import { query, where, orderBy, limit } from 'firebase/firestore';
import { useCollection } from '@/firebase';
import { useConversations } from '@/hooks/use-chat';
import indexes from '../../firestore.indexes.json';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_database, path) => path),
  where: vi.fn((field, operator, value) => ({ field, operator, value })),
  orderBy: vi.fn((field, direction) => ({ field, direction })),
  limit: vi.fn((count) => ({ count })),
  query: vi.fn((...constraints) => constraints),
}));
vi.mock('@/firebase', () => ({
  useFirebase: () => ({ firestore: {} }),
  useMemoFirebase: (factory: () => unknown) => factory(),
  useCollection: vi.fn(() => ({ data: [], isLoading: false, error: null })),
}));

describe('conversation query scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('binds vendor inbox reads to both business and branch', () => {
    useConversations('branch-a', 'vendor', 'business-a');
    expect(where).toHaveBeenCalledWith('businessId', '==', 'business-a');
    expect(where).toHaveBeenCalledWith('branchId', '==', 'branch-a');
    expect(where).toHaveBeenCalledTimes(2);
    expect(orderBy).toHaveBeenCalledWith('lastMessageAt', 'desc');
    expect(limit).toHaveBeenCalledWith(50);
    expect(useCollection).toHaveBeenCalledWith(expect.anything(), { suppressPermissionError: true });
  });

  it.each([[null, 'business-a'], ['branch-a', null], [null, null]])('waits for complete vendor scope (%s, %s)', (branchId, businessId) => {
    useConversations(branchId, 'vendor', businessId);
    expect(query).not.toHaveBeenCalled();
    expect(useCollection).toHaveBeenCalledWith(null, expect.anything());
  });

  it('preserves customer participant reads', () => {
    useConversations('customer-a');
    expect(where).toHaveBeenCalledExactlyOnceWith('participants', 'array-contains', 'customer-a');
  });

  it('declares the composite index for the ordered vendor inbox', () => {
    expect(indexes.indexes).toContainEqual({
      collectionGroup: 'conversations', queryScope: 'COLLECTION', fields: [
        { fieldPath: 'businessId', order: 'ASCENDING' },
        { fieldPath: 'branchId', order: 'ASCENDING' },
        { fieldPath: 'lastMessageAt', order: 'DESCENDING' },
      ],
    });
  });
});
