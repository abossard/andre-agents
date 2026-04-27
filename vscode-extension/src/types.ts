/**
 * Shared types for the learning-first VS Code extension.
 */

/** Result of a CLI command execution. */
export interface CliResult {
  success: boolean;
  stdout: string;
  stderr: string;
  parsed?: unknown;
}

/** Repo detection result from `cli.js repo detect`. */
export interface RepoInfo {
  repo_id: string;
  repo_name: string;
  repo_root: string;
}

/** Repo preference from `cli.js repo pref`. */
export interface RepoPref {
  exists: boolean;
  learning_enabled: number;
  repo_name?: string;
}

/** Override debt entry. */
export interface OverrideDebt {
  task_description: string;
  area: string;
  topics: string;
  created_at: string;
}

/** Mastery level derived from topic mastery data. */
export type MasteryLevel = 'L1' | 'L2' | 'L3';

/** Skill routing entry. */
export interface SkillRoute {
  /** Keywords/patterns that trigger this skill. */
  triggers: string[];
  /** Skill directory name (e.g., 'learning-first', 'learning-tdd'). */
  skillName: string;
  /** Human-readable description. */
  description: string;
}

/** Cached context for a workspace folder. */
export interface WorkspaceContext {
  repoInfo: RepoInfo | null;
  repoPref: RepoPref | null;
  debts: OverrideDebt[];
  masteryLevel: MasteryLevel;
  initialized: boolean;
  /** Timestamp of last initialization. */
  lastInit: number;
}
