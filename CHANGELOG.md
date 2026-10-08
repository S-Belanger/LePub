# LePub collaborator changelog

This is the shared, versioned index of what each collaborator requested and did,
how it was done, what failed, what passed and what was published. Newest entries
come first. Detailed conversation/prompt journals live in
[docs/collaboration](docs/collaboration/README.md); current working state lives
in [HANDOFF.md](HANDOFF.md). All contributors must follow [AGENTS.md](AGENTS.md).

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
