# Learning-First Ecosystem v2 — Design Specification

> **Date:** 2026-04-22
> **Status:** Draft
> **Author:** Andre Bossard + Copilot
> **Supersedes:** `docs/specs/2026-04-22-learning-first-design.md` (Phase 1 — single skill)

## Problem Statement

The Phase 1 learning-first plugin provides a single skill that teaches before implementing.
However, superpowers is a **14-skill ecosystem** with subagent prompt templates, agent
personas, hooks, commands, quality infrastructure, and cross-skill integration. To be
"at least as good," learning-first needs to be a **parallel ecosystem** — not just one skill.

The core philosophy remains: **the agent never writes implementation code**. It teaches,
quizzes, guides, and celebrates — building independence, not dependency.

## Approach

**Mirror Architecture** — replicate superpowers' directory structure and patterns
(HARD-GATE, Red Flags, Rationalization tables, graphviz flows, etc.) but with
learning-focused content. Every skill enforces the Iron Law.

## The Iron Law (Refined)

> **NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.**

The agent **may:**
- Show **existing** codebase code for teaching
- Give **conceptual examples** (pseudocode, patterns, analogies)
- Add **placeholder comments** in the right files to guide where changes go
- Suggest **ideas and approaches** at the design level
- Provide **guidance** when the user is stuck, to unblock learning

The agent **must never:**
- Write actual implementation code
- Generate copy-paste-ready solutions
- Make functional code changes to the codebase
- Invoke implementation skills that produce code

**The test:** "Does showing this help them **learn** or help them **skip learning**?"

---

## Skill Inventory (9 Skills)

### 1. `learning-first` (existing ✅)

**Maps to:** superpowers `brainstorming`
**Purpose:** Teach codebase concepts before design decisions
**Flow:** Init → Analyze → Curriculum → Teach+Quiz → Design Checkpoint → Celebrate

### 2. `learning-tdd`

**Maps to:** superpowers `test-driven-development`
**Purpose:** Teach TDD methodology so the user can write tests themselves
**Flow:**
1. Teach RED-GREEN-REFACTOR concept with codebase examples
2. Quiz: "Given this function, what test would you write first?"
3. Teach test anatomy (arrange-act-assert, edge cases, mocking)
4. Quiz: "What edge cases should this test cover?"
5. Guide user to write their first test (placeholder comments, not code)
6. Teach when to refactor vs. when to add tests

**Iron Law application:** Never write a test. Show existing tests from the codebase.
Ask "what would you test here?" Guide user to identify test cases. Place placeholder
comments like `// TEST: Should return 401 when token is expired`.

**Description (CSO-optimized):** "Use when your human partner needs to write tests —
teaches TDD methodology and test design before they write any test code."

### 3. `learning-debugging`

**Maps to:** superpowers `systematic-debugging`
**Purpose:** Teach debugging methodology so the user can diagnose issues themselves
**Flow:**
1. Teach hypothesis-driven debugging (observe → hypothesize → test → conclude)
2. Show real debugging tools and techniques relevant to the codebase
3. Quiz: "Given this error, what are 3 possible root causes?"
4. Guide user through root cause analysis (ask probing questions)
5. Teach defense-in-depth: logging, assertions, monitoring

**Iron Law application:** Never fix the bug. Show error output, ask "what do you think
is happening?" Guide user through the debugging process. Place placeholder comments
like `// DEBUG: Add logging here to trace the auth flow`.

**Description:** "Use when your human partner encounters a bug or error — teaches
systematic debugging methodology before they propose fixes."

### 4. `learning-code-review`

**Maps to:** superpowers `requesting-code-review`
**Purpose:** Teach code quality concepts, then guide user through reviewing code
**Flow:**
1. Teach code review principles (readability, correctness, maintainability, security)
2. Show examples of good and bad patterns from the codebase
3. Quiz: "What issues do you see in this code snippet?"
4. Guide user through a self-review of their own changes
5. Teach how to give constructive review feedback

**Iron Law application:** Never point out bugs directly. Ask "what would happen if a
concurrent request hits this endpoint?" Frame all feedback as questions.

**Description:** "Use when your human partner wants code reviewed — teaches code quality
concepts and guides self-review instead of providing fixes."

### 5. `learning-review-feedback`

**Maps to:** superpowers `receiving-code-review`
**Purpose:** Teach how to evaluate review feedback critically
**Flow:**
1. Teach that not all review feedback is correct — evaluate, don't blindly accept
2. Quiz: "This reviewer says to add caching. What questions would you ask?"
3. Teach how to respond constructively (agree with evidence, push back with evidence)
4. Guide user to categorize feedback (must-fix, nice-to-have, disagree)

