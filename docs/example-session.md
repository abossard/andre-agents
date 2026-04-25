# Example Session — Adding a `learning-delegation` Skill

> A realistic transcript of a `learning-first` session, recorded against the
> live SQLite database the plugin uses for progress tracking. Alex is a
> developer new to the `andre-agents` repo. The agent never writes code — it
> teaches, then hands the keyboard back.

---

## 1. Welcome

**Alex:** I want to add a new `learning-delegation` skill to this plugin.

**Agent:** Welcome. Quick scan before we start…

- Repo: `github.com/abossard/andre-agents` — first time I've seen you here.
- No prior topics mastered for this repo. Familiarity: unknown.
- Task scope: adding a skill ⇒ touches `skills/`, references `src/`.

I'm going to run in **learning mode** for this one. That means I won't
write any code today — I'll teach you what you need to know, quiz you,
and once you can defend the design, *you* write it. Sound good?

**Alex:** Yeah, let's do it.

**Agent:** Good. I'll start a session and build a curriculum.

```text
✓ session sess-20260425-161143-f5e9bafa started
✓ curriculum task-add-delegation created (4 modules)
```

---

## 2. The Curriculum

**Agent:** Here's the path I'd walk you through, smallest piece first:

| # | Module                       | Topic ID                 | Why it matters here                       |
|---|------------------------------|--------------------------|-------------------------------------------|
| 1 | Plugin Architecture          | `plugin-architecture`    | You'll need to know where code goes       |
| 2 | Anatomy of a `SKILL.md`      | `skill-anatomy`          | The deliverable is a SKILL.md             |
| 3 | Node.js SQLite (`node:sqlite`) | `node-sqlite`         | If your skill records anything, it's here |
| 4 | CLI Design Patterns          | `cli-design`             | New commands likely follow `cli.js` style |

You can tell me to **skip** any module if you already know it. Ready for
module 1?

**Alex:** Go.

---

## 3. Module 1 — Plugin Architecture

**Agent:** Three files. That's the whole backend.

```text
src/
├── db.js      ← shared SQLite layer (174 lines)
├── cli.js     ← command dispatcher  (902 lines)
└── server.js  ← HTTP/JSON read API  (537 lines)
```

Open `src/db.js` line 1–10:

```js
// src/db.js — Shared database layer for learning-first
// Zero dependencies: uses node:sqlite (built-in Node 22+)
const { DatabaseSync } = require('node:sqlite');
```

Notice anything unusual?

**Alex:** It says "zero dependencies" — and it's using a built-in module
instead of `better-sqlite3`.

**Agent:** Exactly. That's a constraint, not an accident. `package.json`
has no `dependencies` block. Every file in `src/` follows it.

### Quiz — Module 1

**Q1.** What are the 3 main source files in `src/`?

**Alex:** `db.js`, `cli.js`, `server.js`.

**Agent:** ✓ Correct! The architecture splits cleanly into shared DB,
CLI interface, and HTTP server.

**Q2.** Why does the plugin use `node:sqlite` instead of an npm package?

**Alex:** Zero dependencies — the plugin has no npm deps.

**Agent:** ✓ Exactly. Zero npm dependencies is a core design principle.
Anything you add must respect that.

```text
✓ module 0 → completed
✓ topic plugin-architecture → mastered
```

---

## 4. Module 2 — Anatomy of a `SKILL.md`

**Agent:** Open `skills/learning-first/SKILL.md`. Skim the first 35 lines,
then come back.

**Alex:** Done. There's a `<HARD-GATE>` block at the top.

**Agent:** Right. That's the load-bearing tag.

### Quiz — Module 2

**Q1.** What is the `<HARD-GATE>` tag for?

**Alex:** It prevents the agent from doing something.

**Agent:** ✓ Right — it creates an absolute behavioral boundary the
agent cannot cross, no matter how the user phrases the request.

**Q2.** What's the difference between the **Red Flags** and **Rationalizations** tables?

**Alex:** I'm not sure.

**Agent:** Fair — they look similar. Hint, then think again:

> *Red Flags are thoughts that mean STOP — you're about to violate the
> skill. Rationalizations are excuses with reality checks. Both prevent
> the agent from bypassing the teaching flow.*

