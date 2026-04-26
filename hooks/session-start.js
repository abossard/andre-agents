#!/usr/bin/env node
// SessionStart hook for learning-first plugin.
// 1. Auto-starts the dashboard server if not running
// 2. Injects the using-learning-first skill into session context
// Must NEVER fail — always exits 0 with valid JSON.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '..');

async function tryAutoStart() {
  try {
    const daemon = await import(path.join(PLUGIN_ROOT, 'src', 'daemon.js'));
    const { shouldAutoStart, startDaemon, status, getSshHint, DEFAULT_PORT } = daemon;

    if (!shouldAutoStart()) {
      if (process.env.SSH_CONNECTION) {
        return `📊 ${getSshHint(DEFAULT_PORT)}`;
      }
      return null;
    }

    const s = await status();
    if (s.running) {
      return `📊 Dashboard: http://localhost:${s.port}/`;
    }

    const result = await startDaemon();
    if (result.alreadyRunning) {
      return `📊 Dashboard: http://localhost:${result.port}/`;
    }
    if (result.started && result.healthy) {
      return `📊 Dashboard started: http://localhost:${result.port}/`;
    }
    if (result.started) {
      return `📊 Dashboard starting on http://localhost:${result.port}/ (logs: ${result.logFile})`;
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const skillPath = path.join(PLUGIN_ROOT, 'skills', 'using-learning-first', 'SKILL.md');
  let skillContent;
  try {
    skillContent = fs.readFileSync(skillPath, 'utf8');
  } catch (err) {
    skillContent = `Error reading using-learning-first skill: ${err.message}`;
  }

  const dashboardMsg = await tryAutoStart();

  let sessionContext = '<EXTREMELY_IMPORTANT>\nYou have learning-first skills.\n\n' +
    '**Below is the full content of your \'learning-first:using-learning-first\' skill - your introduction to using learning skills. For all other skills, use the \'Skill\' tool:**\n\n---\n' +
    skillContent +
    '\n\n</EXTREMELY_IMPORTANT>';

  if (dashboardMsg) {
    sessionContext += `\n\n<current_dashboard>\n${dashboardMsg}\n</current_dashboard>`;
  }

  const output = {};
  if (process.env.CURSOR_PLUGIN_ROOT) {
    output.additional_context = sessionContext;
  } else if (process.env.CLAUDE_PLUGIN_ROOT && !process.env.COPILOT_CLI) {
    output.hookSpecificOutput = {
      hookEventName: 'SessionStart',
      additionalContext: sessionContext,
    };
  } else {
    output.additionalContext = sessionContext;
  }

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main().catch(() => process.exit(0));
