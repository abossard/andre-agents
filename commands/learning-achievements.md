---
description: "List all learning achievements you've earned"
---

Run the achievements command and format the output:

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-${COPILOT_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}}"
node "$PLUGIN_DIR/src/cli.js" achievement list
```

Format as a celebratory list with achievement name, description, and date earned.