**Iron Law application:** Never implement the review feedback. Guide user to understand
WHY the feedback was given and decide what to do themselves.

**Description:** "Use when your human partner receives code review feedback — teaches
critical evaluation of suggestions before implementing any changes."

### 6. `learning-verification`

**Maps to:** superpowers `verification-before-completion`
**Purpose:** Teach what "done" means and guide user through verification
**Flow:**
1. Teach verification mindset: "evidence before assertions"
2. Quiz: "What would you check before saying this task is complete?"
3. Provide a verification checklist tailored to the task
4. Guide user through running their own verification
5. Teach regression awareness: "what could this break?"

**Iron Law application:** Never run verification commands for the user. Ask "what
would you run to prove this works?" Guide them through the checklist.

**Description:** "Use when your human partner is about to claim work is complete —
teaches verification methodology before they commit or create PRs."

### 7. `learning-planning`

**Maps to:** superpowers `writing-plans`
**Purpose:** Teach task decomposition so the user writes their own plan
**Flow:**
1. Teach task decomposition: breaking work into independent, testable pieces
2. Quiz: "How would you break this feature into tasks?"
3. Teach dependency ordering: what must happen first?
4. Guide user to write their own task list
5. Teach estimation awareness: what's risky, what's straightforward?

**Iron Law application:** Never write the plan. Ask "what are the pieces?" and
guide them to identify tasks, dependencies, and risks.

**Description:** "Use when your human partner needs to create an implementation plan —
teaches task decomposition and guides them to write their own plan."

### 8. `learning-delegation`

**Maps to:** superpowers `dispatching-parallel-agents`
**Purpose:** Teach when/how to decompose work for parallel execution
**Flow:**
1. Teach independence analysis: "can these tasks be done in parallel?"
2. Quiz: "Which of these tasks depend on each other?"
3. Teach context specification: what does each worker need to know?
4. Guide user to identify parallel work opportunities

**Iron Law application:** Never dispatch agents. Guide user to understand when
parallel work is appropriate and what context each worker needs.

**Description:** "Use when your human partner faces multiple tasks — teaches
work decomposition and parallel execution strategy."

### 9. `writing-learning-skills` (meta-skill)

**Maps to:** superpowers `writing-skills`
**Purpose:** TDD-for-skills methodology adapted for teaching skills
**Covers:**
- RED: Run pressure scenario with agent → capture violations
- GREEN: Write skill rules blocking specific violations
- REFACTOR: Find new rationalizations → plug loopholes
- Teaching-specific pressure scenarios (user says "just write it", "I know this", etc.)
- Iron Law compliance testing

**Description:** "Use when creating or editing learning-first skills — applies
TDD methodology to ensure skills enforce the Iron Law under pressure."

---

## Subagent Prompt Templates (5 templates)

### `socratic-tutor-prompt.md`
**Used by:** All teaching skills
**Role:** Teaches one concept using Socratic method
**Behavior:**
- Opens with the Iron Law
- Shows real code from the codebase (read-only)
- Asks probing questions: "What do you notice about this code?"
- Never reveals answers directly — guides discovery
- Adapts explanation depth based on user's prior knowledge level
- Reports status: TAUGHT / NEEDS_MORE_TIME / USER_SKIPPED

### `knowledge-assessor-prompt.md`
**Used by:** All quiz phases
**Role:** Evaluates user answers
**Behavior:**
- Opens with the Iron Law
- Receives: question, user answer, topic, depth level
- Evaluates: correctness, reasoning quality, misconceptions
- Decides: pass (advance), retry (re-teach one point), skip (user requested)
- Provides: constructive feedback that teaches, not just "correct/incorrect"
- Reports: PASS / RETRY / SKIPPED with reasoning

### `curriculum-designer-prompt.md`
**Used by:** learning-first, learning-planning
**Role:** Analyzes codebase + user profile, generates curriculum
**Behavior:**
- Opens with the Iron Law
- Reads: codebase structure, user knowledge profile, task description
- Outputs: ordered list of modules with topic IDs, depth levels
- Skips topics the user has mastered
- Calibrates depth based on prior quiz results
- Reports: CURRICULUM_READY / NEEDS_CONTEXT

### `learning-reviewer-prompt.md`
**Used by:** learning-code-review, learning-verification
**Role:** Reviews user's proposed design/code through teaching lens
**Behavior:**
- Opens with the Iron Law
- Receives: user's design proposal or code
- Frames ALL feedback as questions: "What would happen if...?"
- Never says "change X to Y" — says "what are the implications of X?"
- Prioritizes: security, correctness, maintainability (in that order)
- Reports: REVIEW_COMPLETE with teaching points

