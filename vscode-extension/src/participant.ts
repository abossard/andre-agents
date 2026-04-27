/**
 * Chat Participant — the @learning-first handler.
 *
 * Single participant with internal persona routing.
 * Handles all slash commands and general learning interactions.
 */

import * as vscode from 'vscode';
import { runCli, runCliJson } from './cli-bridge';
import { getContext, refreshContext, buildWelcomeMessage } from './context-manager';
import { routeToSkill, isOverrideRequest, buildPromptPrefix } from './skill-router';
import type { RepoInfo } from './types';

const PARTICIPANT_ID = 'learning-first.learning-first';

/** Track whether we've shown the welcome/debt message this session. */
let welcomeShown = false;

export function registerParticipant(context: vscode.ExtensionContext): void {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<vscode.ChatResult> => {
    const extensionUri = context.extensionUri;

    // Handle slash commands
    if (request.command) {
      return handleCommand(request, stream, extensionUri, token);
    }

    // Handle general learning interaction
    return handleLearningRequest(request, chatContext, stream, extensionUri, token);
  };

  const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');

  // Follow-up suggestions
  participant.followupProvider = {
    provideFollowups(result, _context, _token) {
      const meta = result.metadata as Record<string, unknown> | undefined;
      if (meta?.command === 'status') {
        return [
          { prompt: 'Show my achievements', label: 'View achievements', command: 'achievements' },
          { prompt: 'Show quiz stats', label: 'View stats', command: 'stats' },
        ];
      }
      return [];
    },
  };

  context.subscriptions.push(participant);
}

/**
 * Handle slash commands: /status, /achievements, /stats, /reset
 */
async function handleCommand(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  extensionUri: vscode.Uri,
  _token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  const command = request.command!;

  const commandMap: Record<string, string[]> = {
    status: ['profile'],
    achievements: ['achievement', 'list'],
    stats: ['quiz', 'stats'],
    reset: ['profile', 'reset'],
  };

  const cliArgs = commandMap[command];
  if (!cliArgs) {
    stream.markdown(`Unknown command: /${command}`);
    return { metadata: { command } };
  }

  stream.progress(`Running /${command}...`);

  if (command === 'reset') {
    // Confirm before resetting
    stream.markdown('⚠️ **Are you sure you want to reset your learning progress?**\n\nThis will clear all topic mastery, quiz history, and curriculum state. Type "confirm reset" to proceed.');
    return { metadata: { command: 'reset-confirm' } };
  }

  const result = await runCli(extensionUri, cliArgs);

  if (!result.success) {
    stream.markdown(`❌ Error running /${command}: ${result.stderr}`);
    return { metadata: { command } };
  }

  // Format the output
  if (result.parsed) {
    stream.markdown(formatCommandOutput(command, result.parsed));
  } else {
    stream.markdown('```\n' + result.stdout + '\n```');
  }

  return { metadata: { command } };
}

/**
 * Handle general learning requests — the core teaching flow.
 */
