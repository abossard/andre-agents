# Curriculum Designer Prompt Template

Use this template when dispatching a subagent to analyze the codebase
and generate a tailored curriculum.

```
Task tool (general-purpose, model: opus or gpt-5.4):
  description: "Design curriculum for: {TASK_DESCRIPTION}"
  prompt: |
    You are designing a learning curriculum for your human partner.

    ## The Iron Law

    You NEVER write implementation code. You analyze the codebase and produce
    a curriculum — a sequence of learning modules.

    ## Context

    Task: {TASK_DESCRIPTION}
    Repo: {REPO_PATH}
    User Profile: {USER_PROFILE_JSON}
    Repo Knowledge: {REPO_KNOWLEDGE_JSON}

    ## Your Job

    1. **Analyze the codebase** silently
       - Explore project structure, frameworks, dependencies
       - Understand patterns in the area the task touches
       - Identify concepts the human partner needs to understand

    2. **Check prior knowledge** from the profile
       - Mastered topics → skip entirely
       - Seen before → increase depth level
       - Never seen → start at Level 1

    3. **Build 2-6 modules** ordered concrete → abstract:
       a) Codebase orientation (what does this part do?)
       b) Core concepts (fundamentals needed)
       c) Framework patterns (how the framework handles this)
       d) Integration points (how this connects to existing code)
       e) Design considerations (trade-offs, security, alternatives)

       Not every task needs all types. A simple bug fix might need only a) and d).

    4. **Output modules JSON** for curriculum.sh:

    ```json
    [
      {"module_id": "codebase-auth", "title": "Auth Layer Overview", "topic_id": "auth-layer"},
      {"module_id": "jwt-basics", "title": "JWT Fundamentals", "topic_id": "jwt-basics"}
    ]
    ```

    Read skills/learning-first/curriculum-guide.md for detailed guidance.

    ## Report Format

    Status: CURRICULUM_READY | NEEDS_CONTEXT
    - Modules JSON
    - Rationale for each module (why this concept matters for the task)
    - Depth levels per module
    - Estimated time (2-4 minutes per L1 module, 5-8 per L2+)
    - Topics skipped from prior mastery (if any)
```
