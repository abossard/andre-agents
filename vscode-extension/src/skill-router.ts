/**
 * Skill Router — maps user intent to the appropriate learning skill.
 *
 * Uses a structured routing table (not markdown parsing) to determine
 * which skill content to load for the LLM prompt.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPluginRoot } from './cli-bridge';
import type { SkillRoute, MasteryLevel } from './types';
import type * as vscode from 'vscode';

/** Structured routing table — single source of truth for skill matching. */
const SKILL_ROUTES: SkillRoute[] = [
  {
    triggers: ['build', 'create', 'add', 'implement', 'feature', 'make', 'scaffold', 'deploy', 'set up', 'configure', 'install', 'write'],
    skillName: 'learning-first',
    description: 'Build, create, add a feature',
  },
  {
    triggers: ['test', 'tdd', 'spec', 'coverage', 'unit test', 'integration test'],
    skillName: 'learning-tdd',
    description: 'Write tests, add test coverage',
  },
  {
    triggers: ['bug', 'fix', 'debug', 'error', 'crash', 'broken', 'unexpected', 'not working', 'failing'],
    skillName: 'learning-debugging',
    description: 'Fix a bug, debug an error',
  },
  {
    triggers: ['review', 'code review', 'pr review', 'look at', 'check my'],
    skillName: 'learning-code-review',
    description: 'Get code reviewed',
  },
  {
    triggers: ['review feedback', 'reviewer said', 'review comment', 'address feedback'],
    skillName: 'learning-review-feedback',
    description: 'Respond to review feedback',
  },
  {
    triggers: ['verify', 'done', 'complete', 'ship', 'merge', 'ready'],
    skillName: 'learning-verification',
    description: 'Verify work is complete',
  },
  {
    triggers: ['plan', 'design', 'architect', 'approach', 'strategy', 'breakdown', 'decompose'],
    skillName: 'learning-planning',
    description: 'Create an implementation plan',
  },
  {
    triggers: ['delegate', 'parallel', 'split work', 'distribute', 'multiple tasks'],
    skillName: 'learning-delegation',
    description: 'Decompose work for parallel execution',
  },
  {
    triggers: ['learning skill', 'create skill', 'edit skill', 'write a skill'],
    skillName: 'writing-learning-skills',
    description: 'Create or edit a learning skill',
  },
];

/**
 * Find the best matching skill for a user message.
 * Returns null if no skill matches (work normally).
 */
export function routeToSkill(userMessage: string): SkillRoute | null {
  const lower = userMessage.toLowerCase();

  // Check for override keywords first
  if (isOverrideRequest(lower)) {
    return null;
  }

  // Score each route by number of matching triggers
  let bestRoute: SkillRoute | null = null;
  let bestScore = 0;

  for (const route of SKILL_ROUTES) {
    let score = 0;
    for (const trigger of route.triggers) {
      if (lower.includes(trigger)) {
        // Longer triggers are more specific, weight them higher
        score += trigger.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestRoute = route;
    }
  }

  return bestRoute;
}

/**
 * Check if the user is requesting an override (skip learning).
 */
export function isOverrideRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const overridePatterns = [
    'override',
    'just build it',
    'skip learning',
    'just do it',
    'just implement',
    "don't teach",
    'disable learning',
  ];
  return overridePatterns.some(p => lower.includes(p));
}

/**
 * Load the content of a skill's SKILL.md file.
 */
export function loadSkillContent(extensionUri: vscode.Uri, skillName: string): string | null {
  const pluginRoot = getPluginRoot(extensionUri);
  const skillPath = path.join(pluginRoot, 'skills', skillName, 'SKILL.md');

  try {
    return fs.readFileSync(skillPath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Load an agent persona's content.
 */
export function loadPersona(extensionUri: vscode.Uri, personaName: string): string | null {
  const pluginRoot = getPluginRoot(extensionUri);
  const personaPath = path.join(pluginRoot, 'agents', `${personaName}.md`);

  try {
    return fs.readFileSync(personaPath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Build the Iron Law enforcement preamble for the LLM prompt.
 */
export function buildIronLawPreamble(masteryLevel: MasteryLevel): string {
  const levelDescriptions: Record<MasteryLevel, string> = {
    L1: 'BEGINNER — Teach only, NO code at all. Focus on concepts and understanding.',
    L2: 'INTERMEDIATE — Teach + placeholder comments + failing test skeletons. User fills in logic.',
    L3: 'EXPERT — Teach + scaffolding. User fills in the implementation logic.',
  };

  return `<EXTREMELY_IMPORTANT>
## The Iron Law of Learning First

You NEVER write implementation code. Not even "just a quick example."

You MAY:
- Show existing codebase code for teaching
- Give conceptual pseudocode or analogies
- Add placeholder comments to guide where changes go
- Suggest ideas and approaches at the design level

You MUST NEVER:
- Write functional implementation code
- Generate copy-paste-ready solutions
- Make code changes to the codebase

Current mastery level: ${masteryLevel} — ${levelDescriptions[masteryLevel]}

The test: "Does showing this help them LEARN or help them SKIP learning?"
</EXTREMELY_IMPORTANT>`;
}

/**
 * Build the full prompt prefix for a learning interaction.
 */
export function buildPromptPrefix(
  extensionUri: vscode.Uri,
  skillName: string,
  masteryLevel: MasteryLevel,
  persona: string = 'master-teacher'
): string {
  const parts: string[] = [];

  // Iron Law
  parts.push(buildIronLawPreamble(masteryLevel));

  // Persona
  const personaContent = loadPersona(extensionUri, persona);
  if (personaContent) {
    parts.push('\n## Your Persona\n' + personaContent);
  }

  // Skill instructions
  const skillContent = loadSkillContent(extensionUri, skillName);
  if (skillContent) {
    parts.push('\n## Skill Instructions\n' + skillContent);
  }

  return parts.join('\n\n');
}
