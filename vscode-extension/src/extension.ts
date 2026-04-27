/**
 * Learning First — VS Code Chat Participant Extension
 *
 * Registers the @learning-first chat participant that teaches developers
 * through Socratic questioning instead of writing code for them.
 *
 * Architecture: thin extension shell → CLI bridge → existing Node.js backend.
 * The extension NEVER reimplements logic — it delegates to `src/cli.js`.
 */

import * as vscode from 'vscode';
import { registerParticipant } from './participant';
import { clearCache } from './cli-bridge';

export function activate(context: vscode.ExtensionContext) {
  // Register the @learning-first chat participant
  registerParticipant(context);

  // Listen for config changes to clear cached paths
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('learning-first')) {
        clearCache();
      }
    })
  );

  console.log('Learning First extension activated');
}

export function deactivate() {
  console.log('Learning First extension deactivated');
}
