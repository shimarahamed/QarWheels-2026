import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { releaseConfigIssues } from './check-release-config.mjs';

const env = {
  EXPO_PUBLIC_API_BASE_URL: 'https://backend.example.test',
  EXPO_PUBLIC_FIREBASE_API_KEY: 'public-firebase-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'qarwheel.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'qarwheel',
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'qarwheel.firebasestorage.app',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:123456:web:abc',
  EXPO_PUBLIC_SENTRY_DSN: 'https://public-key@sentry.example.test/123',
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'public-maps-key',
};
const config = { android: { package: 'com.qarwheel.app' }, ios: { bundleIdentifier: 'com.qarwheel.app' } };
const androidGradle = "applicationId 'com.qarwheel.app'";

test('accepts configured native release without requiring a checked-in native project', () => {
  assert.deepEqual(releaseConfigIssues(env, { config }), []);
  assert.deepEqual(releaseConfigIssues(env, { config, androidGradle }), []);
});

test('blocks missing API, CI projects and public server secrets without echoing values', () => {
  const issues = releaseConfigIssues({ ...env, EXPO_PUBLIC_API_BASE_URL: '',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-no-project', EXPO_PUBLIC_STRIPE_SECRET_KEY: 'do-not-print-me' });
  assert.ok(issues.some((issue) => issue.startsWith('EXPO_PUBLIC_API_BASE_URL:')));
  assert.ok(issues.some((issue) => issue.includes('emulator/CI')));
  assert.ok(issues.some((issue) => issue.includes('EXPO_PUBLIC_STRIPE_SECRET_KEY:')));
  assert.ok(issues.every((issue) => !issue.includes('do-not-print-me')));
});

test('rejects unsafe release endpoints accepted only for development', () => {
  for (const url of ['http://backend.example.test', 'https://localhost', 'https://127.0.0.2',
    'https://[::1]', 'https://user:secret@backend.example.test', 'https://backend.example.test?key=secret', 'not-a-url']) {
    const issues = releaseConfigIssues({ ...env, EXPO_PUBLIC_API_BASE_URL: url });
    assert.ok(issues.some((issue) => issue.startsWith('EXPO_PUBLIC_API_BASE_URL:')), url);
  }
});

test('blocks stale native identities while web release ignores native-only configuration', () => {
  const options = { config, androidGradle: "applicationId 'com.other.app'" };
  assert.ok(releaseConfigIssues(env, options).some((issue) => issue.includes('applicationId')));
  assert.deepEqual(releaseConfigIssues({ ...env, EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: '' }, { ...options, platform: 'web' }), []);
});

test('aligns Firebase project and App Hosting API origin without comparing distinct client app IDs', () => {
  const webEnvironment = { QARWHEEL_ENV: 'staging', NEXT_PUBLIC_APP_URL: env.EXPO_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID: 'a-different-web-client' };
  assert.deepEqual(releaseConfigIssues(env, { webEnvironment }), []);
  for (const [key, value] of [['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'other-project'],
    ['NEXT_PUBLIC_APP_URL', 'https://business.example.test'], ['QARWHEEL_ENV', 'development']]) {
    assert.ok(releaseConfigIssues(env, { webEnvironment: { ...webEnvironment, [key]: value } }).length > 0, key);
  }
  assert.ok(releaseConfigIssues({ ...env, EXPO_PUBLIC_API_BASE_URL: `${env.EXPO_PUBLIC_API_BASE_URL}/api` },
    { webEnvironment }).some((issue) => issue.includes('do not append /api')));
});

test('explicit env files load without printing values, and process/EAS environment takes precedence', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'qarwheel-release-'));
  const envFile = resolve(directory, '.env');
  try {
    writeFileSync(envFile, Object.entries({ ...env, EXPO_PUBLIC_API_BASE_URL: 'http://do-not-print.example.test' })
      .map(([key, value]) => `${key}=${value}`).join('\n'));
    const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('EXPO_PUBLIC_')));
    const script = fileURLToPath(new URL('./check-release-config.mjs', import.meta.url));
    const invalid = spawnSync(process.execPath, [script, '--platform', 'web', '--env-file', envFile], { env: inherited, encoding: 'utf8' });
    assert.equal(invalid.status, 1);
    assert.ok(!invalid.stderr.includes('do-not-print'));
    const valid = spawnSync(process.execPath, [script, '--platform', 'web', '--env-file', envFile], {
      env: { ...inherited, EXPO_PUBLIC_API_BASE_URL: env.EXPO_PUBLIC_API_BASE_URL }, encoding: 'utf8',
    });
    assert.equal(valid.status, 0, valid.stderr);
  } finally {
    assert.equal(dirname(directory), resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});

test('web environment is parsed only as data, with public process values taking precedence', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'qarwheel-release-'));
  const mobileFile = resolve(directory, 'mobile.env');
  const webFile = resolve(directory, 'web.env');
  try {
    writeFileSync(mobileFile, Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n'));
    writeFileSync(webFile, [
      'QARWHEEL_ENV=staging',
      `NEXT_PUBLIC_FIREBASE_PROJECT_ID=${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}`,
      'NEXT_PUBLIC_APP_URL=https://wrong-origin.example.test',
      'EXPO_PUBLIC_STRIPE_SECRET_KEY=do-not-copy-this-server-value',
    ].join('\n'));
    const inherited = Object.fromEntries(Object.entries(process.env)
      .filter(([key]) => !key.startsWith('EXPO_PUBLIC_') && !key.startsWith('NEXT_PUBLIC_') && key !== 'QARWHEEL_ENV'));
    const script = fileURLToPath(new URL('./check-release-config.mjs', import.meta.url));
    const args = [script, '--platform', 'web', '--env-file', mobileFile, '--web-env-file', webFile];
    const invalid = spawnSync(process.execPath, args, { env: inherited, encoding: 'utf8' });
    assert.equal(invalid.status, 1);
    assert.ok(!invalid.stderr.includes('wrong-origin'));
    assert.ok(!invalid.stderr.includes('do-not-copy'));
    const valid = spawnSync(process.execPath, args, {
      env: { ...inherited, NEXT_PUBLIC_APP_URL: env.EXPO_PUBLIC_API_BASE_URL }, encoding: 'utf8',
    });
    assert.equal(valid.status, 0, valid.stderr);
  } finally {
    assert.equal(dirname(directory), resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  }
});
