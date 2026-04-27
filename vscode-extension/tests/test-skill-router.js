/**
 * Tests for skill-router.ts — routing logic, override detection,
 * Iron Law preamble, and skill content loading.
 */
'use strict';

// Must be required before any extension module
require('./setup');

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { routeToSkill, isOverrideRequest, buildIronLawPreamble, loadSkillContent } = require('../out/skill-router');

describe('routeToSkill', () => {
  it('routes build/create requests to learning-first', () => {
    const route = routeToSkill('build a new REST endpoint');
    assert.equal(route?.skillName, 'learning-first');
  });

  it('routes test requests to learning-tdd', () => {
    const route = routeToSkill('write unit tests for the auth module');
    assert.equal(route?.skillName, 'learning-tdd');
  });

  it('routes debug requests to learning-debugging', () => {
    const route = routeToSkill('there is a bug in the login flow');
    assert.equal(route?.skillName, 'learning-debugging');
  });

  it('routes code review requests to learning-code-review', () => {
    const route = routeToSkill('can you review my pull request');
    assert.equal(route?.skillName, 'learning-code-review');
  });

  it('routes review feedback requests to learning-review-feedback', () => {
    const route = routeToSkill('the reviewer said I should refactor this');
    assert.equal(route?.skillName, 'learning-review-feedback');
  });

  it('routes verification requests to learning-verification', () => {
    const route = routeToSkill('I think this is done, ready to ship');
    assert.equal(route?.skillName, 'learning-verification');
  });

  it('routes planning requests to learning-planning', () => {
    const route = routeToSkill('help me plan the architecture for this feature');
    assert.equal(route?.skillName, 'learning-planning');
  });

  it('routes delegation requests to learning-delegation', () => {
    const route = routeToSkill('I need to split work for parallel execution');
    assert.equal(route?.skillName, 'learning-delegation');
  });

  it('routes meta skill requests to writing-learning-skills', () => {
    const route = routeToSkill('I want to create a new learning skill');
    assert.equal(route?.skillName, 'writing-learning-skills');
  });

  it('prefers longer trigger matches (more specific)', () => {
    // "review feedback" should beat "review" alone
    const route = routeToSkill('address the review feedback from the PR');
    assert.equal(route?.skillName, 'learning-review-feedback');
  });

  it('returns null for override requests', () => {
    const route = routeToSkill('just build it, override learning');
    assert.equal(route, null);
  });

  it('returns a route even for vague messages with a keyword', () => {
    const route = routeToSkill('I have an error');
    assert.equal(route?.skillName, 'learning-debugging');
  });
});

describe('isOverrideRequest', () => {
  it('detects "override" keyword', () => {
    assert.equal(isOverrideRequest('please override'), true);
  });

  it('detects "just build it"', () => {
    assert.equal(isOverrideRequest('just build it please'), true);
  });

  it('detects "skip learning"', () => {
    assert.equal(isOverrideRequest('skip learning for now'), true);
  });

  it('detects "just do it"', () => {
    assert.equal(isOverrideRequest('just do it'), true);
  });

  it('detects "just implement"', () => {
    assert.equal(isOverrideRequest('just implement the feature'), true);
  });

  it('detects "don\'t teach"', () => {
    assert.equal(isOverrideRequest("don't teach me, just code"), true);
  });

  it('detects "disable learning"', () => {
    assert.equal(isOverrideRequest('disable learning mode'), true);
  });

  it('is case-insensitive', () => {
    assert.equal(isOverrideRequest('JUST BUILD IT'), true);
  });

  it('returns false for normal learning requests', () => {
    assert.equal(isOverrideRequest('teach me about authentication'), false);
  });

  it('returns false for empty input', () => {
    assert.equal(isOverrideRequest(''), false);
  });
});

describe('buildIronLawPreamble', () => {
  it('includes the Iron Law text', () => {
    const preamble = buildIronLawPreamble('L1');
    assert.ok(preamble.includes('Iron Law'));
    assert.ok(preamble.includes('NEVER write implementation code'));
  });

  it('includes L1 description for beginners', () => {
    const preamble = buildIronLawPreamble('L1');
    assert.ok(preamble.includes('BEGINNER'));
    assert.ok(preamble.includes('L1'));
  });

  it('includes L2 description for intermediate', () => {
    const preamble = buildIronLawPreamble('L2');
    assert.ok(preamble.includes('INTERMEDIATE'));
    assert.ok(preamble.includes('placeholder'));
  });

  it('includes L3 description for experts', () => {
    const preamble = buildIronLawPreamble('L3');
    assert.ok(preamble.includes('EXPERT'));
    assert.ok(preamble.includes('scaffolding'));
  });

  it('wraps in EXTREMELY_IMPORTANT tags', () => {
    const preamble = buildIronLawPreamble('L1');
    assert.ok(preamble.includes('<EXTREMELY_IMPORTANT>'));
    assert.ok(preamble.includes('</EXTREMELY_IMPORTANT>'));
  });
});

describe('loadSkillContent', () => {
  it('returns null for a nonexistent skill', () => {
    const vscode = require('./vscode-mock');
    const result = loadSkillContent(vscode.Uri.file('/nonexistent'), 'no-such-skill');
    assert.equal(result, null);
  });

  it('loads real skill content when plugin root is correct', () => {
    const vscode = require('./vscode-mock');
    // The plugin root should be the parent of vscode-extension/
    const { clearCache, getPluginRoot } = require('../out/cli-bridge');
    clearCache();

    // Point to the actual plugin root
    const pluginRoot = require('path').resolve(__dirname, '..', '..');
    const extensionUri = vscode.Uri.file(require('path').resolve(__dirname, '..'));
    const result = loadSkillContent(extensionUri, 'learning-first');
    assert.ok(result !== null, 'Should load learning-first SKILL.md');
    assert.ok(result.length > 50, 'SKILL.md should have substantial content');
    assert.ok(result.includes('learning-first'), 'SKILL.md should reference its own name');
    clearCache();
  });
});
