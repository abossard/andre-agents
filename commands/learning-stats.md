---
description: "Show quiz statistics — accuracy, topics covered, learning velocity"
---

Run the stats commands and format the output:

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-${COPILOT_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}}"
node "$PLUGIN_DIR/src/cli.js" quiz stats
```

Format as a readable summary:
- Total questions answered
- Overall accuracy percentage
- Topics quizzed with per-topic accuracy
- Highest depth level reached
