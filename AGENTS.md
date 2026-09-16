# LePub agent continuity rules

## Mandatory startup

Before changing the repository:

1. Read `HANDOFF.md` completely.
2. Inspect `git status --short --branch` and compare it with the handoff.
3. Preserve all uncommitted work unless the user explicitly asks to discard it.

## Mandatory progress checkpoints

`HANDOFF.md` is the durable source of truth when a chat ends, context is
compacted, or another agent continues the work. Do not wait until the end of a
session to update it.

Update `HANDOFF.md` immediately after any of these events:

- pulling, merging, rebasing, switching branches, or resolving conflicts;
- making a substantial code, design, asset, or architecture change;
- discovering or fixing a bug;
- completing a test or browser-validation milestone;
- changing the agreed direction or making a material implementation decision;
- encountering a blocker or leaving unfinished work.

Before a long-running tool call or whenever the remaining context may be low,
checkpoint first. A checkpoint must include:

- local date/time, branch, HEAD commit, and upstream relationship;
- what the user asked for and the decisions currently in force;
- files changed and what changed in each;
- tests run and their exact outcome;
- unfinished work, risks, and the next concrete step;
- whether changes are committed or pushed.

Keep the newest checkpoint at the top. Preserve older checkpoints below it as
history. Never include secrets, `.env` contents, credentials, or private keys.

## Mandatory handoff

Before ending a substantial work session, update `HANDOFF.md` one final time
and make sure it agrees with the actual Git status. If the session terminates
unexpectedly, the most recent milestone checkpoint is the failsafe.