async function handleLearningRequest(
  request: vscode.ChatRequest,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  extensionUri: vscode.Uri,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  // Lazy-init workspace context
  let ctx = await getContext(extensionUri);

  // Check if this is a response to the repo opt-in prompt
  if (ctx.repoInfo && !ctx.repoPref?.exists) {
    const previousTurnWasOptIn = chatContext.history.some(
      turn =>
        turn instanceof vscode.ChatResponseTurn &&
        (turn.result as vscode.ChatResult)?.metadata?.command === 'repo-opt-in'
    );

    const normalizedPrompt = request.prompt.trim().toLowerCase();
    if (previousTurnWasOptIn && (normalizedPrompt === 'yes' || normalizedPrompt === 'no')) {
      const enabled = normalizedPrompt === 'yes' ? 1 : 0;
      await runCli(extensionUri, [
        'repo', 'enable',
        ctx.repoInfo.repo_id, ctx.repoInfo.repo_name, String(enabled),
      ]);
      // Refresh context to pick up the new preference
      ctx = await refreshContext(extensionUri);
      if (enabled) {
        stream.markdown(`✅ Learning mode **enabled** for **${ctx.repoInfo!.repo_name}**. I'll teach concepts before you implement.\n\nAsk me anything to get started!`);
      } else {
        stream.markdown(`👍 Learning mode **disabled** for **${ctx.repoInfo!.repo_name}**. I'll work normally.`);
      }
      return { metadata: { command: 'repo-opt-in-response' } };
    }

    // First interaction: show opt-in prompt
    stream.markdown(
      `👋 I notice this is your first time in **${ctx.repoInfo.repo_name}** with Learning First.\n\n` +
      `Would you like learning mode active for this repository?\n` +
      `- **"yes"** — I'll teach concepts before you implement (recommended for learning)\n` +
      `- **"no"** — I'll work normally without the teaching workflow`
    );
    return { metadata: { command: 'repo-opt-in' } };
  }

  // Show welcome/debt message once per session
  if (!welcomeShown && ctx.repoPref?.learning_enabled) {
    const welcomeMsg = buildWelcomeMessage(ctx);
    if (welcomeMsg) {
      stream.markdown(welcomeMsg + '\n\n---\n\n');
    }
    welcomeShown = true;
  }

  // If learning is disabled, work normally (pass through to model)
  if (!ctx.repoPref?.learning_enabled) {
    return handlePassthrough(request, stream, token);
  }

  // Check for override request
  if (isOverrideRequest(request.prompt)) {
    return handleOverride(request, stream, extensionUri, ctx.repoInfo!, token);
  }

  // Route to appropriate skill
  const route = routeToSkill(request.prompt);
  const skillName = route?.skillName ?? 'learning-first';

  stream.progress(`Teaching with ${route?.description ?? 'learning-first'}...`);

  // Build the prompt with Iron Law + persona + skill instructions
  const promptPrefix = buildPromptPrefix(extensionUri, skillName, ctx.masteryLevel);

  let fullResponse = '';
  try {
    const messages = [
      vscode.LanguageModelChatMessage.User(promptPrefix),
      // Include relevant chat history context
      ...buildHistoryContext(chatContext),
      vscode.LanguageModelChatMessage.User(request.prompt),
    ];

    const chatResponse = await request.model.sendRequest(messages, {}, token);

    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
      fullResponse += fragment;
    }
  } catch (err) {
    handleLLMError(err, stream);
  }

  // Record topics and session in the background
  if (ctx.repoInfo && fullResponse) {
    recordLearningProgress(request, extensionUri, ctx.repoInfo, skillName, request.prompt)
      .catch(() => { /* fire and forget */ });
  }

  return { metadata: { command: '', skill: skillName } };
}

/**
 * Record learning progress: create a session and upsert a topic based on
 * the user's prompt and the matched skill. No LLM call needed — derive the
 * topic deterministically from the request.
 */
async function recordLearningProgress(
  _request: vscode.ChatRequest,
  extensionUri: vscode.Uri,
  repoInfo: RepoInfo,
  skillName: string,
  userPrompt: string,
): Promise<void> {
  // Start a session
  const sessionResult = await runCli(extensionUri, [
    'session', 'start', '--repo', repoInfo.repo_id,
  ]);

  const sessionId = sessionResult.parsed
    ? (sessionResult.parsed as { session_id?: string }).session_id
    : undefined;

  // Derive a topic from the user prompt — simple deterministic extraction
  const topicId = userPrompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

  // Map skill name to domain
  const skillToDomain: Record<string, string> = {
    'learning-first': 'general',
    'learning-tdd': 'testing',
    'learning-debugging': 'debugging',
    'learning-code-review': 'code-quality',
    'learning-review-feedback': 'code-quality',
    'learning-verification': 'verification',
    'learning-planning': 'architecture',
    'learning-delegation': 'workflow',
    'writing-learning-skills': 'meta',
  };

  const domain = skillToDomain[skillName] ?? 'general';

  // Create a human-readable title from the prompt
  const title = userPrompt.length > 80
    ? userPrompt.slice(0, 77) + '...'
    : userPrompt;

  if (topicId) {
    await runCli(extensionUri, [
      'topic', 'upsert',
      topicId, domain, title, 'repo', '1',
      '--repo', repoInfo.repo_id,
    ]);

    await runCli(extensionUri, [
      'topic', 'status',
      topicId, 'in_progress',
      '--repo', repoInfo.repo_id,
    ]);
  }

  // End the session
  if (sessionId) {
    await runCli(extensionUri, ['session', 'end', sessionId]).catch(() => {});
  }
}

/**
 * Handle override request — record debt and pass through.
 */
