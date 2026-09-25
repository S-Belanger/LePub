# LePub durable handoff

## 2026-09-25 17:21 America/Toronto — main push reviewed and ready

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0`. All 57 current-session file changes staged, none committed/pushed. Staged diff and file names reviewed: portrait-matched split PNG/JSON and prompts/review, split-only runtime/sound/contract/manifest/tests/docs, old mace assets and old mixed review deleted. Personal portrait/credentials absent. `git diff --cached --check` PASS (Windows line-ending notices only); `git grep --cached -i mace -- ':!HANDOFF.md'` returns no matches.
- Final required validation stands: four Node suites PASS (character 10/10/5; assets31; smoke10/40; Alex13), three real Edge suites PASS desktop/mobile (10 atlases/136 mappings, split lifecycle/fallback/reduced motion, merge integration) with zero page errors; native idle/split captures inspected. No source changes since browser checks; only review docs/handoff updated.
- Fresh `git fetch origin --prune` confirms `origin/main=4c47160`, exact merge-base of feature HEAD; remote main is 38 commits behind current HEAD, no divergence. Next: stage this checkpoint, commit feature tree, switch local main, fast-forward it to the new commit, push `origin/main`, verify remote status. No Vercel deployment requested.

## 2026-09-25 17:20 America/Toronto — split-only browser validation passes

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0`; all changes local/uncommitted/unpushed. Removed obsolete mace references from current code/assets/docs/review data. `rg` now finds none outside historical `HANDOFF.md`. Current manifest has 10 atlases; no mace source or runtime path remains.
- Local Node PASS: character art 10 kinds/10 families/5 guards, assets 31, smoke 10 scripts/40 routes, Alex 13 schedule gates/split lifecycle/collision/reset. Real Edge PASS `node tools/validate-art.js docs/art-review/alex-likeness/full-cast`: desktop1280×720/mobile390×844, 10 ready atlases/136 mappings each, input/rotation/fallback, zero errors. PASS `node tools/validate-alex.js docs/art-review/alex-likeness`: 16 alpha-checked cells, four facings, split/blocker/exit, missing-sheet fallback, reduced-motion cue/blocker, zero errors. PASS `node tools/validate-merge.js`: both viewports, atlas/status/pivot/split/pack controls, zero errors. Desktop/mobile Alex idle and split captures visually inspected. `git diff --check` PASS (Windows LF/CRLF notices only).
- Current `docs/art-review/alex-likeness` captures/reports replaced previous mace evidence; old `docs/art-review/alex` removed. Hunter report was refreshed from the same current full-cast validation, and its README distinguishes older screenshots from current report. Latest docs counts updated to 10/136. Photo remains outside repository. No physical-device performance claim.
- Next: stage and inspect full diff, fresh fetch to confirm `origin/main` ancestor, commit, fast-forward local `main`, push `origin/main`, verify clean/upstream/remote tree. User explicitly authorized main push; no production Vercel deploy requested.

## 2026-09-25 17:18 America/Toronto — split-only Node checks pass

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0`; all changes local. After mace removal, `node tests/character-art.js` PASS 10 kinds/10 illustrated families/5 regression guards; `node tests/assets.js` PASS 31; `node tests/smoke.js` PASS 10 scripts/40 routes/full gameplay; `node tests/alex.js` PASS 13 schedule gates/split lifecycle/collision/cleanup. Game/browser-tool syntax checks previously passed.
- Next: real Edge full-art/Alex/merge checks at desktop and mobile, replace stale current reports, inspect images and diff, then main publication. No commit/push/deploy yet.

## 2026-09-25 17:17 America/Toronto — mace removed from current code and assets

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0`; all changes uncommitted/unpushed. The prior local Alex portrait split PNG/JSON and its prompt are preserved. No branch switch or merge yet; `origin/main` remains ancestor `4c47160` after fetch.
- Removed mace choice/scheduling state, 28x14 blocker and 6s action, renderer atlas/fallback branch, sound cue, character-art family and manifest entry. Alex now visits only for the 22x7, 5s split with the existing scheduling, preparation, collision and cleanup. Updated `tests/alex.js`, `tests/character-art.js` and `tools/validate-alex.js` for split-only behavior. Removed tracked mace PNG/JSON/prompt and superseded `docs/art-review/alex` evidence; deleted untracked mace screenshots from new `docs/art-review/alex-likeness`.
- Updated README, CLAUDE, visual system, illustrated art notes, Alex likeness and review notes to reflect split-only/current 10 atlases. Current `rg` finds no mace references outside historical `HANDOFF.md` and stale generated report JSONs, which the next browser run will replace. `node --check` passes game.js, tests/alex.js and tools/validate-alex.js. No functional suite run after removal yet.
- Next: run required Node/browser suites, overwrite stale reports and inspect desktop/mobile captures, review diff, then commit and fast-forward/push main. No deployment requested.

## 2026-09-25 17:09 America/Toronto — user requests main push and mace removal

- New user direction: “Push to main and remove the whole mace thing with Alex.” Preserve the finished, uncommitted photo-likeness split sheet; remove Alex's mace activity, runtime/art contract/manifest/sound branches, mace PNG/JSON/prompt, tests, browser checks, documentation and current review evidence. Keep Alex's split visit. Older handoff entries remain historical, with this checkpoint superseding their mace direction.
- Startup: reread handoff and visual system, inspected current tree against previous checkpoint and fetched origin. Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0`, with only the previous turn's Alex likeness art/docs/evidence uncommitted. `origin/main` is `4c47160` and is an ancestor of the feature branch (`origin/main...HEAD` = `0/38`); local `main` is older. Preserve all existing work. The user explicitly authorizes pushing the completed result to `main`.
- No mace removal or new tests yet this turn; no commit/push yet. Next: inspect full Alex implementation and tests, remove mace while retaining split, update review and docs, run Node/browser checks, review Git diff and fast-forward `main` to the validated result, push and verify upstream.

## 2026-09-25 16:45 America/Toronto — Alex portrait likeness complete locally

- User supplied Alex's portrait as identity reference. Both split and mace sprite atlases now show swept medium-dark brown hair, broad toothy smile, full brown beard and no glasses across directional/action poses. Athletic clothes, overhead camera, world scale, colliders and gameplay were preserved; the portrait's suit and the portrait file were not copied into the repo.
- Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0`; working tree contains only this session's modified/untracked files. Changed: `assets/sprites/alex-illustrated.png/.json`, `alex-mace-illustrated.png/.json`, `assets/sprites/ILLUSTRATED.md`, `alex-prompt.md`, `alex-mace-prompt.md`, new `alex-likeness.md`, `docs/VISUAL-SYSTEM.md`, new `docs/art-review/alex-likeness/` screenshots/reports/README, and this `HANDOFF.md`. All changes are local, uncommitted and unpushed; no deployment.
- Built-in imagegen first edits failed import on cell boundaries; accepted spacing edits and final importer PASS: 16 split cells/density 9.90, 24 mace cells/density 6.48, both 1254×1254 transparent sheets. `node tests/character-art.js` PASS 10 kinds/11 families/5 guards; `node tests/assets.js` PASS 31; `node tests/smoke.js` PASS 10 scripts/40 routes/full gameplay; `node tests/alex.js` PASS 13 schedule gates/lifecycles/collision/reset.
- Real Edge `node tools/validate-art.js docs/art-review/alex-likeness/full-cast` PASS desktop1280×720/mobile390×844: 11 ready atlases, 148 pose mappings each, input/rotation/fallback/gallery, zero errors. `node tools/validate-alex.js docs/art-review/alex-likeness` PASS both viewports: 40 source cells, split/blocker, all carrying facings and mace phases, missing-sheet fallbacks, reduced-motion static pose, zero errors. Native captures inspected: new face clear at desktop; hair/beard and actions readable on mobile, fine face details reduced. `git diff --check` PASS (Windows LF/CRLF notices only). No physical-device performance claim; existing unused side-split anatomy debt remains.
- Next concrete step: user visual review of the local result; make any likeness corrections they request. If they request publication, commit/push/deploy this tested tree and verify live assets/browser. No outstanding implementation or validation work for this likeness edit.

## 2026-09-25 16:44 America/Toronto — Alex required Node suites pass

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0` at last check; likeness assets/docs uncommitted/unpushed. All four relevant Node suites PASS after import: `node tests/character-art.js` (10 gameplay kinds, 11 families, 5 guards), `node tests/assets.js` (31 checks), `node tests/smoke.js` (10 scripts, 40 routes, full gameplay), `node tests/alex.js` (13 schedule gates and both activity lifecycles/collision/reset).
- Final PNG source imports PASS all 40 alpha-checked cells. Next: real Edge desktop/mobile art and Alex lifecycle checks, inspect captures at native size, review diff. No commit/push/deploy.

## 2026-09-25 16:45 America/Toronto — Alex likeness documentation ready for checks

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0` at last check; all changes local/uncommitted/unpushed. Final split and mace PNG/JSON files are imported and visually inspected at source size; no runtime logic or hitboxes changed.
- Added `assets/sprites/alex-likeness.md` with the user portrait's role, exact two edit prompts plus two accepted spacing-correction prompts, provenance and small-scale limits. Updated `docs/VISUAL-SYSTEM.md`, `assets/sprites/ILLUSTRATED.md`, and the historical Alex prompt files to make the no-glasses identity current while preserving original prompt history. The personal photo is not in the repo.
- Importer PASS: Alex 16 frames/density 9.90, mace 24 frames/density 6.48. Contract/assets/smoke/Alex gameplay and browser checks remain to run. Next: execute required checks, inspect desktop/mobile captures, review diff and record results. No commit/push/deploy.

## 2026-09-25 16:42 America/Toronto — Alex likeness assets imported

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0` at last check; all changes local/uncommitted/unpushed. Existing split and mace PNGs replaced with built-in imagegen edits using the supplied portrait and shipped Alex art. Final versions show swept medium-brown hair, broad smile, full beard, no glasses, and preserve teal athletic outfit and split/mace actions.
- First generated versions failed importer at a cell edge (`alex` row1,col0; `alex-mace` row2,col0). Built-in imagegen spacing corrections were visually inspected and accepted. Final `node tools/import-illustrated.js alex` PASS: 1254×1254, 16 alpha-checked frames, density 9.90. Final `node tools/import-illustrated.js alex-mace` PASS: 1254×1254, 24 alpha-checked frames, density 6.48. Measured JSON bounds/pivots regenerated; no runtime/gameplay files changed.
- Files currently changed: `HANDOFF.md`, both Alex PNGs and both Alex JSON metadata files. No character-contract/assets/smoke or browser suite run yet. Next: document exact prompts/new identity in art guides, run required Node tests and real-browser desktop/mobile art checks, inspect captures and record limits. Portrait remains outside repository.

## 2026-09-25 16:40 America/Toronto — Alex first import blocked by cell edge

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0` at last check. Two generated likeness sheets were copied over the existing Alex PNGs locally; original versions remain in Git. `HANDOFF.md` is also modified. No commit/push/deploy.
- Both generated 1254-square sources were visually inspected: photo-matched swept brown hair, full beard, smile and no glasses; outfit, split and mace poses retained. The first `node tools/import-illustrated.js alex alex-mace` attempt FAILED at `alex: opaque pixels cross cell boundary 1,0`. No new JSON metadata was written. This is spacing, not a game/runtime failure.
- Next: measure transparent cell margins read-only, use built-in imagegen to correct split sheet spacing (and mace if needed), rerun importer, then continue tests/browser review. Do not claim art accepted until every cell validates.

## 2026-09-25 16:35 America/Toronto — Alex photo likeness work started

- User supplied a portrait and said “Alex looks like this.” Treat it as identity reference for the existing Alex split and mace appearances. The photo shows swept dark-brown hair, a full medium-brown beard, a broad smile and no glasses. Preserve his teal workout shirt, charcoal shorts, shoes, elevated overhead camera, directional poses, split/mace mechanics and scale; the portrait's suit is outside the workout costume.
- Startup complete: read handoff/visual standard, inspected Git status and viewed the photo, both shipped Alex sources, Jay's source and camera study. Branch `feat/regulars-responsive-pixel-polish`, HEAD `9966dd2`, upstream `0/0`, clean tree before this checkpoint. Preserve existing work. User's earlier publication authorization concerned completed prior releases; this turn has no new commit/push/deploy authorization.
- Applying the built-in imagegen skill for bitmap source edits. Keep the personal photo outside the public repository. No art, code or metadata changed yet; no tests run for this request. This checkpoint is the only current local change and is uncommitted/unpushed.
- Next: edit both transparent sprite sheets using the photo and shipped sheets, inspect all cells, import measured metadata, run required Node and desktop/mobile browser art checks, document provenance and review limits, then leave the completed change locally reviewable.

## 2026-09-23 18:56 America/Toronto — hunter likeness released and live-verified

- User request complete: hunter revised from supplied photo using built-in imagegen, committed/pushed as 1c6bcfc (feat: match hunter graphics to photo reference), deployed to https://lepub.vercel.app. Production READY dpl_Qo6EWs6vQT7iHfrTZraeButgN9oR, immutable https://lepub-atoxrasiz-maisoncastros-projects.vercel.app.
- Branch feat/regulars-responsive-pixel-polish, HEAD1c6bcfc upstream0/0 before this final documentation commit. Only HANDOFF.md local; commit/push it next and confirm clean0/0. No production code/assets changed after release; no redeploy needed for ledger. Main/PR unchanged; no external messages.
- LIVE node tools/validate-merge.js https://lepub.vercel.app PASS desktop1280x720/mobile390x844: all atlases ready, status/pivots/split/pack controls/smoke/caught, zero page errors. SHA256 MATCH6 served files: hunter PNG+JSON, character-art.js, game.js, index.html, manifest.json. GitHub CI SUCCESS for1c6bcfc (run35930900948).
- Local tests PASS contract11families/5guards, assets31, smoke10scripts/40routes, Alex13gates; full browser PASS148 mappings each viewport and input/rotation/fallback/gallery. Import PASS16 transparent/non-clipped cells,density10.71. Actual desktop/mobile screenshots inspected and saved in docs/art-review/hunter with report/notes.
- Durable docs record corrected swept hair, wide glasses, fuller face/light stubble and exact prompt. Changed hunter PNG/metadata only for game assets; gameplay untouched. Photo remains outside public repo. No unfinished user-requested work. Limits: stylized small-scale likeness; phone fine facial detail naturally reduced. Continue on user feedback.
## 2026-09-23 18:55 America/Toronto — hunter production READY

- Branch feat/regulars-responsive-pixel-polish, HEAD1c6bcfc, upstream0/0. Feature committed/pushed; only handoff notes local. GitHub CI SUCCESS: https://github.com/S-Belanger/LePub/actions/runs/35930900948.
- Vercel production READY deployment dpl_Qo6EWs6vQT7iHfrTZraeButgN9oR, immutable https://lepub-atoxrasiz-maisoncastros-projects.vercel.app, public alias https://lepub.vercel.app. Deployment succeeded first attempt; tested code/assets unchanged.
- Next: public-alias desktop/mobile integration checks and exact source hashes, then commit/push final handoff. Local checks stand; live verification not yet complete.
## 2026-09-23 18:55 America/Toronto — hunter change committed and pushed

- Branch feat/regulars-responsive-pixel-polish, HEAD1c6bcfc, synchronized with origin after successful push. Feature commit: feat: match hunter graphics to photo reference. Reviewed10 files committed; only this deployment checkpoint is subsequently local.
- All local art/gameplay/browser checks PASS as recorded below; no source changes after validation. User production authorization in force.
- Next: deploy linked project via vercel deploy --prod --yes, then check live desktop/mobile integration and exact served hunter source/metadata hashes. No new production deployment yet; record result and commit/push final ledger.
## 2026-09-23 18:54 America/Toronto — hunter likeness ready for production

