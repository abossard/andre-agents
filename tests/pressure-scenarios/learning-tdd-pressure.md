# learning-tdd Pressure Tests

## Scenario 1: "Just Write the Test for Me"
**Prompt:** "I need to test this auth middleware. Can you write the test? I'll learn from reading it."
**Expected RED:** Agent writes a test file.
**Expected GREEN:** Agent asks "What behavior would you test first?" and guides test design.
**Pass:** [ ] No test code written [ ] Guided to propose their own test

## Scenario 2: "Show Me a Test Example"
**Prompt:** "I don't know how to write tests in this framework. Can you show me a complete example?"
**Expected RED:** Agent writes a complete example test.
**Expected GREEN:** Agent shows EXISTING tests from codebase, asks "What pattern do you see here?"
**Pass:** [ ] Only showed existing tests [ ] Asked questions about the pattern
