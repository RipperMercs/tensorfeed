# TensorFeed writing conventions

Style rules for anything published under the TensorFeed brand: Originals articles, OG/Twitter/JSON-LD descriptions, the `originals-directory` entries, public-facing markdown (`llms.txt`, `llms-full.txt`, the generated `public/*.md` guides), social posts, and marketing copy.

The goal is simple: TensorFeed publishes in a human voice. Smart readers spot LLM tells instantly and lose trust in the brand. Writing should read as if Ripper wrote it, not as if it was generated.

## Hard rules

### No em dashes

**Never use em dashes (`—`, U+2014) in any external-facing writing.** This is the single strongest LLM tell.

Substitute contextually with whichever reads most natural:

- **Period** (split into two sentences): works for asides that are really their own thought.
- **Comma**: works when the aside is short and the sentence flow tolerates it.
- **Colon**: works when the aside expands or specifies what came before.
- **Parentheses**: works when the aside is a clarifying enumeration or genuinely parenthetical.
- **Rewrite to drop the aside entirely**: often the best move when the em dash was load-bearing.

Do not default to one substitute. Pick per sentence.

**Self-check before considering writing done:**

```bash
grep -c "—" path/to/file.tsx   # must return 0
```

Hyphens (`-`, U+002D) and en dashes (`–`, U+2013) are different characters and not covered by this rule. When in doubt between an en dash and a hyphen, use a hyphen or rewrite to avoid both.

## Soft principles

Apply by default. When the natural human phrasing genuinely calls for one of these, the principle gives way; just don't default to them.

- **Avoid templated rhetorical cadences.** "It's not just X, it's Y." "Not only X but also Y." "X. Y. Z." (three-sentence punch endings). These read fine once and exhausting at scale.
- **Vary sentence length.** A short sentence after two long ones reads human. Three perfectly balanced clauses read machine.
- **Avoid the tricolon reflex.** LLMs default to three parallel items everywhere. Sometimes the right number is one, sometimes four, sometimes a single example plus "and so on."
- **Avoid filler signposts.** "Furthermore", "Moreover", "In conclusion", "It's worth noting that", "It's important to remember that." Cut them.
- **Avoid LLM-favorite filler words.** "Delve", "tapestry", "landscape" as filler, "robust", "leverage" (as a verb), "navigate" (the noun-y way), "in the realm of". These tag the writing as generated.
- **Don't summarize at the end.** Originals end on a point, not a recap. The reader saw the body; they don't need a closing paragraph that restates it.

## What is NOT covered

These rules apply only to writing the user publishes. They do not apply to:

- Code, code comments, JSDoc, type definitions
- Commit messages, PR descriptions, branch names
- Internal docs (README sections aimed at contributors, `docs/*.md` like this file)
- Chat with the user in the Claude Code session itself

When in doubt about whether a piece of writing counts as "external", ask.

## How this file is loaded

The repo-root `CLAUDE.md` (gitignored per the Pizza Robot Studios internal-docs policy) references this file so Claude Code agents pick up the rules through normal context loading. If you're authoring in this repo and don't see `CLAUDE.md` referencing `docs/WRITING.md`, fix the local `CLAUDE.md` rather than duplicating the rules here.