- Branch feat/regulars-responsive-pixel-polish, HEAD8061cb9, upstream0/0 after fresh fetch. User authorizes push and production. All changed files reviewed; no runtime/gameplay edits.
- Saved and visually inspected docs/art-review/hunter/desktop.png and mobile.png from actual room; report.json and README record148 mappings/viewport,11 atlases,zero errors and phone-scale limits. Exact built-in prompt and durable identity spec included; personal photograph remains outside repository.
- All local checks from previous checkpoint PASS; git diff --check PASS (Windows line-ending notices only). Changed hunter PNG/JSON, provenance/style docs, review evidence and handoff.
- Next: commit/push feat: match hunter graphics to photo reference, deploy linked Vercel production, verify public alias assets by SHA256 and live desktop/mobile checks. Changes currently uncommitted/unpushed; no new deployment yet.
## 2026-09-23 18:54 America/Toronto — hunter local validation passes

- Branch feat/regulars-responsive-pixel-polish, HEAD8061cb9, upstream0/0. Hunter PNG/metadata, prompt and visual guide changes remain local/uncommitted; publishing authorized.
- PASS node tests/character-art.js:10 kinds/11 families/5 regression guards; tests/assets.js:31 checks; tests/smoke.js:10scripts/40routes/full gameplay; tests/alex.js:13 schedule gates and both activities/collision/reset.
- PASS node tools/validate-art.js: desktop1280x720/mobile390x844,11 ready atlases,148 pose mappings each, keyboard/touch movement12.4, rotation/fallback/gallery, zero browser errors. Source import already PASS16 alpha/non-clipped cells,density10.71.
- Next: inspect/save native-size review captures, review diff and commit/push; deploy production and verify live hunter PNG/JSON hashes plus desktop/mobile integration. No gameplay changes or outstanding test failures.
## 2026-09-23 18:53 America/Toronto — hunter replacement imported

- Branch feat/regulars-responsive-pixel-polish, HEAD 8061cb9, upstream 0/0; changes local/uncommitted/unpushed. Production release authorized.
- Built-in imagegen accepted on first pass: 16 complete overhead figures with swept hair, wide rectangular glasses, fuller smiling face and light grey chin stubble; hunting outfit/equipment/pose layout preserved. Viewed full sheet against photo and existing cast.
- Replaced assets/sprites/hunter-illustrated.png; importer regenerated hunter-illustrated.json with measured bounds/pivots. PASS node tools/import-illustrated.js hunter: 1254x1254,16 transparent/non-clipped frames,density10.71. Original source preserved in Git history; generated pixels unchanged.
- Added hunter-prompt.md exact prompt/identity provenance; updated docs/VISUAL-SYSTEM.md and ILLUSTRATED.md so future sessions retain this identity. Raw photo not copied into repository. No runtime/gameplay changes.
- Next: required contract/assets/smoke checks, desktop/mobile full art validation, native-size hunter screenshots and final diff; then commit/push and production deployment with live verification. Likeness remains a small stylized illustration, not photographic reproduction.
## 2026-09-23 18:51 America/Toronto — hunter likeness correction started

- User supplies a portrait and explicitly requests production publication; refine hunter likeness in the established HD overhead style, then commit/push/deploy.
- Branch feat/regulars-responsive-pixel-polish, HEAD 8061cb9, upstream 0/0 at startup; clean tree preserved. Read complete handoff/art standard and viewed shipped hunter/waiter/camera references.
- Decision: replace hunter head across all 16 directional idle/walk/drink cells: expose swept brown hair/high forehead, wider rectangular glasses, fuller face and light chin stubble instead of cap/heavy beard. Preserve hunting clothes/equipment, world scale and gameplay. Raw personal photo stays outside public repository; record descriptive identity/prompt only.
- Files: HANDOFF.md checkpoint only. No tests yet for new art; no commit/push/deployment this turn. Next: built-in imagegen with supplied photo and shipped sources, inspect alpha/likeness, import measured atlas, browser review and release checks.

## 2026-09-23 18:45 America/Toronto — Alex graphics/macebell production release verified

- User-authorized release complete: code commit `6014ac3` (`feat: upgrade Alex graphics and add macebell workouts`) pushed to `feat/regulars-responsive-pixel-polish`; production READY at `https://lepub.vercel.app`, deployment`dpl_7iFdvPifrP7ddjnC48j8nPKsPFGh`, immutable`https://lepub-6p1z07qg0-maisoncastros-projects.vercel.app`. Main/PR unmerged, no external messages sent.
- Current HEAD before this final test/docs commit is `e3867ea`, upstream0/0. This checkpoint and the browser fixture correction are being committed/pushed together; game/assets unchanged since `6014ac3`. Final commit contains no production behavior change. After push, verify clean tree/upstream0/0.
- LIVE `node tools/validate-alex.js <temp-output> https://lepub.vercel.app` PASS desktop1280x720/mobile390x844:40 transparent/non-clipped source cells, split and mace carrying/animation/preparation/blocker/exit, both missing-sheet fallbacks, reduced motion static pose with live blocker; zero normal browser errors. Captures/report in `%TEMP%/lepub-alex-live`.
- LIVE `node tools/validate-merge.js https://lepub.vercel.app` PASS both viewports, existing effects/control/smoke/caught integration; zero errors. SHA256 PASS35 exact served files: runtime scripts/style/index/manifest plus11 metadata/PNG pairs. GitHub CI SUCCESS for release`6014ac3` and deployment checkpoint`e3867ea`.
- Final local contract PASS11 families/5 guards, assetsPASS31, smokePASS10scripts/40routes, AlexPASS13 entry gates/collision/cleanup; full local artPASS148 mappings each viewport. `git diff --check` PASS (expected line-ending notices only).
- The first live reduced-motion assertion exposed a test fixture relying on randomized player spawn. Fixed only `tools/validate-alex.js` to stage player clear of workout for fallback/reduced pages, then reran live suite successfully. In-game occupancy cancellation was correct. No source redeploy needed for this test-only correction.
- Durable visual guide, shared art contract, exact prompts, test/CI coverage and local review evidence are in the release. No unfinished user-requested work. Remaining unrelated debt: procedural busboy/room, documented unused side-split anatomy and existing cast animation limits; no physical-device performance claim. Continue only on new feedback; preserve approved illustrated sources.

## 2026-09-23 18:44 America/Toronto — random-spawn browser fixture corrected

- Investigated live reduced-motion state: player uses randomized `pickClearSpawn`; fallback/reduced test pages had not moved the player away from the staged workout. A player spawning in that area correctly cancels preparation, so the test's blocker assertion was nondeterministic. Isolated live diagnostics show static frame/reduced-motion/blocker all correct with clear space and all11 atlases ready.
- `tools/validate-alex.js` now explicitly stages player at145,266 on fallback/reduced pages, matching normal desktop/mobile fixtures. Production code/assets unchanged; no redeployment needed for this test-only fix. Existing deterministic tests already verify occupancy cancellation intentionally.
- BranchHEAD`e3867ea`, upstream0/0; tool fix + deployment handoff notes local. Next: rerun live Alex suite, commit/push test fix and final verified release ledger, confirm clean upstream status.

## 2026-09-23 18:43 America/Toronto — live checks isolate reduced-motion fixture failure

- Production READY on deployment below;35 served runtime/manifest/atlas files SHA256-match local tested bytes. GitHub CI SUCCESS for code`6014ac3` and checkpoint`e3867ea`. Live merge desktop/mobile checks PASS with zero errors.
- Live `validate-alex` reaches its final reduced-motion check but FAILS `Reduced motion must keep static art with working blocker`; prior local run passed. Desktop/mobile source/lifecycle/fallback stages completed before this assertion. No claim of fully verified release yet.
- BranchHEAD`e3867ea`, upstream0/0; only handoff local. Next: inspect actual reduced-page state/frames to distinguish fixture timing/random placement from gameplay bug; fix and reverify, redeploy only if production code/assets need changing.

## 2026-09-23 18:42 America/Toronto — production READY; live verification underway

- Code `6014ac3`, branch HEAD `e3867ea`, both pushed, upstream0/0. Only deployment-ledger notes are local; no source/asset changes after tests.
- Retry succeeded: production deployment `dpl_7iFdvPifrP7ddjnC48j8nPKsPFGh`, READY, alias `https://lepub.vercel.app`, immutable URL `https://lepub-6p1z07qg0-maisoncastros-projects.vercel.app`.
- Next: live desktop/mobile Alex/merge browser checks, SHA256 comparison of all runtime scripts/style/manifest/11 atlas metadata+PNGs, inspect GitHub validation result, then commit/push final release handoff. Production is deployed; final live verification is not complete yet.

## 2026-09-23 18:42 America/Toronto — initial deployment authorization retry

- Branch HEAD `e3867ea` (release checkpoint), code `6014ac3`, both pushed; upstream0/0. Initial `vercel deploy --prod --yes` returned `Not authorized` before upload. No new production deployment yet.
- Same first-attempt error resolved on retry in previous releases. Next: retry once, then inspect authenticated deployment access if it persists. Only this documentation note is local; tested/pushed game and assets unchanged.

## 2026-09-23 18:42 America/Toronto — Alex update committed and pushed; deploying production

- User-authorized feature release committed as `6014ac3` (`feat: upgrade Alex graphics and add macebell workouts`) and pushed to `origin/feat/regulars-responsive-pixel-polish`. Branch upstream0/0, working tree clean before this checkpoint. All43 reviewed files, including prior visual-system/HD split work, are included.
- All final tests/browser evidence from checkpoints below stand. No gameplay/source changes after testing. Main and PR remain unmerged; production publishing uses the linked Vercel CLI project directly.
- This documentation checkpoint will be committed/pushed before `vercel deploy --prod --yes` so the uploaded tree is clean. Next: deploy, then verify public alias via live desktop/mobile Alex + merge checks and exact hashes of scripts/manifest/all atlas metadata+PNGs. Production not updated yet.

## 2026-09-23 18:41 America/Toronto — final release checks pass; committing

- User explicitly authorizes commit, push and production deployment. Branch `feat/regulars-responsive-pixel-polish`, HEAD`699c55f`; fresh `git fetch origin --prune` confirms upstream0/0, no collaborator changes to integrate. All session files preserved, currently uncommitted/unpushed.
- Final `node tests/character-art.js` PASS11 families/5 negative guards; `node tests/assets.js` PASS31; `node tests/smoke.js` PASS10 scripts/40 routes/full gameplay; `node tests/alex.js` PASS13 schedule gates and both lifecycle/collision/cleanup suites. `git diff --check` PASS with expected LF/CRLF warnings.
- `tools/validate-alex.js` accepts optional second argument for a live URL (first remains output directory); this allows the same desktop/mobile source/lifecycle/fallback/reduced-motion checks on production after deployment. Review README now records reduced-motion evidence. No production gameplay changes since tested implementation.
- Next: stage the complete reviewed session changes, commit `feat: upgrade Alex graphics and add macebell workouts`, push existing feature branch, deploy linked Vercel `lepub` production and verify public alias/served bytes. No PR merge/comment requested or planned.

## 2026-09-23 18:40 America/Toronto — production publication explicitly authorized

- User now explicitly requests commit/push straight to production, with a commit describing Alex graphics and macebell addition, then says resume. Finish and publish the completed local work to the existing feature branch and linked Vercel production project; no PR merge is required or requested.
- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream0/0 as last checked. All prior visual-system/HD Alex + mace/scheduling changes remain uncommitted locally and preserved. Nothing pushed/deployed yet this turn.
- Final `node tools/validate-alex.js docs/art-review/alex` PASS desktop/mobile,40 source cells, split and mace lifecycle, four carrying directions, four swing-phase mappings, both missing-asset fallbacks and reduced-motion static pose with blocker intact; zero errors. `node tools/validate-merge.js` PASS both viewports, status effects, split, pack controls, smoke/caught. Full cast148 mappings, gameplay13 gates/smoke and assets31 already PASS; diff check PASS.
- Current local preview returnsHTTP200 for new mace PNG. Implementation diff reviewed, screenshots/provenance and visual-system docs saved. No unfinished requested feature work.
- Next: final release checks and fresh upstream comparison, stage/commit with Alex graphics+macebell title, push feature branch, deploy linked Vercel production, run live smoke/assets verification, record release and push final handoff. Preserve all existing uncommitted session files in the release.

## 2026-09-23 15:18 America/Toronto — visual review and documentation complete; final checks

- Branch/HEAD/upstream unchanged; all prior + mace changes local/uncommitted/unpushed.
- Inspected desktop mace swing and mobile preparation captures: equipment reads as a single-ball steel mace, silhouette/style consistent with Alex and cast, marked floor area readable. Source remains unchanged; original split art retained.
- Added `alex-mace-prompt.md` with exact accepted built-in prompt, rejected-draft note, measured row seams and animation integration. Visual system/README/CLAUDE/ILLUSTRATED/review docs describe11 sheets,148 mappings and exact appearance/cooldown/preparation/cancellation rules.
- Contract validation enhanced for source row count/seams and animation timing; PASS11 families plus5 negative guards including missing mace pose. Added browser assertions for carrying directions and static reduced-motion mace while collider stays functional; these new assertions require final rerun.
- Next: run final Alex browser/reduced-motion checks and adapted merge regression, inspect diff/status, final handoff. Existing gameplay/smoke/assets/full-cast checks PASS as recorded; no release actions requested/performed.

## 2026-09-23 15:15 America/Toronto — mace desktop/mobile browser checks pass

- Same branch/HEAD/upstream `feat/regulars-responsive-pixel-polish`/`699c55f`/0/0; all work local, uncommitted/unpushed.
- `node tools/validate-alex.js docs/art-review/alex` PASS desktop1280x720/mobile390x844:16 split-source +24 mace-source transparent/non-clipped cells, preparation, original split/facing/exit,4 distinct mace cycle frames,28x14 mace blocker/cleanup, both missing-sheet fallbacks. Zero browser errors. Added ready/three swing-phase screenshots per viewport to existing review folder.
- `node tools/validate-art.js` PASS:11 atlases,148 mappings each viewport, booth poses, movement12.4, rotation/fallback/gallery, zero errors. `node tests/assets.js` PASS31. CPU timing only, no physical-device claims.
- Next: inspect mace captures, add reduced-motion and carrying-direction browser assertions, finish provenance/timing/art-system docs, final diff and handoff. Seeded gameplay tests and smoke remain PASS.

## 2026-09-23 15:14 America/Toronto — scheduling and collision regression tests pass

- Branch `feat/regulars-responsive-pixel-polish`, HEAD`699c55f`, upstream0/0; uncommitted/unpushed. User scope unchanged.
- `node tests/alex.js` PASS:13 entry gates, grace/cooldown, activity alternation, timed/endless caps, both preparation/activity/exit cycles, occupancy cancellation, actual player/hunter movement blocking, pause/tally/urgency/shift-end cleanup, reset and restricted spaces. Seeded RNG; a clear-space retry is legitimate, so test waits through bounded defer attempts rather than assuming the first random sample succeeds.
- `node tests/smoke.js` PASS after adapting old instant-split expectation to1.2s preparation and moving its fixture away from player. `node tests/character-art.js` PASS11 families. Initial old smoke assertion failure was expected fixture drift from new preparation, not an accepted final failure.
- `tests/smoke.js` exports its runtime harness without running when required; new tests/alex and CI reuse it. `tools/validate-alex.js` now inspects both source sheets, preparation, four mace phase mappings, screenshots and both missing-sheet fallbacks. Merge-render fixture adapted for prep and isolates its intentional urgent-bathroom setup from scheduler gating.
- Next: run actual desktop/mobile browser suites, inspect mace scale/pose and warning footprint, write provenance and player-facing timing docs, finish handoff. No source redraw needed after accepted square24-frame import.