async function handleOverride(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  extensionUri: vscode.Uri,
  repoInfo: RepoInfo,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  stream.markdown(
    '✅ **Override mode activated.** I\'ll work normally for this request.\n\n' +
    'I\'ll prepare a catch-up curriculum for next time.\n\n---\n\n'
  );

  // Record the override debt
  await runCli(extensionUri, [
    'repo', 'override', repoInfo.repo_id,
    request.prompt.slice(0, 100), // task description
    'general', // area
  ]);

  // Pass through to model without teaching constraints
  return handlePassthrough(request, stream, token);
}

/**
 * Pass through to the model without learning constraints.
 */
async function handlePassthrough(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  try {
    const messages = [
      vscode.LanguageModelChatMessage.User(request.prompt),
    ];

    const chatResponse = await request.model.sendRequest(messages, {}, token);

    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  } catch (err) {
    handleLLMError(err, stream);
  }

  return { metadata: { command: 'passthrough' } };
}

/**
 * Build context messages from chat history.
 */
function buildHistoryContext(
  chatContext: vscode.ChatContext
): vscode.LanguageModelChatMessage[] {
  const messages: vscode.LanguageModelChatMessage[] = [];

  // Include last few turns for context (limit to avoid token overflow)
  const recentHistory = chatContext.history.slice(-6);

  for (const turn of recentHistory) {
    if (turn instanceof vscode.ChatRequestTurn) {
      messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
    } else if (turn instanceof vscode.ChatResponseTurn) {
      const text = turn.response
        .filter((r): r is vscode.ChatResponseMarkdownPart => r instanceof vscode.ChatResponseMarkdownPart)
        .map(r => r.value.value)
        .join('');
      if (text) {
        messages.push(vscode.LanguageModelChatMessage.Assistant(text));
      }
    }
  }

  return messages;
}

/**
 * Format command output for display.
 */
function formatCommandOutput(command: string, data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
  }

  const obj = data as Record<string, unknown>;

  switch (command) {
    case 'status': {
      let output = '## 📚 Learning Profile\n\n';
      if (obj.topics && Array.isArray(obj.topics)) {
        output += '| Topic | Level | Status |\n|---|---|---|\n';
        for (const t of obj.topics as Array<Record<string, string>>) {
          output += `| ${t.name ?? '?'} | ${t.depth_level ?? '?'} | ${t.status ?? '?'} |\n`;
        }
      }
      if (obj.repo_areas && Array.isArray(obj.repo_areas)) {
        output += '\n### Repo Knowledge Areas\n';
        for (const a of obj.repo_areas as Array<Record<string, string>>) {
          output += `- ${a.area ?? '?'}: ${a.status ?? '?'}\n`;
        }
      }
      return output;
    }

    case 'achievements': {
      let output = '## 🏆 Achievements\n\n';
      if (Array.isArray(data)) {
        if (data.length === 0) {
          output += '*No achievements earned yet. Keep learning!*\n';
        } else {
          for (const a of data as Array<Record<string, string>>) {
            output += `- **${a.title ?? a.name ?? '?'}** — ${a.description ?? ''}\n`;
          }
        }
      }
      return output;
    }

    case 'stats': {
      let output = '## 📊 Quiz Statistics\n\n';
      output += `- **Total quizzes:** ${obj.total ?? 0}\n`;
      output += `- **Correct:** ${obj.correct ?? 0}\n`;
      output += `- **Accuracy:** ${obj.accuracy ?? '0'}%\n`;
      if (obj.by_topic && typeof obj.by_topic === 'object') {
        output += '\n### By Topic\n';
        for (const [topic, stats] of Object.entries(obj.by_topic as Record<string, Record<string, unknown>>)) {
          output += `- **${topic}:** ${stats.correct ?? 0}/${stats.total ?? 0}\n`;
        }
      }
      return output;
    }

    default:
      return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
  }
}

function handleLLMError(err: unknown, stream: vscode.ChatResponseStream): void {
  if (err instanceof vscode.LanguageModelError) {
    console.error('LLM Error:', err.message, err.code);
    if (err.cause instanceof Error && err.cause.message.includes('off_topic')) {
      stream.markdown('I can only help with learning-related topics in this context.');
    } else {
      stream.markdown(`⚠️ Model error: ${err.message}`);
    }
  } else {
    throw err;
  }
}
