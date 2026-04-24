# Deep Research Synthesis: Effective Mentoring, Learning Science & Helping Struggling Learners

Consolidated findings from three parallel research threads. Detailed source reports:
- `developer-mentoring-research-report.md` — mentoring + graduated help
- `learning-research-report.md` — learning science + session duration
- `learning-tracking-research.md` — knowledge tracing + analytics schema

---

## 1. Key Findings (Most Impactful, Research-Backed)

- **Teach-before-tell beats tell-first.** Cognitive Apprenticeship (Collins, Brown, Newman) — *Modeling → Coaching → Scaffolding → Articulation → Reflection → Exploration* — outperforms lecture/demo approaches for durable skill transfer.
- **Productive struggle has a hard time-budget.** Research consensus: ~5–15 min of engaged struggle is learning-positive; beyond ~15–20 min with no progress it flips to unproductive frustration and damages motivation.
- **Retrieval practice > re-reading.** The testing effect yields ~25% better long-term retention than passive review (Roediger & Karpicke).
- **Spacing > cramming.** SM-2 / Leitner intervals (1d → 3d → 7d → 16d → 35d …) consistently produce higher delayed retention than massed practice.
- **Interleaving > blocking.** Mixing related-but-distinct concepts (e.g., recursion / iteration / memoization) improves discrimination and transfer even though short-term performance feels worse (a classic *desirable difficulty* — Bjork).
- **Cognitive fatigue is real and measurable.** After ~25–30 min of intense focus, error rates rise 15–30% and latency creeps up; Pomodoro (25/5) is a reasonable default, but 45–50 min + 10 min works for deeper flow tasks.
- **Mastery ≠ streak of correct answers.** True mastery requires (a) transfer to novel problems, (b) delayed retention (≥1 week), (c) ability to *explain*, not just produce.
- **Help should escalate, not teleport.** Intelligent tutoring systems (Aleven, VanLehn, Graesser) show that *graduated* hints produce better learning than immediate bottom-out answers — but hints that arrive too late destroy motivation.
- **Metacognition is the multiplier.** Students who self-assess, predict their accuracy, and write rubber-duck explanations learn measurably faster.

---

## 2. Graduated Help Model (Concrete, with Triggers)

A 7-level escalation model. Each row: **what the mentor does → when to escalate to the next level**. Never skip upward on frustration alone — on frustration signals, first *pause, breathe, validate*, then re-enter at the current level.

| L | Name | Mentor behaviour | Example | Escalate when… |
|---|------|------------------|---------|----------------|
| **0** | **Productive struggle** | Say nothing substantive. Encourage. "Take your time." | "Interesting — think out loud." | 3–5 min silent OR learner says "I don't know where to start" |
| **1** | **Reframe the question** | Restate the problem in different words. No new info. | "Another way to see it: what changes between iterations?" | 2–3 more min, no new direction |
| **2** | **Directional hint** | Point to the *area* of thought, not the answer. | "Think about what happens at the boundary of the list." | Learner tries once more, still stuck ~3 min |
| **3** | **Narrow the scope** | Reduce problem size / decompose. | "Forget the edge cases for now — just handle one element." | Scope is now small but learner still can't move |
| **4** | **Worked-example analogue** | Show a *similar but different* solved problem. | "Here's how we reversed a string; reversing a list is analogous." | Learner can't map analogue back to their problem |
| **5** | **Co-construction (I do, you do)** | Walk through part of the solution, leave the remainder as an exercise. | "I'll set up the recursion; you write the base case." | Learner cannot complete their half |
| **6** | **Full solution + post-mortem** | Show the answer, then *immediately* require the learner to re-explain it back. Log as debt → revisit this topic in a future session. | "Here's the answer. Now walk me through *why* it works." | — (terminal, but schedule a spaced review) |