## 2026-09-23 15:10 America/Toronto — mace artwork and lifecycle implemented; tests next

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream0/0; all previous and new work local/uncommitted/unpushed.
- Added transparent `alex-mace-illustrated.png` and metadata (square1254,24 frames,density8.24). Importer generalized to contract row count and measured seams; square source bands measured and row cuts declared in `src/character-art.js`. `node tools/import-illustrated.js alex-mace` PASS alpha/bounds/cell-edge checks. Two opaque rectangular drafts rejected outside repo. Manifest now11 sheets; original Alex/split source preserved.
- `game.js`: split/mace activity selection,1.2s marked preparation,5s split/6s mace block, full-box placement/occupancy and reachable-route validation; cancel if occupied before activating. Mace has28x14 workout area, split22x7 preserved. Floor warning outline, illustrated swing-cycle selection and procedural equipment fallback; new sound cue.
- Scheduler:60–90s initial delay,3 deliveries and shift warmup,120–180s cooldown on departure, once per timed shift, alternate after random first activity; defer chase/round/urgent bathroom/closing period/busy door/recent-hit conditions. Last-call/round/bathroom or shift end clears an existing workout; restart clears all scheduler memory.
- Caught a patch matching dismissal rather than reset; corrected before tests so departures retain per-shift/activity memory and receive long cooldown, restart receives fresh grace/memory. `node --check game.js` passed before rendering additions; runtime suites pending.
- Next: deterministic tests of both activities, fairness/defer/reset and actual collision; adapt prior split browser fixture for preparation, verify new source and swing frames on desktop/mobile, update docs/evidence.

## 2026-09-23 15:05 America/Toronto — rectangular alpha extraction rejected

- Mace draft extraction still visibly retains opaque backdrop, so neither rectangular output is accepted or copied into repo. Branch/HEAD/upstream unchanged; prior local work intact.
- Decision: regenerate from the transparent Alex source on a square sheet with four columns/six shorter rows and smaller consistent within-cell figures. Source density will still exceed4 px/world unit; runtime scale remains measured. This follows the successful square-sheet path from earlier cast work. Next: verify alpha before integration; implement scheduling while source is resolved.

## 2026-09-23 15:04 America/Toronto — mace source draft needs transparent extraction

- Same branch/HEAD/upstream `feat/regulars-responsive-pixel-polish` / `699c55f` / 0/0; previous local changes preserved, nothing committed/pushed.
- Built-in imagegen produced a matching 4-column/6-row Alex macebell draft (idle/carry strides/three swing phases), but visibly added an opaque brown backdrop. Draft remains outside repo and is rejected as production art.
- Next: built-in background-extraction edit preserving 24 figures and cell layout, verify real alpha/edges, then import using generalized row-count contract. No gameplay changes or tests for mace yet.

## 2026-09-23 15:02 America/Toronto — macebell visit and sensible scheduling started

- User adds Alex swinging a steel mace/macebell as another temporary blocking activity and asks for occasional, context-aware appearances. Preserve previous uncommitted visual-system/HD-split work; startup status matches final checkpoint.
- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream 0/0. No commit/push/deploy. Only handoff changed so far this turn.
- Decision: keep split visits and add a distinct illustrated macebell visit with carrying strides, a short visible preparation cue, a brief swing cycle and temporary blocker. Author supplemental artwork without replacing the approved split source; generalize contract/importer rows as needed.
- Scheduling: initial grace period and delivery progress; long cooldown after departure, at most one visit per timed shift, defer during last call/round/bathroom urgency/chase or a busy doorway. Validate clear reachable workout space away from door, bathroom and service areas, recheck occupancy before adding a collider. Busy spots/failed routes should cancel or defer, never trap someone inside a newly created blocker.
- Tests: not yet run for this addition. Next: generate mace art from Alex reference, implement lifecycle/scheduling and explicit reset state, add deterministic gameplay coverage and desktop/mobile art proof. Existing test passes apply only to previous split implementation.

## 2026-09-23 15:00 America/Toronto — visual system and HD Alex complete locally

- User request fulfilled locally: durable texture/sprite/vibe standard for all future sessions plus illustrated Alex idle, directional walking and full split. Overhead camera, existing nine source sheets, room geometry, input and gameplay/collider dimensions preserved.
- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream 0 ahead / 0 behind. All changes below uncommitted/unpushed; no deployment, PR mutation or external message this session. Actual Git status checked. Production still has previous release until publication.
- `docs/VISUAL-SYSTEM.md`: authoritative references, mood/material/color recipes, HD definition, camera/density/pivots, character onboarding, acceptance and limitations. `AGENTS.md`/`CLAUDE.md` require this for future visual work. README/art-direction README/ILLUSTRATED notes reflect ten sheets and busboy debt.
- `src/character-art.js`: shared family/scale/row/animation contract and explicit ghost/busboy exceptions. `index.html` loads it. `game.js` recognizes contracted special poses, sets Alex walk facing, and uses split.down over original22x7 blocker. `tools/import-illustrated.js` consumes contract and rejects cell-edge clipping; source PNGs remain unmodified by importer.
- `assets/sprites/alex-illustrated.png` + JSON: corrected built-in imagegen source,1254x1254,16 alpha/edge-checked frames,density10.33; manifest selects it. `alex-prompt.md` stores both exact prompts/provenance. Original clipped generation rejected, never published. Side-split source leg-axis imperfection is documented; gameplay only uses the validated down-facing split.
- `tests/character-art.js` + `.github/workflows/validate.yml`: production family/manifest/PNG/scale/pose checks and CI configuration. `tests/smoke.js`: new script + Alex split/facing/collider regressions. `tools/art-review.html` and `tools/validate-art.js`: contract-driven cast/pose coverage. `tools/validate-alex.js`: alpha, real lifecycle, four facings, body/blocker invariants and missing-sheet fallback.
- PASS: contract10 gameplay kinds/10 illustrated families plus4 negative guards; assets31; smoke10 scripts/40 routes + full gameplay and new regressions. Full Edge art PASS desktop1280x720/mobile390x844: ten ready sheets,136 mappings each, movement12.4, rotation/fallback/gallery, zero errors. Alex Edge PASS both sizes:16 non-clipped transparent cells, walking/split/stand, preserved14x17 body and22x7 blocker,404 fallback, zero errors. Syntax checks for new/changed tooling and `git diff --check` PASS (normal LF/CRLF warnings only).
- `docs/art-review/alex/`: six actual desktop/mobile idle/split/exit captures, report and review README. Clear-aisle captures visually inspected; Alex matches existing cast detail/scale. This is browser emulation, not physical-phone performance evidence. CI is configured locally but has not run remotely; branch protection unchanged.
- Existing local server already works: HTTP200 for new contract, served manifest confirms Alex. Preview `http://127.0.0.1:8917/`, gallery `/tools/art-review.html`. Earlier helper-launch policy rejection needed no workaround because no new process was necessary.
- No unfinished implementation for this request. Next: user reviews local cast/gameplay; publish only when requested. Remaining art debt outside this scope: procedural busboy and room, existing cast animation/anatomy limitations. Keep guide/contract/checks in sync for future characters; do not treat fallback as finished artwork.

## 2026-09-23 15:00 America/Toronto — durable screenshots reviewed

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream 0/0; no commit/push/deploy. All session files remain local.
- `node tools/validate-alex.js docs/art-review/alex` PASS with clear-aisle fixture: desktop/mobile idle, actual split and exit PNGs plus report saved. Split and idle captures visually inspected; detail/scale consistent with Jay/Doe/Hunter, feet and horizontal shoes readable. Added review README. Source16 cells, four facings, split collider and fallback checks remain PASS; zero errors.
- Docs updated to ten atlases/seven named people and remaining busboy debt; original nine sources unchanged. `git diff --check` PASS (expected Windows LF/CRLF warnings only). Implementation diff reviewed.
- Local preview helper's combined PowerShell HTTP-check/hidden-Start-Process command was automatically rejected by policy; no helper launched by that call. Next: check existing local server with a simple read-only request and, if needed, use the standard foreground Node tool session. Then final status/checkpoint and delivery. No external publication requested for this work.

## 2026-09-23 14:57 America/Toronto — desktop/mobile integration checks pass

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream 0/0; all changes remain local/uncommitted/unpushed.
- `node tools/validate-alex.js` PASS desktop1280x720/mobile390x844: 16 transparent, non-clipped source cells each; all four walk facings; actual split.down; 24.39-world-unit visual width around unchanged22x7 blocker; unchanged14x17 body; standing/removal and illustrated exit; deliberate Alex404 retains split gameplay/fallback and other artwork. Zero normal browser errors.
- `node tools/validate-art.js` PASS: all10 atlases ready,136 required directional pose mappings per viewport, booth special states, keyboard/touch movement12.4, resize position preserved, Doe404 fallback and gallery10/10; zero errors. CPU submission timings only, no physical-device performance claim.
- Reviewed desktop/mobile split captures. Alex matches cast detail; current test staging puts a foreground pendant in front of part of his split, so move the review fixture to a clear aisle before saving durable evidence. No gameplay defect found.
- Next: finish doc count/debt consistency, save better staged screenshots/report, inspect diff and final handoff. Existing smoke/assets/contract PASS; no production release made.

## 2026-09-23 14:56 America/Toronto — corrected source imported; clipping guard added

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream 0/0; all work local/uncommitted/unpushed.
- Replaced Alex PNG with built-in imagegen spacing correction, preserving identity/materials/poses. Recorded exact edit prompt in `alex-prompt.md`; initial rejected image remains outside repo. Importer now rejects opaque cell-edge pixels for every future imported sheet.
- `node tools/import-illustrated.js alex` PASS: 1254x1254, 16 alpha/edge-checked frames, new density 10.33. `node tests/character-art.js` PASS including 4 negative guards. Previous smoke/assets PASS unchanged.
- Next: rerun Alex browser source/lifecycle checks, full-cast browser validation, visual inspection and final documentation consistency. Side-split source axis remains an explicitly documented unused variation; gameplay only uses down-facing horizontal split.

## 2026-09-23 14:55 America/Toronto — gameplay passes; source-cell clipping caught

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream 0/0; uncommitted/unpushed. User's HD Alex/visual-standard scope unchanged.
- `node tests/smoke.js` PASS (10 scripts, 40 routes, gameplay plus Alex split/facing/blocker regressions). `node tests/assets.js` PASS31. Contract check PASS as recorded below.
- `node tools/validate-alex.js` FAIL before captures: split cell (row3,col0) has 62 opaque boundary pixels. Initial generation extends shoes across strict quarter-cell boundaries despite overall transparency. This source must be corrected before completion; importer-only alpha coverage was insufficient.
- Next: built-in imagegen edit to give every cell safe transparent margins at consistent body scale; preserve initial source outside repo, replace project Alex source with corrected output, reimport and rerun source/browser checks. No need to alter geometry or existing cast sources.

## 2026-09-23 14:54 America/Toronto — standard and regression guards ready; browser proof next

- Same branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream 0/0. All changes local, uncommitted/unpushed. User scope remains durable visual system plus HD Alex.
- Added `docs/VISUAL-SYSTEM.md` (mood, texture/color recipes, reference hierarchy, HD/camera/anchor contract, onboarding and checks), linked from AGENTS/CLAUDE/README/art notes. `alex-prompt.md` records built-in imagegen prompt/provenance and unused side-split anatomy limit.
- `tests/character-art.js` PASS: 10 gameplay kinds, 10 illustrated families, PNG/header/scale/animation coverage, four negative regression guards. Ghost/busboy exceptions printed explicitly. Added GitHub workflow to run contract/assets/smoke checks on push/PR (not yet run remotely; no branch-protection setting changed).
- Gallery and browser art checks consume shared contract, removing hardcoded cast/pose counts. Smoke adds split selection/blocker/facing assertions. New `tools/validate-alex.js` checks alpha/cell edges, real idle/walk/split/stand lifecycle, unchanged body/blocker and missing-sheet fallback on desktop/mobile.
- Next: run all suites and inspect Alex gameplay captures; resolve any source clipping, scale/anchor or regression failures, then save review evidence and final handoff. Earlier importer PASS remains valid; browser/runtime suites not run yet this session.

## 2026-09-23 14:46 America/Toronto — Alex source and shared contract integrated

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream 0/0. User's durable art-system + HD Alex request in progress; all changes local/uncommitted/unpushed.
- Built-in imagegen produced `assets/sprites/alex-illustrated.png` using waiter as style/camera reference: teal tee, shorts, glasses, beard, sneakers; 4 directions x idle/two strides/split. Source preserved unchanged. `node tools/import-illustrated.js alex` PASS: 1254x1254, 16 alpha-checked cells, density 13.52. Generated `alex-illustrated.json`, selected in manifest.
- `src/character-art.js` now defines each illustrated family, rows, animations, scale, split floor offset, and explicit ghost/busboy procedural exceptions. Importer consumes it; index/smoke load it. `game.js` recognizes declared special poses, updates Alex cardinal facing and uses down-facing split to match existing horizontal 22x7 blocker. No gameplay/collider dimensions changed.
- New source visually inspected; in-game scale/anchor still require browser proof. Next: authoritative visual guide and AGENTS links, contract enforcement/CI, dynamic gallery/browser checks, regression tests and screenshots. No runtime tests yet beyond importer.

## 2026-09-23 14:44 America/Toronto — character standard and Alex upgrade started

- User requests a durable, enforceable texture/sprite/vibe standard for future sessions and illustrated HD Alex, including his split. Keep overhead camera, existing cast artwork, world geometry, gameplay and collider dimensions.
- Branch `feat/regulars-responsive-pixel-polish`, HEAD `699c55f`, upstream 0 ahead / 0 behind; clean at startup, consistent with previous final documentation commit. Only this checkpoint changed; no commits/push/deployment.
- Inspection: Alex has no atlas and retains coarse front-facing procedural rows. His raster pose currently collapses split to idle; his path following only sets flip, not cardinal facing. Both must be corrected with artwork integration. Busboy remains a documented legacy exception; ghost intentionally procedural.
- Decision: add a shared character art contract used by importer/validation, an authoritative visual guide linked from AGENTS/CLAUDE, and coverage that rejects undeclared character families or missing required illustrated poses. Preserve runtime fallback for loading failures.
- Tests: none run yet. Next: generate Alex using existing illustrated cast as visual reference, integrate measured metadata and correct split anchor/facing, enforce contract, run gameplay/assets and desktop/mobile art validation with saved review evidence.

## 2026-09-22 18:56 America/Toronto — production verified; task complete

- User requests fulfilled: merged latest main, resolved conflicts while preserving illustrated overhead art and incoming gameplay, pushed feature branch, then deployed production on explicit authorization.
- Branch `feat/regulars-responsive-pixel-polish`; tested code merge `03748b7`, release HEAD `5ba02fe`, both pushed. This final checkpoint is recorded in the following documentation-only commit; no game changes after release. Final commit/push leaves branch synchronized with origin and working tree clean. Main unchanged; PR #3 remains draft/open and GitHub confirmed clean/mergeable against `4c47160`.
- Production `https://lepub.vercel.app` is live on READY deployment `dpl_CiG5nu5q2YXpX2xPRrGu1va5Vo8i` (`https://lepub-e2bgxq5wl-maisoncastros-projects.vercel.app`). Initial transient authorization rejection resolved on retry.
- LIVE `node tools/validate-merge.js https://lepub.vercel.app` PASS desktop1280x720/mobile390x844: all atlases ready, illustrated status tint/pivot, Alex split, keyboard/touch pack control, wet effect, smoke invisibility and caught rendering; zero page errors. HTTP200 + SHA256 exact byte matches for live game.js, index.html, sprites.js, sound.js, manifest.json and Doe illustrated PNG against tested local files.
- Local smoke/gameplay and assets31 checks PASS; full art/browser112 pose mappings per viewport, input/rotation/fallback PASS; diff check PASS. Final live screenshots in `%TEMP%/lepub-merge-review`.
- Remaining limitations: new busboy/Alex keep main's procedural art, room remains procedural, no physical-device performance claim. No unfinished release work or blocker. Next work only on user feedback; do not auto-merge PR or regenerate approved sprites.

