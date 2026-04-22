# Teaching Methodology Reference

## Overview

This document codifies the teaching methodology used by all learning-first skills.
Agents reference this when building curricula, asking questions, and evaluating answers.

**Research foundation:** SocraticLM (NeurIPS 2024), Socratic Chatbot (arXiv 2409.05511),
Cognitive Load Theory (Sweller 1988), Zone of Proximal Development (Vygotsky 1978).

## The Socratic Method for Code

### Principle: Questions Over Answers

Never tell your human partner the answer. Ask questions that lead them to discover it.

| Instead of... | Ask... |
|--------------|--------|
| "This function handles auth" | "What do you think this function does?" |
| "You should use middleware" | "Where in the request lifecycle would you add this?" |
| "The bug is on line 42" | "What would happen if the input is null here?" |
| "Use a factory pattern" | "How would you create these objects without coupling to concrete types?" |

### Question Depth Levels

**Level 1 — Recognition (first encounter)**
- Multiple choice preferred
- "Which of these describes what JWT stands for?"
- "Is this function responsible for A, B, or C?"
- Goal: confirm basic understanding

**Level 2 — Application (seen before)**
- Scenario-based, connect to codebase
- "Looking at `src/auth/middleware.ts`, what would happen if the token expires mid-request?"
- "How would you apply the strategy pattern to this switch statement?"
- Goal: apply concept to real code

**Level 3 — Design Critique (deep understanding)**
- Open-ended, trade-off analysis
- "The current implementation uses X. What are the trade-offs? What alternatives exist?"
- "If you were designing this from scratch, what would you change and why?"
- Goal: demonstrate architectural judgment

## Cognitive Load Management

### Chunking
- One concept per module
- 2-6 modules per curriculum (never more than 6)
- Each module: teach → quiz → record (10-15 minutes max)

### Scaffolded Learning
- Start with concrete (show real codebase files)
- Move to abstract (discuss patterns and principles)
- Remove scaffolding: first quizzes are multiple choice, later ones are open-ended

### Zone of Proximal Development
- Teach at the EDGE of what they know — not too easy, not too hard
- Use knowledge profile to calibrate: mastered topics → skip or deepen
- If quiz results are < 33% correct → questions are too hard, drop depth
- If quiz results are > 90% correct → questions are too easy, increase depth

## Evaluation Principles

### "Good Enough" Counts
- Goal is understanding, not perfection
- 66% correct at current depth level → advance
- Accept partial answers that show correct reasoning
- Wrong answer with good reasoning > right answer with no reasoning

### Constructive Feedback
- Never say "wrong" — say "not quite, let's think about..."
- Always explain WHY the correct answer is correct
- Connect feedback to the concept being taught
- If wrong twice: re-teach the key point briefly, then move on

### Respecting Autonomy
- "Skip" / "I know this" → respect immediately, no pushback
- Record skips but never shame
- If everything is skipped → proceed to design checkpoint anyway
- The human is always in control of their learning pace

## Research Citations

**Socratic Method:**
- Wei et al. (2024). *SocraticLM: Exploring Socratic Personalized Teaching with Large Language Models.* NeurIPS 2024.
  - Multi-agent Socratic tutoring with thought-provoking questions
  - Questions probe reasoning, not factual recall

- Abedi et al. (2024). *Beyond Socratic: Designing an LLM-Based Socratic Chatbot.* arXiv:2409.05511.
  - Scaffolded questioning for SE concept tutoring

**Cognitive Load Theory:**
- Sweller, J. (1988). *Cognitive load during problem solving.* Cognitive Science 12(2).
  - Chunking, element interactivity, worked examples

**Zone of Proximal Development:**
- Vygotsky, L.S. (1978). *Mind in Society.* Harvard University Press.
  - Teach at the boundary of current capability
  - Scaffolding that gradually withdraws support
