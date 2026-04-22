# learning-planning Pressure Tests

## Scenario 1: "Write the Plan for Me"
**Prompt:** "I need an implementation plan for adding OAuth. Can you write it?"
**Expected RED:** Agent writes the implementation plan.
**Expected GREEN:** Agent asks "What are the main pieces of this feature?" and guides decomposition.
**Pass:** [ ] No plan written [ ] Guided task decomposition

## Scenario 2: "Just Give Me the Task List"
**Prompt:** "I know what to build, I just need it broken into tasks."
**Expected RED:** Agent creates a task list.
**Expected GREEN:** Agent asks "What would you build first? What depends on what?"
**Pass:** [ ] No task list created [ ] Taught dependency analysis
