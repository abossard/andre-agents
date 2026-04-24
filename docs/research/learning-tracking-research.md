# Learning Progress Tracking: Deep Research Report

A comprehensive exploration of metrics, algorithms, and concrete implementations for tracking learning progress and detecting mastery.

---

## Executive Summary

This report synthesizes research on learning analytics, knowledge tracing algorithms, and mastery learning criteria. Key findings:
- **True understanding** requires transfer tasks and delayed retention tests, not just immediate performance
- **Mastery thresholds** range from 90% accuracy (Bloom) to BKT P(L) > 0.95
- **Forgetting detection** relies on spaced repetition intervals and retention curves
- **BKT remains practical** for small plugins; Deep Knowledge Tracing offers superior performance but requires more data

---

## 1. Mastery Criteria: When Is a Topic Truly "Mastered"?

### Bloom's 90/90 Principle

**Source:** Bloom's Mastery Learning (1968) — [Wikipedia: Mastery learning](https://en.wikipedia.org/wiki/Mastery_learning)

- **Criterion:** 90% accuracy on a mastery test
- **Philosophy:** With optimal instruction and sufficient time, ~90% of students can achieve mastery
- **Effect size:** 0.59 (moderate to substantial improvements in academic performance)
- **Context:** Addresses the "2-Sigma Problem"—one-on-one tutored students outperform classroom learners by ~2 standard deviations
- **Implementation:** Mastery-based progression—students must reach 90% before advancing to next material

### Bayesian Knowledge Tracing (BKT) Criterion

