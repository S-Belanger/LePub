# Shared collaborator records

[Changelog index](../../CHANGELOG.md) · [Current handoff](../../HANDOFF.md) · [Session template](SESSION-TEMPLATE.md)

The user wants to track what every collaborator asked for, did, how they did it,
and what happened. This applies to Claude, Codex and human contributors. Keep
these records in the repository so they travel with the work between machines.

## Three records with different jobs

| Record | Purpose | Update when |
| --- | --- | --- |
| Root `CHANGELOG.md` | Newest-first index of changes, contributors and publication receipts | Task starts, substantial outcome, publication receipt |
| `docs/collaboration/YYYY-MM-DD-topic.md` | Detailed conversation/prompt journal, methods, failures, checks and evidence | Every user/assistant message and each meaningful work/check milestone |
| `HANDOFF.md` | Latest durable branch/files/tests/next-step state | Mandatory repository checkpoints and before ending |

Keep existing records. Start a dated topic file from the template, or continue
the record for the active task. If multiple contributors work on the same date,
use a distinct topic/contributor suffix rather than overwriting someone else's
file. Link each record from the changelog.

## What to capture

1. Contributor identity actually known, assistant/tool names actually available,
   local time/timezone, starting branch/HEAD and upstream state.
2. Exact user requests, corrections and approvals. For supplied project rules,
   link the versioned rules and note any differences from the user's message.
3. Every assistant progress/report/decision, preserving exact text when
   available. Otherwise label a faithful summary explicitly. Internal private
   reasoning is not a conversation artifact and is not required.
4. Every substantive prompt sent to an image tool or collaborator. Store exact
   text in the journal or link a versioned prompt file plus heading; include
   input image roles/order, options actually used and selected output identity.
   Templates are reusable instructions, not evidence that generation was run.
5. Changed files and resulting behavior, why/how the change was made, failure
   messages, rejected attempts and corrections. Keep failure history visible.
6. Exact check commands, outcome, environment and evidence. Distinguish previous
   checks from fresh ones, Node mocks from browsers, emulation from devices,
   local work from remote CI and publication from verified live behavior.
7. Commit/push/deploy status, actual verified SHA, outstanding work and next step.

Do not dump raw tool output containing secrets or private data. Record useful
commands/results safely, redacting explicitly when needed. Do not duplicate
private identity photos into the served repository just to log their use.
Unknown original wording/time/model identity must stay **unavailable**.

## During a session

Append journal entries in time order inside the detailed file. Use explicit
timestamps when known; label retrospective summaries or approximate time ranges.
Update the changelog summary and handoff at substantial milestones. Before
committing, make sure the journal records the current request, actual results,
changed files, unfinished work and intended publication scope.

After pushing, independently verify the remote SHA (for example with
`git ls-remote origin refs/heads/main`) and add a publication receipt. A follow-up
documentation commit may publish that receipt; record the implementation commit
explicitly and identify the receipt commit through Git history. A file cannot
contain its own final Git SHA without changing that SHA, so do not invent one.
Verify the final remote tip after the receipt push and report it to the user.

Automation/branch instructions and user publication authorization still apply.
The changelog requirement does not create an additional approval step or allow
discarding another collaborator's work.

## Current record

- [2026-10-06 — professional README and current live demo](2026-10-06-readme-refresh.md).
- [2026-10-06 — Nick, Claude sprite handbook and main publication](2026-10-06-nick-claude-guide.md).
