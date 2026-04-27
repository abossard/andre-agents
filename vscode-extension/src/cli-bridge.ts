/**
 * CLI Bridge — spawns `node src/cli.js` commands using Node >= 22.
 *
 * The extension host may run an older Node, so we find a Node 22+ binary
 * and spawn the CLI as a child process.
 */

import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { CliResult } from './types';

const CLI_TIMEOUT_MS = 15_000;

let cachedNodePath: string | null = null;
let cachedPluginRoot: string | null = null;

/**
 * Find a Node.js >= 22 binary.
 * Priority: config setting > nvm > common paths > PATH fallback.
 */
export async function findNode22(): Promise<string> {
  if (cachedNodePath) return cachedNodePath;

  const config = vscode.workspace.getConfiguration('learning-first');
  const configured = config.get<string>('nodePath', '');
  if (configured && fs.existsSync(configured)) {
    cachedNodePath = configured;
    return configured;
  }

  // Try nvm directories
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const nvmCandidates = [
    path.join(home, '.nvm/versions/node'),
    path.join(home, '.local/share/nvm/versions/node'),
  ];

  for (const nvmDir of nvmCandidates) {
    if (!fs.existsSync(nvmDir)) continue;
    try {
      const versions = fs.readdirSync(nvmDir)
        .filter(v => v.startsWith('v'))
        .sort((a, b) => {
          const aMajor = parseInt(a.slice(1).split('.')[0], 10);
          const bMajor = parseInt(b.slice(1).split('.')[0], 10);
          return bMajor - aMajor; // highest first
        });

      for (const ver of versions) {
        const major = parseInt(ver.slice(1).split('.')[0], 10);
        if (major >= 22) {
          const nodeBin = path.join(nvmDir, ver, 'bin', 'node');
          if (fs.existsSync(nodeBin)) {
            cachedNodePath = nodeBin;
            return nodeBin;
          }
        }
      }
    } catch {
      // ignore read errors
    }
  }

  // Common paths
  const commonPaths = [
    '/usr/local/bin/node',
    '/usr/bin/node',
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      // Check version
      try {
        const ver = await execAsync(p, ['--version']);
        const major = parseInt(ver.trim().slice(1).split('.')[0], 10);
        if (major >= 22) {
          cachedNodePath = p;
          return p;
        }
      } catch {
        // skip
      }
    }
  }

  // Fallback: assume `node` in PATH is >= 22
  cachedNodePath = 'node';
  return 'node';
}

/**
 * Resolve the plugin root directory.
 * Priority: config setting > extension bundled path > parent of extension dir.
 */
export function getPluginRoot(extensionUri: vscode.Uri): string {
  if (cachedPluginRoot) return cachedPluginRoot;

  const config = vscode.workspace.getConfiguration('learning-first');
  const configured = config.get<string>('pluginRoot', '');
  if (configured && fs.existsSync(configured)) {
    cachedPluginRoot = configured;
    return configured;
  }

  // Default: extension is at <plugin-root>/vscode-extension/
  const extensionPath = extensionUri.fsPath;
  const parentDir = path.dirname(extensionPath);

  // Verify it looks like the plugin root (has src/cli.js)
  const cliPath = path.join(parentDir, 'src', 'cli.js');
  if (fs.existsSync(cliPath)) {
    cachedPluginRoot = parentDir;
    return parentDir;
  }

  // Fallback: use extension path itself
  cachedPluginRoot = extensionPath;
  return extensionPath;
}

/**
 * Run a CLI command and return the result.
 */
export async function runCli(
  extensionUri: vscode.Uri,
  args: string[],
  options?: { cwd?: string; timeout?: number }
): Promise<CliResult> {
  const nodePath = await findNode22();
  const pluginRoot = getPluginRoot(extensionUri);
  const cliPath = path.join(pluginRoot, 'src', 'cli.js');

  if (!fs.existsSync(cliPath)) {
    return {
      success: false,
      stdout: '',
      stderr: `CLI not found at ${cliPath}`,
    };
  }

  const timeout = options?.timeout ?? CLI_TIMEOUT_MS;
  const cwd = options?.cwd ?? pluginRoot;

  try {
    const stdout = await execAsync(nodePath, ['--no-warnings', cliPath, ...args], {
      cwd,
      timeout,
      env: {
        ...process.env,
        // Ensure the plugin root is available
        LEARNING_FIRST_PLUGIN_ROOT: pluginRoot,
      },
    });

    // Try to parse as JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout.trim());
    } catch {
      // Not JSON — that's fine for some commands
    }

    return { success: true, stdout: stdout.trim(), stderr: '', parsed };
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    return {
      success: false,
      stdout: '',
      stderr: error.stderr || error.message || 'Unknown error',
    };
  }
}

/**
 * Run a CLI command and return parsed JSON, or null on failure.
 */
export async function runCliJson<T>(
  extensionUri: vscode.Uri,
  args: string[]
): Promise<T | null> {
  const result = await runCli(extensionUri, args);
  if (result.success && result.parsed) {
    return result.parsed as T;
  }
  return null;
}

/** Promise wrapper around execFile. */
function execAsync(
  cmd: string,
  args: string[],
  options?: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv }
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, {
      maxBuffer: 1024 * 1024,
      timeout: options?.timeout ?? CLI_TIMEOUT_MS,
      cwd: options?.cwd,
      env: options?.env,
    }, (error, stdout, stderr) => {
      if (error) {
        reject({ ...error, stderr: stderr?.toString() || '' });
      } else {
        resolve(stdout?.toString() || '');
      }
    });
  });
}

/** Clear cached paths (for testing or config changes). */
export function clearCache(): void {
  cachedNodePath = null;
  cachedPluginRoot = null;
}
