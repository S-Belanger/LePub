# 2026-10-14 — Add Martine, the manager

## Contributors and starting state

- User: samuel.belanger (per session context). Assistant: Claude Code (Sonnet 5.5 per session; no other tool identity exposed).
- Date: 2026-10-14; local time/timezone not recorded.
- Branch main, starting HEAD `8ba9024be78e1a3567c70108121cf446a036829c`, clean, upstream 0/0 not re-fetched.
- Authorization and scope: local implementation only; no commit/push requested.

## Conversation and prompt journal

### 2026-10-14 — user — request

- Exact text: "Could we add Martine to the pub. She is the manager (the woman on the left on the picture)" plus one attached photo (not copied into the repo).
- Action: read AGENTS.md, HANDOFF.md, docs/claude workflow/Nick case study, `src/character-art.js`, Nick's implementation in `game.js` as the pattern.
- Decision (assistant, summary): implement as a recurring walk-on like Nick, with a manager flavour: she walks a few stops on the floor and comments on the state of the room. No gameplay effect on score, hunter, orders or colliders. The user did not specify mechanics, so this is the assistant's default.
- Result: implemented; see below.

### assistant — progress/limits (summary)

- No raster image generator was available, so illustrated art was not produced. Shipped a procedural sprite built from the photo's likeness (silver-lilac fringe, charcoal zip-neck top) and recorded the gap as explicit art debt with a brief.
- `node` is not installed on this machine's PATH, so none of the `tests/*.js` suites were run.

### 2026-10-14 — user — art workflow (summaries)

