'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  type DocumentData,
  type UpdateData,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';

/**
 * Only genuine "permission-denied" errors go to the global error boundary
 * (surfaced there for debugging against security rules). Every other
 * Firestore error (offline, unavailable, cancelled, etc.) is a transient
 * failure and should just toast — it must never crash the app.
 */
function reportWriteError(error: unknown, build: () => FirestorePermissionError) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
    errorEmitter.emit('permission-error', build());
    return;
  }
  toast({
    variant: 'destructive',
    title: 'Something went wrong',
    description: 'Your change could not be saved. Please try again.',
  });
}

/**
 * Initiates a setDoc operation, automatically handling permission errors.
 * Returns a promise that resolves on success.
 */
export function safeSetDoc(docRef: DocumentReference, data: DocumentData, options: SetOptions): Promise<void> {
  const promise = setDoc(docRef, data, options);
  const isMerge = 'merge' in options ? Boolean(options.merge) : false;
  promise.catch(error => {
    reportWriteError(error, () => new FirestorePermissionError({
        path: docRef.path,
        operation: isMerge ? 'update' : 'create',
        requestResourceData: data,
      })
    )
  });
  return promise;
}


/**
 * Initiates an addDoc operation, automatically handling permission errors.
 * Returns a promise that resolves with the new DocumentReference on success.
 */
export function safeAddDoc(colRef: CollectionReference, data: DocumentData): Promise<DocumentReference> {
  const promise = addDoc(colRef, data);
  promise.catch(error => {
      reportWriteError(error, () => new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
      )
    });
  return promise;
}


/**
 * Initiates an updateDoc operation, automatically handling permission errors.
 * Returns a promise that resolves on success.
 */
export function safeUpdateDoc(docRef: DocumentReference, data: UpdateData<DocumentData>): Promise<void> {
  const promise = updateDoc(docRef, data);
  promise.catch(error => {
      reportWriteError(error, () => new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      )
    });
  return promise;
}


/**
 * Initiates a deleteDoc operation, automatically handling permission errors.
 * Returns a promise that resolves on success.
 */
export function safeDeleteDoc(docRef: DocumentReference): Promise<void> {
  const promise = deleteDoc(docRef);
  promise.catch(error => {
      reportWriteError(error, () => new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
  return promise;
}