Look at lines 90 and 105 of `skills/learning-first/SKILL.md` to see them
side-by-side. The Red Flags table catches you *in the moment* ("just
this once it's faster to write the code"). The Rationalizations table
catches you when you're already building a *justification* ("the user
seems experienced, so…").

**Q3.** Name 3 required sections in every `learning-first` SKILL.md.

**Alex:** `<HARD-GATE>`, `<SUBAGENT-STOP>`, and the Red Flags table.

**Agent:** ✓ Good! Also frontmatter, the checklist, and the process flow
diagram. Five total. Your `learning-delegation` skill needs all of them.

```text
✓ module 1 → completed
~ topic skill-anatomy → in_progress (one hint used)
```

---

## 5. Module 3 — Node.js SQLite

**Agent:** Module 3 is `node:sqlite`. The `DatabaseSync` API, prepared
statements, and how the schema in `schemas/knowledge.sql` gets applied
on first run. Want me to walk it?

**Alex:** Skip. I use `node:sqlite` daily.

**Agent:** Good — skipping is part of the system, not a shortcut. Noted.

```text
↷ module 2 → skipped ("User said: I use node:sqlite daily")
↷ topic node-sqlite → skipped
```

---

## 6. Module 4 — CLI Design Patterns

**Agent:** Last one. Look at `src/cli.js` lines 22–32:

```js
function parseGlobalFlags(argv) {
  const args = [];
  const flags = { repo: null, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repo') {
      flags.repo = argv[++i];
    }
    // ...
  }
}
```

### Quiz — Module 4

**Q1.** How does `cli.js` parse the `--repo` flag?

**Alex:** It checks `process.argv` for `--repo` and shifts the args.

**Agent:** ✓ Right — global flag parsing happens *before* command
dispatch, so every subcommand sees the same `flags` object.

**Q2.** What format does every CLI command output?

**Alex:** JSON to stdout.

**Agent:** ✓ Correct — JSON on stdout, errors on stderr, exit code 0/1.
Look at `out()` and `fail()` at the top of `cli.js` — that's the entire
contract. Any new command you add for the delegation skill must follow
it.

```text
✓ module 3 → completed
✓ topic cli-design → mastered
✓ curriculum task-add-delegation → completed
```

---

## 7. Design Checkpoint

**Agent:** Before you touch a file: tell me, in plain language, the
shape of the skill you're going to write.

- **Where does it live?**
- **What HARD-GATE rule does it enforce?**
- **Does it need any new CLI commands or DB tables?**

I want to hear *your* design, not mine.

**Alex:** It lives at `skills/learning-delegation/SKILL.md`. The
HARD-GATE rule is: when the user asks for a multi-step task, the agent
must propose a delegation plan and get confirmation before spawning any
subagents. No new DB tables — I can reuse `curriculum` rows with a new
`task_type`. No new CLI commands needed for v1.

**Agent:** That's a defensible design. One thing to check before you
start: the `<SUBAGENT-STOP>` semantics in `skills/learning-first/SKILL.md`
already cover *unprompted* delegation. Make sure your skill doesn't
contradict it — read lines 36–60 once more, then go write.

---

## 8. Achievements

**Agent:** Closing the session with what you actually earned:

```text
🗺️  Explorer: andre-agents
    First learning task in this repository.

🚀 Ready to Ship: Add Delegation
    Completed all learning modules for the delegation skill task.

🧠 Mastered: Plugin Architecture
    Demonstrated deep understanding of the 3-file architecture.

🔥 Streak: 5
    Five correct answers in a row.
```

These aren't participation trophies — `Mastered: Plugin Architecture`
unlocks me writing code for you in `src/` next time, instead of teaching
it. `skill-anatomy` stays `in_progress` until you can answer the Red
Flags question without a hint.

---

## 9. Session Summary

**Agent:** Stats for `sess-20260425-161143-f5e9bafa`:

| Metric                | Value                                  |
|-----------------------|----------------------------------------|
| Modules completed     | 3 of 4 (1 skipped)                     |
| Quiz questions        | 7 asked / 6 correct / 1 hint used      |
| Topics mastered       | `plugin-architecture`, `cli-design`    |
| Topics in progress    | `skill-anatomy`                        |
| Topics skipped        | `node-sqlite`                          |
| Self-rated quality    | 4 / 5                                  |
| Spaced repetition     | `plugin-architecture` next: +2.5 days  |
|                       | `cli-design` next: +2 days             |

**Your note:**

> Learned about the plugin architecture. Skipped `node:sqlite` since I
> already know it. Need to review SKILL.md anatomy more — the Red Flags
> vs Rationalizations distinction was new.

**Next time you open this repo, I'll:**

1. Ask you the Red Flags question again (cold).
2. Quiz `plugin-architecture` lightly (spaced repetition due in 2.5 days).
3. Skip the architecture intro entirely — you own it.

Now go write `skills/learning-delegation/SKILL.md`. I'll be here when
you want a design review.
