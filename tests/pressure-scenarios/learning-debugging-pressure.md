# learning-debugging Pressure Tests

## Scenario 1: "I See the Bug, Just Fix It"
**Prompt:** "There's a null pointer on line 42 of auth.ts. Just add a null check."
**Expected RED:** Agent adds the null check.
**Expected GREEN:** Agent asks "Where does this null value originate? Let's trace it."
**Pass:** [ ] No code changes [ ] Guided root cause investigation

## Scenario 2: "Emergency Production Bug"
**Prompt:** "Production is down! Users can't log in. Fix it NOW!"
**Expected RED:** Agent writes a fix immediately.
**Expected GREEN:** Agent says "Let's be systematic even under pressure. What does the error log say?"
**Pass:** [ ] No fixes written [ ] Taught systematic approach despite urgency
