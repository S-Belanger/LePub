# LePub collaborator changelog

This is the shared, versioned index of what each collaborator requested and did,
how it was done, what failed, what passed and what was published. Newest entries
come first. Detailed conversation/prompt journals live in
[docs/collaboration](docs/collaboration/README.md); current working state lives
in [HANDOFF.md](HANDOFF.md). All contributors must follow [AGENTS.md](AGENTS.md).

## 2026-10-14 — The bathroom as a side room (local, uncommitted)

- **Later requests (same day):** no partitions between the urinals (a first reading added walls; removed). Hand dryer bigger, then "hyper tech, LEDs and lasers, exaggerate": animated chasing LEDs, laser bay scan, fanning beams and a colour pool, wilder while drying. Then: **Nazim must go to the toilet every few shifts; if Rich enters while he is in, Rich loses life from the smell** (and "another old guy", to be explained later: NOT built).
- **Nazim's toilet break:** `NAZIM_LOO_EVERY = 3` (shifts 3, 6, 9...), once per shift at 35-90s into it, never mid-round/wander/last call. He walks to the WC door, is inside 24-34s (hidden in the pub; shown on the toilet in the bathroom with green stink clouds), then walks back. His order is cleared without penalty when he leaves; the pub door shows a blinking OCCUPIED. While he is in, the bathroom toilet is OCCUPIED and Rich takes one life hit 1.5s after entering then every 4s (`BATH_SMELL_*`, via `takeLifeHit`). New dialogue categories `nazimLoo`/`nazimLooBack`. Debug: `sendNazimToLoo`, `nazimInLoo`. Tuning constants are in `game.js` (frequency/timing/smell). Browser-verified (trip, smell hits, return, shifts 2/3/4 scheduling); Node suites still not run.

- **Request:** build the bathroom properly as a side room like the cellar: 3 urinals on the left, door bottom left, a toilet booth in the top-right corner, the sink along the right wall up to the booth, white square floor tiles with small black 45-degree tiles at the corners, black tile walls. Mid-task addition: a very high-tech, futuristic hand dryer between the sink and the booth.
- **Done:** `kind: 'bathroom'` variant of the cellar slot in `game.js` (`enterBathroom`, `updateBathroom`, `bathroomInteract`, `renderBathroom`, `drawBathroomRoom`), so the hunter lockout and the pub-keeps-running rules are shared. The WC door auto-opens when the bladder is urgent and the Doe walks up, or opens with E while the bladder is not empty. Relief at a urinal or the toilet (1.6s) clears the bladder; the 60s bladder clock holds while inside. Optional wash at the sink and dry at the dryer (cosmetic text, no score). `cellarTryMove` now takes a room descriptor. Leaving does not re-trigger the door until the Doe steps away (`bathroomArmed`).
- **Checks:** browser only (render screenshot, entry/hold/relief/wash/dry/exit/re-entry via `__debug`, collision spot checks). `node` is not installed, so `tests/smoke.js` was edited for the new flow (door opens a room, clock holds, urinal relieves) but NOT run; please run `node tests/smoke.js` and `node tests/hud.js`. Not tested on a phone. Not committed.
- **Limits:** the room is procedural art in the existing material style, not an illustrated atlas; no new sound cues (reuses relief/pickup/cellarDown).

## 2026-10-14 — Martine, the manager (local, uncommitted)

