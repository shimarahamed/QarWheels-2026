import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function checkSystems(base, registry, withMobile = false) {
  const errors = [];
  const skipped = [];
  const entries = [...registry.systems, ...registry.shared];
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) errors.push('System IDs must be unique.');
  function checkPath(path) {
    const absolute = resolve(base, path);
    const inside = relative(base, absolute);
    if (isAbsolute(path) || inside === '..' || inside.startsWith('../') || inside.startsWith('..\\')) {
      errors.push(`Path leaves repository: ${path}`);
    } else if (!existsSync(absolute)) errors.push(`Missing system path: ${path}`);
  }
  for (const entry of entries) {
    if (entry.primaryDeployment && !entry.deployments?.[entry.primaryDeployment]) errors.push(`Unknown primary deployment for ${entry.id}.`);
    for (const dependency of entry.dependsOn ?? []) {
      if (!ids.has(dependency)) errors.push(`Unknown dependency for ${entry.id}: ${dependency}`);
    }
    if (entry.independentRepository && !existsSync(resolve(base, entry.root, 'package.json'))) {
      if (withMobile) errors.push('Mobile checkout is missing. See docs/module-map.md.');
      else skipped.push('Mobile checkout is absent; mobile paths were not checked.');
      continue;
    }
    for (const path of [...entry.paths, ...Object.values(entry.surfaces ?? {}), ...Object.values(entry.deployments ?? {})]) checkPath(path);
  }
  for (const path of registry.archive) checkPath(path);
  const firebase = JSON.parse(readFileSync(resolve(base, 'firebase.json'), 'utf8'));
  for (const path of [firebase.firestore.rules, firebase.firestore.indexes, firebase.storage.rules]) checkPath(path);
  const workspace = JSON.parse(readFileSync(resolve(base, 'qarwheel.code-workspace'), 'utf8'));
  for (const { path } of workspace.folders) {
    if (path === 'mobile' && !withMobile && !existsSync(resolve(base, 'mobile/package.json'))) continue;
    checkPath(path);
  }
  return { errors, skipped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.slice(2).some((arg) => arg !== '--with-mobile')) {
    console.error('Usage: node scripts/check-systems.mjs [--with-mobile]');
    process.exitCode = 2;
  } else {
    const result = checkSystems(root, JSON.parse(readFileSync(resolve(root, 'systems.json'), 'utf8')), process.argv.includes('--with-mobile'));
    for (const message of result.skipped) console.log(`SKIP: ${message}`);
    for (const message of result.errors) console.error(`FAIL: ${message}`);
    if (!result.errors.length) console.log('PASS: system paths, dependencies, Firebase references and workspace folders.');
    process.exitCode = result.errors.length ? 1 : 0;
  }
}