### Escalation triggers (quantitative, drop-in)
| Trigger | Action |
|---|---|
| Time stuck at current level | 5 min → +1 level |
| 3 consecutive failed attempts | +1 level |
| Learner's answer latency is dropping AND they're articulating ideas | **Hold** — they are thinking |
| Frustration signals (sighs, "I'm dumb", off-task, typing deleted repeatedly) | Pause, validate, offer break; *do not* escalate reflexively |
| Explicit "give me the answer" | Escalate by 1–2 levels, not straight to L6 |
| Session duration >45 min on same problem | Force break before escalating further |

### Productive vs. unproductive struggle — diagnostic signals
- **Productive:** verbal externalisation ("so if I…"), small code edits with direction, questions about the *problem*, incremental progress even if wrong.
- **Unproductive:** repeated identical attempts, negative self-talk, long silences with no artifacts, questions about the *meta-situation* ("is this even possible?"), erratic code edits.

---

## 3. Spaced Repetition Schedule

Use **SM-2-lite** as the default scheduler. For each topic, after a quiz attempt:

| Outcome | Next interval |
|---|---|
| First encounter (new topic) | +1 day |
| Correct, easy | multiply interval × 2.5 |
| Correct, some hesitation | multiply × 2.0 |
| Correct with a hint used | multiply × 1.3 |
| Incorrect | reset to 1 day, lower ease factor by 0.2 |

**Concrete default ladder:** `1d → 3d → 7d → 16d → 35d → 90d → 180d`.

### Programmer-specific twists
- **Interleave** within a review session: pull 3–5 due topics from *different* domains rather than drilling one topic.
- **Transfer-check** at the 3rd successful review: ask a *novel* problem that uses the same concept. If they fail it, reset the interval to 3d — the earlier correctness was pattern-matching, not mastery.
- **Lapse handling:** on forgetting, don't reset to 1d blindly — re-teach briefly (Level 4 worked example) then 1d.

---

## 4. Session Tracking Metrics

### What the DB should capture
Current schema (`schemas/knowledge.sql`) tracks topics, quiz results, achievements, curricula, and override debts — but **lacks time/fatigue/retention data**. Add:

```sql
-- NEW: learning sessions (wall-clock, fatigue, quality)
CREATE TABLE IF NOT EXISTS learning_sessions (
    id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    duration_minutes INTEGER,
    active_minutes INTEGER,          -- excludes idle/breaks
    topics_touched TEXT,             -- JSON array
    break_count INTEGER DEFAULT 0,
    fatigue_score REAL,              -- 0.0–1.0 from latency + error trend
    self_rated_quality INTEGER       -- 1–5, optional prompt at end
);

-- EXTEND quiz_results:
ALTER TABLE quiz_results ADD COLUMN session_id TEXT;
ALTER TABLE quiz_results ADD COLUMN response_time_ms INTEGER;
ALTER TABLE quiz_results ADD COLUMN hint_level_used INTEGER DEFAULT 0;   -- 0–6, mirrors help model
ALTER TABLE quiz_results ADD COLUMN attempt_number INTEGER DEFAULT 1;
ALTER TABLE quiz_results ADD COLUMN quiz_kind TEXT DEFAULT 'recall';     -- recall | apply | transfer | explain

-- NEW: spaced-repetition state per (repo, topic)
CREATE TABLE IF NOT EXISTS topic_review_state (
    repo_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days REAL NOT NULL DEFAULT 1,
    last_reviewed_at TEXT,
    next_review_at TEXT,
    correct_streak INTEGER DEFAULT 0,
    lapse_count INTEGER DEFAULT 0,
    transfer_passed INTEGER DEFAULT 0,       -- 0/1 — have they passed a transfer quiz?
    retention_passed_at TEXT,                -- passed a ≥7d delayed quiz
    PRIMARY KEY (repo_id, topic_id)
);

-- NEW: lightweight BKT estimates (optional, per topic)
CREATE TABLE IF NOT EXISTS topic_bkt (
    repo_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    p_known REAL DEFAULT 0.2,     -- P(L)
    p_learn REAL DEFAULT 0.1,     -- P(T)
    p_guess REAL DEFAULT 0.2,     -- P(G)
    p_slip  REAL DEFAULT 0.1,     -- P(S)
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (repo_id, topic_id)
);
```