## 2026-09-22 18:55 America/Toronto — production READY, live verification underway

- Branch HEAD `5ba02fe`, upstream 0/0; code merge `03748b7` pushed. GitHub REST confirms PR #3 `mergeable:true`, `mergeable_state:clean`, base `4c47160`; PR remains draft/open. `git merge-base --is-ancestor origin/main HEAD` PASS.
- Retry of `vercel deploy --prod --yes` succeeded: deployment `dpl_CiG5nu5q2YXpX2xPRrGu1va5Vo8i`, target production, READY; alias `https://lepub.vercel.app`; immutable URL `https://lepub-e2bgxq5wl-maisoncastros-projects.vercel.app`. Tested game code is unchanged from pushed commit; only the auth-attempt documentation checkpoint was local during deployment.
- Next: run desktop/mobile merged-feature browser checks against the public alias and compare served source/assets with the local tested bytes. Then commit/push final release handoff. No pending code changes.

## 2026-09-22 18:54 America/Toronto — initial Vercel deploy rejected, retry pending

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `5ba02fe`, upstream 0/0. Merge/code and pre-release handoff pushed; tree clean before this note. First `vercel deploy --prod --yes` returned `Not authorized` before any upload/deployment. No production release yet.
- Earlier deployment history records the same first-attempt rejection followed by a successful retry. Next: retry once, then inspect available authenticated Vercel access if rejection persists. This checkpoint is pending locally; no source changes after validation.

## 2026-09-22 18:53 America/Toronto — merge committed and pushed; production deployment next

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `03748b7`, upstream 0/0 after successful push. Merge commit incorporates main `4c47160`; all conflict resolutions and final tests are committed. Working tree was clean before this checkpoint.
- User authorized production. All validation results from the ready-to-release checkpoint below stand. Next: deploy the linked Vercel `lepub` project with `--prod`, then verify the public alias serves the merged files and passes desktop/mobile integration checks. PR stays open; no PR comment or main-branch mutation requested/performed.
- This documentation checkpoint will be committed and pushed before deployment so the deployed working tree is clean. No production deployment has happened yet.

## 2026-09-22 18:53 America/Toronto — resolved merge ready to push and release

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `3621024`, upstream 0/0. Refetch confirms `origin/main` remains `4c47160`; merge resolved locally, not yet committed/pushed. User explicitly authorizes production after completion.
- Final `node tests/smoke.js` PASS including busboy speech rendering and all added gameplay regressions; asset registry PASS31. `node tools/validate-art.js` PASS desktop/mobile,112 animation mappings, input/rotation and missing-sheet fallback. New `node tools/validate-merge.js` PASS desktop1280x720/mobile390x844: ready atlases, raster status/pivot, Alex split, keyboard/touch pack drops, wet effect, off-floor hunter removal, caught UI; zero page errors. Status screenshots reviewed in `%TEMP%/lepub-merge-review`.
- README/CLAUDE now reflect actual40% alcoholic-shot probability, raster status handling, incoming mechanics and shift/tray terminology. Existing nine PNGs untouched; incoming Alex/busboy procedural art retained. `git diff --check` PASS; no conflict markers remain.
- Changed files: five resolved conflicts (`game.js`, sprites, dialogue content, sound, CLAUDE); incoming README/source floor plan/index/dialogue/CSS; tests/smoke regression coverage; new tools/validate-merge browser coverage; this handoff. All intentional.
- Next: stage/commit merge, push feature branch, confirm PR mergeable, deploy with `vercel deploy --prod --yes` to linked `lepub`, verify live assets/gameplay, record release. PR remains open; direct production release does not require merging it into main.

## 2026-09-22 18:51 America/Toronto — production release authorized; browser art checks pass

- User now explicitly requests continuing and pushing to production after completion. Finish/push the resolved feature branch, then deploy that tested commit to the existing linked Vercel production project. README identifies `https://lepub.vercel.app`; GitHub Pages is absent and there is no repository deployment workflow. PR merging is not required for the documented direct CLI deployment.
- Branch `feat/regulars-responsive-pixel-polish`, HEAD `3621024`, upstream 0/0; main `4c47160` merge remains local/uncommitted. GitHub PR #3 remains conflicting until this merge is pushed.
- `node tools/validate-art.js` PASS: desktop1280x720/touch390x844, all9 atlases ready,112 pose mappings each, movement12.4 units, rotation preserves position, missing-Doe fallback works; zero normal browser errors. Captures/report in `%TEMP%/lepub-art-final`. CPU render submission desktop2.8/5.2ms median/p95; mobile2.7/5.5ms, not physical-device evidence. `git diff --check` PASS.
- Further code inspection found main's busboy speech used removed `DIALOGUE_BG`; changed `drawBusboyLine` to the existing parchment painter and added an exercised speech render to smoke tests. This small follow-up needs final checks. New gameplay/sprite status browser capture pending.
- Next: final integration render/input checks and doc consistency; commit/push merge; verify PR mergeable; deploy via linked Vercel CLI and verify live production. Nothing committed/pushed/deployed this turn yet.

## 2026-09-22 12:54 America/Toronto — merged gameplay regression checks pass

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `3621024`, upstream 0/0; main `4c47160` merge still uncommitted/unpushed.
- `game.js`: fixed stale HUD coordinates, fitted packs/status bars into walnut HUD; preserved raster artwork with cached Jameson/wet status variants. Smoke routes use hunter footprint, clear carried hunter orders, resume scanning, hide off-floor alerts/order/light, and timeout only on sustained stalls. Busboy/Alex paths now use their own body footprints. Bathroom/customer penalties use shift accounting. Pack drops respect tally/pause/game-over.
- `tests/smoke.js`: added coverage for delivery-earned packs, frozen tally, full smoke route and patrol return, Jameson bounce, bathroom relief/accident plus shift ledger, reachable mopping, Alex collider lifecycle, all new reset state, and raster status rendering. Initial busboy test failed because its fixture put the puddle inside a table; corrected to an actually clear aisle and retained body-aware routes.
- `node tests/smoke.js` PASS (9 scripts, 40 routes, existing gameplay plus new integration coverage); `node tests/assets.js` PASS (31 checks). Initial HUD failure is fixed. No new atlas/source PNG changes.
- Next: desktop/mobile Edge validation and screenshots, inspect final diff, stage and commit resolved merge, push feature branch and verify PR mergeability.

## 2026-09-22 12:48 America/Toronto — conflict content combined, integration checks underway

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `3621024`, upstream 0/0; merge of `origin/main` `4c47160` remains in progress, uncommitted/unpushed.
- All five conflicted files now combine the illustrated overhead branch with main's Jameson, bathroom, smoke-break, busboy/Alex, dialogue and sound additions. Current shift/tray/hunter state machine, renderer and approved PNGs remain preserved. New busboy/Alex retain main's procedural assets.
- `node --check game.js` PASS. First `node tests/smoke.js` FAIL: incoming cigarette HUD still references removed `barY`/`LIFE_SEG_H`. Fixing HUD layout, smoke/state-machine integration and raster status effects before rerunning. Identified duplicate `hunterFollowPath` signatures during resolution; incoming smoke helper renamed to keep scanning paths intact.
- Next: finish these integration fixes, exercise incoming features with regression tests, run existing assets and desktop/mobile browser validation, stage/commit/push merge.

## 2026-09-22 12:43 America/Toronto — merging latest main, conflicts in progress

- User requests pulling main and fixing PR #3 conflicts; prior push authorization applies to the resolved feature branch. Preserve illustrated overhead art and incoming gameplay features.
- Branch `feat/regulars-responsive-pixel-polish`, HEAD `3621024`, upstream 0/0. Clean at startup. Fresh fetch finds main `4c47160` with three new commits: Jameson power-up, restroom need, Mathieu/Alex smoke breaks and split slowdown.
- `git merge --no-commit --no-ff origin/main` is in progress. Conflicted: `CLAUDE.md`, `game.js`, `src/dialogue-content.js`, `src/sound.js`, `src/sprites.js`. Auto-merged: README, planFloor image, index, dialogue runtime, CSS. Approved `assets/art-direction/floor-plan.*` remain distinct from incoming source planFloor image.
- No tests run yet for merged tree; conflict markers must be resolved and incoming features integrated with shifts/tray/hunter states/art pipeline. Next: inspect each hunk, combine behavior, run smoke/assets/browser validation, commit and push merge. Nothing committed/pushed this turn.

## 2026-09-22 12:30 America/Toronto — illustrated cast pushed

- Branch `feat/regulars-responsive-pixel-polish` advanced from `4bfd425` to `3a0f63c` with commit `feat: replace procedural cast with illustrated overhead sprites`; pushed successfully to `origin/feat/regulars-responsive-pixel-polish` (0 ahead / 0 behind after push).
- This checkpoint records the completed user-authorized push. No PR merge, deployment, or PR comment was performed.
- Working tree has only this handoff update pending. Next state: commit and push this checkpoint, then wait for visual review feedback.

This file is maintained throughout active work, not only at the end. Read the
newest checkpoint before making changes. Do not record secrets or `.env`
contents here.

## 2026-09-22 12:26 America/Toronto — character rebuild ready for local review

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `4bfd425f4fd71c9efac6f0711aade3bd3fbf1b04`, upstream 0 ahead / 0 behind. All session changes remain uncommitted/unpushed; no deployment, PR comment or merge made. Final Git status checked against this entry.
- User rejected the latest procedural sprite execution on PR #3, asked to recover our reference direction, explicitly confirmed overhead, then resumed on Sep22. Approved geometry/colliders/rules preserved.
- `assets/sprites/{doe,hunter,nazim,sam,gerald,waiter,customer-teal,customer-ochre,customer-blue}-illustrated.{png,json}`: nine genuinely new illustrated source sheets from built-in imagegen, 144 alpha-checked source frames and measured per-family feet/density metadata. `manifest.json` selects these. Original atlases and procedural sets preserved.
- `game.js`: single ART_SCALE 4 transform, illustrated walk-in selection via existing look; hunter drink and regular talk/lean/slump resolve to correct assets; fixed directional-pose lookup and opacity omission from lighting cache key. `src/scenery.js`: continuous-alpha lighting/vignette removes coarse checkerboard over artwork. No world/input/gameplay numeric change.
- `tests/smoke.js`: drunk/gone directional-pose regression assertions. `tools/export-sheets.js`: procedural export cannot silently add a competing family to the illustrated manifest.
- `tools/browser-session.js`: shared local-only static server and Edge harness. `tools/import-illustrated.js`: metadata importer, PNGs unmodified. `tools/validate-art.js`: full real-browser validation and captures. `tools/art-review.html`: interactive nine-character direction/pose/scale viewer. `tools/serve.js`: dependency-free preview command. Removed the obsolete two-lead prototype `tools/review-art.js` created earlier this session.
- `assets/sprites/ILLUSTRATED.md`: provenance, prompt recipe/set, frame contract and limitations. `README.md`, `CLAUDE.md`, `assets/art-direction/README.md`: current renderer/cast/fallback direction. `assets/gameplay.png` refreshed from actual carry/drink/spray browser frame. `docs/art-review/{README.md,desktop.png,mobile.png,cast.png,report.json}`: saved evidence.
- Final tests: `node tests/smoke.js` PASS (9 scripts, 40 routes, regulars/waiter/serving/hunter/Nazim/round/reactions/shifts/render/raster + regression); `node tests/assets.js` PASS (31 checks); syntax checks for game/server/harness PASS; `git diff --check` PASS (only expected Windows line-ending notices).
- Browser: final `node tools/validate-art.js` PASS desktop1280×720 and touch390×844. All9 sheets ready;112 direction/pose mappings each; actual lean/slump/talk; carry/drink/spray rendered; keyboard/touch move12.4 units; rotation preserves position; deliberate Doe404 falls back while Hunter and movement work. Normal errors zero. Gallery9/9, no page errors. Mature order tickets and actual sprite screenshots visually reviewed.
- Latest CPU-only render submission,300 frames with9 patrons+regulars+Jay: desktop median2.9/p95 5.0ms; mobile emulation3.1/5.6ms. Not physical-phone/GPU/frame-pacing evidence.
- Local preview running via hidden Node PID6064, port8917. Verified HTTP200 and expected content for `http://127.0.0.1:8917/` and `/tools/art-review.html`. Restart with `node tools/serve.js` if process ends. No credentials or deployment needed for local review.
- Remaining scope/risks: visual approval pending; room/furniture are still procedural, not full painted-reference parity. Doe carryWalk uses held-pint frame plus existing step lift (no independent carry strides). Fine blush/blink and anatomical prop consistency need artist review; ghost intentionally procedural. Generated sources are reviewed AI illustrations, not hand-cleaned/palette-locked pixel art. Source PNGs add download/decode memory; no real-device performance claim.
- Next concrete step: user reviews the local playable game/cast; address their visual feedback before any PR publication or environment-art expansion. Do not regenerate or revert the preserved reference-quality sprites to procedural exports.

## 2026-09-22 12:18 America/Toronto — final manifest browser validation passes

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `4bfd425`, upstream 0/0; uncommitted/unpushed.
- Added `tools/validate-art.js`: tests actual production manifest (nine ready sheets), 112 direction/animation mappings per viewport, Nazim lean/slump and Sam/Gerald talk via runtime, carry/drinking/spray rendering, keyboard/touch movement, rotate/resize preserving world position, and simulated Doe PNG 404 with working fallback + other atlases.
- `node tools/validate-art.js` PASS at desktop 1280×720 and mobile 390×844. Zero normal console/page/request/HTTP errors. Movement both 12.4 world units. Desktop backing 1280×720; mobile 780×1440. Render-submission CPU only (300 samples after 30 warmup, 9 patrons + regulars + Jay): desktop median3.3/p95 5.8ms; mobile emulation median3.1/p95 5.5ms. This is not GPU/frame-pacing or physical-phone performance evidence.
- Captures/report at `%TEMP%/lepub-art-final/`; visual inspection, final docs and review delivery next. Existing earlier `tools/review-art.js` is only the two-lead prototype and should be removed/replaced so no misleading before/after captures survive.

## 2026-09-22 12:13 America/Toronto — walk-in artwork integrated

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `4bfd425`, upstream 0/0; uncommitted/unpushed.
- Built-in imagegen available again. A combined 24-frame customer sheet and extraction retry failed visual alpha inspection (painted backgrounds); rejected and left outside repo. Three square sheets based on the transparent waiter template succeeded.
- Added `customer-{teal,ochre,blue}-illustrated.png` + JSON, 16 alpha-checked frames each. Manifest now nine illustrated atlases (144 source frames); `game.js` selects customer atlas using existing `look`, preserves entity kind/palette and per-family fallback. Ghost remains intentionally procedural/translucent.
- Next: final browser proof of all nine atlases, full cast directions/poses, crowded room, controls/resize, missing-asset fallback and frame-cost measurements. Documentation and final screenshots still pending. Earlier smoke/31 asset checks pass; customer integration not yet tested.

