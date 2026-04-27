/**
 * Context Manager — lazy initialization of workspace context.
 *
 * On first chat request per workspace folder, detects repo, checks opt-in,
 * checks override debts, and optionally starts the dashboard.
 */

import * as vscode from 'vscode';
import { runCliJson, runCli } from './cli-bridge';
import type { RepoInfo, RepoPref, OverrideDebt, MasteryLevel, WorkspaceContext } from './types';

const contextCache = new Map<string, WorkspaceContext>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get or initialize context for the current workspace.
 * Lazy — only runs CLI commands on first access or after TTL expiry.
 */
export async function getContext(extensionUri: vscode.Uri): Promise<WorkspaceContext> {
  const workspaceKey = getWorkspaceKey();
  const cached = contextCache.get(workspaceKey);

  if (cached?.initialized && (Date.now() - cached.lastInit) < CACHE_TTL_MS) {
    return cached;
  }

  const ctx = await initializeContext(extensionUri);
  contextCache.set(workspaceKey, ctx);
  return ctx;
}

/**
 * Force refresh context (e.g., after repo enable/disable).
 */
export async function refreshContext(extensionUri: vscode.Uri): Promise<WorkspaceContext> {
  const workspaceKey = getWorkspaceKey();
  contextCache.delete(workspaceKey);
  return getContext(extensionUri);
}

async function initializeContext(extensionUri: vscode.Uri): Promise<WorkspaceContext> {
  const ctx: WorkspaceContext = {
    repoInfo: null,
    repoPref: null,
    debts: [],
    masteryLevel: 'L1',
    initialized: true,
    lastInit: Date.now(),
  };

  // Detect repo
  ctx.repoInfo = await runCliJson<RepoInfo>(extensionUri, ['repo', 'detect']);
  if (!ctx.repoInfo?.repo_id) {
    return ctx;
  }

  // Check opt-in preference
  ctx.repoPref = await runCliJson<RepoPref>(extensionUri, ['repo', 'pref', ctx.repoInfo.repo_id]);

  // Check override debts
  if (ctx.repoPref?.learning_enabled) {
    const debtsResult = await runCliJson<OverrideDebt[]>(extensionUri, ['repo', 'debts', ctx.repoInfo.repo_id]);
    ctx.debts = debtsResult ?? [];
  }

  // Get mastery level
  if (ctx.repoPref?.learning_enabled) {
    ctx.masteryLevel = await detectMasteryLevel(extensionUri, ctx.repoInfo.repo_id);
  }

  // Auto-start dashboard if configured
  const config = vscode.workspace.getConfiguration('learning-first');
  if (config.get<boolean>('autoStartDashboard', true)) {
    // Fire and forget — don't block on dashboard
    runCli(extensionUri, ['server', 'start']).catch(() => { /* ignore */ });
  }

  return ctx;
}

async function detectMasteryLevel(extensionUri: vscode.Uri, repoId: string): Promise<MasteryLevel> {
  const result = await runCli(extensionUri, ['topic', 'mastery', '--repo', repoId]);
  if (!result.success) return 'L1';

  try {
    const data = JSON.parse(result.stdout);
    // Determine level based on mastered topics and quiz accuracy
    const masteredCount = data.mastered_count ?? 0;
    const accuracy = data.quiz_accuracy ?? 0;

    if (masteredCount >= 5 && accuracy > 85) return 'L3';
    if (masteredCount >= 2 && accuracy >= 60) return 'L2';
    return 'L1';
  } catch {
    return 'L1';
  }
}

function getWorkspaceKey(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }
  return '__no_workspace__';
}

/**
 * Build the welcome/debt reminder message for first interaction.
 */
export function buildWelcomeMessage(ctx: WorkspaceContext): string | null {
  if (!ctx.repoInfo || !ctx.repoPref?.learning_enabled) {
    return null;
  }

  if (ctx.debts.length > 0) {
    const debtList = ctx.debts
      .map(d => `- ${d.task_description} (${d.area})`)
      .join('\n');
    return `Welcome back to **${ctx.repoInfo.repo_name}**! Last time you used override mode for:\n${debtList}\n\nWould you like a quick catch-up curriculum on those topics? (Just say "catch up" anytime)`;
  }

  return null;
}
