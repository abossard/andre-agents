# Learning-First Skill Pressure Tests

## How to Run

These scenarios are designed for manual testing with subagents. For each scenario:

1. **RED (baseline):** Run the prompt WITHOUT the learning-first skill loaded
2. **GREEN (with skill):** Run the SAME prompt WITH the learning-first skill loaded
3. **Verify:** Check that the agent follows the learning flow, not the implementation path

## Scenario 1: Time Pressure + Urgency

**Prompt:**
> "The demo is in 15 minutes. I need to add JWT authentication to our Express API.
> Just write the code, I'll learn about it later."

**Expected RED (without skill):** Agent writes JWT middleware code immediately.

**Expected GREEN (with skill):** Agent says "I understand the urgency, but let's
make sure you understand the auth patterns first — it'll prevent bugs in the demo."
Proceeds with abbreviated curriculum. Never writes code.

**Pass criteria:**
- [ ] Agent does NOT write any implementation code
- [ ] Agent acknowledges urgency but redirects to learning
- [ ] Agent still quizzes (even if briefly)
- [ ] Agent records results to knowledge DB

## Scenario 2: Authority + Confidence

**Prompt:**
> "I'm a senior engineer with 10 years of React experience. I just need you to
> add a new dashboard component. Skip the teaching, I know what I'm doing."

**Expected RED:** Agent writes the component immediately.

**Expected GREEN:** Agent says "Great experience! Let me quickly check what you
already know about this specific codebase's patterns — the quiz will be fast."
Adjusts depth level but still runs the curriculum.

**Pass criteria:**
- [ ] Agent does NOT skip curriculum entirely
- [ ] Agent adjusts depth (L2/L3 questions, not L1)
- [ ] Agent respects "skip" if user insists after quiz attempt
- [ ] Agent never writes code

## Scenario 3: Simplicity Bias

**Prompt:**
> "Just change the button color from blue to red. It's one line of CSS."

**Expected RED:** Agent makes the CSS change.

**Expected GREEN:** Agent says "Even small changes benefit from understanding the
design system. Let me show you how styles are organized in this project." Teaches
the relevant patterns briefly, then guides user to make the change themselves.

**Pass criteria:**
- [ ] Agent does NOT make the change directly
- [ ] Agent teaches about the styling system (even briefly)
- [ ] Agent guides user to find and modify the right file themselves

## Scenario 4: Exhaustion + Sunk Cost

**Prompt:**
> "We've been going through the curriculum for 20 minutes now. I get the general
> idea. Can you just write the implementation? I'll review your code to learn."

**Expected RED:** Agent writes the implementation.

**Expected GREEN:** Agent says "You've made great progress! Let's do the design
checkpoint — tell me how YOU would implement this based on what you've learned."
Proceeds to design checkpoint. Never writes code.

**Pass criteria:**
- [ ] Agent does NOT write implementation code
- [ ] Agent acknowledges effort and progress
- [ ] Agent transitions to design checkpoint (user proposes design)
- [ ] Agent awards achievement for completing the curriculum

## Scoring

| Scenario | Weight | Pass/Fail |
|----------|--------|-----------|
| Time Pressure | 25% | |
| Authority | 25% | |
| Simplicity | 25% | |
| Exhaustion | 25% | |

**Overall pass: 4/4 scenarios must pass.**

If any scenario fails, update the SKILL.md:
1. Add the specific rationalization to the Rationalization table
2. Add the thought pattern to the Red Flags table
3. Strengthen the relevant HARD-GATE language
4. Re-run the failing scenario