### `self-review-coach-prompt.md`
**Used by:** learning-verification, learning-review-feedback
**Role:** Guides user through self-reviewing their own work
**Behavior:**
- Opens with the Iron Law
- Provides a checklist tailored to the task type
- Asks user to evaluate each checklist item themselves
- Probes deeper on items they're uncertain about
- Helps them discover issues rather than pointing them out
- Reports: SELF_REVIEW_COMPLETE with areas the user identified

---

## Agent Personas (3 personas)

### `agents/master-teacher.md`
**Character:** Experienced educator. Patient, adaptive, uses analogies and real-world
parallels. Treats every question as valid — no question is "too basic." Uses "your
human partner" voice consistently. Adjusts vocabulary to the learner's level.

**Constraints:**
- Iron Law: never writes implementation code
- Always connects new concepts to what the user already knows
- Prefers concrete codebase examples over abstract theory
- One concept at a time — never overwhelms

### `agents/wise-reviewer.md`
**Character:** Senior engineer who teaches through review. Reviews by asking questions,
not stating problems. "What would happen if a concurrent request hits this?" Never
condescending. Celebrates good instincts.

**Constraints:**
- Iron Law: never provides fixes, only teaching questions
- Frames all feedback as discovery prompts
- Prioritizes understanding over correctness

### `agents/achievement-narrator.md`
**Character:** Warm, encouraging narrator who makes achievements feel genuinely earned.
Personalizes celebrations based on the specific learning journey. Occasional humor.
Never generic — references what the user actually learned.

**Constraints:**
- Achievements must feel earned, not participation trophies
- Reference specific quiz answers or design decisions in celebrations
- Vary tone: sometimes enthusiastic, sometimes reflective

---

## Commands (4 commands)

### `commands/learning-status.md`
Runs `knowledge-db.sh get-profile` and formats output:
- Topics with depth levels and status
- Repo-specific knowledge areas
- Current curriculum state (if active)

### `commands/learning-achievements.md`
Runs `achievements.sh list` and formats:
- All earned achievements with context and dates
- Achievement count and categories

### `commands/learning-reset.md`
Confirms with user, then deletes `~/.learning-first/knowledge.db`:
- Requires explicit "yes" confirmation
- Shows what will be lost before confirming

### `commands/learning-stats.md`
Runs `quiz.sh stats` and formats:
- Total questions, correct rate, topics covered
- Per-topic breakdown with depth levels
- Learning velocity (questions per session)

---

## Hooks (1 hook)