### Metrics that actually predict understanding
- **Transfer accuracy** (novel problem, same concept) — strongest signal.
- **Explanation quality** (free-text quiz scored by the agent) — separates memorised from understood.
- **Delayed retention ≥7d** — true durability check.
- **Latency trend** — should *decrease* then plateau; sudden rise = fatigue or forgetting.
- **Hint-level-used trend over reviews** — should trend to 0.
- **Correct streak ≥3** with ≥1 of them being transfer → mark mastered.

### Fatigue signal (compute on the fly)
`fatigue_score = 0.5·(error_rate_last_5 − baseline) + 0.5·(latency_last_5 / baseline_latency − 1)`, clipped to [0,1]. Trigger a break suggestion at >0.6 or after 25 continuous minutes.

---

## 5. Concrete Recommendations for the `learning-first` Plugin

Mapped to the existing code under `skills/learning-first/` and `scripts/`.

### A. Adopt the 7-level help model explicitly
- In `socratic-tutor-prompt.md`, replace the current implicit "L1/L2/L3 assistance levels" (which are *mastery* levels) with a clearly separate **help-level** axis (0–6) used *within* a tutoring turn. Mastery L1/L2/L3 still governs *how much code the agent may ever write*; help level 0–6 governs *this single stuck moment*.
- Log `hint_level_used` on every quiz answer (schema change above).
- Add escalation rules to the prompt: wait ≥3 min of silence or 3 failed attempts before +1; never jump to L6 without passing through L4–L5.

### B. Add a spaced-repetition scheduler
- New script `scripts/review-scheduler.sh` with commands:
  - `next-due [--repo R] [--limit N]` → topics whose `next_review_at ≤ now`.
  - `record-review <topic_id> <outcome>` where outcome ∈ `{easy, good, hard, lapse}` → updates `ease_factor`, `interval_days`, `next_review_at` via SM-2.
- At session start, if any topics are due, the tutor should **interleave ≥1 review** before introducing new material.

### C. Track sessions + fatigue
- Wrap each invocation of the skill in a `learning_sessions` row. Update `active_minutes` from quiz timestamps.
- Compute `fatigue_score` from the last 5 quiz attempts. At >0.6 or 25 min active, the tutor prompt MUST suggest a break before the next quiz.

### D. Upgrade mastery criteria
- Current `status='mastered'` triggers on a single threshold. Change to require **all three**:
  1. Correct streak ≥3 at depth_level ≥2.
  2. At least 1 successful `quiz_kind='transfer'` attempt.
  3. At least 1 successful review ≥7 days after first correct answer (`retention_passed_at IS NOT NULL`).
- Everything else is `practicing`, not `mastered`. This prevents premature L2→L3 promotion.