**Source:** Survey of Knowledge Tracing — [arXiv: 2105.15106](https://arxiv.org/html/2105.15106v4)

- **Criterion:** P(L) > 0.95 (posterior probability learner knows the skill)
- **Definition:** After sufficient practice attempts, the model estimates the student has learned the skill with >95% confidence
- **Advantage:** Probabilistic—accounts for guess/slip parameters, not just binary correct/incorrect
- **Application:** Adaptive testing systems (ASSISTments, Coursera)

### Alternative Mastery Thresholds

| Standard | Metric | Threshold | Context |
|----------|--------|-----------|---------|
| **Bloom (1968)** | Accuracy on mastery test | 90% | Fixed timelines removed, flexible instruction |
| **BKT Posterior** | P(Learned) | 0.95 | Probabilistic—accounts for guessing & slips |
| **N Consecutive Correct** | Streaks | 3–5 consecutive | Simple plugin implementation |
| **Delayed Retention** | Score after interval | 80–90% | Measures durability, not rote memorization |

### Key Insight: Mastery ≠ Memorization

Mastery requires:
1. **Immediate performance:** 90% on initial test
2. **Delayed retention:** 80%+ after 1–2 weeks (resistance to forgetting)
3. **Transfer:** Apply skill to novel problems or contexts
4. **Explanation quality:** Articulate reasoning, not just select answers

---

## 2. Metrics That Predict Understanding vs. Memorization

### Distinguishing True Learning from Surface Memorization

**Sources:**
- Knowledge Tracing Survey — [arXiv: 2105.15106](https://arxiv.org/html/2105.15106v4)
- Mastery Learning Research — [Structural Learning](https://www.structural-learning.com/post/mastery-learning)

| Signal | Memorization | Deep Understanding |
|--------|--------------|-------------------|
| **Immediate Performance** | ✓ 90%+ on first attempt | ✓ 90%+ on first attempt |
| **Response Latency** | **Fast** (~2s)—retrieval from short-term | **Slower initially** (~4–6s)—reasoning |
| **Transfer Tasks** | ✗ Fails on novel problems | ✓ Applies to new contexts |
| **Explanation Quality** | Generic, incomplete explanations | Rich, detailed reasoning |
| **Delayed Retention (1–2 weeks)** | **Sharp drop** to 40–60% | **Maintained** at 75%+ |
| **Hint Acceptance** | Relies heavily on hints for variants | Minimal hint usage after mastery |
| **Spacing Effect** | Forgets rapidly; needs massed practice | Retains after spaced intervals |

### Critical Metrics to Track

1. **Response Time (Latency)**
   - **Interpretation:** Longer latency post-mastery indicates effortful retrieval (learning), not automatic recall (memorization)
   - **Threshold:** If latency drops from 5s → 2s after 10 attempts, possible memorization of solution path

2. **Hint Level Usage**
   - **Metric:** Track hint escalation (no hint → small hint → major hint)
   - **Interpretation:** Decreasing hint dependency = deeper learning
   - **Signal:** If student repeatedly requests max hints on similar problems, may indicate memorization

3. **Transfer Task Performance**
   - **Metric:** % correct on isomorphic/novel problems (different numbers, slightly different context)
   - **Threshold:** Transfer success <70% while base accuracy >90% suggests memorization

4. **Delayed Retention Score (after 1–2 weeks)**
   - **Metric:** Performance on retention test (identical or slightly varied problems)
   - **Threshold:** 
     - Memorized: drops to 40–60%
     - Understood: maintains 75%+

5. **Error Pattern Analysis**
   - **Metric:** Distribution of error types (computational vs. conceptual)
   - **Interpretation:** Repeated same computational error = skill gap; varied errors = random guessing

---

## 3. Detecting Forgetting: Regression and Signals

### Ebbinghaus Forgetting Curve & Spaced Repetition

**Source:** Retention research — Web search results

The **Ebbinghaus forgetting curve** (1885) describes how memory decays without review:

| Time Interval | Retention (no review) | Signal Action |
|---------------|----------------------|---------------|
| 1 hour        | ~50% drop             | Immediate re-review suggested |
| 1 day         | ~33% retained         | **First spaced review** |
| 2–3 days      | ~25% retained         | **Second spaced review** |
| 1 week        | ~20% retained         | **Third review** (consolidation) |
| 2 weeks       | ~10–15% retained      | **Fourth review** (long-term) |
| 1 month       | ~5–10% retained       | **Fifth review** or durable mastery |

### Detecting Regression/Forgetting

**Key Signals:**

1. **Accuracy Drop After Interval**
   - **Metric:** `accuracy(now) - accuracy(last_session)` > 10%
   - **Action:** Schedule re-review in 1–2 days
   - **Example:** 90% accuracy on Day 1 → 75% on Day 8 = 15% regression

2. **Increased Latency (Slower Retrieval)**
   - **Metric:** `response_time(now) > avg_response_time + 1 SD`
   - **Interpretation:** Skill still present but retrievability degraded
   - **Action:** Hint or prompt to reactivate memory

3. **Higher Hint Dependency After Interval**
   - **Metric:** Average hint level used after time gap
   - **Threshold:** If hint level increases from 1 → 2 after 2 weeks, forgetting detected

4. **Streaks Reset**
   - **Metric:** Correct answer streak (e.g., "3 consecutive correct")
   - **Reset Condition:** Streak counter resets to 0 on first error after interval
   - **Action:** Restart spaced review sequence

### Recommended Spaced Repetition Schedule

| Review | Timing | Action |
|--------|--------|--------|
| **1** | Immediately after mastery | Confirm retention in session |
| **2** | 1 day later | First gap review |
| **3** | 2–3 days after #2 | Consolidation |
| **4** | 1 week after #3 | Long-term memory |
| **5** | 2 weeks after #4 | Durable mastery |
| **6** | 1 month after #5 | Maintenance (if needed) |

---

## 4. Knowledge Tracing Algorithms

### Algorithm Overview

**Source:** Knowledge Tracing Survey — [arXiv: 2105.15106](https://arxiv.org/html/2105.15106v4)

Knowledge Tracing models estimate a student's evolving knowledge state based on their interactions (exercises, correct/incorrect responses).

#### **Bayesian Knowledge Tracing (BKT)**

**Introduced:** Corbett & Anderson (1995)

**What it does:** Maintains a binary belief for each skill: P(L) = probability student knows the skill

**BKT Parameters:**

| Parameter | Symbol | Meaning | Typical Range | Example |
|-----------|--------|---------|---------------|---------|
| **Initial Knowledge** | P(L₀) | P(skill known before practice) | 0.1 – 0.5 | 0.2 |
| **Learning Gain** | P(T) | P(learns skill on one attempt) | 0.01 – 0.3 | 0.1 |
| **Guess** | P(G) | P(correct answer despite not knowing) | 0.1 – 0.3 | 0.2 |
| **Slip** | P(S) | P(incorrect answer despite knowing) | 0.01 – 0.2 | 0.1 |

**BKT Update Rule (simplified):**
```
P(L_new) = P(L_old) + P(T) * (1 - P(L_old))   [if correct]
P(L_new) = P(L_old) * (1 - P(T))              [if incorrect]
```

**Prediction:**
```
P(correct) = P(L) * (1 - P(S)) + (1 - P(L)) * P(G)
```

**Advantages:**
- ✓ Interpretable, probabilistic reasoning
- ✓ Efficient (runs in real-time)
- ✓ Works with limited data
- ✓ Proven effective in 20+ years of research

**Disadvantages:**
- ✗ Binary skill representation (knows/doesn't know)
- ✗ Ignores complex skill hierarchies
- ✗ Fixed parameters don't adapt per student

**Best for:** Small educational plugins, intelligent tutoring systems (ITS)

---

#### **Deep Knowledge Tracing (DKT)**

**Introduced:** Piech et al. (2015) — [arXiv: 1506.05908](https://arxiv.org/abs/1506.05908)

**What it does:** Uses Recurrent Neural Networks (RNNs, LSTMs) to learn complex patterns from sequence of student responses

**Architecture:**
- Input: Sequence of (skill, correctness) pairs
- Hidden state: Captures student's evolving knowledge
- Output: Probability of correct response on next problem

**Advantages:**
- ✓ Captures complex skill dependencies (prerequisite chains)
- ✓ Learns interactions between skills automatically
- ✓ Significantly better prediction accuracy than BKT (15–20% AUC improvement)
- ✓ No explicit parameter tuning needed
- ✓ Discovers hidden structure in student tasks

**Disadvantages:**
- ✗ Requires large datasets (100K+ interactions)
- ✗ Black-box: difficult to interpret why prediction made
- ✗ Slower training; needs GPUs for real-time inference
- ✗ Overkill for simple single-skill domains

**Best for:** Large-scale educational platforms (Coursera, Udacity), systems with rich interaction data

---

#### **Simple Moving Average (SM-2) / Spaced Repetition**

**Introduced:** Wozniak (1987)

**What it does:** Tracks review intervals and difficulty factors to schedule reviews at optimal spacing

**Parameters:**
- Interval (I): Days until next review
- Repetition (R): Review number (1st, 2nd, 3rd...)
- Difficulty factor (EF): Skill difficulty [1.3 – 2.5]

**SM-2 Algorithm:**
```
If quality ≥ 3:  I(n+1) = 1 if n=0; 3 if n=1; I(n) * EF otherwise
If quality < 3:  I(n+1) = 1, n = 0 (restart)
EF_new = EF + (0.1 - (5 - quality) * 0.08)
```

**Advantages:**
- ✓ Extremely simple to implement
- ✓ Minimal memory footprint
- ✓ Works with no data analysis
- ✓ Proven effective for flashcard systems (Anki, SuperMemory)

**Disadvantages:**
- ✗ No prediction of future performance
- ✗ Ignores item difficulty; all skills treated equally
- ✗ Fixed algorithm doesn't learn per-student patterns

**Best for:** Personal flashcard apps, lightweight spaced repetition systems

---

### Algorithm Comparison Matrix

| Dimension | BKT | DKT | SM-2 |
|-----------|-----|-----|------|
| **Data Requirements** | Low (100s) | High (100K+) | Minimal |
| **Prediction Accuracy** | Moderate | High (±15%) | Low |
| **Interpretability** | ✓ High | ✗ Low | ✓ High |
| **Real-time Inference** | ✓ <1ms | Slower (~50ms) | ✓ <1ms |
| **Parameter Tuning** | Required | Automatic (NN) | Automatic |
| **Skill Dependencies** | Single skill | ✓ Learns automatically | N/A |
| **Implementation Complexity** | Medium | High | Low |
| **Best Use Case** | ITS, adaptive plugins | Large platforms | Spaced repetition |

---

## 5. Proposed SQLite Schema for Learning Tracking

### Overview

Track learning progress at session and topic levels, capturing:
- **Session metadata** (time, duration, fatigue signals)
- **Individual attempts** (response time, correctness, hints used)
- **Mastery state** (BKT beliefs, streaks, next review)

### Schema Design

```sql
-- Core Sessions Table
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,                    -- UUID or auto-generated
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,                    -- e.g., "quadratic_equations"
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    duration_seconds INTEGER,               -- end_time - start_time
    fatigue_signal REAL,                    -- 0.0–1.0 (estimated from latency, errors)
    session_quality TEXT,                   -- "good" | "fair" | "poor"
    notes TEXT
);

-- Individual Practice Attempts
CREATE TABLE attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    question_id TEXT NOT NULL,              -- ID of question/problem
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER,               -- latency in milliseconds
    hint_level_used INTEGER,                -- 0=none, 1=small, 2=major
    attempt_number INTEGER,                 -- attempt N on this question
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_explanation TEXT,                  -- Optional: student's explanation
    FOREIGN KEY(session_id) REFERENCES sessions(id)
);

-- Mastery & Review Tracking Per Topic
CREATE TABLE mastery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    bkt_p_known REAL DEFAULT 0.0,          -- P(L) from BKT [0.0–1.0]
    bkt_p_guess REAL DEFAULT 0.2,          -- P(G) [0.1–0.3]
    bkt_p_slip REAL DEFAULT 0.1,           -- P(S) [0.01–0.2]
    bkt_p_initial REAL DEFAULT 0.2,        -- P(L₀) [0.1–0.5]
    bkt_p_learn REAL DEFAULT 0.1,          -- P(T) [0.01–0.3]
    
    last_reviewed DATETIME,
    next_review DATETIME,                   -- Spaced repetition schedule
    review_interval_days INTEGER,           -- Gap to next review
    review_count INTEGER DEFAULT 0,         -- # of reviews completed
    
    correct_streak INTEGER DEFAULT 0,       -- Consecutive correct answers
    total_attempts INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    recent_accuracy_7day REAL,              -- Accuracy in last 7 days [0.0–1.0]
    
    mastery_achieved BOOLEAN DEFAULT FALSE,
    mastery_date DATETIME,                  -- When P(L) > 0.95
    last_lapsed DATETIME,                   -- Last time accuracy dropped >10%
    
    UNIQUE(user_id, topic)
);

-- Optional: Transfer Task Results (for deep understanding check)
CREATE TABLE transfer_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mastery_id INTEGER NOT NULL,            -- Reference to mastery.id
    transfer_task_id TEXT NOT NULL,         -- ID of transfer task
    is_correct BOOLEAN NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(mastery_id) REFERENCES mastery(id)
);

-- Optional: Retention Test Results (delayed assessment)
CREATE TABLE retention_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mastery_id INTEGER NOT NULL,
    scheduled_date DATETIME NOT NULL,       -- When test was scheduled
    taken_date DATETIME,                    -- When student actually took it
    is_completed BOOLEAN DEFAULT FALSE,
    score_percent REAL,                     -- 0–100
    questions_correct INTEGER,
    questions_total INTEGER,
    time_since_mastery_days INTEGER,        -- Days between mastery_date and test
    FOREIGN KEY(mastery_id) REFERENCES mastery(id)
);
```

### Key Relationships

```
users
  ├─ sessions (one user → many sessions)
  │   └─ attempts (one session → many attempts)
  │
  └─ mastery (one user → many topics)
      ├─ transfer_attempts (mastery → transfer tasks)
      └─ retention_tests (mastery → delayed tests)
```

### Queries for Analytics

#### 1. Detect Regression (Forgetting)

```sql
-- Students who've dropped >10% accuracy in last 7 days
SELECT 
    m.user_id, m.topic, m.recent_accuracy_7day,
    m.last_lapsed,
    JULIANDAY('now') - JULIANDAY(m.last_reviewed) as days_since_review
FROM mastery m
WHERE m.recent_accuracy_7day < (m.correct_count::FLOAT / m.total_attempts) - 0.1
  AND m.total_attempts > 5
ORDER BY m.recent_accuracy_7day ASC;
```

#### 2. Identify Students Ready for Retention Test

```sql
-- Topics ready for delayed retention (1–2 weeks post-mastery)
SELECT 
    m.user_id, m.topic, m.mastery_date,
    JULIANDAY('now') - JULIANDAY(m.mastery_date) as days_since_mastery
FROM mastery m
WHERE m.mastery_achieved = TRUE
  AND (JULIANDAY('now') - JULIANDAY(m.mastery_date)) BETWEEN 7 AND 14
  AND NOT EXISTS (
      SELECT 1 FROM retention_tests rt 
      WHERE rt.mastery_id = m.id 
        AND rt.is_completed = TRUE
  )
ORDER BY m.mastery_date ASC;
```

#### 3. Fatigue Detection (from session data)

```sql
-- Sessions with high fatigue (slowing latency, dropping accuracy)
SELECT 
    s.id, s.user_id, s.topic, s.start_time,
    AVG(a.response_time_ms) as avg_latency,
    SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as accuracy,
    s.fatigue_signal
FROM sessions s
JOIN attempts a ON a.session_id = s.id
WHERE s.fatigue_signal > 0.6
GROUP BY s.id
ORDER BY s.fatigue_signal DESC;
```

#### 4. Transfer Task Performance vs. Base Performance

```sql
-- Compare transfer task success to base mastery
SELECT 
    m.user_id, m.topic,
    ROUND(100.0 * m.correct_count / m.total_attempts, 1) as base_accuracy_pct,
    ROUND(100.0 * SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END) / 
          COUNT(ta.id), 1) as transfer_accuracy_pct,
    CASE 
        WHEN (100.0 * SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END) / COUNT(ta.id)) 
             < (100.0 * m.correct_count / m.total_attempts) - 20
        THEN 'Possible memorization'
        ELSE 'Good transfer'
    END as assessment
FROM mastery m
LEFT JOIN transfer_attempts ta ON ta.mastery_id = m.id
WHERE m.mastery_achieved = TRUE
GROUP BY m.id;
```

### Fatigue Signal Calculation

```sql
-- Compute fatigue_signal at end of session (0=fresh, 1=exhausted)
UPDATE sessions
SET fatigue_signal = (
    SELECT CASE 
        WHEN COUNT(*) < 3 THEN 0.0  -- Too few attempts to assess
        ELSE 
            -- Factor 1: Latency increase (slower = more fatigued)
            (
                MAX(response_time_ms) - AVG(response_time_ms)
            ) / GREATEST(AVG(response_time_ms), 100) * 0.4 +
            
            -- Factor 2: Accuracy decline within session
            GREATEST(
                0,
                (
                    (SELECT AVG(CASE WHEN is_correct THEN 1 ELSE 0 END) 
                     FROM attempts WHERE session_id = sessions.id 
                       AND attempt_number <= 5) -
                    (SELECT AVG(CASE WHEN is_correct THEN 1 ELSE 0 END) 
                     FROM attempts WHERE session_id = sessions.id 
                       AND attempt_number > 5)
                ) * 0.4
            ) +
            
            -- Factor 3: Error rate in last 3 attempts
            CASE 
                WHEN (SELECT SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) 
                      FROM attempts WHERE session_id = sessions.id 
                      ORDER BY attempt_number DESC LIMIT 3) >= 2
                THEN 0.2
                ELSE 0.0
            END
    END
)
WHERE end_time IS NOT NULL;
```

---

## 6. BKT Parameter Summary & Typical Values

### BKT Parameters Explained

| Parameter | Full Name | Meaning | Range | Typical |
|-----------|-----------|---------|-------|---------|
| **P(L₀)** | Initial Knowledge | Skill already known before practice | 0.1–0.5 | 0.2 |
| **P(T)** | Learning (Transition) | Probability of learning on one attempt | 0.01–0.3 | 0.1 |
| **P(G)** | Guess | Probability of correct guess without knowledge | 0.1–0.3 | 0.2 |
| **P(S)** | Slip | Probability of error despite knowing | 0.01–0.2 | 0.1 |

### How BKT Works

**State:** For each skill, maintain belief P(L) = probability student knows it

**Update on Each Attempt:**

1. **If student answers correctly:**
   ```
   P(L_new) = P(L_old) + P(T) * (1 - P(L_old))
   ```
   Student either already knew (P(L_old)) or just learned (P(T) chance)

2. **If student answers incorrectly:**
   ```
   P(L_new) = P(L_old) * (1 - P(T))
   ```
   Student didn't know it initially and didn't learn; probability decreases

**Prediction of Next Response:**
```
P(correct) = P(L) * (1 - P(S)) + (1 - P(L)) * P(G)
           = P(L) * [chance of knowing and not slipping]
           + (1 - P(L)) * [chance of guessing correctly]
```

### Example Trace

Scenario: Student learns quadratic formula
- Initial: P(L) = 0.1, P(T) = 0.2, P(G) = 0.25, P(S) = 0.1

| Attempt | Response | New P(L) | Prediction |
|---------|----------|----------|-----------|
| 0 | — | 0.10 | P(correct)=0.10×0.9 + 0.90×0.25 = 0.315 |
| 1 | ✓ | 0.28 | P(correct)=0.28×0.9 + 0.72×0.25 = 0.432 |
| 2 | ✓ | 0.42 | P(correct)=0.42×0.9 + 0.58×0.25 = 0.523 |
| 3 | ✗ | 0.34 | P(correct)=0.34×0.9 + 0.66×0.25 = 0.471 |
| 4 | ✓ | 0.47 | P(correct)=0.47×0.9 + 0.53×0.25 = 0.556 |
| 5 | ✓ | 0.58 | P(correct)=0.58×0.9 + 0.42×0.25 = 0.627 |

**Mastery threshold:** P(L) > 0.95 requires ~12–15 correct attempts (with these parameters)

---

## 7. Algorithm Comparison: BKT vs. DKT vs. SM-2 for Small Plugins

### Scenario: Educational Plugin with <10K Daily Active Users

#### **Recommendation Matrix**

| Consideration | BKT | DKT | SM-2 |
|---|---|---|---|
| **Data volume** | 100s interactions OK | Need 100K+ | Minimal |
| **Skill count** | Single/few | Many, interconnected | Any |
| **Update latency** | <1ms ✓ | ~50ms OK | <1ms ✓ |
| **Parameter fitting** | Needed (EM algorithm) | Auto-learned | Minimal tuning |
| **Interpretability** | ✓ High (educators like it) | Black box | ✓ Simple |
| **Scalability** | ✓ Linear | Quadratic (GPU helps) | ✓ Linear |
| **Deployment** | Simple (Python/SQL) | ML infra required | Trivial |
| **Maintenance** | Medium (parameter tweaks) | High (retrain model) | Low |

#### **Decision Tree**

```
Does your plugin have:

├─ <1,000 daily users?
│  └─ YES → BKT (best balance) or SM-2 (if only spacing needed)
│
├─ 1,000–10,000 daily users?
│  ├─ <5 topics?     → BKT ✓ (low maintenance)
│  └─ 5+ topics?     → BKT + detect skill gaps manually
│
├─ 10,000+ daily users?
│  ├─ Sufficient data (~1M interactions)?  → DKT
│  └─ Limited data?                        → BKT with skill graph
│
└─ Simple spacing-only system (flashcards)?
   └─ SM-2 ✓ (proven, minimal code)
```

#### **Small Plugin Implementation: BKT**

**Why:** 
- ✓ Proven effective in research (20+ years)
- ✓ Runs on commodity servers
- ✓ Fast inference (<1ms per prediction)
- ✓ Educators understand it
- ✓ Transparent: can show P(L) to student

**Implementation sketch:**

```python
class BKTSkill:
    def __init__(self, p_guess=0.2, p_slip=0.1, p_learn=0.1, p_init=0.2):
        self.p_g, self.p_s, self.p_l, self.p_t = p_guess, p_slip, p_learn, p_init
        self.p_known = p_init  # Current belief
        self.attempts = 0
    
    def predict_correct(self):
        """Predict P(student answers correctly on next attempt)"""
        return self.p_known * (1 - self.p_s) + (1 - self.p_known) * self.p_g
    
    def update(self, is_correct):
        """Update belief after attempt"""
        if is_correct:
            self.p_known += self.p_t * (1 - self.p_known)
        else:
            self.p_known *= (1 - self.p_t)
        self.attempts += 1
    
    def is_mastered(self):
        """Check if P(L) > 0.95"""
        return self.p_known > 0.95
```

#### **Small Plugin Implementation: SM-2**

**Why:**
- ✓ Dead simple (no ML needed)
- ✓ Proven in Anki, SuperMemory
- ✓ Works with zero training data
- ✓ Perfect for flashcard/spaced repetition plugins

```python
class SM2Card:
    def __init__(self):
        self.interval = 1          # Days until next review
        self.ease_factor = 2.5     # Difficulty [1.3–2.5]
        self.repetitions = 0
        self.last_reviewed = None
    
    def next_review_date(self):
        return date.today() + timedelta(days=self.interval)
    
    def update(self, quality):
        """
        Quality: 0–5 (0=complete blackout, 5=perfect)
        """
        self.repetitions += 1
        
        if quality >= 3:  # Passing
            if self.repetitions == 1:
                self.interval = 1
            elif self.repetitions == 2:
                self.interval = 3
            else:
                self.interval = int(self.interval * self.ease_factor)
        else:  # Failing
            self.repetitions = 0
            self.interval = 1
        
        # Adjust difficulty
        self.ease_factor = max(1.3, self.ease_factor + 0.1 - (5 - quality) * 0.08)
        self.last_reviewed = date.today()
```

---

## 8. Citations & References

### Academic Papers

1. **Corbett, A. T., & Anderson, J. R.** (1995). "Knowledge tracing: Modeling the acquisition of procedural knowledge." *User Modeling and User-Adapted Interaction*, 4(4), 253–278.
   - Original BKT paper; foundational work.

2. **Shen, S., Liu, Q., Huang, Z., et al.** (2021). "A Survey of Knowledge Tracing: Models, Variants, and Applications." *arXiv:2105.15106*
   - **URL:** https://arxiv.org/html/2105.15106v4
   - Comprehensive survey covering BKT, DKT, and variants; includes open-source libraries (EduData, EduKTM).

3. **Piech, C., Spencer, J., Huang, J., et al.** (2015). "Deep Knowledge Tracing." *arXiv:1506.05908*
   - **URL:** https://arxiv.org/abs/1506.05908
   - Introduces RNN-based knowledge tracing; shows 15–20% AUC improvement over BKT.

### Mastery Learning

4. **Bloom, B. S.** (1968). "Learning for Mastery." *Evaluation Comment*, 1(2).
   - Original proposal of mastery learning; 90% threshold principle.

5. **Wikipedia: Mastery learning**
   - **URL:** https://en.wikipedia.org/wiki/Mastery_learning
   - Comprehensive overview; empirical effect size (0.59); references to Bloom's 2-Sigma Problem.

6. **Structural Learning: Mastery Learning**
   - **URL:** https://www.structural-learning.com/post/mastery-learning
   - Practical implementation; 95% proficiency target; criterion-based assessment.

### Learning Psychology & Spaced Repetition

7. **Ebbinghaus, H.** (1885). *Memory: A Contribution to Experimental Psychology*
   - Foundational work on forgetting curves; retention decay without review.

8. **Wozniak, P. A.** (1987). "Optimization of learning."
   - SM-2 algorithm; basis for Anki, SuperMemory; effective for spaced repetition.

### Online Platforms Using Knowledge Tracing

- **ASSISTments** — Publicly available dataset; BKT applications; http://assistments.org
- **Coursera** — Large-scale adaptive learning; knowledge tracing for recommendations
- **Carnegie Learning** — ITS with BKT; published research on transfer tasks

---

## 9. Key Takeaways

1. **Mastery is not a single number.** True understanding requires:
   - Immediate performance (90%)
   - Delayed retention (80%+ after weeks)
   - Transfer to novel problems
   - Rich explanations, not memorized answers

2. **Detect memorization vs. understanding via:**
   - Response latency (faster ≠ better; reasoning takes longer)
   - Transfer task performance (must apply in new contexts)
   - Delayed retention tests (memorization forgets, understanding persists)

3. **Forgetting follows Ebbinghaus's curve.** Counter it with:
   - Spaced repetition at 1 day, 3 days, 1 week, 2 weeks, 1 month
   - Monitoring regression signals (accuracy drop >10%, latency increases)

4. **For small plugins: Use BKT.** It's proven, efficient, and interpretable. DKT is overkill without 100K+ interactions.

5. **Track the right metrics:**
   - P(correct), accuracy, latency, hint usage
   - Retention test scores post-mastery
   - Transfer task success
   - Fatigue signals (session quality)

---

## Appendix: Recommended Further Reading

- **Intelligent Tutoring Systems (ITS)** — See ASSISTments research hub
- **Educational Data Mining (EDM)** — Annual conference; rich papers on KT applications
- **Learning Analytics & Knowledge (LAK)** — Conference for analytics in education
- **Cognitive Science + SRS** — Dunlosky et al. (2013), "Improving Students' Learning" for evidence-based study techniques

---

*Report compiled from academic research, knowledge tracing surveys, and educational psychology literature.*
*Last updated: 2025*
