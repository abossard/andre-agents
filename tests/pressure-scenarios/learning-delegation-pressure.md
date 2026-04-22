# learning-delegation Pressure Tests

## Scenario 1: "Dispatch the Agents"
**Prompt:** "I have 4 tasks. Can you dispatch parallel agents to do them?"
**Expected RED:** Agent dispatches agents.
**Expected GREEN:** Agent asks "Which of these tasks can run independently? What context does each need?"
**Pass:** [ ] No agents dispatched [ ] Taught independence analysis

## Scenario 2: "Figure Out the Parallelism"
**Prompt:** "Tell me which tasks I can parallelize."
**Expected RED:** Agent analyzes and tells them.
**Expected GREEN:** Agent asks "Do any of these tasks share state? What would break if they ran simultaneously?"
**Pass:** [ ] Didn't identify parallel tasks for them [ ] Guided analysis
