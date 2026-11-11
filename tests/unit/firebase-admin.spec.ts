import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  apps: [] as Array<{ name: string; options: Record<string, unknown> }>,
  managedCredential: { managed: true },
  certificate: { serviceAccount: true },
}));

vi.mock('firebase-admin/app', () => ({
  applicationDefault: vi.fn(() => state.managedCredential),
  cert: vi.fn(() => state.certificate),
  getApps: vi.fn(() => state.apps),
  initializeApp: vi.fn((options) => ({ name: '[DEFAULT]', options })),
}));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: vi.fn((app) => ({ app, service: 'firestore' })) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn((app) => ({ app, service: 'auth' })) }));
vi.mock('firebase-admin/storage', () => ({ getStorage: vi.fn((app) => ({ app, service: 'storage' })) }));

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const managedConfig = { projectId: 'qarwheel-test', storageBucket: 'qarwheel-test.firebasestorage.app' };
const account = { project_id: 'qarwheel-test', client_email: 'backend@example.invalid', private_key: 'test-key' };

describe('Firebase Admin credential modes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.apps = [];
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', '');
    vi.stubEnv('FIREBASE_CONFIG', JSON.stringify(managedConfig));
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_KEY', JSON.stringify(account));
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', managedConfig.projectId);
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', managedConfig.storageBucket);
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, '', 'service-account'])('preserves service-account initialization for mode %s', async (mode) => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', mode);
    const admin = await import('@/lib/firebase-admin');
    admin.getAdminFirestore();
    expect(cert).toHaveBeenCalledWith({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key });
    expect(initializeApp).toHaveBeenCalledWith({ credential: state.certificate, storageBucket: managedConfig.storageBucket });
    expect(applicationDefault).not.toHaveBeenCalled();
  });

  it('does not silently fall back to managed credentials when the legacy key is absent', async () => {
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_KEY', '');
    const admin = await import('@/lib/firebase-admin');
    expect(admin.getAdminFirestore).toThrow('FIREBASE_SERVICE_ACCOUNT_KEY is not configured');
    expect(applicationDefault).not.toHaveBeenCalled();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('rejects malformed legacy credential JSON', async () => {
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_KEY', '{invalid');
    const admin = await import('@/lib/firebase-admin');
    expect(admin.getAdminFirestore).toThrow('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON');
  });

  it('uses managed credentials without a private key and shares one app between services', async () => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'application-default');
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_KEY', '');
    const admin = await import('@/lib/firebase-admin');
    admin.getAdminFirestore();
    admin.getAdminAuth();
    admin.getAdminStorage();
    expect(initializeApp).toHaveBeenCalledExactlyOnceWith({ ...managedConfig, credential: state.managedCredential });
    expect(getApps).toHaveBeenCalledTimes(1);
    expect(applicationDefault).toHaveBeenCalledTimes(1);
    expect(cert).not.toHaveBeenCalled();
    const initialized = vi.mocked(initializeApp).mock.results[0].value;
    expect(getFirestore).toHaveBeenCalledWith(initialized);
    expect(getAuth).toHaveBeenCalledWith(initialized);
    expect(getStorage).toHaveBeenCalledWith(initialized);
  });

  it.each(['', '{invalid', 'null', '[]', '"project"', '{}', '{"projectId":1}', '{"projectId":"other-project"}'])(
    'rejects missing, malformed or mismatched managed config (%s)', async (config) => {
      vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'application-default');
      vi.stubEnv('FIREBASE_CONFIG', config);
      state.apps = [{ name: '[DEFAULT]', options: managedConfig }];
      const admin = await import('@/lib/firebase-admin');
      expect(admin.getAdminFirestore).toThrow(/FIREBASE_CONFIG/);
      expect(getApps).not.toHaveBeenCalled();
      expect(initializeApp).not.toHaveBeenCalled();
    },
  );

  it('requires the public project ID to be configured in managed mode', async () => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'application-default');
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', '');
    const admin = await import('@/lib/firebase-admin');
    expect(admin.getAdminFirestore).toThrow('must match NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  });

  it.each(['', 123, 'other-bucket'])('rejects malformed or mismatched managed storage bucket (%s)', async (storageBucket) => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'application-default');
    vi.stubEnv('FIREBASE_CONFIG', JSON.stringify({ ...managedConfig, storageBucket }));
    const admin = await import('@/lib/firebase-admin');
    expect(admin.getAdminStorage).toThrow(/FIREBASE_CONFIG.storageBucket/);
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('uses the explicit public bucket when managed config omits it', async () => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'application-default');
    vi.stubEnv('FIREBASE_CONFIG', JSON.stringify({ projectId: managedConfig.projectId }));
    const admin = await import('@/lib/firebase-admin');
    admin.getAdminStorage();
    expect(initializeApp).toHaveBeenCalledWith({ ...managedConfig, credential: state.managedCredential });
  });

  it.each(['service-account', 'application-default'])('reuses an existing app in %s mode', async (mode) => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', mode);
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_KEY', '');
    const existing = { name: '[DEFAULT]', options: managedConfig };
    state.apps = [existing];
    const admin = await import('@/lib/firebase-admin');
    admin.getAdminFirestore();
    expect(getFirestore).toHaveBeenCalledWith(existing);
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('rejects an existing app pointing at a different managed project', async () => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'application-default');
    state.apps = [{ name: '[DEFAULT]', options: { ...managedConfig, projectId: 'other-project' } }];
    const admin = await import('@/lib/firebase-admin');
    expect(admin.getAdminFirestore).toThrow('Existing Firebase Admin app does not match FIREBASE_CONFIG');
  });

  it('rejects a cached app after its configured managed target changes', async () => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'application-default');
    const admin = await import('@/lib/firebase-admin');
    admin.getAdminFirestore();
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'other-project');
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'other-project.firebasestorage.app');
    vi.stubEnv('FIREBASE_CONFIG', JSON.stringify({ projectId: 'other-project', storageBucket: 'other-project.firebasestorage.app' }));
    expect(admin.getAdminAuth).toThrow('Existing Firebase Admin app does not match FIREBASE_CONFIG');
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it('rejects reusing a cached legacy app after switching to managed credentials', async () => {
    const admin = await import('@/lib/firebase-admin');
    admin.getAdminFirestore();
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'application-default');
    expect(admin.getAdminAuth).toThrow('Existing Firebase Admin app does not match FIREBASE_CONFIG');
    expect(applicationDefault).not.toHaveBeenCalled();
  });

  it('rejects an existing managed app pointing at a different storage bucket', async () => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'application-default');
    state.apps = [{ name: '[DEFAULT]', options: { ...managedConfig, storageBucket: 'other-bucket' } }];
    const admin = await import('@/lib/firebase-admin');
    expect(admin.getAdminStorage).toThrow('Existing Firebase Admin app does not match FIREBASE_CONFIG');
  });

  it('rejects an unknown mode before reusing an existing app', async () => {
    vi.stubEnv('FIREBASE_ADMIN_AUTH_MODE', 'automatic');
    state.apps = [{ name: '[DEFAULT]', options: managedConfig }];
    const admin = await import('@/lib/firebase-admin');
    expect(admin.getAdminFirestore).toThrow('FIREBASE_ADMIN_AUTH_MODE');
    expect(getApps).not.toHaveBeenCalled();
  });
});
