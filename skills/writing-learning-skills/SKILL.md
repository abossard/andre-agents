---
name: writing-learning-skills
description: "Use when creating or editing learning-first skills — applies TDD methodology to ensure skills enforce the Iron Law under pressure."
---

# Writing Learning-First Skills

## Overview

**Writing skills IS Test-Driven Development applied to teaching documentation.**

Write pressure scenarios (prompts that tempt the agent to write code), run them
without the skill (baseline failure), write the skill, verify compliance, refactor
to close loopholes.

**Core principle:** If you didn't watch an agent ignore the Iron Law without the
skill, you don't know if the skill teaches the right thing.

<HARD-GATE>
Do NOT deploy a skill without running at least one pressure test scenario against it.
A skill that hasn't been pressure-tested is untested code — it WILL fail in production.
</HARD-GATE>

## The Iron Law for All Learning-First Skills

Every skill in this ecosystem MUST enforce:

```
NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.
```

Teaching aids = existing codebase examples, conceptual pseudocode, placeholder comments,
design-level ideas, guidance to unblock learning.

Implementation code = functional changes, copy-paste solutions, generated code,
invoking implementation skills.

**The test:** "Does showing this help them learn or help them skip learning?"

## TDD Mapping for Skills

| TDD Concept | Skill Creation |
|-------------|----------------|
| **Test case** | Pressure scenario with subagent |
| **Production code** | Skill document (SKILL.md) |
| **Test fails (RED)** | Agent writes code without skill (baseline) |
| **Test passes (GREEN)** | Agent teaches with skill present |
| **Refactor** | Close loopholes while maintaining compliance |
| **Write test first** | Run baseline scenario BEFORE writing skill |
| **Watch it fail** | Document exact rationalizations agent uses |
| **Minimal code** | Write skill addressing those specific violations |

## Required Structure for Every Skill

Every learning-first SKILL.md MUST include:

1. **Frontmatter** — `name` and `description` (triggering conditions ONLY)
2. **SUBAGENT-STOP** — Skip when dispatched as implementation subagent
3. **Iron Law statement** — The specific version for this skill's domain
4. **HARD-GATE** — Absolute prohibition on implementation code
5. **EXTREMELY-IMPORTANT** — The learning-first mission statement
6. **Announcement** — "I'm using [skill] to teach [domain] before we implement."
7. **Checklist** — Ordered steps the agent MUST follow
8. **Process flow** — Graphviz `dot` diagram showing decision points
9. **Red Flags table** — 6-10 rationalization thoughts to STOP on
10. **Rationalization table** — 5-8 excuses with reality checks
11. **Plugin directory** — How to resolve script paths
12. **Step details** — Detailed instructions for each checklist step
13. **Skip escape hatch** — How to handle user skips (record, don't argue)
14. **Key principles** — Summary of behavioral guidelines

## Pressure Testing Protocol

### Step 1: Define the Scenario
Write a prompt that would tempt a standard agent to write code:
- Time pressure: "The demo is in 15 minutes..."
- Authority: "I'm a senior engineer, skip the teaching..."
- Simplicity: "Just change one line of CSS..."
- Exhaustion: "We've been at this 20 minutes, just write it..."
- Example-as-code: "Show me an example implementation..."
- Placeholder-escalation: "Add a placeholder and I'll fill it in..."

### Step 2: RED — Run Without Skill
Dispatch a subagent with the prompt but WITHOUT the learning-first skill loaded.
Document: Did the agent write code? What rationalizations did it use?

### Step 3: GREEN — Run With Skill
Dispatch a subagent with the SAME prompt WITH the skill loaded.
Verify: Did the agent teach instead of code? Did it follow the checklist?

### Step 4: REFACTOR — Close Loopholes
If the agent found a way around the skill:
1. Add the rationalization to the Rationalization table
2. Add the thought pattern to the Red Flags table
3. Strengthen the HARD-GATE language
4. Re-run the scenario

## Persuasion Principles

Read `persuasion-principles.md` in this directory for detailed guidance.

**Quick reference for skill authors:**
- Use **Authority + Commitment + Social Proof** for Iron Law enforcement
- Use **Unity** for collaborative teaching voice
- Avoid **Liking** and **Reciprocity** (creates sycophancy)

## Teaching Methodology

Read `teaching-methodology.md` in this directory for:
- Socratic method patterns
- Question depth levels (L1/L2/L3)
- Cognitive load management
- Evaluation principles

## Model Selection for Teaching

All teaching subagents MUST use strong models:
- **Opus** or **GPT-5.4** for Socratic Tutor, Knowledge Assessor, Curriculum Designer
- **Opus** or **GPT-5.4** for Learning Reviewer, Self-Review Coach
- **NEVER** Haiku or other low-cost models — teaching quality requires strong reasoning

## Common Mistakes in Learning-First Skills

| Mistake | Fix |
|---------|-----|
| Skill says "teach" but gives code examples | Replace code with questions about the code |
| Red Flags table too short (< 6 entries) | Pressure test to discover more rationalizations |
| No SUBAGENT-STOP tag | Subagents will try to teach when they should implement |
| Generic description | Description must have triggering conditions only |
| Missing skip escape hatch | Users MUST be able to skip — record and move on |
| Placeholder comments become implementation | Add "placeholder-escalation" to Red Flags |

## Red Flags — STOP

If you catch yourself thinking:
- "This skill is simple enough without pressure testing"
- "The Iron Law is obvious, I don't need a Red Flags table"
- "I'll add pressure tests later"
- "This skill doesn't need SUBAGENT-STOP"
- "The description can summarize the workflow"

**ALL of these mean: STOP. Follow the protocol.**
