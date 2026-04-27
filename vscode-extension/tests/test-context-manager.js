/**
 * Tests for context-manager.ts — buildWelcomeMessage and context utilities.
 */
'use strict';

require('./setup');

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { buildWelcomeMessage } = require('../out/context-manager');

describe('buildWelcomeMessage', () => {
  it('returns null when repoInfo is missing', () => {
    const ctx = {
      repoInfo: null,
      repoPref: { learning_enabled: 1, exists: true },
      debts: [],
      masteryLevel: 'L1',
      initialized: true,
      lastInit: Date.now(),
    };
    assert.equal(buildWelcomeMessage(ctx), null);
  });

  it('returns null when learning is disabled', () => {
    const ctx = {
      repoInfo: { repo_id: 'test', repo_name: 'my-repo', repo_root: '/tmp' },
      repoPref: { learning_enabled: 0, exists: true },
      debts: [],
      masteryLevel: 'L1',
      initialized: true,
      lastInit: Date.now(),
    };
    assert.equal(buildWelcomeMessage(ctx), null);
  });

  it('returns null when there are no debts', () => {
    const ctx = {
      repoInfo: { repo_id: 'test', repo_name: 'my-repo', repo_root: '/tmp' },
      repoPref: { learning_enabled: 1, exists: true },
      debts: [],
      masteryLevel: 'L1',
      initialized: true,
      lastInit: Date.now(),
    };
    assert.equal(buildWelcomeMessage(ctx), null);
  });

  it('returns debt reminder when debts exist', () => {
    const ctx = {
      repoInfo: { repo_id: 'test', repo_name: 'my-repo', repo_root: '/tmp' },
      repoPref: { learning_enabled: 1, exists: true },
      debts: [
        { task_description: 'Add auth', area: 'security', topics: 'auth', created_at: '2026-01-01' },
      ],
      masteryLevel: 'L1',
      initialized: true,
      lastInit: Date.now(),
    };
    const msg = buildWelcomeMessage(ctx);
    assert.ok(msg !== null);
    assert.ok(msg.includes('my-repo'));
    assert.ok(msg.includes('Add auth'));
    assert.ok(msg.includes('security'));
    assert.ok(msg.includes('catch up'));
  });

  it('lists multiple debts', () => {
    const ctx = {
      repoInfo: { repo_id: 'test', repo_name: 'my-repo', repo_root: '/tmp' },
      repoPref: { learning_enabled: 1, exists: true },
      debts: [
        { task_description: 'Add auth', area: 'security', topics: '', created_at: '2026-01-01' },
        { task_description: 'Fix caching', area: 'performance', topics: '', created_at: '2026-01-02' },
      ],
      masteryLevel: 'L1',
      initialized: true,
      lastInit: Date.now(),
    };
    const msg = buildWelcomeMessage(ctx);
    assert.ok(msg.includes('Add auth'));
    assert.ok(msg.includes('Fix caching'));
    assert.ok(msg.includes('security'));
    assert.ok(msg.includes('performance'));
  });
});
