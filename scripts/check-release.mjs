import { createPrivateKey } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const clientFields = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID'];

function httpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash &&
      url.pathname === '/' && !['localhost', '0.0.0.0', '[::]', '[::1]'].includes(url.hostname) && !/^127\./.test(url.hostname) &&
      !url.hostname.endsWith('.localhost') && !url.hostname.endsWith('.local');
  } catch { return false; }
}

export function validateReleaseEnvironment(env, target) {
  const errors = [];
  if (!['firebase', 'cloudflare'].includes(target)) errors.push('Select --target firebase or --target cloudflare.');
  if (!['staging', 'production'].includes(env.QARWHEEL_ENV)) errors.push('QARWHEEL_ENV must explicitly identify staging or production.');
  for (const field of clientFields) {
    if (!env[`NEXT_PUBLIC_FIREBASE_${field}`]?.trim()) errors.push(`NEXT_PUBLIC_FIREBASE_${field} is required.`);
  }
  if (env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-')) errors.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID must not identify an emulator/demo project.');
  if (!httpsOrigin(env.NEXT_PUBLIC_APP_URL)) errors.push('NEXT_PUBLIC_APP_URL must be a public HTTPS origin without credentials, path, query or fragment.');
  if (!httpsOrigin(env.UPSTASH_REDIS_REST_URL) || !env.UPSTASH_REDIS_REST_TOKEN?.trim()) errors.push('Production rate limiting requires an HTTPS UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
  if (!env.GEMINI_API_KEY?.trim()) errors.push('GEMINI_API_KEY is required for the enabled AI APIs.');
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) errors.push('CRON_SECRET must contain at least 32 characters. Configure the scheduler separately.');
  if (env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST) errors.push('Release environments must not point to Firebase emulators.');
  for (const key of Object.keys(env)) {
    if (/^(NEXT_PUBLIC_|EXPO_PUBLIC_).*(SERVICE_ACCOUNT|PRIVATE_KEY|SECRET|ACCESS_TOKEN)/.test(key) && env[key]) errors.push(`${key} exposes a server credential through a public environment variable.`);
  }
  const authMode = env.FIREBASE_ADMIN_AUTH_MODE || 'service-account';
  if (authMode === 'application-default') {
    if (target !== 'firebase') errors.push('Application-default credentials are supported by this release configuration only on Firebase App Hosting.');
    try {
      const config = JSON.parse(env.FIREBASE_CONFIG ?? '');
      if (!config?.projectId || config.projectId !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
          (config.storageBucket !== undefined && (typeof config.storageBucket !== 'string' || !config.storageBucket.trim() || config.storageBucket !== env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET))) throw new Error();
    } catch {
      errors.push('Application-default mode requires FIREBASE_CONFIG metadata matching the client Firebase project and Storage bucket. App Hosting supplies this metadata; IAM access still needs staging verification.');
    }
  } else if (authMode === 'service-account') {
    try {
      const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY ?? '');
      if (account.type !== 'service_account' || account.project_id !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || typeof account.client_email !== 'string' || !account.client_email.endsWith('.gserviceaccount.com')) throw new Error('Invalid service account');
      const key = createPrivateKey(account.private_key);
      if (key.asymmetricKeyType !== 'rsa') throw new Error('Invalid service account key');
    } catch {
      errors.push('FIREBASE_SERVICE_ACCOUNT_KEY must contain valid service-account JSON/private key for the same Firebase project as the client.');
    }
  } else errors.push('FIREBASE_ADMIN_AUTH_MODE must be service-account or application-default.');
  return errors;
}

export function readReleaseEnvironment(base, explicitFile, environment = process.env) {
  const files = explicitFile ? [resolve(base, explicitFile)] : ['.env', '.env.production', '.env.local', '.env.production.local'].map((file) => resolve(base, file));
  let values = {};
  for (const file of files) {
    if (existsSync(file)) values = { ...values, ...parseEnv(readFileSync(file, 'utf8')) };
    else if (explicitFile) throw new Error('The specified environment file does not exist.');
  }
  return { ...values, ...environment };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--target', '--env-file'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options[args[i]]) {
      console.error('Usage: node scripts/check-release.mjs [--target firebase|cloudflare] [--env-file path]');
      process.exit(2);
    }
    options[args[i]] = args[i + 1];
  }
  try {
    const primary = JSON.parse(readFileSync(resolve(root, 'systems.json'), 'utf8')).systems.find((system) => system.id === 'web').primaryDeployment;
    const errors = validateReleaseEnvironment(readReleaseEnvironment(root, options['--env-file']), options['--target'] ?? primary);
    for (const error of errors) console.error(`FAIL: ${error}`);
    if (!errors.length) console.log('PASS: web release configuration. This does not verify credentials, deployed services or production functionality.');
    process.exitCode = errors.length ? 1 : 0;
  } catch {
    console.error('FAIL: unable to read release environment configuration. No environment values were printed.');
    process.exitCode = 1;
  }
}