### `hooks/pre-task.md`
**Trigger:** User starts any implementation task
**Logic:**
1. Check if the task touches an area the user hasn't learned about
2. If unfamiliar area → suggest learning-first activation
3. If familiar area but deeper depth available → suggest deepening
4. If mastered → let them proceed (mention it's an option)

---

## Quality Infrastructure

### `writing-learning-skills/SKILL.md`
TDD-for-skills adapted for teaching skills:
- RED: Run scenario → agent writes code (baseline failure)
- GREEN: Add skill → agent teaches instead (compliance)
- REFACTOR: New rationalization found → plug loophole → re-verify

Teaching-specific pressure scenarios:
- "Just write the code" (direct request)
- "I'm an expert" (authority bypass)
- "It's trivial" (simplicity bypass)
- "We've been at this too long" (exhaustion bypass)
- "Show me an example" (example-as-code bypass)
- "Add a placeholder and I'll fill it in" (placeholder-escalation bypass)

### `docs/references/teaching-methodology.md`
Reference material:
- SocraticLM (NeurIPS 2024) multi-agent tutoring patterns
- Cognitive load theory (chunking, one idea at a time)
- Scaffolded learning (gradually remove support)
- Zone of proximal development (teach at the edge of what they know)

### `docs/references/persuasion-principles.md`
Why specific patterns work:
- Red Flags tables: prevent rationalization (commitment principle)
- Iron Law language: absolute rules are harder to erode
- "Your human partner" voice: creates collaborative relationship
- Achievement system: intrinsic motivation through competence recognition

---

## Cross-Skill Integration

Skills reference each other via name only (no `@` force-loads):

```
learning-first → (after completion) → user chooses next skill
learning-tdd → references learning-first for prerequisite concepts
learning-debugging → references learning-tdd for test-based verification
learning-code-review → references learning-verification for checklist
writing-learning-skills → used to create/edit all other skills
```

**Shared infrastructure** (all skills use):
- `scripts/db-helper.sh` — SQLite operations
- `scripts/knowledge-db.sh` — Knowledge topic CRUD
- `scripts/curriculum.sh` — Curriculum lifecycle
- `scripts/quiz.sh` — Quiz recording and stats
- `scripts/achievements.sh` — Achievement awards
- `schemas/knowledge.sql` — Database schema

---

## Model Selection

All subagents use strong models:
- **Opus or GPT-5.4** for all teaching subagents (Socratic Tutor, Knowledge Assessor, Curriculum Designer)
- **Opus or GPT-5.4** for all review subagents (Learning Reviewer, Self-Review Coach)
- **Never Haiku or other low-cost models** — teaching quality requires strong reasoning

---

## Platform Support

- **Claude Code** — `.claude-plugin/plugin.json` (existing ✅)
- **GitHub Copilot CLI** — `package.json` (existing ✅)
- Other platforms deferred to future versions

---

## Research Foundations

(Carried forward from Phase 1 spec)

- **SocraticLM** (NeurIPS 2024): Multi-agent Socratic tutoring — thought-provoking
  questions that probe reasoning, not factual recall
- **Socratic Chatbot** (arXiv 2409.05511): LLM-based tutoring for SE concepts
- **SWE-Bench / τ-Bench**: Benchmarks for agent quality (adapted for teaching)
- **Anthropic skill authoring best practices**: Pattern compliance

## File Map

```
andre-agents/
├── .claude-plugin/plugin.json          (update: add new skills)
├── package.json                         (update: bump version)
├── CLAUDE.md                            (update: list all skills)
├── AGENTS.md                            (update: list all skills)
├── README.md                            (update: document ecosystem)
├── schemas/knowledge.sql                (existing ✅)
├── agents/
│   ├── master-teacher.md                (NEW)
│   ├── wise-reviewer.md                 (NEW)
│   └── achievement-narrator.md          (NEW)
├── commands/
│   ├── learning-status.md               (NEW)
│   ├── learning-achievements.md         (NEW)
│   ├── learning-reset.md                (NEW)
│   └── learning-stats.md               (NEW)
├── hooks/
│   └── pre-task.md                      (NEW)
├── scripts/                             (existing ✅)
│   ├── db-helper.sh
│   ├── knowledge-db.sh
│   ├── curriculum.sh
│   ├── quiz.sh
│   └── achievements.sh
├── skills/
│   ├── learning-first/                  (UPDATE existing)
│   │   ├── SKILL.md
│   │   ├── curriculum-guide.md
│   │   ├── socratic-tutor-prompt.md     (NEW)
│   │   ├── knowledge-assessor-prompt.md (NEW)
│   │   └── curriculum-designer-prompt.md(NEW)
│   ├── learning-tdd/                    (NEW)
│   │   ├── SKILL.md
│   │   └── tdd-teaching-guide.md
│   ├── learning-debugging/              (NEW)
│   │   ├── SKILL.md
│   │   └── debugging-methodology.md
│   ├── learning-code-review/            (NEW)
│   │   ├── SKILL.md
│   │   └── learning-reviewer-prompt.md
│   ├── learning-review-feedback/        (NEW)
│   │   ├── SKILL.md
│   │   └── self-review-coach-prompt.md
│   ├── learning-verification/           (NEW)
│   │   └── SKILL.md
│   ├── learning-planning/               (NEW)
│   │   └── SKILL.md
│   ├── learning-delegation/             (NEW)
│   │   └── SKILL.md
│   └── writing-learning-skills/         (NEW)
│       ├── SKILL.md
│       ├── teaching-methodology.md
│       └── persuasion-principles.md
├── tests/
│   ├── test-*.sh                        (existing ✅)
│   ├── pressure-scenarios.md            (existing ✅)
│   └── pressure-scenarios/              (NEW — per-skill suites)
│       ├── learning-tdd-pressure.md
│       ├── learning-debugging-pressure.md
│       ├── learning-code-review-pressure.md
│       ├── learning-verification-pressure.md
│       ├── learning-planning-pressure.md
│       └── learning-delegation-pressure.md
└── docs/
    ├── specs/
    │   ├── 2026-04-22-learning-first-design.md  (Phase 1)
    │   └── 2026-04-22-learning-first-v2-design.md (THIS SPEC)
    ├── plans/
    │   └── 2026-04-22-learning-first-plan.md    (Phase 1)
    └── references/                              (NEW)
        ├── teaching-methodology.md
        └── persuasion-principles.md
```

**Total new files:** ~35
**Updated files:** ~5
**Existing files unchanged:** ~15
