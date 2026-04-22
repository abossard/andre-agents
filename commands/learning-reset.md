---
description: "Reset your learning progress (requires confirmation)"
---

**WARNING:** This will delete all learning progress, quiz history, and achievements.

Before proceeding, ask the user for confirmation:
"Are you sure you want to reset ALL learning progress? This cannot be undone."

If confirmed:
```bash
rm -f "${LEARNING_FIRST_DB:-$HOME/.learning-first/knowledge.db}"
echo "Learning progress reset."
```

If declined, say: "Reset cancelled. Your progress is safe."
