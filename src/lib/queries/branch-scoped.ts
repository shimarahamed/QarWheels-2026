import { collection, query, where, type Firestore, type Query, type QueryConstraint } from 'firebase/firestore';

export type BranchScope =
  | { kind: 'branch'; branchId: string }
  | { kind: 'business'; businessId: string };

/**
 * Builds a scoped query for the given collection — the single place every
 * vendor-dashboard page should route through, so branch scoping can't be
 * forgotten on a new page. Pass the useVendor() context's activeBranch/
 * canSeeAllBranches/business to derive the right scope:
 *
 *   const scope = canSeeAllBranches
 *     ? { kind: 'business', businessId: business.id } as const
 *     : activeBranch ? { kind: 'branch', branchId: activeBranch.id } as const : null;
 *   const q = scope ? branchScopedQuery(firestore, 'branch_inventory', scope) : null;
 *
 * The rules-level enforcement is what actually protects the data (a
 * tampered client requesting `business` scope while only holding a
 * branch_staff claim gets permission-denied, not real cross-branch data) —
 * this factory exists so the UI layer stays consistent by construction.
 */
export function branchScopedQuery(
  firestore: Firestore,
  collectionName: string,
  scope: BranchScope,
  ...extra: QueryConstraint[]
): Query {
  const field = scope.kind === 'branch' ? 'branchId' : 'businessId';
  const value = scope.kind === 'branch' ? scope.branchId : scope.businessId;
  return query(collection(firestore, collectionName), where(field, '==', value), ...extra);
}
