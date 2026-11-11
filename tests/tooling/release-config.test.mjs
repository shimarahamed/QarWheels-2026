import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readReleaseEnvironment, validateReleaseEnvironment } from '../../scripts/check-release.mjs';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const environment = {
  QARWHEEL_ENV: 'staging', NEXT_PUBLIC_FIREBASE_API_KEY: 'test-public-key', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'staging.example.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-project.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123', NEXT_PUBLIC_FIREBASE_APP_ID: 'test-app', NEXT_PUBLIC_APP_URL: 'https://staging.example.com',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.com', UPSTASH_REDIS_REST_TOKEN: 'test-token', GEMINI_API_KEY: 'test-ai-key', CRON_SECRET: 'x'.repeat(32),
  FIREBASE_SERVICE_ACCOUNT_KEY: JSON.stringify({ type: 'service_account', project_id: 'test-project', client_email: 'test@test-project.iam.gserviceaccount.com', private_key: privateKey }),
};

test('accepts complete matching staging config for either supported runtime', () => {
  assert.deepEqual(validateReleaseEnvironment(environment, 'firebase'), []);
  assert.deepEqual(validateReleaseEnvironment(environment, 'cloudflare'), []);
});

test('rejects dev, emulator, unselected runtime and missing distributed limiter', () => {
  assert.equal(validateReleaseEnvironment({ ...environment, QARWHEEL_ENV: 'development', FIRESTORE_EMULATOR_HOST: 'localhost:8080', UPSTASH_REDIS_REST_TOKEN: '' }).length, 4);
});

test('rejects mismatched projects and malformed private keys without returning credentials', () => {
  for (const account of ['DO_NOT_PRINT_THIS_SECRET', JSON.stringify({ project_id: 'other-project', private_key: 'DO_NOT_PRINT_THIS_SECRET' })]) {
    const errors = validateReleaseEnvironment({ ...environment, FIREBASE_SERVICE_ACCOUNT_KEY: account }, 'firebase');
    assert.equal(errors.length, 1);
    assert.ok(!errors.join().includes('DO_NOT_PRINT_THIS_SECRET'));
  }
});

test('Firebase managed-identity mode checks project metadata without requiring a private key', () => {
  const adc = { ...environment, FIREBASE_ADMIN_AUTH_MODE: 'application-default', FIREBASE_SERVICE_ACCOUNT_KEY: '', FIREBASE_CONFIG: JSON.stringify({ projectId: 'test-project', storageBucket: environment.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }) };
  assert.deepEqual(validateReleaseEnvironment(adc, 'firebase'), []);
  assert.ok(validateReleaseEnvironment(adc, 'cloudflare').length);
  for (const config of ['', 'null', '{}', JSON.stringify({ projectId: 'other-project' }), JSON.stringify({ projectId: 'test-project', storageBucket: 'wrong-bucket' }), JSON.stringify({ projectId: 'test-project', storageBucket: 0 })]) assert.ok(validateReleaseEnvironment({ ...adc, FIREBASE_CONFIG: config }, 'firebase').some((error) => error.includes('FIREBASE_CONFIG')));
  assert.ok(validateReleaseEnvironment({ ...adc, FIREBASE_ADMIN_AUTH_MODE: 'unknown' }, 'firebase').some((error) => error.includes('FIREBASE_ADMIN_AUTH_MODE')));
});

test('rejects local or credential-bearing release URLs and public server secrets', () => {
  for (const url of ['http://staging.example.com', 'https://localhost', 'https://127.0.0.2', 'https://0.0.0.0', 'https://[::]', 'https://app.localhost', 'https://user:pass@example.com', 'https://example.com/api', 'https://example.com?token=x']) assert.ok(validateReleaseEnvironment({ ...environment, NEXT_PUBLIC_APP_URL: url }, 'firebase').some((error) => error.startsWith('NEXT_PUBLIC_APP_URL')));
  assert.ok(validateReleaseEnvironment({ ...environment, NEXT_PUBLIC_PRIVATE_KEY: 'sensitive' }, 'firebase').some((error) => error.includes('exposes a server credential')));
});

test('environment loading respects production files and injected environment precedence', () => {
  const directory = mkdtempSync(join(tmpdir(), 'qarwheel-release-'));
  try {
    for (const [name, value] of [['.env', 'base'], ['.env.production', 'production'], ['.env.local', 'local'], ['.env.production.local', 'release']]) writeFileSync(join(directory, name), `VALUE=${value}\n`);
    assert.equal(readReleaseEnvironment(directory, undefined, {}).VALUE, 'release');
    assert.equal(readReleaseEnvironment(directory, undefined, { VALUE: 'injected' }).VALUE, 'injected');
    assert.equal(readReleaseEnvironment(directory, '.env.production', {}).VALUE, 'production');
    assert.throws(() => readReleaseEnvironment(directory, 'missing.env', {}));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