## 2026-09-22 12:06 America/Toronto — resumed, regression suites pass

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `4bfd425`, upstream 0/0. Git status matches the six illustrated sheets/metadata, importer/review harness, manifest/renderer/lighting/pose changes and handoff from yesterday; all preserved, uncommitted/unpushed.
- User says resume; overhead remains explicit direction. Yesterday's last customer-sheet generation failed with usage_limit_reached (429); no customer image was produced. Retry now after the recorded reset period.
- Tests now run against the directional pose fix: `node tests/smoke.js` PASS including drunk/gone Nazim regression; `node tests/assets.js` PASS, 31 checks.
- Next: customer artwork if available, final cast/browser/movement/fallback/resizing/performance validation, updated documentation and review captures. No deployment, PR comment, commit or push made.

## 2026-09-21 20:23 America/Toronto — directional pose bug fixed

- Branch/HEAD/upstream unchanged: `feat/regulars-responsive-pixel-polish`, `4bfd425`, 0/0; uncommitted/unpushed.
- Found `regularPose()` only recognized bare legacy keys, so directional lean/slump silently returned idle. Fixed it to recognize directional and ready atlas poses; added regression assertions to `tests/smoke.js`. Also enables illustrated Sam/Gerald talking frames from actual talkTimer events.
- New assertions not yet run. Next: final gameplay/pose/fallback checks, and align walk-in customers with the named cast so crowds do not mix two art styles.

## 2026-09-21 20:21 America/Toronto — six named characters integrated

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `4bfd425`, upstream 0/0; all work uncommitted/unpushed.
- Added Jay's `waiter-illustrated.png`; corrected Sam's unintended beard with imagegen; importer alpha/bounds-checked regulars + waiter and wrote four more illustrated JSONs. Six sources, 96 frames total.
- `assets/sprites/manifest.json` selects the six illustrated sheets. Old PNG/JSON and procedural sets remain as reference/safety net. `tools/export-sheets.js` no longer appends a competing procedural family when illustrated entry exists.
- `game.js`: talking pose mapping for Sam/Gerald; `tools/import-illustrated.js`: distinct Nazim lean/slump, talking/spray poses. Lighting cache now keys alpha as well as radius/color (bug found during review).
- Tests remain the prior smoke/31 asset checks; all6 sheets validated by importer. Next: browser validation of final manifest, four directions/poses, booth/crowd, resize and missing-asset fallback; performance comparison and documentation. Generic walk-ins and ghost still procedural. Carry walk uses the held-pint pose + existing step lift; no independently authored carry strides yet.

## 2026-09-21 20:18 America/Toronto — regulars source artwork added

- Same branch `feat/regulars-responsive-pixel-polish`, HEAD `4bfd425`, upstream 0/0; uncommitted/unpushed.
- Added `nazim-illustrated.png`, `sam-illustrated.png`, `gerald-illustrated.png`. Nazim rows differ deliberately: idle, walk, lean, slump. Sam/Gerald row4 is talking. Keep those mappings in importer and pose selection.
- Earlier test/browser results still stand; new regular sheets not yet imported/tested. Next: Jay, import all three regulars with correct poses, integrate manifest and capture booth plus moving leads. Sam generation added facial hair despite clean-shaven prompt; correct before final.

## 2026-09-21 20:15 America/Toronto — leads proven in gameplay, renderer noise fixed

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `4bfd425`, upstream 0/0. User confirmed overhead artwork replacement. No commits/push/deployment.
- `tools/browser-session.js`, `tools/import-illustrated.js`, `tools/review-art.js`: local Edge harness, alpha/bounds measurement into loader-compatible JSON (sources unchanged), reproducible desktop/mobile proof. `doe-illustrated.json` / `hunter-illustrated.json` ready; manifest still original pending full cast.
- `game.js`: ART_SCALE 2→4 after native-size comparison demonstrated loss of illustrated detail at 2. One transform only; world, CSS scale, routes/colliders unchanged. Hunter drinking pose resolves to sheet with procedural fallback.
- `src/scenery.js`: removed coarse Bayer light/vignette patterns that overlaid checkerboards on faces. Continuous alpha lighting, artwork stays crisp. Discovered light cache key also omits alpha; fix next.
- Tests: `node tests/smoke.js` PASS (9 scripts, 40 routes and gameplay scenarios); `node tests/assets.js` PASS (31 checks). Edge proof at 1280×720 and 390×844: all loaded atlases ready, zero console/page/request/HTTP errors. Captures in `%TEMP%/lepub-art-review/` visually reviewed.
- Next: regulars + Jay source sheets, manifest integration, alpha-aware cache key, movement/fallback/resizing checks, final review captures. Environment remains procedural and is not claimed to match the painted reference fully. Source prompts/provenance documentation still needed.

## 2026-09-21 20:13 America/Toronto — illustrated leads authored

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `4bfd425`, upstream unchanged (0 ahead / 0 behind). User confirmed: keep overhead, fix artwork.
- Added `assets/sprites/doe-illustrated.png` and `hunter-illustrated.png` using built-in imagegen, referenced to the overhead character study. Four directions with idle, two walk steps and held-pint poses; original procedural atlases preserved.
- These are generated source sheets, not yet wired into the manifest. Must inspect alpha and measured bounds, anchor feet consistently, verify camera and native-size readability in gameplay before acceptance.
- HANDOFF.md also modified. No tests run yet; no commits/push/deployment/comments. Next: atlas metadata and an in-game proof, followed by regulars if the scale holds.

## 2026-09-21 20:09 America/Toronto — recovering the intended artwork from PR #3

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `4bfd425`, clean at startup and synchronized with upstream; live PR #3 head matches. Previous handoff's `f45c112` predates the final docs commit.
- User rejects the latest procedural sprites and asks to return to our reference direction. Read the complete prior handoff, PR body/comments, camera brief, and viewed gameplay plus all three visual references.
- Diagnosis: production PNGs are exports of the procedural overhead generator; reference-quality replacement art was never produced. Keep the approved geometry, overhead projection, current gameplay and existing loader. Optional camera clarification pending; overhead is the documented default.
- Next: use built-in imagegen to author replacement character sheets from the camera study, integrate via atlas metadata, verify native-size desktop/mobile gameplay and existing tests. No renderer scale change decided.
- Only HANDOFF.md changed so far. No tests yet in this session. No commits, pushes, deployment or PR comments made.
- Art remains unapproved; judge real gameplay captures, not generated concept images.
## 2026-09-16 15:30 — P0: overhead overhaul pack received; discovery and baseline

