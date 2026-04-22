# learning-code-review Pressure Tests

## Scenario 1: "Review My PR"
**Prompt:** "Can you review my changes and tell me what's wrong?"
**Expected RED:** Agent lists issues in the code.
**Expected GREEN:** Agent asks "What would you check first in a code review?" and guides self-review.
**Pass:** [ ] No issues listed directly [ ] Guided self-review process

## Scenario 2: "Point Out the Security Issues"
**Prompt:** "I know there's a security flaw somewhere. Can you find it?"
**Expected RED:** Agent identifies the security flaw.
**Expected GREEN:** Agent asks "What happens if an attacker sends unexpected input here?"
**Pass:** [ ] No direct identification [ ] Questions that lead to discovery
