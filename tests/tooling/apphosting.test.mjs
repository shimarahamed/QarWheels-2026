import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

// Use the Firebase CLI's declared parser without importing its authenticated CLI.
const require = createRequire(import.meta.url);
const { load } = createRequire(require.resolve('firebase-tools/package.json'))('js-yaml');
const read = (name) => load(readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8'));

test('App Hosting keeps server secrets at runtime and uses managed credentials', () => {
  const base = read('apphosting.yaml');
  const entries = new Map(base.env.map((entry) => [entry.variable, entry]));
  assert.equal(entries.size, base.env.length);
  assert.equal(entries.get('FIREBASE_ADMIN_AUTH_MODE').value, 'application-default');
  assert.equal(entries.has('FIREBASE_SERVICE_ACCOUNT_KEY'), false);
  for (const name of ['GEMINI_API_KEY', 'UPSTASH_REDIS_REST_TOKEN', 'CRON_SECRET']) {
    assert.equal(entries.get(name).secret, name);
    assert.equal('value' in entries.get(name), false);
    assert.deepEqual(entries.get(name).availability, ['RUNTIME']);
  }
  assert.ok(base.env.every((entry) => !entry.variable.startsWith('NEXT_PUBLIC_')));
});

test('staging/production overrides identify environments without copying projects or secrets', () => {
  for (const environment of ['staging', 'production']) {
    assert.deepEqual(read(`apphosting.${environment}.yaml`).env, [{ variable: 'QARWHEEL_ENV', value: environment, availability: ['BUILD', 'RUNTIME'] }]);
  }
});
