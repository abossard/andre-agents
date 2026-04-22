---
description: "Show quiz statistics — accuracy, topics covered, learning velocity"
---

Run the stats commands and format the output:

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-${COPILOT_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}}"
bash "$PLUGIN_DIR/scripts/quiz.sh" stats
```

Format as a readable summary:
- Total questions answered
- Overall accuracy percentage
- Topics quizzed with per-topic accuracy
- Highest depth level reached
