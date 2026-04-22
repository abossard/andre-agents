# Learning-First: A Learning-Focused Skill Plugin

**Date:** 2026-04-22
**Status:** Design — awaiting implementation plan

## Problem Statement

When AI agents help developers implement features, the developer often doesn't deeply understand what's being built — the patterns, trade-offs, and codebase context behind the implementation. This is especially problematic during team onboarding, where new members need to build genuine understanding, not just have code written for them.

## Proposed Solution

A plugin that **replaces the brainstorming skill** with a learning-first workflow. Before implementation, the agent:

1. Analyzes the codebase and task to identify what concepts the developer needs to understand
2. Generates a dynamic curriculum tailored to the developer's current knowledge level
3. Teaches concepts using real codebase examples
4. Quizzes the developer to assess understanding (soft gate — skippable)
5. Adapts depth based on quiz performance
6. Only then proceeds to design and implementation planning

## Target Users

- **Team onboarding** — new team members learning a shared codebase
- The system tracks knowledge progression per user so that returning to the same codebase deepens understanding over time

## Architecture: Skill + Runtime Scripts (Approach B)

A SKILL.md defines agent behavior. Helper shell scripts manage persistence (SQLite knowledge DB, curriculum state, achievements). The agent calls scripts via `bash`.

### Plugin Structure

```
andre-agents/
├── .claude-plugin/
│   └── plugin.json              # Claude Code plugin manifest
├── .github/
│   └── copilot/                 # Copilot CLI discovery
├── CLAUDE.md                    # Claude Code instructions
├── AGENTS.md                    # Copilot CLI instructions
├── package.json                 # Version, metadata
├── skills/
│   └── learning-first/
│       ├── SKILL.md             # Core skill — agent behavior definition
│       └── curriculum-guide.md  # How curriculum generation works
├── scripts/
│   ├── knowledge-db.sh          # Init/query/update SQLite DB
│   ├── curriculum.sh            # Generate/fetch/advance curriculum
│   ├── quiz.sh                  # Submit answers, evaluate
│   └── achievements.sh          # Track and list milestones
├── schemas/
│   └── knowledge.sql            # DB schema definition
└── README.md                    # Installation + usage docs
```

### Installation

- **Claude Code:** `claude plugin add /path/to/andre-agents`
- **Copilot CLI:** Clone/symlink to plugin discovery directory
- **Updates:** `git pull`

## Learning Flow

```
USER REQUEST ("Add JWT auth to the API")
        │
        ▼
1. CONTEXT SCAN
   - Analyze codebase: frameworks, languages, existing patterns
   - Check user's knowledge profile for prior learning
   - Identify what concepts this task involves
        │
        ▼
2. CURRICULUM GENERATION
   - Build a task-specific learning path
   - Skip topics the user has already mastered
   - Calibrate depth based on prior quiz performance
   Example modules:
     Module 1: "Project Auth Architecture" (codebase-specific)
     Module 2: "JWT Fundamentals" (conceptual)
     Module 3: "Express Middleware Patterns" (framework)
     Module 4: "Security Considerations" (design)
        │
        ▼
3. TEACH + QUIZ LOOP (per module)
   a) Teach: explain concept using real code from the codebase
   b) Quiz: 2-3 questions testing understanding
   c) Evaluate: correct → advance, wrong → re-teach once
   d) User can say "skip" at any time (soft gate)
   e) Record results to knowledge DB
        │
        ▼
4. DESIGN CHECKPOINT
   - Present implementation design (like brainstorming's "propose approaches")
   - User can now make informed decisions because they understand the concepts
   - This is where the learning pays off — informed design collaboration
        │
        ▼
5. RECORD & TRANSITION
   - Save progress + achievements to knowledge DB
   - Transition to writing-plans skill for implementation
```

### Key Principle

The curriculum is **task-specific**. It doesn't teach "everything about JWT" — it teaches exactly what this user needs to understand to make good design decisions about *this* implementation in *this* codebase.

## Knowledge Database

### Storage Location

`~/.learning-first/knowledge.db` — local SQLite file, per user, per machine.

### Schema

```sql
CREATE TABLE IF NOT EXISTS knowledge_topics (
    id TEXT PRIMARY KEY,           -- e.g., 'jwt-fundamentals'
    domain TEXT NOT NULL,          -- e.g., 'authentication'
    title TEXT NOT NULL,           -- 'JWT Fundamentals'
    depth_level INTEGER DEFAULT 1, -- 1=intro, 2=intermediate, 3=deep
    status TEXT DEFAULT 'not_started',
                                   -- 'not_started', 'in_progress', 'mastered', 'skipped'
    first_seen_at TEXT,
    mastered_at TEXT
);

CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id TEXT NOT NULL REFERENCES knowledge_topics(id),
    question TEXT NOT NULL,
    user_answer TEXT,
    correct INTEGER NOT NULL,      -- 0 or 1
    feedback TEXT,                  -- Agent's feedback on the answer
    asked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,           -- e.g., 'mastered-auth-module'
    title TEXT NOT NULL,           -- 'Mastered Auth Module'
    description TEXT,              -- 'Demonstrated deep understanding of...'
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    context TEXT                   -- Which task/repo triggered this
);

CREATE TABLE IF NOT EXISTS repo_knowledge (
    repo_path TEXT NOT NULL,
    area TEXT NOT NULL,            -- e.g., 'src/auth/', 'database layer'
    familiarity TEXT DEFAULT 'none',
                                   -- 'none', 'basic', 'solid', 'expert'
    last_assessed_at TEXT,
    PRIMARY KEY (repo_path, area)
);
```

