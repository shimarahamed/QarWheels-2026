'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  doc,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation, automatically handling permission errors.
 * This is "fire-and-forget" and does not block for the write to complete on the server.
 */
export function safeSetDoc(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: options.merge ? 'update' : 'create',
        requestResourceData: data,
      })
    )
  })
}


/**
 * Initiates an addDoc operation, automatically handling permission errors.
 * Returns a promise that resolves with the new DocumentReference on success.
 */
export function safeAddDoc(colRef: CollectionReference, data: any): Promise<DocumentReference> {
  const promise = addDoc(colRef, data);
  promise.catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
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
 * This is "fire-and-forget" and does not block for the write to complete on the server.
 */
export function safeUpdateDoc(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      )
    });
}


/**
 * Initiates a deleteDoc operation, automatically handling permission errors.
 * This is "fire-and-forget" and does not block for the write to complete on the server.
 */
export function safeDeleteDoc(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
}
