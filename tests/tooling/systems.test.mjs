import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkSystems } from '../../scripts/check-systems.mjs';

test('system checks detect missing paths, escaping paths and unknown dependencies', () => {
  const directory = mkdtempSync(join(tmpdir(), 'qarwheel-systems-'));
  try {
    writeFileSync(join(directory, 'firebase.json'), JSON.stringify({ firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' }, storage: { rules: 'storage.rules' } }));
    writeFileSync(join(directory, 'qarwheel.code-workspace'), JSON.stringify({ folders: [{ path: '.' }] }));
    for (const path of ['firestore.rules', 'firestore.indexes.json', 'storage.rules']) writeFileSync(join(directory, path), '');
    const registry = { systems: [{ id: 'web', paths: ['.'], dependsOn: [] }], shared: [], archive: [] };
    assert.deepEqual(checkSystems(directory, registry), { errors: [], skipped: [] });
    registry.systems[0].paths.push('missing', '../outside');
    registry.systems[0].dependsOn.push('unknown');
    assert.equal(checkSystems(directory, registry).errors.length, 3);
    registry.systems.push({ id: 'web', paths: [], dependsOn: [] });
    assert.ok(checkSystems(directory, registry).errors.some((error) => error.includes('unique')));
    registry.systems[0].primaryDeployment = 'missing';
    assert.ok(checkSystems(directory, registry).errors.some((error) => error.includes('primary deployment')));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('main checkout can be verified alone but full platform checks require mobile', () => {
  const directory = mkdtempSync(join(tmpdir(), 'qarwheel-mobile-checkout-'));
  try {
    writeFileSync(join(directory, 'firebase.json'), JSON.stringify({ firestore: { rules: '.', indexes: '.' }, storage: { rules: '.' } }));
    writeFileSync(join(directory, 'qarwheel.code-workspace'), JSON.stringify({ folders: [{ path: 'mobile' }] }));
    const registry = { systems: [{ id: 'mobile', root: 'mobile', independentRepository: true, paths: ['mobile/package.json'] }], shared: [], archive: [] };
    assert.equal(checkSystems(directory, registry).skipped.length, 1);
    assert.ok(checkSystems(directory, registry, true).errors.length);
    mkdirSync(join(directory, 'mobile'));
    writeFileSync(join(directory, 'mobile/package.json'), '{}');
    assert.deepEqual(checkSystems(directory, registry, true), { errors: [], skipped: [] });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