### Depth Progression

| Encounter | Level | Behavior |
|-----------|-------|----------|
| 1st time seeing "JWT" | Level 1 | What is it, why use it, basic structure |
| 2nd task involving JWT | Level 2 | Token refresh, claim validation, key rotation |
| 3rd+ time | Level 3 | Security edge cases, timing attacks, custom claims |

The agent checks `depth_level` and `quiz_results` to calibrate question difficulty. If the user aces Level 1, the system skips ahead. If they struggle, it adds more Level 1 content.

## Quiz Mechanics

### Question Types by Depth

| Level | Style | Example |
|-------|-------|---------|
| 1 (Intro) | Multiple choice, concept recognition | "What does JWT stand for? A) ... B) ..." |
| 2 (Intermediate) | Scenario-based, apply to codebase | "Looking at `src/auth/middleware.ts`, what happens if token refresh fails?" |
| 3 (Deep) | Open-ended design critique | "The current auth flow stores tokens in localStorage. What are the security implications?" |

### Evaluation

- The agent evaluates answers conversationally — not exact string matching
- "Good enough" counts — the goal is understanding, not perfection
- Wrong answers get one re-explanation and one more chance, then move on
- All results are recorded to the knowledge DB for future calibration

### Adaptive Behavior

- All L1 correct → skip to L2
- Struggles with L1 → add more L1 questions, don't advance
- "Skip" → record as skipped, note in design doc, move on

### The "Skip" Escape Hatch

The user can always say "skip", "I know this", or "let's move on". The agent:
- Records the skip in the DB with topic status = 'skipped'
- Notes what was skipped in the design document
- Moves to the next module or to the design checkpoint
- Does not shame or pressure the user

## Achievements

**Style:** Serious milestones only — professional, not gamified.

**Generated dynamically** by the agent based on milestones:

| Trigger | Achievement Example |
|---------|-------------------|
| Master a topic area | "Mastered: Database Layer" |
| Complete all modules for a task | "Ready to Ship: JWT Auth" |
| Deep-dive security review | "Security Sentinel: Auth Module" |
| First task in a new repo | "Explorer: project-name" |
| Return to deepen knowledge | "Deepening: Auth Patterns (L2→L3)" |

Achievements are stored in the local knowledge DB and displayed when the agent greets the user or when progress is queried.

## Script Interface

The agent interacts with the knowledge system via bash scripts:

### knowledge-db.sh
```bash
# Initialize DB (idempotent)
./scripts/knowledge-db.sh init

# Get user's knowledge profile
./scripts/knowledge-db.sh get-profile

# Get knowledge for a specific repo area
./scripts/knowledge-db.sh get-repo-knowledge <repo_path> [area]

# Update topic status
./scripts/knowledge-db.sh update-topic <topic_id> <status> [depth_level]
```

### quiz.sh
```bash
# Record a quiz result
./scripts/quiz.sh record <topic_id> <question> <answer> <correct:0|1> [feedback]

# Get quiz history for a topic
./scripts/quiz.sh history <topic_id>

# Get overall stats
./scripts/quiz.sh stats
```

### curriculum.sh
```bash
# Get current curriculum state for a task
./scripts/curriculum.sh get-state <task_id>

# Create a new curriculum (agent provides JSON modules list)
./scripts/curriculum.sh create <task_id> <modules_json>

# Advance to next module
./scripts/curriculum.sh advance <task_id>

# Mark curriculum complete
./scripts/curriculum.sh complete <task_id>
```

### achievements.sh
```bash
# Award an achievement
./scripts/achievements.sh award <id> <title> <description> [context]

# List all achievements
./scripts/achievements.sh list

# Check if achievement already earned
./scripts/achievements.sh check <id>
```

### Script Path Resolution

The SKILL.md references scripts using `$PLUGIN_DIR/scripts/`. The CLAUDE.md and AGENTS.md files set the `LEARNING_FIRST_DIR` environment variable to the plugin's installation path so scripts can be invoked portably:

```bash
bash "$LEARNING_FIRST_DIR/scripts/knowledge-db.sh" init
```

If `LEARNING_FIRST_DIR` is not set, scripts fall back to a relative path from the skill file location.

## Platform Compatibility

| Platform | Installation | Skill Discovery | Script Execution |
|----------|-------------|-----------------|------------------|
| Claude Code | `claude plugin add` or symlink | Reads `.claude-plugin/plugin.json` | `bash scripts/*.sh` |
| Copilot CLI | Clone to plugin dir | Reads plugin metadata | `bash scripts/*.sh` |

Both platforms support:
- Markdown skill files with frontmatter
- Shell script execution via bash tool
- `ask_user`-style interactions for quizzes
- SQLite via system sqlite3 command

## Out of Scope

- Web dashboard / UI for progress visualization
- Multi-user leaderboards or shared progress
- Pre-authored curriculum templates (fully dynamic for v1)
- Integration with LMS or other learning platforms
- Exporting/importing knowledge profiles between machines

## Open Questions (Resolved)

- **Gate strictness?** → Soft gate (user can skip, but progress is noted)
- **Achievement tone?** → Serious milestones only
- **Curriculum source?** → Fully dynamic, agent-generated from codebase analysis
- **Storage?** → Local SQLite per user
