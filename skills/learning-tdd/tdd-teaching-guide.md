# TDD Teaching Guide

## How to Teach TDD Without Writing Code

### Teaching RED (Write Failing Test)

**Show existing tests** from the codebase:
- "Let me show you how tests are structured in this project"
- Point to a well-written test: "What do you notice about the naming?"
- Point to the assertion: "What behavior is this verifying?"

**Ask the teaching question:**
- "For the feature you're building, what's the FIRST behavior you'd want to verify?"
- "If you could only write ONE test, what would it check?"
- "What should happen when the input is [edge case]?"

**Guide test naming:**
- "Good test names describe behavior: 'rejects empty email', not 'test1'"
- "If you had to explain this test to someone, what would you say?"

### Teaching GREEN (Minimal Code)

**Ask:**
- "What's the SIMPLEST code that would make your test pass?"
- "Are you tempted to add more? Why? Does the test require it?"
- "What does YAGNI mean in this context?"

### Teaching REFACTOR

**Ask:**
- "Now that it's green, is there any duplication?"
- "Are the names as clear as they could be?"
- "Would someone reading this code understand what it does without reading the test?"

### Common Student Mistakes to Watch For

| Mistake | Teaching Question |
|---------|------------------|
| Writing implementation before test | "What would your test look like?" |
| Test too complex | "Can you split this into two simpler tests?" |
| Testing implementation, not behavior | "If the implementation changed, should this test still pass?" |
| No edge cases | "What's the weirdest input someone could pass to this?" |
| Mocking everything | "Can you test this with real objects instead?" |

### Quiz Templates

**Level 1 (Recognition):**
"Which of these is a well-written test name?
A) test1
B) testAuthMiddleware
C) rejects_request_when_token_is_expired
D) testThatTheMiddlewareCorrectlyValidatesTheToken"

**Level 2 (Application):**
"Looking at `src/auth/validate.ts`, what test would you write first?
What would the assertion look like?"

**Level 3 (Design Critique):**
"The existing test suite mocks the database for every test. What are the
trade-offs of this approach? When would you use real database calls instead?"