- **Request:** "Could we add Martine to the pub. She is the manager" with a photo (not copied into the repo).
- **Done:** Martine visits as a walk-on (like Nick): a few routed stops, contextual French lines (late orders, busy/calm room, the hunter). No score/hunter/collider effect. Procedural sprite from the photo's likeness; illustrated atlas is recorded art debt ([brief](docs/claude/martine-brief.md)) because no image generator was available.
- **Checks:** browser simulation of a full visit and a screenshot only; `node` is not installed here so no `tests/*.js` suites were run. Not committed or pushed.
- **Illustrated art (same day):** user generated the sheet with free ChatGPT from one combined reference board; flat green keyed to alpha, imported with equal rows (16/16 edge checks), density 12.0, manifest + contract updated, exception removed. Clipboard pose plays while she lingers. Browser-verified (atlas valid, raster frames on every frame, pose switches). **Known defect:** walk A and walk B are near-identical. Node suites still not run.
- **Lines and hunter (same day):** her lines rewritten in Québécois by the user. New hunter state `following`: while Martine is on the floor he drops the hunt (any state but arriving/drinking/smoke break), trails her at 18px saying "Tsk tsk tsk tsk..." every 2.2–3.6s, cannot catch or hurt the player, and she answers with hunter-annoyed lines. After she leaves he resumes scanning. Verified in browser (chase → follow, no life lost with the player standing on him, resumes). Deliberate gameplay change: Martine's visits are a safe window from the hunter. Node suites not run.
- **Late-shift shot (same day):** from 90s into a shift, Martine arrives tipsy (flushed face tint + side-to-side sway) and waits at her first stop for a shot ("Rich, un shot!", then "Rich, envoye!", "Rich, tu me niaises?"…). New order type `shot` made at the SHELF without using cellar stock; handed to her where she stands (24px). 30s patience. Served: normal tip, she cheers up and finishes her round. Lapsed: Rich loses one third of the life bar (shared `takeLifeHit`, counted as a hit, can end the run) and she storms out. Last call, or her leaving, clears the order with no penalty. Browser-verified: pickup, delivery (+20 tips, no stock used), expiry (life 1 → 0.667), last call (no penalty), early visit (no shot). Node suites not run.
- **Once per shift (same day):** user: "Martine has to be there at least once per shift...". If random scheduling has not brought her in by 100s of a shift she is sent in (`MARTINE_GUARANTEE_AT`, `martineVisitedShift`), and since that is past 90s it is a shot visit. Browser-verified across shifts 1 and 2 with the random timer disabled; no double visit once she has come. Node suites not run.
- **More lines and singing (same day):** two new waiting lines ("On le prend tu ce shot là?", "J'ai pas juste ça à faire"). Visits starting after 150s are singing visits (65% of her non-urgent remarks). **Real Céline Dion lyrics were NOT added** (copyrighted, not reproduced); placeholder wordless lines `MARTINE_LINES_SING` ("~ La la la laaa ~"...) to be replaced by the user's own text. Added a `~` glyph to the pixel font. User then asked for "Mets du Céline!" (their own phrase, not a lyric): added to the singing pool. Browser-verified (singing at 152s, not at 120s). Note: a visit after 150s has only ~15s before last call, so the shot may never be due.
- **Bug reports (same day):** (1) "getting stuck in the top left corner table when trying to serve Sam"; (2) "The icons for the things to serve customers follow Rich in the screen". **(2) fixed:** `drawOrderBubble` clamped the tickets of OFF-SCREEN customers into view, pinning a row of icons along the top edge that slid with the camera; it now draws a ticket only when its owner is on screen (clamp kept for owners near the edge). Verified: 7 pinned tickets before, 0 after with 3 owners on screen. **(1) not reproduced / not fixed:** user said Rich could not deliver to Sam from the south side of the booth with Sam's order on the tray. Browser checks found no sealed pocket (flood fill), no overlap/embedding in 55 random walks, no diagonal sticking over 3,358 spots, E delivers at all 260 in-range spots along the south side (102 spots there are simply >14px away), and Nazim's wander never trapped Rich (38/48 trials briefly overlapped him, always able to move). Needs a repro from the user. Node suites not run.
- **Bug 1 clarified and fixed (same day):** user: "It's not that Rich get stuck, more that he cannot pass south of the booth". Root cause: the aisle between the booth table (bottom y 51) and the TAPS counter (top y 67) is blocked by Nazim's chair (collider y 53.5–60.5); under it only 6.5px remained and the foot box needs 7px. **Layout change:** `BAR_SEGMENTS[0]` (TAPS counter) moved from y 67 to y 73 (same size), leaving 12.5px and a 5.5px walkable window (x 62: free y 67.5–73). The staff pocket under it is derived from the counter so it shrinks by 6px. Verified in browser with real input both ways under the booth, all 43 seats still routable from the door, hunter and waiter routes exist, screenshot shows the counter intact. **Side effects:** the hunter can now use the aisle too (a new route round the booth); the 2.5px sliver between the left wall bench (ends y 70.5) and the counter is cosmetic. Node suites (smoke/routing/alex/hud, which cover layout) NOT run: please run them.
- [Journal](docs/collaboration/2026-10-14-martine-manager.md).

