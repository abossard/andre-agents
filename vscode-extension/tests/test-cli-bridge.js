/**
 * Tests for cli-bridge.ts — Node path resolution, plugin root detection,
 * cache management, and CLI execution.
 */
'use strict';

require('./setup');

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { findNode22, getPluginRoot, clearCache, runCli } = require('../out/cli-bridge');

beforeEach(() => {
  clearCache();
});

describe('clearCache', () => {
  it('does not throw', () => {
    assert.doesNotThrow(() => clearCache());
  });

  it('can be called multiple times', () => {
    clearCache();
    clearCache();
  });
});

describe('getPluginRoot', () => {
  beforeEach(() => clearCache());

  it('resolves to parent of extension directory', () => {
    const vscode = require('./vscode-mock');
    const extensionDir = path.resolve(__dirname, '..');
    const extensionUri = vscode.Uri.file(extensionDir);
    const pluginRoot = getPluginRoot(extensionUri);
    // Parent of vscode-extension/ is the repo root, which has src/cli.js
    const expectedRoot = path.resolve(extensionDir, '..');
    const cliExists = fs.existsSync(path.join(expectedRoot, 'src', 'cli.js'));
    if (cliExists) {
      assert.equal(pluginRoot, expectedRoot);
    } else {
      // Falls back to extension path itself
      assert.equal(pluginRoot, extensionDir);
    }
  });

  it('caches the result', () => {
    const vscode = require('./vscode-mock');
    const extensionUri = vscode.Uri.file(path.resolve(__dirname, '..'));
    const first = getPluginRoot(extensionUri);
    const second = getPluginRoot(extensionUri);
    assert.equal(first, second);
  });

  it('resets on clearCache', () => {
    const vscode = require('./vscode-mock');
    const extensionUri = vscode.Uri.file(path.resolve(__dirname, '..'));
    getPluginRoot(extensionUri);
    clearCache();
    // After clearing, it should re-resolve (same result, but proves no crash)
    const result = getPluginRoot(extensionUri);
    assert.ok(typeof result === 'string');
  });
});

describe('findNode22', () => {
  beforeEach(() => clearCache());

  it('returns a string path', async () => {
    const nodePath = await findNode22();
    assert.ok(typeof nodePath === 'string');
    assert.ok(nodePath.length > 0);
  });

  it('caches the result', async () => {
    const first = await findNode22();
    const second = await findNode22();
    assert.equal(first, second);
  });

  it('resets cache on clearCache', async () => {
    await findNode22();
    clearCache();
    const result = await findNode22();
    assert.ok(typeof result === 'string');
  });
});

describe('runCli', () => {
  beforeEach(() => clearCache());

  it('returns failure when CLI path does not exist', async () => {
    const vscode = require('./vscode-mock');
    const extensionUri = vscode.Uri.file('/nonexistent/path');
    clearCache();
    const result = await runCli(extensionUri, ['profile']);
    assert.equal(result.success, false);
    assert.ok(result.stderr.includes('CLI not found'));
  });

  it('returns a CliResult shape', async () => {
    const vscode = require('./vscode-mock');
    const extensionUri = vscode.Uri.file('/nonexistent/path');
    clearCache();
    const result = await runCli(extensionUri, ['init']);
    assert.ok('success' in result);
    assert.ok('stdout' in result);
    assert.ok('stderr' in result);
  });
});