- User asked whether a recipe existed in the design files (answer: prompts only; generation was Codex's built-in tool), then asked about Claude Desktop (cannot generate raster art), then said they only have free GPT with one picture. Assistant built one combined reference board locally (private, scratchpad) and a single-image prompt with a flat green background.
- User returned the generated 1254x1254 sheet. Assistant keyed it with Python (PIL/numpy, available here), measured it with a port of the project importer, wrote `martine-illustrated.png/.json`, added `martine` to `families`, removed the procedural exception, added the manifest entry, and set `pose = 'talk'` while she lingers. Assistant judged walk A/B near-identical by eye and recorded it as a defect.

### 2026-10-14 — user — change her lines (exact text, translated nothing)

- Exact: "More Quebecois than french? * Busy: "Voyons!" , "Ça va faire", "Rich, arretes de te pogner le cul" * Late: "Rich, ton client a la #4!" * Hunter: "Mathieu! Commence pas...", "Tu me gosses a soir" In that style?"
- Action: replaced all four line lists in `game.js` with Quebecois. User's lines kept; spelled "arrête" for "arretes", "la 4" for "#4" (the pixel font has no `#`), accents added (font folds them). Assistant-written additions: calm "Ça roule, Rich?", "Pas pire, Rich.", "Continue de même!", "C'est beau, là."; busy "Wô, ça rentre!"; late "Rich, bouge-toi!", "Ils sont tannés d'attendre!"; hunter "Mathieu, assis-toi donc." Assumes Rich = the player's Doe and Mathieu = the hunter (from the user's lines).

### 2026-10-14 — user — hunter behaviour (exact)

- Exact: "Ok, and on the behavior side: * When she is there, the hunter starts to follow her and says "Tsk tsk tsk tsk..." (She hates that, so its funny) * The hunter stops hunting while she is there"
- Decisions (assistant): new `hunterState = 'following'` entered from scanning/chase/lost while `martine` exists; arriving, drinking and smoke breaks are left alone and fold in afterwards. `hunterCanCatch` excludes it, so he also cannot hurt the player ("stops hunting"). Trails at `HUNTER_FOLLOW_GAP` 18 via the hunter's own routing, speed ×1.2 so he keeps up with her at level 1. Tsk bubble reuses `drawWalkOnLine` with the tomato frame; she replies from the hunter list about half the time. His pint craving keeps running (serving him still works). Reset clears the line/timer.
- Judgement call to flag: her visit is now a safe window from the hunter (gameplay/balance change, user-requested by intent).
- Checks: browser run with hunter forced into chase → follows, 0 life lost with the player on top of him, resumes after she leaves; screenshot shows both bubbles. Node suites not run.

### 2026-10-14 — user — late-shift shot and tipsy (exact)

- Exact: "Another behavior to add: * If she comes later in the shift: she wants a shot with Rich, but she is impatient and says "Rich, enyoye!", and "Rich, tu me niaises?"... * If she doesnt get he shot in time, rich lose life * Can you make her look tipsie?"
- Interpretations (assistant; user may correct): "enyoye" = "envoye"; "later in the shift" = `shiftClock >= 90` (half of a timed shift; applies to every shift); "get the shot" = Rich carries it to her like any order; "lose life" = one third of the bar via the same path as a hunter hit (also counts in the tally and can end the run); "tipsy" = whole late visit, rosy face tint on the illustrated sprite (head only), pink-skin palette on the fallback, and a side-to-side weave that grows once she is served.
- Design choices: shot made at the SHELF; exempt from cellar stock so the penalty can't be unavoidable; 30s patience; she stands still at her first stop while waiting; she leaves with no penalty on last call. Nag lines every 4.5–6.5s (below 35% patience: "Rich, tu me niaises?"). Unrequested lines added: "Rich, un shot!", "Rich, mon shot!", thanks ("Enfin, Rich!", "Ah! Là on se parle.", "T'es fine, Rich!"), wrath ("Rich, t'es dans le trouble!", "C'est pas drôle, Rich!").
- Refactor: hunter-hit life/caught code extracted into `takeLifeHit()` (behaviour unchanged) and reused by Martine's wrath.
- Checks: browser only (see CHANGELOG entry). Not tested: phone viewport, cellar while she waits (cellar plate does not list her ticket), reduced-motion sway.

### 2026-10-14 — user — guarantee a visit (exact)

- Exact: "Martine has to be there at least once per shift..."
- Action: added a per-shift guarantee at 100s (`martineVisitedShift`, `martineForced`, retry every 10s if the floor/cellar blocks it; never during last call). Debug: `__debug.martineSchedule()`. Checked in browser for shifts 1 and 2 with the random timer forced off. Limit: if the player reaches the tip target before 100s, the shift ends without her (not changed).

### 2026-10-14 — user — more lines, singing (exact)

- Exact: "Also, add these lines: \"On le prend tu ce shot la?\", \"J'ai pas juste ca a faire\" (when she is waiting for her shot) If she comes after 150 sec, she sings Celine Dion lyrics in french"
- Action: added the two lines to the waiting pool (accents added). Singing implemented with `martine.singing` (visit starts at shiftClock >= 150) but the assistant declined to write Céline Dion lyrics (copyrighted) and used wordless placeholders the user can replace in `MARTINE_LINES_SING`. Added `~` glyph in `src/pixelfont.js`. Follow-up user message: "Can she says: \"Mets du Celine!\"" -> added "Mets du Céline!" to `MARTINE_LINES_SING` (user's own phrase, not lyrics). Verified the glyph and line render after a cache-clearing reload.

### 2026-10-14 — user — two bugs (exact)

- Exact: "There are two bugs: * getting stuck in the top left corner table when trying to serve Sam * The icons for the things to serve customers follow Rich in the screen". Answers to assistant questions: symptom = "Can't reach Sam"; side = "South side"; Sam's order on the tray = "Yes, it was".
- Bug 2 root cause and fix: see CHANGELOG (off-screen tickets clamped to the screen edge). Fixed in `drawOrderBubble`.
- Bug 1: investigated, not reproduced (details in CHANGELOG). Booth collider x34-90,y27-59; west lane between bench and Sam's chair is ~12px wide for the foot centre; the slot under the booth (y58-66) is a dead end closed by Nazim's chair at x54-70; deliverable region (14px margin) covers all four sides. Hypothesis not proven: the south slot/west lane is a long dead-end the player can enter but must exit via the north.

### 2026-10-14 — user — bug 1 clarified (exact)

- Exact: "It's not that Rich get stuck, more that he cannot pass south of the booth".
- Finding: colliders there are table x42–82,y29–51; Nazim's chair x58–66,y53.5–60.5; counter top y67. Foot box is 7px tall, so the aisle under the chair (6.5px) was impassable by 0.5px, and above the chair only 2.5px. Fix: move the TAPS counter to y 73. Rejected: moving the booth up (risks the phone HUD clearance tests, which could not be run), shaving the chair collider (leaves a 0.5px window), shrinking the counter (squashes its art).

## Implementation and evidence

- `src/sprites.js`: `MARTINE_PALETTE`, `OH_MARTINE` (ohSheetSet), `SPRITES.martine`.
- `src/character-art.js`: `proceduralExceptions.martine` (art debt, points to the brief).
- `game.js`: hitbox/speed, `MARTINE_FOOTPRINT`, Martine block (spawn, routed stops, lines, leave), hooks in `update`, leg ticking, draw list, line bubble, HUD fade check, Alex's people list, `resetGame`, `__debug.getMartine/spawnMartine`. First visit 25–45 s in (and after 15 s game time), then every 70–120 s; skipped in last call and in the cellar.
- Lines are contextual: late orders, busy room, calm room, or a remark about the hunter.
- `docs/claude/martine-brief.md`: art brief and next steps.
- Failed attempt: running `node tests/*.js` (bash and PowerShell) — `node` not found; searched common install paths, none present.
- Evidence: in-browser at localhost:8917 (screenshot inspected): Martine appears at the floor with silver hair and a speech bubble "CETTE COMMANDE !".

## Checks

| Timestamp | Command/check | Environment | Actual outcome | Evidence |
| --- | --- | --- | --- | --- |
| 2026-10-14 | Browser: `__debug.spawnMartine()` then simulate 31 s | Browser pane, desktop size | PASS: states entering → lingering → leaving, removed afterwards, four lines said, no thrown errors | in-session |
| 2026-10-14 | Browser screenshot with Martine lingering | Browser pane 800x600 | Visible, readable, bubble placed above her | in-session |
| 2026-10-14 | Browser: `Assets.hasFamily('martine')`, `Assets.validate(json)`, rasterFrameFor over a visit | Browser pane | PASS: ready, validate null, 191/191 frames raster, pose 'talk' while lingering | in-session |
| 2026-10-14 | Python import: 16 cells edge/transparency guard | Python 3.14 PIL/numpy | PASS, density 12.0 | measure script |
| 2026-10-14 | `node tests/*.js` (all suites) | Windows shell | Not run: node unavailable | |
| 2026-10-14 | Mobile viewport, console-error read, reset-mid-visit | Browser pane | Not run | |

## Publication and handoff

- Local, uncommitted, unpushed. Files: game.js, src/sprites.js, src/character-art.js, docs/claude/martine-brief.md, this record, CHANGELOG.md, HANDOFF.md.
- Remote CI/deployment: not performed.
- Limits: no illustrated atlas; Node suites not run; procedural face from above is only a silver cap of hair and a skin sliver.
- Next step: generate the illustrated atlas from the brief, then move her from `proceduralExceptions` to `families`, and run `node tests/character-art.js`, `assets`, `smoke`, `routing`.
