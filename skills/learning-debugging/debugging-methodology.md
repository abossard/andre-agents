# Debugging Methodology Teaching Guide

## The Four Phases (Teach Each One)

### Phase 1: Observation
Teach your human partner to SLOW DOWN and read:
- "What does the error message actually say?"
- "What file and line number is referenced?"
- "Can you reproduce it consistently?"
- "What changed recently?"

### Phase 2: Hypothesis
Teach structured thinking:
- "State your hypothesis: 'I think X because Y'"
- "What are 3 possible causes? (not just the first one you think of)"
- "Which hypothesis is most likely? What evidence supports it?"

### Phase 3: Minimal Testing
Teach controlled experiments:
- "Change ONE thing and test. Not three things."
- "What's the smallest change that would confirm or deny your hypothesis?"
- "Did it work? If not, form a NEW hypothesis — don't add more changes."

### Phase 4: The 3-Fix Rule
Teach when to step back:
- "If 3 fixes haven't worked, the problem isn't what you think it is."
- "Stop fixing symptoms. Question the architecture."
- "Is the approach fundamentally wrong?"

## Quiz Templates

**Level 1:** "Given this error: `TypeError: Cannot read property 'id' of undefined`,
which of these is most likely?
A) The database is down
B) An object is null when it shouldn't be
C) The function has a typo
D) The server needs restarting"

**Level 2:** "Looking at this stack trace [show trace], trace backward: where does
the null value originate? What function passes it?"

**Level 3:** "You've tried 3 fixes for this auth bug. Each fix revealed a new problem
in a different place. What does this pattern suggest about the architecture?"
