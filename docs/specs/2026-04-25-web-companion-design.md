# Learning-First Web Companion — Design Spec

> **Date:** 2026-04-25
> **Status:** Approved
> **Decisions:** From user input on 2026-04-25

## Vision

A **persistent, growing personal knowledge base** per repository that accumulates
over time into a comprehensive, individualized reference. The web companion is
creative, surprising, and interactive — always finding new ways to engage the
learner. Strong-model subagents verify accuracy before publishing.

**The end state:** After working in a repo for weeks, the user has a rich,
personalized learning library they can browse anytime — like a custom textbook
written just for them, about their exact codebase.

## Decisions

| # | Question | Answer |
|---|----------|--------|
| 1 | Storage location | `~/.learning-first/knowledge-base/<repo-name>/` (global, follows user) |
| 2 | Format | Rich, interactive, creative — generated dynamically with learning goals in mind. Agent explores new interaction patterns over time. Adapts based on user feedback. |
| 3 | Verification | Verify key claims — check code citations and patterns via strong-model subagents. Trust conceptual explanations. |
| 4 | Corrections | Auto-correct silently with "last updated" timestamp |
| 5 | Checklist | Agent-generated + user can add items (collaborative) |
| 6 | Code display | Agent quotes excerpts at generation time (may get stale) |
| 7 | V1 scope | Medium: localhost server + Mermaid diagrams + prediction cards |
| 8 | CDN | CDN-based (simpler, needs internet) |

## Architecture

```
~/.learning-first/
├── knowledge.db                          # SQLite (existing)
└── knowledge-base/
    └── <repo-name>/
        ├── index.html                    # Curriculum overview + progress
        ├── concepts/
        │   ├── jwt-verification.html     # One page per concept
        │   ├── express-middleware.html
        │   └── ...
        ├── data/
        │   ├── concepts.json             # Structured data for all concepts
        │   ├── checklist.json            # Collaborative checklist state
        │   └── feedback.json             # User feedback on content quality
        └── assets/
            └── style.css                 # Shared styling (dark mode)
```

### Key Principles

1. **Persistent & cumulative** — pages are never deleted, only updated/corrected
2. **Creative & surprising** — each concept page can use different interactive
   patterns (prediction cards, flowcharts, analogies, mini-games, etc.)
3. **Accuracy-first** — strong-model subagents verify code citations before publishing
4. **Feedback-driven** — user can rate content, suggest changes, mark confusion
5. **Auto-correcting** — silent corrections with "last updated" timestamp

### Verification Pipeline

```
Agent generates content
    ↓
Dispatch Opus 4.7 verification subagent:
  - Check: do cited files/lines actually exist?
  - Check: does the code snippet match the actual file?
  - Check: are pattern claims consistent with codebase?
  - Mark each claim: verified | inferred | suggested
    ↓
Write verified content to knowledge-base/
    ↓
On future sessions: re-verify stale content (files changed since last check)
```

### Server

Node.js localhost (~200 LoC), same pattern as superpowers visual companion:
- Serves from `~/.learning-first/knowledge-base/<repo>/`
- SSE for live updates when agent adds content during a session
- Port: 3142 (learning-first)
- Auto-opens default browser

### Interactive Elements (V1)

| Element | Purpose | Science |
|---------|---------|---------|
| Prediction cards | "What happens if...?" → reveal | Active recall +25% |
| Mermaid diagrams | Dependency/flow visualization | Dual coding (Paivio) |
| Tri-state checklist | ○ → ◐ → ● with user items | Self-regulated learning |
| Confidence badges | 🟢verified 🔵documented 🟡inferred 🔴suggested | Trust calibration |
| Confidence self-rating | 1-5 per concept | Metacognition |
| Click-to-source | Copy CLI command to view file | Source grounding |

### Future Interactive Patterns (V2+)

The system should evolve its interaction patterns over time:
- Code trace puzzles ("What does this output?")
- Drag-and-drop ordering (sort execution steps)
- Fill-in-the-blank code
- Architecture drawing (user draws, system compares)
- Analogy mapping ("This pattern is like...")
- "Teach it back" — user writes explanation, system evaluates
- Spaced repetition cards integrated into the knowledge base
