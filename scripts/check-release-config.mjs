import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, parseEnv } from 'node:util';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function releaseConfigIssues(env, { platform = 'native', config, androidGradle, webEnvironment } = {}) {
  const issues = [];
  const required = [
    'EXPO_PUBLIC_API_BASE_URL',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_SENTRY_DSN',
  ];
  if (platform === 'native') required.push('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
  for (const key of required) {
    if (!env[key]?.trim()) issues.push(`${key}: required for this release target.`);
    else if (/^(YOUR_|REPLACE_|CHANGEME$|demo-ci-)/i.test(env[key].trim())) {
      issues.push(`${key}: replace the placeholder configuration.`);
    }
  }
  if (env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() === 'demo-no-project') {
    issues.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID: the emulator/CI project is not a release project.');
  }
  if (env.EXPO_PUBLIC_API_BASE_URL?.trim()) {
    try {
      const url = new URL(env.EXPO_PUBLIC_API_BASE_URL.trim());
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
        issues.push('EXPO_PUBLIC_API_BASE_URL: use HTTPS without credentials, query parameters or fragments.');
      }
      if (['localhost', '0.0.0.0', '[::]', '[::1]'].includes(url.hostname)
          || url.hostname.endsWith('.localhost') || /^127\./.test(url.hostname)) {
        issues.push('EXPO_PUBLIC_API_BASE_URL: a release needs a device-reachable backend, not loopback.');
      }
    } catch {
      issues.push('EXPO_PUBLIC_API_BASE_URL: invalid URL.');
    }
  }
  if (env.EXPO_PUBLIC_SENTRY_DSN?.trim()) {
    try {
      if (new URL(env.EXPO_PUBLIC_SENTRY_DSN.trim()).protocol !== 'https:') throw new Error();
    } catch {
      issues.push('EXPO_PUBLIC_SENTRY_DSN: use a valid HTTPS DSN.');
    }
  }
  for (const [key, value] of Object.entries(env)) {
    if (value && /^EXPO_PUBLIC_.*(?:PRIVATE_KEY|SERVICE_ACCOUNT(?:_KEY)?|SECRET|SECRET_KEY|GEMINI_API_KEY)$/.test(key)) {
      issues.push(`${key}: server credentials must never be bundled into a public mobile environment.`);
    }
  }
  if (webEnvironment) {
    if (!['staging', 'production'].includes(webEnvironment.QARWHEEL_ENV)) {
      issues.push('QARWHEEL_ENV: the web release environment must explicitly select staging or production.');
    }
    const webProject = webEnvironment.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    if (!webProject) {
      issues.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID: required from the web release environment.');
    } else if (env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() !== webProject) {
      issues.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID: must match NEXT_PUBLIC_FIREBASE_PROJECT_ID from the web release environment.');
    }
    try {
      const webUrl = new URL(webEnvironment.NEXT_PUBLIC_APP_URL);
      if (webUrl.protocol !== 'https:' || webUrl.username || webUrl.password
          || webUrl.pathname !== '/' || webUrl.search || webUrl.hash) throw new Error();
      const apiUrl = new URL(env.EXPO_PUBLIC_API_BASE_URL);
      if (apiUrl.origin !== webUrl.origin || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
        issues.push('EXPO_PUBLIC_API_BASE_URL: must equal the NEXT_PUBLIC_APP_URL HTTPS origin; do not append /api or use the business website origin.');
      }
    } catch {
      issues.push('NEXT_PUBLIC_APP_URL and EXPO_PUBLIC_API_BASE_URL: valid release HTTPS origins are required for alignment.');
    }
  }
  if (platform === 'native' && config) {
    if (!config.android?.package || !config.ios?.bundleIdentifier) {
      issues.push('app.json: Android package and iOS bundle identifier are required.');
    }
    if (androidGradle !== undefined) {
      const applicationId = androidGradle.match(/applicationId\s*(?:=\s*)?["']([^"']+)["']/)?.[1];
      if (!applicationId || applicationId !== config.android?.package) {
        issues.push('android/app/build.gradle: applicationId disagrees with app.json; confirm the published identity before rebuilding.');
      }
    }
  }
  return issues;
}

export function checkReleaseConfig(args = process.argv.slice(2)) {
  let values;
  let webEnvironment;
  try {
    ({ values } = parseArgs({ args, options: {
      platform: { type: 'string', default: 'native' },
      'env-file': { type: 'string' },
      'web-env-file': { type: 'string' },
    } }));
    if (!['native', 'web'].includes(values.platform)) throw new Error('--platform must be native or web.');
    const envPath = values['env-file'] ? resolve(process.cwd(), values['env-file']) : resolve(mobileRoot, '.env');
    if (values['env-file'] || existsSync(envPath)) process.loadEnvFile(envPath);
    if (values['web-env-file']) {
      const webFile = parseEnv(readFileSync(resolve(process.cwd(), values['web-env-file']), 'utf8'));
      const publicProcessEnvironment = Object.fromEntries(Object.entries(process.env)
        .filter(([key]) => key.startsWith('NEXT_PUBLIC_') || key === 'QARWHEEL_ENV'));
      webEnvironment = { ...webFile, ...publicProcessEnvironment };
    }
  } catch (error) {
    console.error(`Release configuration could not be read: ${error.code ?? error.message}`);
    return 2;
  }
  let config;
  let androidGradle;
  try {
    config = JSON.parse(readFileSync(resolve(mobileRoot, 'app.json'), 'utf8')).expo;
    if (!config) throw new Error();
    const gradlePath = resolve(mobileRoot, 'android/app/build.gradle');
    androidGradle = existsSync(gradlePath) ? readFileSync(gradlePath, 'utf8') : undefined;
  } catch {
    console.error('Mobile release configuration could not be read: app.json or Android configuration.');
    return 2;
  }
  const issues = releaseConfigIssues(process.env, {
    platform: values.platform,
    config,
    androidGradle,
    webEnvironment,
  });
  if (issues.length) {
    console.error(`Mobile ${values.platform} release configuration: BLOCKED`);
    for (const issue of issues) console.error(`- ${issue}`);
    return 1;
  }
  console.log(`Mobile ${values.platform} release configuration: PASS (configuration only; staging/device acceptance still required).`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = checkReleaseConfig();
}