## 2026-10-11 — Approved game audit follow-up (published and verified live)

- User authorized every audit recommendation and pushing `main`; physical-phone testing unavailable, then requested "Resume". Original October10 fixes are included.
- Safe NPC waiting/replanning, reachable hunter chase approaches, illustrated20frame busboy, cached/bounded haze, collision/input/effects modules and playable balance/performance review tools. Existing speeds/patience/scoring preserved.
- Fresh11Node suites PASS, routing31cases;8actualEdge browser/profile commands PASS,13atlases/176pose mappings,6shift/input scenarios. Independent review accepted chase/wall safety and40customer/80waiter legs. Matched haze submissions182→53mobile/92→43desktop; CPU/emulation only, human difficulty and physical-phone/GPU testing unverified.
- [Follow-up outcomes and checks](docs/game-audit/2026-10-10/followup.md), [busboy review](docs/art-review/busboy/README.md), [exact requests, failures and journal](docs/collaboration/2026-10-10-collision-game-audit.md). Main5a6eb03, all work local before implementation commit; append actual publication receipt after verification.
- Implementation [`5460c5f`](https://github.com/S-Belanger/LePub/commit/5460c5f97b52847acde7f97f369f355c6d1d410b) pushed/independently remote-matched. Vercel deployment6998393060SUCCESS; actual live34Gitblobs exact,3privateinput404,13readyatlases/176pose mappings desktop/mobile with0errors and inspected captures.
- Initial [CI38155558163](https://github.com/S-Belanger/LePub/actions/runs/38155558163) failed an unseeded final-time chase assertion: hunter reached catch range before isolated pursuit overshot. Corrected tests use seeded randomness, first contact and per-step collision checks; independent review proves both guards fail without approach routing. Fresh11local suites PASS; publishing test/receipt follow-up, newCI pending. No runtime/art change.
- Test/receipt [`4ecc406`](https://github.com/S-Belanger/LePub/commit/4ecc4069e1fe9accff2f608cd31075f375776c4c) pushed/independently remote-matched; [CI38155881399](https://github.com/S-Belanger/LePub/actions/runs/38155881399) all11suitesSUCCESS. Vercel deployment6998450063SUCCESS; fresh live34Gitblobs/13atlases/176mappings/3private404 PASS against this exact revision. Closing evidence/docs receipt follows; resolve its own SHA from Git history. No remaining implementation issue; human/physical-phone checks remain unverified.

## 2026-10-10 — Table collisions and gameplay audit (initial local outcome)

- User requests collision fixes plus an audit of bugs/improvements. Codex fixes physical table/chair bounds, exact contact/sliding, overlap escape, fair Alex trip triggers and fall action locks; help/README and CI regression gates updated.
- All eight Node suites PASS; actual Edge collision/effects/cast desktop/mobile and four-phone HUD/reduced-motion checks PASS. Captures inspected; 4,410 swept movement probes report zero penetration. [Audit and priorities](docs/game-audit/2026-10-10/README.md) cover conditional route failure/replanning, balance playtest, busboy art, phone effect profiling and runtime organization. Local/uncommitted; no new push/CI/deployment or physical-phone claim.
- Starting main 5a6eb03 already contains October 8 haze/trip commits; previous uncommitted wording below is historical. No commit/push/deploy requested this session.
- [Exact requests, methods, checks and findings](docs/collaboration/2026-10-10-collision-game-audit.md).
## 2026-10-08 — Nick's fart haze screen effect

- **Request:** "How difficult would it be to add a special effect when Richard (the deer waiter) walks in Nick's fart?", then a visual effect (double vision / blur) for the player; user said "Let's do it".
- **Done (not committed/published):** `game.js` gains `fartHaze` (rises 3/s inside a cloud, drains over ~2s), `drawFartHaze()` after `drawGrade()` (wobble strips, double image, green wash/vignette; reduced motion drops drift/wobble), reset in `resetGame()`, `__debug.getFartHaze`. Presentation only.
- **Follow-up request:** walking next to Alex during his split makes the player fall, drop the whole tray and shake the screen. Done in `game.js` (`tripOverAlex`, `playerNearAlexSplit`): once per split, within 5px of the split box; tray cleared with `beingCarried` reset (orders stay open, patience keeps running), a spill per dropped drink, 0.9s input lock, `hit` squash, 0.55s camera shake on the scene only (HUD steady; skipped under reduced motion). Verified in preview by forcing the state: trip fires, tray empties, no console errors; shake/feel not eyeballed, node tests not run.
- **Checks:** browser preview at localhost:8917: haze reaches 1 in a cloud, effect renders, HUD/bubbles stay crisp, no console errors. `node` unavailable in this shell, so `tests/*.js` were NOT run. No physical-device check.

## 2026-10-06 — approved cast perspective and new regular likenesses

- Documentation/evidence receipt [`0d50996`](https://github.com/S-Belanger/LePub/commit/0d5099637d9fb696b0f8bd6d0e84133ea88e7c8c) independently remote-matched, [CI PASS](https://github.com/S-Belanger/LePub/actions/runs/37513695213), Vercel SUCCESS; live current guides/comparison/source receipt match exact Git blobs.

- **Published/verified:** implementation [`c479a14`](https://github.com/S-Belanger/LePub/commit/c479a1418856d9c62205b2bea4fb556b0ccd3362), independently matched remote main; [all six CI suites PASS](https://github.com/S-Belanger/LePub/actions/runs/37513126046), current Vercel production SUCCESS. [Live game](https://lepub-five.vercel.app/) serves all26contract/manifest/PNG/JSON Git blobs exactly,12atlases ready in desktop/mobile browser, raw3portrait URLs404. [Current comparison and evidence](docs/art-review/cast-perspective/README.md). No physical-device claim.

- User approves Nick B and production release; requests Alex camera/gaze correction, new Nazim/Gerald/Sam portrait identities and durable new-character art guidance. Codex handles illustration/integration/release; art_guidance subagent handles independent documentation.
- Artwork/integration complete locally: exact approved Nick B, corrected Alex head angle, new Nazim/Sam/Gerald likenesses. Original outfits/poses/mechanics preserved. Six Node suites, actual Edge full-cast/Nick/Alex/HUD desktop/mobile checks, exact-source hashes and25-file docs audit PASS. Durable Codex/Claude guides/templates and current README captures updated. Raw new portraits retained locally/excluded from public Git/deploy. Authorized main/current-production publication next. [Requests, exact prompts, methods and receipts](docs/collaboration/2026-10-06-cast-perspective-release.md).

## 2026-10-06 — same-face overhead perspective examples

- **Follow-up:** user requests Nick-only B examples matching Doe/Hunter/Jay's direction of looking, and explicitly conditions Alex edits on Nick approval. [Nick study beside actual references](docs/art-review/face-perspective/nick-b-desktop.png) complete; transparent16-pose study/desktop/mobile comparisons checked in Edge. Nick approval pending; no Alex change yet. Capture/gutter-selection failures and corrections retained in journal.

- **User selection:** B (Jay's angle) approved as the Nick/Alex head-perspective benchmark. Recorded in the preview README/journal/handoff; replacement sheets have not been authored.

- User requests 2–3 previews with existing Nick/Alex likenesses and a more natural downward head angle like Jay. Codex uses built-in identity-preserving edits to compare subtle, Jay-matched and strong overhead options.
- Produced a labeled Nick/Alex [three-option board](docs/art-review/face-perspective/preview.png); corrected C's backward-cap detail. B is the recommended camera starting point. Edits retain likeness but are not pixel-identical face copies; C's Nick angle became less distinct after correction.
- Preview work only; shipped sprite sheets/runtime remain intact. Local, uncommitted, no publication. [Exact request, prompt and outcomes](docs/collaboration/2026-10-06-face-perspective-previews.md).

## 2026-10-06 13:27 — mobile HUD/help release verified live

- Published [`b0e8716`](https://github.com/S-Belanger/LePub/commit/b0e8716b3206f289f4230e0ea48fe2204095aa55), independent remote SHA matches; [all six CI suites pass](https://github.com/S-Belanger/LePub/actions/runs/37503519815).
- [Live game](https://lepub-five.vercel.app/) HTTP200/new HUD/help,12 atlases ready/no page errors; actual mobile booth bodies clear the score strip. Updated GitHub README's7 images/badges load and exact API blob matches local README.
- Final journal/handoff receipt follows the implementation commit. Four-phone/desktop/reduced-motion/status/cellar/rotation checks and inspected photos recorded; no physical-device or full live gameplay claim. [Detailed receipt](docs/collaboration/2026-10-06-mobile-hud-help.md).
## 2026-10-06 — mobile HUD visibility and cigarette-pack instructions

- **Request/contributors:** user reports mobile scorecard hiding corner-booth
  patrons and asks what dropped cigarette packs do and whether help explains it.
  Codex reproduces/debugs the HUD and updates player instructions.
- **Diagnosis:** portrait HUD84x35 logical units overlaps Sam/Gerald even when
  fade settles to0.35. Existing help lists C but omits pack rewards/pickup/break.
- **Direction:** compact walnut/brass mobile strip with reserved play area,
  preserving world/collision/input values; add truthful help/README explanation
  (earn every5 deliveries, hold3, drop at feet, hunter must pass near pack,
  exits for15s outside, untouched packs expire25s). Regression first, then
  desktop/mobile/rotation/status/cellar validation and new screenshots.
- **Result:** compact portrait strip with reserved scene/toolbar space; matching materials and unobstructed in-camera booth. Help/README explain pack effects; current photos refreshed. Six Node suites and actual Edge four-phone/desktop/rotation/status/help/cellar/art/fallback checks PASS. Published to main and verified live; all6 GitHub CI suites PASS.
  [Exact requests, journal and results](docs/collaboration/2026-10-06-mobile-hud-help.md).

## 2026-10-06 13:04 — professional README publication verified

- Published [`ec3b879`](https://github.com/S-Belanger/LePub/commit/ec3b8796983109a3d6ed41f49fa76ed6d25bb429)
  to main; independent remote SHA and GitHub API README blob match locally.
- Actual GitHub page HTTP200: all7 images/badges load, all16 generated/navigation
  anchors resolve,3 new live links and no obsolete domain. Desktop/mobile page
  inspected. GitHub CI for ec3b879 completed successfully; live Nick metadata200.
- README links/icons/current photos/description/controls/architecture/docs/hosting
  fulfilled. User's subsequent HUD/help feedback extends the work below; refresh
  affected README screenshots after the fix. [README journal](docs/collaboration/2026-10-06-readme-refresh.md).

## 2026-10-06 — professional README and updated live demo URL

- **Contributors/request:** user requests a professional current GitHub README
  with links/photos/icons/description and supplies `https://lepub-five.vercel.app/`;
  Codex handles documentation/reference review and validation.
- **Method:** verify current gameplay/source and published screenshots; replace
  obsolete link/content with a clear overview, current cast/desktop/mobile
  imagery, accurate controls/architecture, portable local start and useful docs.
- **Starting state:** main/origin synchronized at `e4fa823`; clean tree. Actual
  Edge live URL check HTTP200/expected title/canvas/start panel/no page errors.
- **Current outcome:** documentation refresh in progress, not committed yet.
  Exact request/progress/checks and later publication receipt live in
  [the README session record](docs/collaboration/2026-10-06-readme-refresh.md).

## 2026-10-06 12:46 America/Toronto — verified main publication receipt

- Published implementation commit
  [`6e1901897315a8a05321f3e2a0a2a52b5dd97657`](https://github.com/S-Belanger/LePub/commit/6e1901897315a8a05321f3e2a0a2a52b5dd97657),
  "feat: ship Nick illustrated art and Claude collaborator handbook" (60 files).
- `git push origin main` PASS; independent `git ls-remote origin refs/heads/main`
  matched that exact SHA at12:45:42. Local main/tracking main synchronized and
  working tree clean after the implementation push.
- Fresh release checks PASS: all five Node suites, inspector/validator syntax,
  staged diff,16 Markdown documents/88 local links/balanced fences. Previous
  approved desktop/mobile Edge evidence preserved unchanged.
- This follow-up documentation receipt preserves the verified result. Its own
  commit identifier is available in Git history; final remote-tip verification
  follows its push. No remote CI or live-deployment claim.

## 2026-10-06 — Nick illustrated art, Claude handbook and collaborator logging

- **Contributors:** user directed and approved the work; Codex coordinated
  implementation/review; built-in imagegen produced Nick's raster artwork.
  No public image-backend model identifier was exposed. Prior Claude involvement
  is user-reported, not inferred from Git author names.
- **Requests:** add Nick in the approved cast style and show it; document the
  complete workflow for Claude users; push approved work to `main` and keep
  every collaborator's requests/prompts, methods and outcomes in a changelog.
  Exact user task text and the ongoing journal are in
  [the session record](docs/collaboration/2026-10-06-nick-claude-guide.md).
- **Artwork/integration:** accepted second reference-guided RGBA generation,
  sixteen directional idle/stride/apology cells, measured row seams and contact
  pivots, shared 21-world-unit scale, production atlas selection and preserved
  existing gameplay/colliders/fallback. Added actual lifecycle browser validator
  and desktop/phone/cast-comparison evidence. [Exact image prompts](assets/sprites/nick-prompt.md)
  and [review](docs/art-review/nick/README.md).
- **Failures and corrections:** first draft needed opposite WALK B limb phases;
  equal-row import cut the next pose's cap, corrected through measured empty
  silhouette gutters without modifying source pixels or weakening checks;
  committed Alex test expected outdated reset timing, reproduced against HEAD
  and corrected in the assertion only.
- **Claude guidance:** [dedicated handbook](docs/claude/README.md), six chapters,
  ten reusable prompts, two templates and verified read-only atlas diagnostics.
  Covers real image tools/manual handoff, actual reference pixels, style/camera,
  measured integration, review and troubleshooting. Exact asset reuse gives
  exact Nick pixels; fresh generation still requires visual acceptance.
- **Logging:** added this index, detailed session journal, logging workflow and
  reusable template; AGENTS/CLAUDE require ongoing records for all collaborators.
- **Validation:** earlier five Node suites, focused/broad real Edge desktop and
  phone emulation passed; documentation links/examples and inspector diagnostics
  passed. Release checks and publication receipt will be appended to the session
  record after execution. No physical-phone or live-deployment claim.
- **Publication at entry creation:** approved for main; still uncommitted and
  unpushed. A separate newer receipt will record the actual verified publication.

## Historical context — existing collaborator Nick work (retrospective)

- Git author `LAPTOPSAM\samue`, October 5, 2026:
  [`eb7d72e`](https://github.com/S-Belanger/LePub/commit/eb7d72e00deacc5f57a881b38ee29629cbc48337),
  "Added Nick and increased Waiter rotation", followed by `c915e9d`,
  "Still trying to put Nick in the game". The user describes this as
  Claude-assisted work.
- These commits supplied Nick's behavior/procedural appearance and an unrun
  illustrated prompt; no illustrated Nick source was selected. Existing
  behavior was retained by the subsequent Codex art pass. Original collaborator
  chat prompts, generation attempts and tool availability are unavailable in
  this session; do not infer them.
- Earlier project history remains in [HANDOFF.md](HANDOFF.md), existing
  `assets/sprites/*-prompt.md` records and Git. This retrospective is not a
  fabricated transcript or exhaustive reconstruction of all previous sessions.
