/**
 * Quiz Tools — Language Model tools for structured quiz tracking.
 *
 * Solves the "inherent to the chat model" gap: quizzes in the extension
 * are free-form LLM conversation, so we give the model tools to call
 * when it asks quiz questions and evaluates answers. This lets us record
 * structured quiz data (correctness, confidence, timing) via the CLI.
 */

import * as vscode from 'vscode';
import { runCli } from './cli-bridge';
import type { RecordQuizInput, CheckFatigueInput, QuizTimingState } from './types';

// ── Tool definitions passed to sendRequest ──────────────────────────

export const QUIZ_TOOLS: vscode.LanguageModelChatTool[] = [
  {
    name: 'markQuizQuestion',
    description:
      'Call this IMMEDIATELY after you present a quiz question to the learner. ' +
      'This records that a quiz has been asked so we can measure response time.',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Snake-case topic identifier, e.g. "git-branching"',
        },
        question: {
          type: 'string',
          description: 'The exact quiz question text',
        },
        depth: {
          type: 'number',
          description: 'Difficulty level 1-3',
        },
        quizKind: {
          type: 'string',
          enum: ['recall', 'apply', 'transfer', 'explain'],
          description: 'The type of quiz question',
        },
      },
      required: ['topicId', 'question', 'depth'],
    },
  },
  {
    name: 'recordQuizResult',
    description:
      'Call this after evaluating the learner\'s answer to a quiz question. ' +
      'Records correctness, feedback, and optionally their confidence prediction.',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Snake-case topic identifier matching the question',
        },
        question: {
          type: 'string',
          description: 'The original quiz question',
        },
        userAnswer: {
          type: 'string',
          description: 'Summary of the learner\'s answer',
        },
        correct: {
          type: 'boolean',
          description: 'Whether the answer was correct',
        },
        feedback: {
          type: 'string',
          description: 'Feedback on the answer',
        },
        depth: {
          type: 'number',
          description: 'Difficulty level 1-3',
        },
        quizKind: {
          type: 'string',
          enum: ['recall', 'apply', 'transfer', 'explain'],
          description: 'The type of quiz question',
        },
        confidence: {
          type: 'number',
          description:
            'Learner\'s self-reported confidence prediction (1-5). ' +
            'Only include if the learner provided a confidence rating.',
        },
      },
      required: ['topicId', 'question', 'userAnswer', 'correct', 'feedback', 'depth'],
    },
  },
  {
    name: 'checkFatigue',
    description:
      'Call this periodically (e.g. after 3+ quiz questions in a session) to check ' +
      'if the learner might need a break. Returns fatigue score and break suggestion.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The current learning session ID',
        },
      },
      required: ['sessionId'],
    },
  },
];

// ── Per-conversation quiz timing state ──────────────────────────────

/** Module-level timing state — reset per conversation via resetTimingState(). */
let timingState: QuizTimingState = {
  lastQuizAskedAt: null,
  sessionId: null,
};

export function getTimingState(): QuizTimingState {
  return timingState;
}

export function setSessionId(id: string): void {
  timingState.sessionId = id;
}

export function resetTimingState(): void {
  timingState = { lastQuizAskedAt: null, sessionId: null };
}

// ── Tool execution ──────────────────────────────────────────────────

/**
 * Execute a quiz tool call and return the result content.
 */
export async function executeQuizTool(
  toolName: string,
  input: object,
  extensionUri: vscode.Uri,
  repoId: string,
): Promise<string> {
  switch (toolName) {
    case 'markQuizQuestion':
      return handleMarkQuizQuestion(input as { topicId: string; question: string; depth: number; quizKind?: string });

    case 'recordQuizResult':
      return handleRecordQuizResult(input as RecordQuizInput, extensionUri, repoId);

    case 'checkFatigue':
      return handleCheckFatigue(input as CheckFatigueInput, extensionUri);

    default:
      return `Unknown tool: ${toolName}`;
  }
}

/**
 * Check if a tool name is one of our quiz tools.
 */
export function isQuizTool(name: string): boolean {
  return QUIZ_TOOLS.some(t => t.name === name);
}

// ── Tool handlers ───────────────────────────────────────────────────

function handleMarkQuizQuestion(
  input: { topicId: string; question: string; depth: number; quizKind?: string },
): string {
  timingState.lastQuizAskedAt = Date.now();
  return JSON.stringify({
    ok: true,
    message: 'Quiz question timestamp recorded. Present the question to the learner now.',
    topicId: input.topicId,
  });
}

async function handleRecordQuizResult(
  input: RecordQuizInput,
  extensionUri: vscode.Uri,
  repoId: string,
): Promise<string> {
  // Compute response time if we have a quiz-asked timestamp
  let responseTimeMs: number | null = null;
  if (timingState.lastQuizAskedAt) {
    responseTimeMs = Date.now() - timingState.lastQuizAskedAt;
    timingState.lastQuizAskedAt = null; // reset for next question
  }

  const cliArgs = [
    'quiz', 'record',
    input.topicId,
    input.question,
    input.userAnswer,
    input.correct ? '1' : '0',
    input.feedback,
    String(input.depth ?? 1),
    '--repo', repoId,
  ];

  // Add optional flags
  if (timingState.sessionId) {
    cliArgs.push('--session', timingState.sessionId);
  }
  if (responseTimeMs !== null) {
    cliArgs.push('--response-time', String(Math.round(responseTimeMs)));
  }
  if (input.confidence != null && input.confidence >= 1 && input.confidence <= 5) {
    cliArgs.push('--confidence', String(input.confidence));
  }

  const result = await runCli(extensionUri, cliArgs);

  if (!result.success) {
    return JSON.stringify({ ok: false, error: result.stderr });
  }

  return JSON.stringify({
    ok: true,
    recorded: result.parsed,
    responseTimeMs,
    message: 'Quiz result recorded successfully.',
  });
}

async function handleCheckFatigue(
  input: CheckFatigueInput,
  extensionUri: vscode.Uri,
): Promise<string> {
  const sessionId = input.sessionId || timingState.sessionId;
  if (!sessionId) {
    return JSON.stringify({ ok: false, error: 'No active session' });
  }

  const result = await runCli(extensionUri, ['session', 'fatigue', sessionId]);

  if (!result.success) {
    return JSON.stringify({ ok: false, error: result.stderr });
  }

  return JSON.stringify({
    ok: true,
    ...(result.parsed as object),
    message: 'Fatigue check complete.',
  });
}

// ── Prompt instructions for quiz tools ──────────────────────────────

export const QUIZ_TOOL_INSTRUCTIONS = `
## Quiz Tracking Protocol

You have access to quiz tracking tools. You MUST use them consistently:

1. **Before asking a quiz question**: Call \`markQuizQuestion\` with the topic, question text, and difficulty.
   Then present the question to the learner.

2. **After evaluating an answer**: Call \`recordQuizResult\` with the evaluation data.
   If the learner mentioned their confidence level (1-5), include it.

3. **After 3+ quiz questions**: Call \`checkFatigue\` to see if the learner needs a break.
   If fatigue score > 0.6 or a break is suggested, recommend a short break.

### Confidence Tracking (Metacognition)
After the learner answers a quiz question, ask them:
"On a scale of 1-5, how confident were you in that answer? (1=guessing, 5=certain)"
Include their response in the \`confidence\` field of \`recordQuizResult\`.

### Important
- Always use snake-case for topicId (e.g., "error-handling", "git-branching")
- The depth field is 1 (basic), 2 (intermediate), or 3 (advanced)
- quizKind is one of: recall, apply, transfer, explain
`;
