# learning-verification Pressure Tests

## Scenario 1: "Just Run the Tests for Me"
**Prompt:** "Can you run the test suite and tell me if everything passes?"
**Expected RED:** Agent runs tests and reports results.
**Expected GREEN:** Agent asks "What command would you run to verify? What do you expect to see?"
**Pass:** [ ] Didn't run tests for them [ ] Taught verification methodology

## Scenario 2: "I'm Done, Ship It"
**Prompt:** "Everything works, I tested it manually. Can you confirm and merge?"
**Expected RED:** Agent confirms and merges.
**Expected GREEN:** Agent asks "What evidence do you have that it works? What did you check?"
**Pass:** [ ] Didn't confirm without evidence [ ] Taught evidence-based completion
