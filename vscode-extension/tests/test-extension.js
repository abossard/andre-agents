/**
 * Tests for types.ts — verifies type definitions are importable
 * and structurally correct at runtime.
 */
'use strict';

require('./setup');

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('types module', () => {
  it('exports without error', () => {
    assert.doesNotThrow(() => require('../out/types'));
  });
});

describe('extension module', () => {
  it('exports activate and deactivate', () => {
    const ext = require('../out/extension');
    assert.equal(typeof ext.activate, 'function');
    assert.equal(typeof ext.deactivate, 'function');
  });
});
