/**
 * Tests for quiz-tools.ts — quiz tracking, confidence, fatigue tools.
 */
'use strict';

require('./setup');

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  QUIZ_TOOLS,
  QUIZ_TOOL_INSTRUCTIONS,
  isQuizTool,
  getTimingState,
  setSessionId,
  resetTimingState,
} = require('../out/quiz-tools');

describe('quiz-tools', () => {
  beforeEach(() => {
    resetTimingState();
  });

  describe('QUIZ_TOOLS definitions', () => {
    it('defines three tools', () => {
      assert.equal(QUIZ_TOOLS.length, 3);
    });

    it('has markQuizQuestion tool', () => {
      const tool = QUIZ_TOOLS.find(t => t.name === 'markQuizQuestion');
      assert.ok(tool, 'markQuizQuestion tool should exist');
      assert.ok(tool.description.length > 0);
      assert.ok(tool.inputSchema);
      assert.deepEqual(tool.inputSchema.required, ['topicId', 'question', 'depth']);
    });

    it('has recordQuizResult tool', () => {
      const tool = QUIZ_TOOLS.find(t => t.name === 'recordQuizResult');
      assert.ok(tool, 'recordQuizResult tool should exist');
      assert.ok(tool.inputSchema);
      assert.deepEqual(
        tool.inputSchema.required,
        ['topicId', 'question', 'userAnswer', 'correct', 'feedback', 'depth']
      );
    });

    it('has checkFatigue tool', () => {
      const tool = QUIZ_TOOLS.find(t => t.name === 'checkFatigue');
      assert.ok(tool, 'checkFatigue tool should exist');
      assert.ok(tool.inputSchema);
      assert.deepEqual(tool.inputSchema.required, ['sessionId']);
    });

    it('recordQuizResult includes confidence field', () => {
      const tool = QUIZ_TOOLS.find(t => t.name === 'recordQuizResult');
      assert.ok(tool.inputSchema.properties.confidence);
      assert.equal(tool.inputSchema.properties.confidence.type, 'number');
    });

    it('recordQuizResult includes quizKind field', () => {
      const tool = QUIZ_TOOLS.find(t => t.name === 'recordQuizResult');
      const quizKind = tool.inputSchema.properties.quizKind;
      assert.ok(quizKind);
      assert.deepEqual(quizKind.enum, ['recall', 'apply', 'transfer', 'explain']);
    });
  });

  describe('isQuizTool', () => {
    it('returns true for quiz tool names', () => {
      assert.equal(isQuizTool('markQuizQuestion'), true);
      assert.equal(isQuizTool('recordQuizResult'), true);
      assert.equal(isQuizTool('checkFatigue'), true);
    });

    it('returns false for unknown tool names', () => {
      assert.equal(isQuizTool('unknownTool'), false);
      assert.equal(isQuizTool(''), false);
    });
  });

  describe('timing state', () => {
    it('starts with null values', () => {
      const state = getTimingState();
      assert.equal(state.lastQuizAskedAt, null);
      assert.equal(state.sessionId, null);
    });

    it('setSessionId updates session', () => {
      setSessionId('test-session-123');
      const state = getTimingState();
      assert.equal(state.sessionId, 'test-session-123');
    });

    it('resetTimingState clears everything', () => {
      setSessionId('test-session');
      resetTimingState();
      const state = getTimingState();
      assert.equal(state.lastQuizAskedAt, null);
      assert.equal(state.sessionId, null);
    });
  });

  describe('QUIZ_TOOL_INSTRUCTIONS', () => {
    it('is a non-empty string', () => {
      assert.equal(typeof QUIZ_TOOL_INSTRUCTIONS, 'string');
      assert.ok(QUIZ_TOOL_INSTRUCTIONS.length > 100);
    });

    it('mentions markQuizQuestion', () => {
      assert.ok(QUIZ_TOOL_INSTRUCTIONS.includes('markQuizQuestion'));
    });

    it('mentions recordQuizResult', () => {
      assert.ok(QUIZ_TOOL_INSTRUCTIONS.includes('recordQuizResult'));
    });

    it('mentions checkFatigue', () => {
      assert.ok(QUIZ_TOOL_INSTRUCTIONS.includes('checkFatigue'));
    });

    it('mentions confidence tracking', () => {
      assert.ok(QUIZ_TOOL_INSTRUCTIONS.includes('confidence'));
    });

    it('mentions fatigue threshold', () => {
      assert.ok(QUIZ_TOOL_INSTRUCTIONS.includes('0.6'));
    });
  });
});
