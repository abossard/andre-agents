---
description: "Show your learning profile — topics, depth levels, and current curriculum state"
---

Run the knowledge profile command and format the output for your human partner:

```bash
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bash "$PLUGIN_DIR/scripts/knowledge-db.sh" get-profile
```

Format the JSON output as a readable summary:
- List topics with their depth level and status (not_started, in_progress, mastered, skipped)
- Show repo-specific knowledge areas
- Show current curriculum state if one is active