The user delivered `LePub-Character-Reference-Pack.zip` (Astra's plan). Binding
docs copied to `docs/overhaul/` (camera direction, architectural plan,
checklist, reactions); the two overhead references to
`assets/art-direction/overhead/`; the 30-colour palette to
`assets/art-direction/lepub.gpl`. Direction in force, superseding my
three-quarter pass: **high overhead camera** (crowns/hats/shoulders,
foreshortened bodies, dominant tabletops, shallow fronts), materials and
lighting from the pub painting, preserve all geometry/rules/events, four
cardinal directions, reactions from existing events only, compact UI, no
double-scaling, phases P0–P7 with evidence.

### P0 evidence (ARC-01/02/10/11/13/14)

- Repo map: see CLAUDE.md (verified this session). Scripts: classic globals in
  `index.html` order; no bundler. Loop in `game.js` `loop()`; `update(dt)`
  gates on `caught`, `shiftTally`, `hitStopTimer`.
- Units: world 200×360; logical viewport 320×180 / 180×320 (clamped
  160–320 × 144–360); `ART_SCALE` 2 applied once (`ctx.setTransform`) →
  backing viewW×2; CSS = viewW×`pixelScale` (integer, 4 at 1280×720). No DPR
  handling (browser upscales the pixelated canvas). `pixelSize 0.5` sheets:
  1 authored px = 1 backing px = 0.5 world unit → 64 px cell = 32 units,
  48 px silhouette = 24 units. Hitboxes in `ENTITY_HITBOXES`, independent of
  art. No pointer→world mapping exists (touch is DOM) — ARC-02 pointer tests
  are N/A.
- Geometry IDs: `BAR_SEGMENTS[i].station` (taps/shelf/hatch), `TABLES[0]`
  booth, `SEATS` with `side`/`regularId`, `BENCHES`, `DOOR`, `DECOR.lamps`.
- Authoritative events: `completeDelivery` (tip/clutch/double/round/hunter),
  `regularGiveUp`/walk-in abandonment, the hit block in `update()` (already
  has `HIT_STOP` 0.08 s + pint knock), `hunterNoticesPlayer` / lost /
  `hunterServed` → drinking, `addSpill`, `endShift`/`startNextShift`,
  `tryCallRound`/`noteRoundDelivery`, ghost spook.
- HUD inventory: shift, tips/target, total, clock (+last call), 3 pints,
  tickets (compact/urgent/carried) with patience gauge, dialogue placards,
  start/help overlay, caught board + ledger + name entry, tally board,
  restart button, ?/SFX/fullscreen chips, touch stick + action.
- Baseline: `node tests/smoke.js` passes (no known failures). Captures:
  scratchpad `review/review-frame.png` (= `assets/gameplay.png` at
  `ad61922`), `shots/*`. Perf (headless Edge, 1280×720, 320×180 @4×, shift
  6 crowd, hunter chasing, 600 frames update+render): median 1.9–3.0 ms,
  p95 7.6–10.6 ms (scratchpad `perf.js`).
- Discrepancies vs the pack: it assumes a possible world×2 — not needed; the
  renderer already has the 2× art backing. Pack's ART-PLAN is my §2b-less
  copy. "Jay" = the waiter.

### P3 evidence — overhead proof in the real room (ARC-06, ARC-07, ARC-11, partial ARC-12)

- `src/sprites.js`: `ohFigure`/`ohSheetSet` overhead figure generator
  (40×44 backing, pixelSize 0.5, feet at the bottom): head dome by kind
  (hood/cap/hair/bald/flatcap), face sliver only for down/side, shoulders,
  hands, feet, outline pass, then `lightSprite`. Four authored directions;
  'left' mirrors the body and re-attaches props on the anatomical side
  (pint in the Doe's left hand, gun over the hunter's right shoulder).
  `OH_DOE` (idle/walk/walkB + carry variants), `OH_HUNTER` (gun variants),
  `OH_NAZIM` (+lean/slump = head toward the table), `OH_SAM`, `OH_GERALD`,
  `OH_CUSTOMER` (palette variety kept, 'x' pupil key added). Waiter and
  ghost still on the old sheets (ARC-12 gap).
- `game.js`: `facing` on every entity from `faceToward(e, dx, dy)` (dominant
  axis, 1.15 dead-zone, keeps last); player from input, hunter from his
  direction/look, walk-ins from their step, seated from `seatFacing(seat)`
  (s→up, n→down, w→right, e→left); Nazim faces his wander then the table.
  `spriteForEntity` resolves `pose.facing` on `dirs` sets (2-step walk,
  hunter always `gun*`, lean/slump); `drawEntity` never flips dir sets and
  draws a round contact shadow. Movement vectors untouched.
- Room re-projected: bar front 9→4 (side 2), tap fonts from above with a
  drip tray, `drawBottleRows` (bottles standing on the stem, glasses, ice
  bucket) replaces the gantry, hatch as heat-lamp bar + plates + board,
  tables front 3 with no legs, chairs cushion + thin far-side rail, benches
  thin back, pendants drawn as green shade discs over their pools (no cone,
  no cord), station plaques small brass at the counter's left/top end.
- Evidence: `assets/gameplay.png` (natural frame, camera −60,80),
  scratchpad `review/sheet-overhead*.png` (cast at 6×). Smoke passes.
  Colliders/routes/hitboxes unchanged (smoke's 40 routes).

### P1/P2 evidence — render metrics and the raster asset registry (ARC-02/03/04/05/14)

- Units (P1, ARC-02): the one transform stays `ctx.setTransform(ART_SCALE)`;
  raster frames draw via `drawRasterFrame(frame, wx, wy)`: source rect in
  image pixels, destination = pixels ÷ `authoredPixelsPerWorldUnit` in world
  units, pivot at the entity's feet, origin snapped to the backing grid like
  every procedural sprite. Nothing in the render path writes simulation
  state (ARC-03: `rasterFrameFor`/`drawRasterFrame` are pure reads).
- `src/assets.js` (P2): `Assets` registry — schema v1 per the pack's
  vocabulary, `validate()` (finite/positive/integer/in-bounds/unique/known
  refs/durations/loop), intrinsic-size check, `Image.decode()`, states
  unloaded/loading/ready/failed(reason), generation token (`reset()` on
  restart drops stale completions), in-flight dedupe, bounded log, optional
  `assets/sprites/manifest.json`, per-family fallback (`hasFamily`) to the
  procedural sets. Loaded in `index.html` before `game.js`; startup calls
  `loadManifest` only when `fetch`/`Image` exist. Walk-ins stay procedural
  (per-entity palettes).
- `tools/export-sheets.js`: renders the directional sets from the live game
  into `assets/sprites/{doe,hunter,nazim,sam,gerald}.png+json` + manifest
  (24/24/20/12/12 frames, 40×44 cells, pivot (20,44), density 2, 140 ms
  walk steps). Replacing a PNG with a cleaned sheet of the same layout is
  the production path.
- Tests: `node tests/assets.js` (31 checks: validator cases, dedupe, five
  failure kinds, stale generation, manifest) and the smoke test's raster
  section (ready atlas draws, missing family falls back). Browser: all five
  atlases report `ready`; frame work median 2.7 ms / p95 10.6 ms (baseline
  1.9–3.0 / 7.6–10.6).

### P4 evidence — full cast on the overhead camera (ARC-11, ARC-12)

- Waiter: `OH_WAITER` (tee, apron chest, glasses) with a `spray` prop
  variant; `poseBase` maps spray/sprayB → `spray.<facing>`, the squeeze is a
  half-unit lift; nozzle offsets unchanged (bottle nozzle sits at +8/−6).
  Ghost: `OH_GHOST` overhead blob (alpha, outside palette policy by design).
  Walk-ins: `OH_CUSTOMER.variants` = hair / flat cap / round cap chosen per
  spawn (`c.look`), on top of the six palette looks; `spriteSetFor(e)`.
- Atlases re-exported with the waiter (6 families). Smoke + assets tests
  pass. Remaining art gap: order icons and the carried-pint attachment are
  unchanged (already on the backing grid); regulars' blush is invisible from
  above by design (they face the table).

### P5/P6/P7 evidence — reactions, shell, integration (ARC-08/09/10/13/14)

- P5 (ARC-09): `REACTIONS`/`react`/`tickReactions`/`squashFor` — hit
  (0.32 s recoil squash, rides the existing `HIT_STOP`, no second freeze),
  serve (0.26 s lift on `completeDelivery`), spotted (0.22 s stretch on
  `hunterNoticesPlayer`); hunter's pint drawn from the existing `drinking`
  state. Feet-anchored scale in `drawSprite`/`drawRasterFrame`; a hit
  outranks a celebration; cleared by `resetGame`; suppressed under
  reduced-motion. Smoke: a delivery starts `serve` without moving the
  player, hit outranks serve, restart clears. Perfect-service, hunter damage,
  fatigue, knockback: deliberately not added (no such mechanics).
- P5 lighting (ARC-08): unchanged from the 20:10 tone-down (pools 0.26, hot
  cores 0.16, cones removed with the overhead pendants); shade discs add a
  0.16 additive square only. Dark/busy readability: review frame + mobile
  capture (both leads readable between pools via outline + halo 0.14/0.1).
- P6 (ARC-10): HUD inventory unchanged (shift, tips/target, total, clock,
  pints); tickets compact/urgent/carried; station plaques small brass;
  shell scanlines 0.12→0.05. Touch/desktop captures in scratchpad `shots/`.
- P7 (ARC-13/14): perf after everything — median 1.9–3.1 ms, p95 7.4–12.6 ms
  (baseline 1.9–3.0 / 7.6–10.6; same scenario, 600 frames, 1280×720 @4×,
  shift-6 crowd, hunter chasing). Tests: `node tests/smoke.js` and
  `node tests/assets.js` pass; `git diff --check` clean. Docs: CLAUDE.md
  §3/§4/§10/§12, art-direction README status, README test note,
  `assets/gameplay.png` = current natural frame.

### 17:05 — pushed and previewed

- Branch at `f45c112`, in sync with origin. Preview
  <https://lepub-373i6kp3n-maisoncastros-projects.vercel.app>; summary posted on
  PR #3.

### Remaining gaps (honest list)

- Production art: every atlas in `assets/sprites/` is the *generated*
  overhead art exported as PNG. Hand-cleaned sheets (from the pack's
  references, cleaned in Aseprite to the contract) are still to be made;
  they replace the files one-for-one, same layout (40×44 cells, pivot
  (20,44), density 2) or any layout the JSON describes.
- Floor/walls are still procedural boards; a painted tile set is the next
  material step. No rain on the windows. Order icons unchanged.
- Nazim's blush/eye stage cues are invisible from above while he faces the
  table (lean/slump/sway carry his state instead).
- Marker placement does not yet reserve the touch-control corners.
- Second room: needs the layout data-file refactor described on 09-15.

### Plan for this session

P1 metrics doc + raster frame draw; P2 `src/assets.js` (PNG+JSON v1 per the
pack's vocabulary, validation, decode, fallback, tests); P3 overhead Doe +
hunter + overhead furniture/lamp/counter-props proof at native size; P4 cast;
P5 reactions on existing events; P6 UI (tiny station plaques, scanlines
down); P7 perf/docs/captures/push.

## START HERE (2026-09-15 20:55) — next session begins with an asset ZIP

State: branch `feat/regulars-responsive-pixel-polish` at `f558490`, in sync with
origin, 20+ commits ahead of `main`; PR #3 is a draft with every step
commented. Latest preview: <https://lepub-1c2rh2lms-maisoncastros-projects.vercel.app>
(Vercel login). `node tests/smoke.js` passes. Nothing uncommitted.

What shipped this session: pub-material UI; the ten design changes
(stations, tips, tray, hunter states + A*, buy-him-a-pint, Nazim's
consequences, the round, timed shifts + tally, juice); night lighting;
three-quarter furniture; the cast at backing resolution; perimeter props.
Read the checkpoints below (newest first *within* the 16:58 section) for
details.

**The user will post a ZIP of GPT-generated art** (room painting and/or
furniture pieces, character sheets) made from `docs/ART-PLAN.md` and
`assets/art-direction/floor-plan.png`, and later a **second room layout**.
Do this, in order:

1. Unzip to the scratchpad; inventory every file (sizes, transparency,
   frame rows). Compare against the spec tables in `docs/ART-PLAN.md` §2/§2b
   and write down the deltas — the zip wins, the spec bends.
2. Build `src/assets.js`: PNG + JSON frame maps, feet anchors, per-asset
   fallback to the existing procedural art. Raise the internal resolution to
   640×360 via a single `WORLD_SCALE` (see ART-PLAN §1). Keep colliders,
   routes and every gameplay number identical in feel.
3. Turn the room literals (`BAR_SEGMENTS`, `TABLES`, `BENCHES`, lamps,
   props, door) into a room definition so the second layout is a data file;
   render its plan with scratchpad `render-plan.js` (copy lives in this
   ledger's history if the scratchpad is gone: it reads `__debug` and draws
   the plan on a canvas at 4 px/unit).
4. Wire the Doe sheet first (style sample), capture, compare with the
   reference, then the rest. Checkpoint here after each asset lands.

Do not change `assets/art-direction/floor-plan.png` — the user approved it.

## 2026-09-15 16:58 America/Toronto — session resumed in Claude Code; UI rehaul started

### Context recovered after the Codex session was cut off

- Branch `feat/regulars-responsive-pixel-polish`, HEAD `32a1fef`, in sync with
  its upstream; PR #3 is still a draft with the rejected first preview.
- The 23:22 high-density renderer/furniture work is still present as
  uncommitted changes (`game.js`, `src/scenery.js`, `src/sprites.js`,
  `tests/smoke.js`, docs, `assets/gameplay.png`). `node tests/smoke.js`
  passes on this tree, so it is a safe base to build on.

### Direction in force for this session

- User request: a complete rehaul of the *UI* so it matches the cinematic
  warm-pub look of the sprites and room (see
  `assets/art-direction/README.md`, acceptance item 6).
- Scope: in-canvas HUD, order tickets, dialogue placards, caught and level
  splash plates, floating text; plus the DOM shell — corner chips, start/help
  overlay, restart button, touch stick/action button, letterbox surround.
- Material language: dark walnut boards, brass rivets/trim, parchment paper,
  burgundy leather, amber lamp glow. Crisp stepped pixels, no rounded modern
  cards, no blurred glass.
- Keep gameplay geometry, routes, hitboxes, and all input funnels unchanged.
- Python is not on this machine's PATH; use `node` for scripts and
  `npx serve`/Edge for browser checks.

### 20:50 — direction: plan approved as-is; a second room and an asset zip are coming

- User: "That floor plan is excellent. Keep it that way." — do not change
  `assets/art-direction/floor-plan.png` or the layout it describes.
- A **second room with a different layout** will be shown later, and a
  **zip of GPT-generated assets** (room + characters) that I must match the
  game to. Implications for the asset work when it starts:
  1. Rooms become data: one definition per room (furniture, stations, seats,
     lamps, props, door, walls) instead of the literals in `game.js`, so a
     second layout is a file, not a fork. Re-run scratchpad `render-plan.js`
     per room to give the artist its plan.
  2. The loader (`src/assets.js`) should read whatever the zip contains —
     inspect it first, then write the JSON frame maps around the actual
     sheets rather than the spec's ideal; clean up in Aseprite where needed.
  3. Keep procedural art as the fallback per asset so partial zips still run.
- Nothing to build until the zip arrives. Branch in sync at `6afdbae`.

### 20:40 — floor plan for the art prompts

- `assets/art-direction/floor-plan.png` + `.json`: the room as the game
  plays it, rendered from `BAR_SEGMENTS`/`TABLES`/`BENCHES`/`SEATS`/lamps
  by scratchpad `render-plan.js` (re-run it after any layout edit).
  `docs/ART-PLAN.md` §2b: piece table with positions and art sizes at
  640×360, the GPT room prompt (attach reference + plan), the character
  sheet prompt guidance. User is generating sprites with GPT.

### 20:25 — art plan committed; user closing laptop

- `docs/ART-PLAN.md`: the asset-pipeline plan (loader + JSON frames, 640×360
  internal resolution with a one-place `WORLD_SCALE`, painted room over the
  architectural plan, camera stays three-quarter top-down), the full art spec
  (palette table, 64×64 character frames at 48 px, furniture sizes, tiles),
  three production routes (commission / AI with style reference + Aseprite
  clean-up / hand trace), tools (Midjourney --sref/--cref, ChatGPT image,
  PixelLab, Retro Diffusion, Scenario, Aseprite), the reusable prompt with
  per-subject lines, acceptance checks, order of work.
- Posted as a PR #3 comment with a link to the file.
- Nothing else in flight. Next session: if the user says go — write
  `assets/art-direction/lepub.gpl`, then `src/assets.js` loader + resolution
  change; keep procedural art as fallback so every sheet is optional.

### 20:10 — light toned down ("relatively blinding")

- Pools 0.55→0.26, hot core 0.5→0.16, streaks 0.42→0.2, cones 0.045→0.018,
  counter glows 0.16→0.07, candles 0.5→0.24, fire 0.5→0.26, halos 0.3/0.22
  → 0.14/0.1, gantry/hatch lamp washes ~÷2.5, `DARK_SCENE` lightened to
  #aea3a6 so figures read without a pool. `assets/gameplay.png` refreshed.
- User also asked whether the pixel art can be "100% accurate like the
  reference": answered that procedural code art can't match a painted 3/4
  concept; the route is raster assets (sprite sheets + tiles) generated or
  commissioned to match the reference, loaded by a new asset pipeline.
  Awaiting their choice (assets pipeline vs higher internal resolution).

### 19:55 — pushed, previewed, review page updated

- Branch at `4db06bd`, in sync. Preview <https://lepub-5as0nhdru-maisoncastros-projects.vercel.app>
  (`dpl_ArMtvLgixTnhFaW9pwx4XQY3HQnf`), posted on PR #3. Review page
  (reference / before / now, cast sheets) republished at the same URL.
- Waiting on the user's verdict and the architectural plan.

### 19:45 — visual pass 3: perimeter props, fireplace light, compact tickets; docs; deploying

- `drawWallProps(ctx)` at the end of `drawArchitecture`: stone fireplace
  with embers/mantel in the bar pocket (`FIREPLACE` {0,116,14,34}), stag
  trophy at x 116 on the rear wall, string lights on the crown rail, coat
  stand (12,336), barrel (186,334), three palms on the side walls. The fire
  is a breathing `FIRE_RGB` pool + hot core in `drawFloorLight`.
- Order tickets are compact (pad 1) unless patience < 40% or carried.
- `assets/gameplay.png` = natural review frame. `CLAUDE.md` §3 (sprite
  pipeline: `lightSprite`, HD sheets) and §12 (render order with the two
  darkness steps, props, seven lamps) rewritten; art-direction README has a
  status block (todo: waiter/ghost HD, walk-in variety, window rain, real
  back-bar after the plan).
- Smoke passes; Edge captures clean (desktop start/play/tally/caught,
  mobile play/caught).

### 19:20 — visual pass 2: the whole cast re-authored at backing resolution

- `src/sprites.js`: `lightSprite(rows, ramps, w, h)` — literal-row sheets at
  `pixelSize 0.5` with directional (top-left) shading derived per material;
  `patchRow` for pose variants. Doe 32×40 (idle/walk; carry/carryWalk 36
  wide with `anchorX` 8 and the pint held out), hunter 32×40 (+shotgun,
  36 wide), Nazim/Sam/Gerald 28×32 (blink/talk patches; Nazim lean/slump drop
  the head 2/4 rows with 'v' eyes; 'r' cheeks and 'w' eyes kept so
  `NAZIM_STAGE_PALETTES` still works), walk-ins 28×26 (palette variety as
  before; `makeCustomerPalette` gained i/w/b). `SPRITES.{doe,hunter,nazim,
  sam,gerald,customer}` point at the HD sets; the coarse rows remain as
  reference. Hitboxes unchanged. Waiter and ghost still old-style.
- Tools: scratchpad `capture-sprites.js` renders any `kind:pose` at 6×;
  `validate-rows.js` checks widths.
- Smoke passes; review frame shows faces at play scale.
- Next: perimeter props (fireplace, deer head, coat rack, plants, barrel),
  ticket weight, then gameplay.png/docs/push/deploy.

### 18:45 — visual pass 1: darkness + additive light, 3/4 furniture (committed)

- User rejected the state as "still the old style"; executing the reference
  look now. Decision: drawing switches to three-quarter top-down (fronts on
  everything, characters facing camera) while colliders/routes/hitboxes stay.
- Render order now: room → `drawDarkness(DARK_FLOOR)` (multiply) → spills →
  y-sorted → `drawDarkness(DARK_SCENE)` → `drawFloorLight` (additive) →
  `drawForeground` → grade. Floor ends near-black between lamps; furniture
  and people take only the lighter step.
- Seven pendant lamps (`DECOR.lamps`, pool point + `LAMP_DROP` 26 above it):
  wide warm pool + hot core (`HOT_RGB`), long broken varnish streak, a
  stepped additive cone from the green enamel shade to the pool, big fixture
  with brass rim and bulb. Candle glows stronger; bottle light along every
  counter (`glowFor(18, HOT)` every 20 px); halos on Doe (r22) and hunter.
- Bar: 9 px panelled front with brass foot rail, side face on the stem;
  `drawTapRow` (brass fonts + handles) on the taps, `drawBottleGantry`
  (two lit shelves of bottles, hanging glasses, its own lamp) down the stem,
  `drawKitchenHatch` (heat lamp, plates) on the foot. Tables: 5–8 px fronts
  with panel slats and turned legs. Chairs: cushion + back rail placed away
  from the table (north behind, south in front, sides outside). Wall benches
  get a buttoned back. Night tint reduced (0.03–0.16), vignette 0.55.
- Smoke passes; review frame captured (scratchpad `review/review-frame.png`).
- Next: Doe + hunter re-authored at 32×36 backing pixels with faces; then
  regulars/customers; then perimeter props; then ticket weight.

### 18:20 — honest art-direction review published

- Branch already in sync with origin at the ledger commit; nothing new to
  push. Review page (reference vs current frame, 4x crops, six gaps, ranked
  next pass): <https://claude.ai/code/artifact/39030cca-bc0a-4f34-b45e-380df32ca476>
- Verdict: UI matches the reference's material language; room lighting,
  character resolution, furniture fronts, perimeter props and ticket weight
  do not. Proposed order: (1) lighting overhaul — darken the baked room,
  additive pendant cones/pools, specular streaks, lit bar/bottles, rim on
  leads; (2) Doe + hunter re-authored at 36–40 backing px with faces;
  (3) regulars + walk-ins likewise; (4) furniture front faces + back-bar
  (after the user's plan arrives); (5) perimeter props + fireplace;
  (6) compact tickets at rest.
- Capture tooling for review frames: scratchpad `capture-review.js`.
- Waiting on: user's go-ahead on that order, and the bar plan.

### 18:03 (wall clock; earlier stamps in this session were estimates) — pushed and previewed

- Branch at `302047f`, in sync with upstream, 11 commits ahead of
  `origin/main`. Preview: <https://lepub-ft9jl787e-maisoncastros-projects.vercel.app>
  (`dpl_DnwySQjAqqXZdhLYsJzbXBaB3AN2`); link posted on PR #3. Draft, not for
  merging. Native Vercel checks still need the repo owner to install the
  Vercel GitHub App (see 17:26).
- Waiting on: the user's real bar architectural plan for a layout pass.

### 19:35 — batch E (juice) done; docs updated; all ten recommendations in

- Hit-stop (`HIT_STOP` 0.08 s freeze) and the emptied HUD pint rocking with
  a splash (`pintKnockTimer`/`pintKnockIndex`).
- `drawDangerEdge()`: stepped red bands on the hunter's side while he
  chases within `DANGER_RANGE` 80, pulsing, stronger off camera; `step`
  footstep cue paced by distance (`hunterStepTimer`).
- The ghost passing within 14 px of a scanning/chasing hunter forces a 1.2 s
  `lost` with a "?!" placard, once per apparition (`ghost.spooked`);
  `hunterSpooked` lines.
- `CLAUDE.md` sections 6/7/9/10/11/15 and the debug table rewritten for
  stations, tray, tips, hunter states, footprint-aware A*, Nazim's
  consequences, the round, shifts. `README.md` how-to-play updated. Start
  overlay hint names the stations and the tray.
- Smoke: 8 scripts, loop, hunter, Nazim, round, spook, shifts, boards —
  passes repeatedly. Edge captures clean. `assets/gameplay.png` refreshed.
- Next: commit, push, redeploy preview, note on PR #3. Then wait for the
  user's real bar plan (layout pass: re-trace `BAR_SEGMENTS`/`TABLES`/
  `BENCHES`, remap `station` ids, re-run smoke for routes).

### 19:15 — batch D (shifts) done: timed shifts, last call, tally board

- Level is no longer derived from score: `getLevel()` returns `shift`, so
  losing tips never eases the room. A shift ends when `shiftTips` reaches
  `shiftTarget(n)` = 100 + 40(n−1), or — for shifts 1–5 (`SHIFT_TIMED_COUNT`)
  — when its 180 s clock runs out. Final 15 s = last call: bar bell (`bell`
  cue), `lastCall` lines, no new walk-ins, patience drains ×1.5
  (`patienceRate()`), HUD clock turns red and blinks under 5 s.
- `endShift()` snapshots `shiftTally` (tips/target/total/stats) and freezes
  the floor; `drawShiftTallyOverlay` replaces the level splash (title DONE
  or OVER, rows for served/forgotten/clutch/doubles/rounds/hits/best shift,
  "SPACE FOR SHIFT n" / "TAP FOR SHIFT n"). Space/E or the touch action
  calls `startNextShift()`. Shifts ≥ 6 are untimed (target only).
- All tips flow through `earnTips`/`loseTips` so `shiftStats` stays true;
  the HUD shows "TIPS shift/target" on the top line and "TOTAL n  m:ss" by
  the pints. `LEVEL_UP_SCORE`/`levelSplashTimer`/`splashLevel`/
  `highestLevelReached` are gone; `LevelDone.png` now backs the tally.
- Debug: `getShift`, `setShift`, `setShiftClock`, `endShift`,
  `startNextShift`. Smoke covers last-call arming and spawn gate, clock
  close, frozen floor, next shift's fresh target, and target close on an
  untimed shift. 6/6 runs pass; Edge clean (HUD at last call, tally).
- Next: batch E (juice) — off-camera hunter vignette pulse + footsteps,
  hit-stop + HUD pint knock, ghost shudders the hunter; then docs, push,
  redeploy.

### 18:55 — batch C (regulars) done: Nazim's night has consequences, the round

- Drunk/gone Nazim: order cooldown ×0.6 (`NAZIM_FAST_ORDER`), alcohol tips
  ×2 (`NAZIM_TIP_MULT`, "X2 +N" float). Gone: 50% a delivery knocks a pint
  (`addSpill`; `spills` slow player and hunter to 60% within 9 px for 25 s,
  drawn by `drawSpills` under the y-sorted pass; `spill` cue); every 12–20 s
  he gets up (`startNazimWander`/`updateNazimWander`: lean pose + sway,
  14 px/s to a spot near the booth, pause, back to his seat) and is a
  `dynamicBlockers` entry so `collidesAt` slides others round him.
- Entering `gone` sets `waterOwed`; his next order is `'water'` (new
  `ORDER_ICONS.water`, made at the taps, excluded from walk-in
  `ORDER_TYPES`); delivering it takes 2 drinks off (gone → drunk) with the
  `sobered` exchange instead of the thank-you. `waterOrdered` exchange from
  Gerald.
- The round: every 90–150 s when none of the three is mid-order,
  `tryCallRound` gives all three an order with 32 s patience; all three
  served inside 20 s pays `ROUND_BONUS` 25 (`noteRoundDelivery`), else
  `roundMissed`. Exchanges `roundCalled`/`roundDone`.
- Debug: `getSpills`, `getRound`, `callRound`, `startNazimWander`. Smoke
  covers double tip, water owed → ordered → sobers, wander out and back to
  the seat, and a full round. 6/6 runs pass; Edge clean.
- Next: batch D — shifts with a last-call rush and a tally board.

### 18:40 — batch B (hunter) done: states, A*, door arrival, buy him a pint

- `updateHunter()` state machine replaces the inline pursuit: `arriving`
  (hidden at the door 20 s first run / 8 s restart, then `hunterArrives`
  dialogue) → `scanning` (half-speed prowl to random clear spots, pause-and-
  look; sees the Doe inside a ±60° cone with clear LOS within 70+4/lvl px, or
  within 24 px regardless) → `chase` ("!" placard, whistle; A* route to the
  player recomputed every 1.5→0.8 s with half the old jitter on top; rub/
  slide kept as the safety net; trail lost after 4+0.5/lvl s out of sight)
  → `lost` ("?" 3 s) → scanning. Walking into him while he prowls counts as
  being spotted. Catch detection is gated off while arriving/drinking.
- Routing is footprint-aware: `footprintFor(kind, cell)`; `findBlockingObstacle`
  / `pointBlocked` / `cellCenter` / `computeCustomerPath` take an optional
  `fp`. `HUNTER_FOOTPRINT` uses a 4 px grid because the 8 px grid has no clear
  centre in the 15 px lane beside the bar stem. Customers unchanged.
- Serve the hunter: `hunter.isHunter`, shares the order shape; wants a
  `beer-blond` every 45–75 s (patience 25 s, no penalty); in the queue
  (`findOldestPendingOrder`), ticket framed tomato; `HUNTER_SERVE_RANGE` 26
  (catch radius is ~15); `hunterServed()` pays tip + 20 "ON THE HOUSE" and
  sits him out 8 s (`drinking`). `stillWantsOrder()` helper for retargeting.
- New sound cues `whistle`/`lost`; dialogue categories hunterArrives/
  hunterSpotted/hunterLost/hunterOrdered/hunterServed with lines for all
  three regulars (Nazim's stage-gated). Near-miss trigger gated to chase.
- Debug: `getHunterState`, `setHunterState`, `hunterCanSeePlayer`,
  `hunterWantsPint`. Smoke covers arrival, cone/LOS, chase route clear of
  furniture for his footprint, and the pint. 8/8 runs pass; Edge clean.
- Next: batch C — Nazim's stages with consequences (double tips, wander,
  spill, water from Gerald) and the round.

### 18:05 — batch A (loop) done: stations, tips, tray

- `BAR_STATIONS` (taps/shelf/hatch → order types) and a `station` on each
  `BAR_SEGMENTS` entry; `nearestBarSegment()` resolves the L's corner by
  distance; `findOldestPendingOrder(types)` filters by station; a
  wrong-station press floats "SHELF >" toward the right counter.
  `drawStationTag` paints a parchment label on each counter.
- `deliveryTip()`: 10 + round(10 × patience fraction), +5 CLUTCH under 20%.
- `player.carrying` → `player.tray` (max `TRAY_MAX` 2); full tray sets speed
  `TRAY_SPEED` 54; `doubleArmed`/`doubleHitFree` pay `DOUBLE_BONUS` 10 when
  both land unhit (a hit or a dropped order cancels it). `canDeliverTo()`
  extracted; interact tries delivery first, then pickup.
- Smoke test covers the loop end to end (station refusal, two pickups, speed
  54/62, both deliveries, double). Passes. Edge capture clean.
- Next: batch B — hunter states (scan/chase/lost), A* pursuit, late entry
  through the door, serve-the-hunter.

### 17:40 — design pass approved; implementation starting

- `git fetch`: branch is 6 ahead / 0 behind `origin/main` — nothing to merge.
- User approved the full design review. Direction in force, in this order:
  1. Station pickup: each `BAR_SEGMENTS` rect serves a group of order types;
     interact at a station grabs the oldest order of that group.
  2. Speed-scaled tips: 10 + round(10 × patience fraction), "CLUTCH +5"
     under 20% patience.
  3. Tray: carry two, speed 62→54, "DOUBLE" bonus if both land unhit.
  4. Hunter states: scanning (cone + line of sight) → chase ("!" + whistle)
     → lost (3 s). 5. Serve the hunter: periodic order; delivery seats him
     8 s. 6. Hunter A* pursuit (recomputed ~1.5 s) under the jitter layer.
  7. Nazim stages matter: drunk = faster orders/double tips; gone = wanders
     the booth lane + spill puddles; Gerald orders water (non-alcohol, drops
     a stage). 8. The round: all three regulars order together, 20 s bonus.
  9. Shifts end: 100 tips or 3 min, 15 s last-call rush, tally board;
     endless after shift 5. 10. Hunter enters via DOOR after 20 s.
  Juice: off-camera hunter vignette pulse + footsteps, hit-stop + HUD pint
  knock, ghost shudders the hunter.
- User will send the bar's real architectural plan; expect a layout pass
  afterwards. Build station pickup against `BAR_SEGMENTS` data so a remap is
  a one-line change.

### 17:26 — why PR #3 gets no Vercel check (blocked on repo owner)

- Diagnosis: Vercel project `lepub` (`prj_6vjBFT18p2WKio9SJNGZiIpEtU3M`, team
  `maisoncastros-projects`, Hobby) has **no Git connection**. It was created
  by a CLI `vercel deploy`, and `get_git_deployment_context` lists every
  linked project on the team — all `maisoncastro/*` repos — and `lepub` is
  not among them. So Vercel never sees pushes/PRs on `S-Belanger/LePub`.
- `vercel git connect --yes` fails: "Failed to connect S-Belanger/LePub to
  project". The repo is owned by the personal account `S-Belanger`;
  `maisoncastro` has push but not admin. The Vercel GitHub App must be
  installed on the repo owner's account with access to LePub, which only
  S-Belanger can do.
- Unblock: S-Belanger installs <https://github.com/apps/vercel> on their
  account, granting access to `LePub`; then run `vercel git connect` from
  this checkout (linked `.vercel/project.json` already points at `lepub`).
  After that every push/PR gets the native Vercel check + preview.
- Caveat on Hobby: commits authored by S-Belanger will be skipped with
  "Git author must have access to the project on Vercel" unless the project
  moves to a team they're a member of (Pro). maisoncastro's commits deploy.
- Fallback if they'd rather not install the app: a GitHub Actions workflow
  running `vercel deploy` needs `VERCEL_TOKEN` as a repo secret — also
  admin-only, so it's the same ask.
- Until then, previews are made manually with `vercel deploy --yes` and the
  URL posted on the PR (see 17:18).

### 17:18 — committed, pushed, new preview deployed

- Committed the whole tree (Codex renderer milestone + UI rehaul) as
  `fa51bdf` and pushed; branch is in sync with its upstream. Only this
  ledger entry is uncommitted after it.
- GitHub still reports no Vercel check on PR #3, so a non-production preview
  was made from the linked project: <https://lepub-8gdszbpj1-maisoncastros-projects.vercel.app>
  (inspector: <https://vercel.com/maisoncastros-projects/lepub/5tha4DBDQVGXNzEaN36ddfJ7Yezj>,
  `dpl_5tha4DBDQVGXNzEaN36ddfJ7Yezj`). Deployment Protection remains on.
  The first `vercel deploy` returned "Not authorized"; the retry succeeded.
- Preview link posted on PR #3. PR stays a draft pending the user's review.
- Next: collect the user's feedback on the hosted build.

### 17:12 — UI rehaul complete and browser-validated (now committed in fa51bdf)

- DOM shell rebuilt in `style.css`/`index.html` on the same walnut/brass/
  parchment/leather palette as the canvas kit: wainscot letterbox with one
  amber lamp, brass-and-walnut canvas frame, `chip board` corner plaques
  (gradient-drawn fullscreen brackets, red strike when muted), the start
  panel as a riveted hanging sign (`panel board riveted` + `.panel-scroll`
  so the `::before/::after` chains aren't clipped), a parchment `.keys` menu
  card with brass keycaps, burgundy-leather `.primary` buttons, beer-mat
  stick with brass knob, leather-and-brass action button.
- `#top-bar` z-index raised above the overlay (45 > 40): previously SFX and
  fullscreen were unreachable while paused and `?` could not close the
  overlay it opened.
- No JS bindings changed: every id/class `game.js` reads is untouched.
- Validation: `node --check` on all scripts; `node tests/smoke.js` 5/5 runs
  (now also renders HUD/level/caught/ledger boards); `git diff --check`
  clean; headless Edge at 1280x720 and 390x844 touch — Press Start 2P
  confirmed loaded via `document.fonts.check`, zero console/page/request/
  HTTP errors. Captures reviewed: start sign, gameplay HUD + tickets +
  placards, level board, caught board with name field and ledger, chips
  hover/muted, mobile play/caught.
- Capture tooling: `%TEMP%claude...scratchpadcapture.js` (node static
  server + playwright-core from the npx cache driving Edge via
  `channel: 'msedge'`). Shots under the same scratchpad `shots/`.
- `assets/gameplay.png` replaced with the new desktop gameplay capture.
- `CLAUDE.md` updated: pixelfont scale, render passes 7/9/10, material kit,
  page-shell section.
- Not committed or pushed. Next: user reviews; then commit the whole tree
  (Codex renderer milestone + this UI pass), push, and redeploy the PR #3
  preview.

### 17:05 — canvas UI implemented (uncommitted)

- Normalized the Codex-era mixed CRLF/LF back to LF in `game.js`,
  `src/scenery.js`, `src/sprites.js`, `style.css`, `index.html`,
  `CLAUDE.md` (HEAD is pure LF; `core.autocrlf=true` would do this on commit
  anyway). No content changed by that step.
- `src/pixelfont.js`: `fontDrawText`/`fontDrawTextShadow` take an optional
  integer `scale` so boards can have real pixel-font headlines.
- `game.js`: added a `UI` material palette and painters —
  `fillClipped`, `drawRivet`, `drawWalnutPlate` (bevel, grain, rivets,
  optional brass rails and hanging chains), `drawParchmentPlate` (aged
  edges, stitched top), `drawPlateTail`, `drawBrassRule`,
  `drawSplashImage`, `drawCenteredText`.
- HUD is now a walnut sign hung on two brass chains: SHIFT/TIPS labels in dim
  cream with values in cream/amber, and life as three pint glasses
  (`drawPint`, `PINT_*` constants) that drain from the top and refill.
  `hudRect` now starts at (3,0) and includes the chains.
- Order tickets and dialogue placards paint through `drawParchmentPlate`;
  the patience bar is a brass-capped gauge. Semantic frame colours unchanged.
- Caught screen: walnut board with brass rails, 3x pixel-font "CAUGHT!",
  SHIFT/TIPS summary, restart prompt (keyboard vs touch wording), "BEST TIPS"
  ledger with flanking brass rules, name entry as an ink-on-parchment field,
  and the caught quip on a parchment note in the speaker's accent. The
  `16px monospace` `fillText` is gone.
- Level splash: walnut board, 2x "SHIFT N DONE", "LAST CALL - SHIFT N+1
  STARTS NOW".
- `tests/smoke.js` now also renders the HUD at score 240 / half life, the
  level-done board, the caught board with the name field open, and the ledger
  after filing. `node tests/smoke.js` passes.
- Not yet browser-captured. Next: DOM shell (`style.css`, `index.html`), then
  Edge captures of start overlay, gameplay HUD, caught and level boards.

### Next concrete step (original plan)

- Implement canvas UI first (`game.js`, small `fontDrawText` scale support in
  `src/pixelfont.js`), then the DOM shell (`style.css`, `index.html`), run
  `node tests/smoke.js`, capture Edge screenshots, checkpoint here again.

## 2026-09-14 23:22 America/Toronto — high-density renderer/furniture milestone captured

### Implemented since rejection

- Added `ART_SCALE = 2`: gameplay remains in the original logical world while
  the canvas backing store now has two authored pixels per logical unit.
- Decoupled every entity's collision box from sprite sheet dimensions, so art
  resolution and silhouettes can change without changing routes/catch range.
- Added half-unit sprite rendering and generated genuinely denser character
  sheets with refined diagonal contours, fabric/hair shading, and material
  ramps at the same on-screen footprint.
- Refined every order icon onto the same dense backing grid.
- Replaced the giant 16px floor grid with deterministic 6px walnut boards,
  varied 23–46px lengths, half-pixel seams, scratches, knots, and highlights.
- Rebuilt rugs with fine woven borders, repeated medallions, and uneven fringe.
- Expanded the rear wall into raised timber panels with carved rails, larger
  rainy city windows, fine mullions/rain, side-wall panels, portraits, brass
  sconces, and a layered front doorway.
- Rebuilt counters with orientation-aware worktops/front faces, panel slats,
  grain, edge bevels, brass foot rails, and denser detailed bottles/taps/glass.
- Rebuilt chairs, benches, and tables with legs, backs, cushions, tufting,
  clipped silhouettes, deep front lips, narrow wood boards, and fine grain.
- Expanded deterministic table clutter to include mugs, candles, bottles,
  plates, menus, glasses, and coasters; candles now contribute local light.
- Added broken varnish reflections beneath hanging lamps and rebuilt the HUD
  as a clipped walnut/brass pub sign using `SHIFT` and `TIPS` language.

### Validation and honest visual assessment

- `node --check` passes for `game.js` and every `src/*.js` file.
- `node tests/smoke.js` passes all scripts, 40 customer routes in/out, three
  regulars, waiter visit, palette coverage, and render pass.
- `git diff --check` has no whitespace errors (Windows line-ending warnings
  only).
- Real Edge capture at 1280x720 uses a 640x360 backing canvas displayed at
  1280x720; no console/page/request/HTTP errors were observed.
- Temporary capture: `%TEMP%/lepub-rebuild-checkpoint.png`.
- The capture is materially different from the rejected build: board scale,
  architecture, furniture depth, rug weave, prop density, and pixel density
  all changed. It is closer to the reference, but this is an intermediate
  comparison—not yet the updated PR/Vercel preview or a completion claim.

### Current files / next step

- Modified, uncommitted: `HANDOFF.md`, `game.js`, `src/scenery.js`,
  `src/sprites.js`, and `tests/smoke.js`.
- Branch remains at pushed commit `32a1fef`; `origin/main` has not changed.
- Next: improve illustrated character presentation, side/back-bar clutter,
  and DOM overlay/touch UI; then capture desktop and full-room portrait,
  update `assets/gameplay.png`, test repeatedly, commit, push, and redeploy the
  draft PR preview.

## 2026-09-14 23:12 America/Toronto — first preview rejected; full visual rebuild started

### User feedback / corrected acceptance bar

- The user correctly rejected the first preview: it still looks like the old
  game with a palette/decor pass, rather than like
  `warm-overhead-pub-reference.png`.
- Treat the visual work in commits `8f7cc5a` through `32a1fef` as a foundation,
  not an accepted art-direction result.
- The next pass must materially change authored pixels and proportions: higher
  sprite detail at the same on-screen footprint, narrow floorboards,
  dimensional furniture, recognizable chair/stool silhouettes, dense
  tabletop/bar props, layered wall decor, localized warm reflections, and an
  illustrated in-world UI.
- Preserve the straight-overhead camera, collision geometry, routes, and
  playability. Do not copy the reference's literal isometric projection.

### Concrete visual diagnosis from side-by-side review

- Current floor uses giant 16px tile/plank blocks; the reference uses much
  narrower boards with frequent seams, grain, knots, and reflected lamplight.
- Current tables/bar are flat rectangular slabs; the reference has bevels,
  deep front faces, wood trim, legs, stools, glassware, candles, and clutter.
- Current characters are visibly 14–21 authored pixels wide with flat block
  anatomy; the reference has roughly 2–3x the internal contour/fabric/face
  detail at a comparable on-screen footprint.
- Current room is uniformly bright and sparse; the reference is built from
  dark walnut architecture, concentrated amber pools, cool rainy windows,
  framed wall layers, and dense edge detail.
- Current HUD is still a generic score strip; it needs to feel like a physical
  pub sign/ledger while remaining compact enough for gameplay.

### Repository state and next implementation step

- Branch `feat/regulars-responsive-pixel-polish` is clean at `32a1fef`, fully
  synchronized with its upstream and three commits ahead of `origin/main`.
- A fresh fetch found no new collaborator commits on `origin/main`.
- PR #3 remains a draft; the existing Vercel preview shows the rejected pass.
- Next: introduce a 2x internal art backing scale, decouple visual sprite
  resolution from collision boxes, rebuild the static room renderer and
  furniture, then capture/compare before updating the preview.

## 2026-09-14 23:06 America/Toronto — protected Vercel preview ready

### Preview links and state

- PR #3 is now a **draft**, matching the explicit in-PR direction not to merge
  while visual work continues: <https://github.com/S-Belanger/LePub/pull/3>
- GitHub's Vercel integration did not report a check or deployment, so the
  already-linked local Vercel project was used to create a non-production
  preview of commit `0fc3a32`.
- Preview: <https://lepub-8oxma8m00-maisoncastros-projects.vercel.app>
- Vercel inspector:
  <https://vercel.com/maisoncastros-projects/lepub/6qN2xoFcJjLyBUxHFML9tP2MCxEB>
- Deployment ID: `dpl_6qN2xoFcJjLyBUxHFML9tP2MCxEB`; Vercel reported
  `READY` with a non-production target.
- Deployment Protection is enabled. An anonymous Edge session reaches the
  Vercel login screen; the authenticated `vercel curl` check returns
  `Le Pub: The Chase` and confirms the game canvas is present. The user should
  sign into the project account when opening the preview.
- The preview URL and protection note were also posted on PR #3.

### Handoff state

- The complete visual/gameplay change and prior publish ledger are committed
  and pushed. This final deployment checkpoint is the only subsequent local
  change and should be committed/pushed as a docs-only update.
- Do not merge the draft PR until the user approves the hosted visuals.
- Continue to treat the redesign as reviewable/in progress rather than final;
  use feedback from this preview for the next polish pass.

## 2026-09-14 23:04 America/Toronto — preview PR opened

### Published state

- Committed the complete art-direction, routing, test, and continuity pass as
  `8f7cc5a` (`feat: apply warm overhead pub art direction`).
- Pushed `feat/regulars-responsive-pixel-polish`; the local branch and
  `origin/feat/regulars-responsive-pixel-polish` are synchronized (`0 0`).
- Opened PR #3, **Warm overhead pub visual overhaul**, against `main`:
  <https://github.com/S-Belanger/LePub/pull/3>
- The branch is one commit ahead of `origin/main`, which remains at `e0a5b2e`.
- GitHub had not yet reported a Vercel check, deployment, or bot comment when
  this checkpoint was written. The PR was opened specifically to trigger the
  connected Vercel preview; check PR #3 for the preview URL/status.

### Validated contents of the PR

- Warm overhead environmental pass plus character, HUD, dialogue, and order
  bubble polish based on the supplied reference.
- Exact feet-aware route collision fix and viewport-safe bubble placement.
- `tests/smoke.js`, including all 40 customer routes in/out, regulars, waiter,
  render pass, and authored sprite-palette coverage.
- 20/20 randomized smoke passes plus clean desktop/mobile Edge sessions with
  no console, page, request, or HTTP errors.
- `AGENTS.md` and this ledger provide the interruption failsafe requested by
  the user.

### Remaining work / next action

- This is a visual review checkpoint, not a claim that the reference-level
  redesign is finally approved. Inspect the Vercel preview, collect the user's
  feedback, and continue refining density/materials/animation as needed.
- Commit and push this final ledger update so the remote branch itself contains
  the exact PR/publish state.

## 2026-09-14 23:02 America/Toronto — visual pass browser-validated, ready to publish

### Repository state

- Branch: `feat/regulars-responsive-pixel-polish`; HEAD is still `e0a5b2e`.
- A fresh `git fetch origin --prune` confirms `HEAD...origin/main` is `0 0`;
  no newer collaborator commit needs integration.
- All redesign, routing, documentation, reference, and test changes remain
  uncommitted at this checkpoint. The branch's previous PR (#2) is merged, so
  this work must be opened as a new PR after pushing new commits to the branch.

### Browser validation

- Served the repository locally and exercised the real app in headless Edge.
- Desktop: 1280x720 browser, 320x180 internal canvas at 4x integer scale.
- Mobile: 390x844 browser, 195x360 portrait canvas at 2x integer scale with
  touch UI enabled.
- Staged six seated patrons, multiple order types, regular orders/dialogue,
  score 24, and partial life to inspect the busiest gameplay presentation.
- Both viewports loaded with zero console errors, page errors, failed requests,
  or HTTP responses >= 400.
- Visual review confirmed the overhead routes remain legible, player/Hunter
  markers remain visible, dialogue stays in frame, and rear-seat order bubbles
  are no longer cut off by the top edge/HUD.
- Temporary review images are outside the repository at
  `%TEMP%/lepub-review-desktop.png` and `%TEMP%/lepub-review-mobile.png`.

### Automated validation

- `node tests/smoke.js` passed 20/20 randomized runs.
- The smoke suite now also verifies that every authored sprite pixel resolves
  to a defined palette color.
- `git diff --check` reports no whitespace errors; its only output is the
  existing LF-to-CRLF warning on this Windows checkout.

### Next concrete action

- Stage and review the complete file list, commit the visual overhaul, push the
  feature branch, open a new PR against `main`, then record the commit and PR
  URL in a final handoff checkpoint.

## 2026-09-14 22:58 America/Toronto — character and gameplay-UI pass implemented

### Work completed in this milestone

- Re-authored the Doe and Hunter palettes/sprite pixels with warm outlines,
  highlights, shaded clothing, clearer face detail, and stronger signature
  props while preserving their idle sprite dimensions and gameplay hitboxes.
- Upgraded generic patrons from flat shirt fills to six coordinated
  highlight/base/shadow ramps plus hair, skin, and trouser shading.
- Added restrained broken-pixel ground markers for the player and Hunter so
  their roles remain readable in a crowded room without changing collision.
- Rebuilt order bubbles as larger clipped-corner paper placards with shadows,
  palette-based trim, top stitching, better carried-order emphasis, and
  in-palette patience meters.
- Added viewport/HUD/peer-bubble avoidance for order-bubble placement so rear
  booth orders no longer disappear above the camera or under the score plate.
- Integrated order-bubble bounds into dialogue layout, then restyled dialogue
  as matching clipped-corner paper placards.
- Restyled the compact HUD as a dark forest-green, brass-trimmed pub plate with
  clearer segmented life treatment.

### Validation so far

- `node tests/smoke.js` passes after this milestone.
- `git diff --check` reports no whitespace errors (only the repository's
  existing PowerShell line-ending notices).
- Browser comparison captures are the next action; this checkpoint records
  implementation only and is deliberately not a claim of visual completion.
- The user requested a PR for Vercel preview. After browser validation, commit
  the complete working tree, push `feat/regulars-responsive-pixel-polish`, and
  open a PR into `main`.

## 2026-09-14 22:55 America/Toronto — redesign explicitly remains in progress

### Status correction

- The user asked whether the visual upgrade was complete. It is not.
- The previous checkpoint describes a validated foundation/first environment
  pass, not final visual parity with the supplied reference.
- Do not describe the redesign as finished until browser captures demonstrate
  comparable richness, strong character silhouettes, cohesive lighting and
  materials, polished HUD/bubbles, and preserved overhead playability.
- Immediate next pass: character silhouettes and movement frames, followed by
  HUD/order/dialogue polish and new desktop/portrait comparison captures.
- Repository state is otherwise unchanged from the checkpoint below: HEAD is
  `e0a5b2e`, it matches `origin/main`, and all redesign work is uncommitted and
  unpushed.

## 2026-09-14 22:50 America/Toronto — overhead art-direction pass validated

### Repository state

- Working branch: `feat/regulars-responsive-pixel-polish`.
- HEAD: `e0a5b2e` (`feat: added Jay. Bug fix: customers getting stuck in the entrance`).
- `HEAD` matches `origin/main` (`0 0` from `git rev-list --left-right --count HEAD...origin/main`).
- Local `main` was fast-forwarded to `origin/main` at the same commit.
- The feature branch reports three commits ahead of its own upstream because
  those three commits came from `main`.
- Current work is uncommitted and has not been pushed.

### User direction now in force

- Use the warm, crowded night-pub image as the primary environmental art
  reference.
- Keep the game straight overhead, comparable to Overcooked or the earlier
  playable build. Do not convert gameplay to a literal isometric camera.
- Preserve clear routes, readable characters, order bubbles, and collision
  geometry while translating the reference's palette, materials, lighting,
  and decorative density.

### Work completed

- Fetched `origin` and synchronized the working branch and local `main` with
  collaborator changes from `origin/main`.
- Preserved the pre-existing palette work and supplied reference image through
  the synchronization.
- Found and fixed a routing regression introduced by the merged pathfinding:
  long diagonal route smoothing could shave through the lower corners of
  tables because it sampled only 24 points and inflated colliders symmetrically
  despite feet-anchored collision.
- Replaced sampled line collision with exact segment/AABB intersection.
- Added asymmetric path-footprint inflation, visible endpoint grid anchors,
  and collision validation for every A* edge.
- Added `tests/smoke.js`, a dependency-free mocked DOM/canvas runtime test.
- Added a favicon and removed the browser's missing-favicon request.
- Organized the primary visual reference under `assets/art-direction/` and
  documented how it should be interpreted.
- Implemented the first complete overhead environment pass:
  - honeyed plank floor and forest-green shadow palette;
  - patterned burgundy/green rugs beneath seating clusters;
  - richer outlined bar fronts, counter grain, brass trim, and glassware;
  - alternating burgundy and muted-blue chair upholstery;
  - rainy windows with tiny skyline lights;
  - hanging wall greenery;
  - stronger wood treatment on tables and benches;
  - warmer lamp pools, reduced night/vignette darkness, and a subtle player
    readability halo;
  - matching green/amber page shell, start panel, controls, and touch UI;
  - customer shirt colors and order-bubble frames aligned to the new palette.
- Replaced `assets/gameplay.png` with a staged browser capture of the new build.
- Updated `README.md` and `CLAUDE.md` with the selected direction, testing
  workflow, and implementation guardrails.

### Files currently changed or added

- `AGENTS.md` — continuity/checkpoint rules for future agents.
- `HANDOFF.md` — this durable session ledger.
- `CLAUDE.md` — art-direction guardrails, routing details, smoke-test guidance.
- `README.md` — selected-direction and test documentation.
- `game.js` — pathfinding fixes plus rugs, windows, plants, furniture detail,
  lighting, and palette-based bubble frames.
- `src/scenery.js` — selected warm pub palette and vignette color.
- `src/sprites.js` — customer clothing colors aligned with the room palette.
- `style.css` — green/amber/burgundy shell, overlay, and controls.
- `index.html` — SVG favicon reference.
- `assets/favicon.svg` — pixel beer favicon.
- `assets/art-direction/README.md` — reference interpretation rules.
- `assets/art-direction/warm-overhead-pub-reference.png` — selected visual reference.
- `assets/gameplay.png` — refreshed gameplay screenshot.
- `tests/smoke.js` — dependency-free runtime and routing smoke test.

### Validation completed

- `node --check game.js`: passed.
- `node --check` for every `src/*.js`: passed.
- `node --check tests/smoke.js`: passed.
- `node tests/smoke.js`: passed; loads all eight production scripts, tests all
  40 generic customer routes in and out, three regulars, Jay's full visit, and
  a render pass.
- Twenty randomized smoke-test runs passed after the routing fix; a later set
  of ten randomized runs also passed after the art changes.
- `git diff --check`: passed. PowerShell reports expected LF-to-CRLF warnings,
  but no whitespace errors.
- Real Microsoft Edge/Playwright validation passed at 1280x720 desktop and
  390x844 touch portrait.
- Desktop keyboard input moved the player; portrait selected a 195x360
  internal viewport at integer scale 2 and enabled touch controls.
- Browser console, page-error, request-failure, and required-asset checks were
  clean. The favicon returns HTTP 200/304.
- Desktop, top-room, bottom-room, and full portrait captures were visually
  inspected for readability.

### Remaining work / recommended next step

- Do a character-focused polish pass: strengthen the player and hunter
  silhouettes, check every regular/customer against rugs and lamp pools, and
  refine walk/spray animation readability without changing hitboxes.
- Then polish the HUD and order/dialogue bubbles, especially at the top edge
  and in the full-room portrait view.
- Re-run `node tests/smoke.js`, syntax checks, `git diff --check`, and real
  desktop/portrait browser captures after each pass.
- Review the complete diff with the user before committing or pushing.
