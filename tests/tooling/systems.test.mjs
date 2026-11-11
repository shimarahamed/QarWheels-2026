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
    assert.deepEqual(checkSystems(directory, registry), { errors: [] });
    registry.systems[0].paths.push('missing', '../outside');
    registry.systems[0].dependsOn.push('unknown');
    assert.equal(checkSystems(directory, registry).errors.length, 3);
    registry.systems.push({ id: 'web', paths: [], dependsOn: [] });
    assert.ok(checkSystems(directory, registry).errors.some((error) => error.includes('unique')));
    registry.systems[0].primaryDeployment = 'missing';
    assert.ok(checkSystems(directory, registry).errors.some((error) => error.includes('primary deployment')));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('unified checkout requires mobile source', () => {
  const directory = mkdtempSync(join(tmpdir(), 'qarwheel-mobile-checkout-'));
  try {
    writeFileSync(join(directory, 'firebase.json'), JSON.stringify({ firestore: { rules: '.', indexes: '.' }, storage: { rules: '.' } }));
    writeFileSync(join(directory, 'qarwheel.code-workspace'), JSON.stringify({ folders: [{ path: 'mobile' }] }));
    const registry = { systems: [{ id: 'mobile', root: 'mobile', paths: ['mobile/package.json'] }], shared: [], archive: [] };
    assert.ok(checkSystems(directory, registry).errors.some((error) => error.includes('mobile/package.json')));
    mkdirSync(join(directory, 'mobile'));
    writeFileSync(join(directory, 'mobile/package.json'), '{}');
    assert.deepEqual(checkSystems(directory, registry), { errors: [] });
    mkdirSync(join(directory, 'mobile/.git'));
    assert.ok(checkSystems(directory, registry).errors.some((error) => error.includes('nested repository')));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
