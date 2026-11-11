import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDevelopmentProject } from '../../scripts/development-project.mjs';

const environment = { QARWHEEL_ENV: 'development', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project' };
const account = { project_id: 'test-project' };
const args = ['--project', 'test-project'];

test('allows only explicitly selected matching development projects', () => {
  assert.doesNotThrow(() => assertDevelopmentProject(environment, args, account));
  for (const env of [{}, { ...environment, QARWHEEL_ENV: 'staging' }, { ...environment, QARWHEEL_ENV: 'production' }, { ...environment, NODE_ENV: 'production' }]) assert.throws(() => assertDevelopmentProject(env, args, account));
  for (const argv of [[], ['--project'], ['--project', 'other-project']]) assert.throws(() => assertDevelopmentProject(environment, argv, account));
  assert.throws(() => assertDevelopmentProject({ ...environment, NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'other-project' }, args, account));
});

test('reset never receives implicit confirmation', () => {
  assert.throws(() => assertDevelopmentProject(environment, args, account, true));
  assert.doesNotThrow(() => assertDevelopmentProject(environment, [...args, '--yes-i-mean-it'], account, true));
});
