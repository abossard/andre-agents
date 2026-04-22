# Persuasion Principles for Learning-First Skills

## Overview

LLMs respond to the same persuasion principles as humans. This document explains
WHY learning-first skills use specific language patterns — not to manipulate, but
to ensure the Iron Law holds even under pressure.

**Research foundation:** Meincke et al. (2025) tested 7 persuasion principles with
N=28,000 AI conversations. Persuasion techniques more than doubled compliance rates
(33% → 72%, p < .001).

## The Iron Law and Persuasion

The Iron Law ("NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.") uses **Authority**
principle: absolute language that eliminates rationalization.

Why it works:
- "NEVER write code" removes decision fatigue
- Absolute rules are harder to erode than guidelines
- Specific anti-rationalization tables close loopholes preemptively

## Principles Used in Learning-First

### 1. Authority
**What it is:** Deference to imperative, non-negotiable language.

**How learning-first uses it:**
- HARD-GATE tags with absolute prohibitions
- Iron Law stated as non-negotiable rule
- "YOU MUST", "NEVER", "ALWAYS" for critical behaviors

**Example:**
```markdown
✅ Do NOT write implementation code. EVER.
❌ Try to avoid writing code when possible.
```

### 2. Commitment
**What it is:** Consistency with prior declarations.

**How learning-first uses it:**
- "Announce at start" forces public commitment
- Checklist tracking creates obligation to follow through
- Achievement system rewards sustained commitment

**Example:**
```markdown
✅ "I'm using learning-first to teach the relevant concepts before we implement."
❌ (Just start teaching without announcing)
```

### 3. Social Proof
**What it is:** Conformity to universal patterns.

**How learning-first uses it:**
- "Simple fixes are where misunderstandings hide. Teach anyway."
- Red Flags tables establish norms ("if you're thinking this, you're rationalizing")
- Rationalization tables preempt known failure modes

**Example:**
```markdown
✅ Every exception normalizes skipping. No exceptions.
❌ Sometimes you might need to skip teaching.
```

### 4. Scarcity / Immediacy
**What it is:** Urgency from time constraints.

**How learning-first uses it:**
- "BEFORE any implementation" (sequencing requirement)
- "IMMEDIATELY record the skip" (no delay)
- Prevent "I'll teach later" procrastination

### 5. Unity
**What it is:** Shared identity and collaborative partnership.

**How learning-first uses it:**
- "Your human partner" (not "the user")
- Collaborative framing: "Let's make sure you understand"
- Shared goal: "building independence, not dependency"

## Principles NOT Used

### Reciprocity
Rarely used — can feel manipulative in a teaching context.

### Liking
Avoided for discipline enforcement — creates sycophancy risk.
Exception: Achievement celebrations use warm tone (not compliance).

## Principle Combinations

| Skill Type | Use | Avoid |
|-----------|-----|-------|
| Teaching skills (learning-first, learning-tdd, etc.) | Authority + Commitment + Social Proof + Unity | Liking, Reciprocity |
| Review skills (learning-code-review, etc.) | Authority + Unity + Commitment | Heavy authority alone |
| Meta-skill (writing-learning-skills) | Authority + Commitment | Liking |
| Commands/hooks | Clarity only | All persuasion |

## Ethical Use

**Legitimate:** Ensuring the Iron Law holds so the human genuinely learns.
**Illegitimate:** Manipulating the human into a specific design decision.

**The test:** Would this technique serve your human partner's genuine interests
if they fully understood it?

## Research Citations

**Cialdini, R. B. (2021).** *Influence: The Psychology of Persuasion.* Harper Business.
- Seven principles of persuasion, empirical foundation

**Meincke, L. et al. (2025).** *Call Me A Jerk: Persuading AI to Comply.*
University of Pennsylvania.
- N=28,000 LLM conversations, compliance 33% → 72% with persuasion
- Authority, commitment, scarcity most effective