### E. Add metacognition prompts
- After every quiz: one-line self-prediction ("How confident, 1–5?") stored alongside `correct`. Calibration (predicted vs actual) is itself a learning metric and surfaces over-/under-confidence.
- At session end: 2-question reflection (*what clicked? what's still fuzzy?*) saved to `learning_sessions.notes`.

### F. Interleave in quiz generation
- `quiz.sh` should, when ≥2 topics are "in_progress", pull 60% questions from the current module and 40% from other due/practicing topics. This is a one-line change in the topic sampler.

### G. Productive-struggle guard
- Before giving a hint at all, the tutor prompt requires the user's written attempt (even "I think it might be X because Y"). No attempt → no hint. This forces articulation and sharpens retrieval practice.

### H. Lapse / regression alerts
- Add `cmd_list_lapses` to `knowledge-db.sh`: topics where the latest quiz was wrong after previous mastered status, OR where `recent_accuracy` dropped >10%. Surface these at session start as "topics that need a refresher".

### I. Optional: lightweight BKT
- For each topic, after every attempt update `p_known` with the standard BKT update:
  ```
  p_known_post_obs = correct
      ? p_known*(1-p_slip) / (p_known*(1-p_slip) + (1-p_known)*p_guess)
      : p_known*p_slip      / (p_known*p_slip     + (1-p_known)*(1-p_guess))
  p_known = p_known_post_obs + (1 - p_known_post_obs)*p_learn
  ```
  Treat `p_known ≥ 0.95` as a *candidate* for mastery, still gated by transfer + retention.

---

## 6. Citations

### Mentoring & pair programming
- Martin Fowler — *Being a Good Mentor*: https://martinfowler.com/articles/mentoring.html
- Pluralsight — *How to be a Good Mentor in Software Engineering*: https://www.pluralsight.com/resources/blog/cloud/how-to-be-a-good-mentor-in-software-engineering
- CodeMentor — *Mentoring Guide for Developers*: https://www.codementor.io/blog/mentoring-guide-for-developers-8z8y984usf
- *Pair Programming in Perspective: Effects on Persistence, Achievement, and Equity* (NSF): https://par.nsf.gov/servlets/purl/10281045
- *Examining the Impact of Pair Programming on Efficiency* (Springer 2024): https://link.springer.com/article/10.1007/s10639-024-12859-w
- *Adopting Distributed Pair Programming as an Effective Team Learning* (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC9930723/
- *Evaluating Effectiveness of Pair Programming as a Teaching Tool* (ERIC): https://files.eric.ed.gov/fulltext/EJ1140923.pdf
- *The Impact of Pair Programming on College Students' Interest* (ACM): https://dl.acm.org/doi/fullHtml/10.1145/3440759

### Cognitive apprenticeship, scaffolding, ZPD
- Collins, Brown & Newman (1989), *Cognitive Apprenticeship* — summary: https://en.wikipedia.org/wiki/Cognitive_apprenticeship
- Vygotsky's ZPD — summary: https://en.wikipedia.org/wiki/Zone_of_proximal_development

### Learning science
- Roediger & Karpicke — testing effect: https://www.learningscientists.org (summary pages on retrieval practice)
- Bjork — *Desirable Difficulties*: https://bjorklab.psych.ucla.edu/research/
- Rohrer & Taylor — interleaving studies: summarised on The Learning Scientists
- SuperMemo SM-2: https://super-memory.com/english/ol/sm2.htm
- Anki scheduling: https://docs.ankiweb.net/scheduling.html
- Bloom's mastery learning: https://en.wikipedia.org/wiki/Mastery_learning

### Session duration & Pomodoro
- MDPI 2025 — *Self-Regulated, Pomodoro, and Flowtime Study Techniques*: https://www.mdpi.com/2076-328X/15/7/861
- PMC mirror: https://pmc.ncbi.nlm.nih.gov/articles/PMC12292963/
- Brown Daily Herald fact-check: https://www.browndailyherald.com/article/2026/03/fact-check-is-the-pomodoro-technique-actually-effective-for-studying
- PomoForge research summary: https://pomoforge.com/blog/pomodoro-technique-research-evidence

### Knowledge tracing
- Corbett & Anderson (1995) — BKT original paper (via ACM): https://dl.acm.org/doi/10.1007/BF01099821
- Piech et al. (2015) — *Deep Knowledge Tracing*: https://arxiv.org/abs/1506.05908
- Shen et al. — *Knowledge Tracing Survey*: https://arxiv.org/html/2105.15106v4
- Mastery Learning overview — Structural Learning: https://www.structural-learning.com/post/mastery-learning

### Intelligent tutoring systems & graduated help
- VanLehn (2006), *The Behavior of Tutoring Systems*: https://www.public.asu.edu/~kvanlehn/Stringent/PDF/06IJAIED_KVL.pdf
- Aleven et al. on help-seeking in ITS — summary via CMU HCII publications: https://www.cs.cmu.edu/~aleven/

---

*Generated 2025. Full intermediate reports retained alongside this synthesis.*
