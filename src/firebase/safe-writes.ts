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
 * Returns a promise that resolves on success.
 */
export function safeSetDoc(docRef: DocumentReference, data: any, options: SetOptions): Promise<void> {
  const promise = setDoc(docRef, data, options);
  promise.catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: options.merge ? 'update' : 'create',
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
 * Returns a promise that resolves on success.
 */
export function safeUpdateDoc(docRef: DocumentReference, data: any): Promise<void> {
  const promise = updateDoc(docRef, data);
  promise.catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
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
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
  return promise;
}
