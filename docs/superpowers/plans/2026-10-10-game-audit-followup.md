# Gameplay audit follow-up implementation plan

> **For agentic workers:** Use focused implementation workers under the parallel-agent skill; parent integrates and verifies before publication. User explicitly authorized all audit recommendations and main push; no further design approval requested.

**Goal:** Complete the five audit recommendations as far as available hardware permits and publish tested work to main.

**Architecture:** Keep dependency-free classic browser scripts. Extract collision/routing, input and haze drawing into small focused modules with explicit dependencies; retain game state and compatibility wrappers in game.js. Route failures return no unsafe waypoint and callers wait/replan with bounded retry cadence.

**Tech stack:** Canvas/vanilla JavaScript, Node VM tests, local Edge/Playwright, built-in image generation.

**Spec:** Approved audit scope: [October 10 audit](../../game-audit/2026-10-10/README.md), user follow-up "Great do everything recommended then push to main". User confirms "No phone testing available now"; physical-phone performance is an explicit unavailable check.

## Global constraints

- Preserve all earlier uncommitted collision/effect/help/evidence work and original sprites/private photos.
- Physical world200x360, entity hitboxes, seat coordinates and scoring stay stable during extraction.
- Current illustrated camera/gaze/material/density21unit supporting people, four authored directions; no procedural art substitutions.
- Exact prompts/progress/checks/publication receipts journaled. Commit/push authorized main; verify independent remote SHA, CI and live deployment rather than infer them.
- No physical-device/human playtest claim from scripted simulation. Publish repeatable stress/playtest evidence and limits; no speed/patience retuning without evidence.

## Review focus

- Failed route remains safe when the obstacle is permanent, then resumes when removed.
- Obstacle added after planning causes wait/replan rather than collision traversal or false arrival.
- Serving/seated own-table exclusion survives route changes.
- Reset/resize/blur/pointer cancel and reduced motion survive module extraction.
- New busboy source includes opposite strides and distinct mop phases in every direction, readable at phone size.

## Tasks

### 1 — Route failure recovery and collision/routing extraction

- [ ] Reproduce full-height wall no-route and temporary blocker interruption with deterministic tests.
- [ ] Extract collision/path geometry into src/collision-routing.js; classic script dependency factory with runtime furniture/dynamic blocker refs, fixed world/hitboxes supplied. Public compatibility wrappers remain available.
- [ ] computeCustomerPath returns an empty path on failure. Every caller checks it before indexing; retry paths at most once per second; movement checks newly blocked legs and replans toward original destination. No-route cannot signal successful arrival.
- [ ] Implement shared routed-walk helper or equivalent caller logic for customer, waiter, hunter smoke, busboy, Alex, Nick and Nazim; existing visitor timeout cleanup remains bounded.
- [ ] Tests cover customer40routes, own-table exclusions, no-route retry/removed blocker/resume, every NPC role and reset. Parent adds new script to browser and VM script order.

### 2 — Effects/input extraction and performance

- [ ] Extract keyboard vector calculation and pointer-stick math into src/input.js, preserving held-input clearing and original bindings.
- [ ] Extract haze drawing into src/effects.js with supplied canvas/context/world dimensions/motion/time, reusing backing resources.
- [ ] Replace two-unit strip copies with a materially cheaper, visually equivalent bounded strip budget and cropped scene processing; retain crisp HUD/bubbles and calm reduced motion.
- [ ] Verify behavior tests and profile normal/active-haze/stress cases in desktop/phone emulation; report CPU submission/frame schedule separately from unavailable GPU/physicalphone cost.

### 3 — Busboy authored art

- [ ] Inspect actual Nick B/Jay/Doe/Hunter pixels plus existing busboy costume/props.
- [ ] Save exact prompt/provenance; generate transparent directional idle/walkA/walkB/mopA/mopB source using built-in imagegen.
- [ ] Declare family, measure rows/import single21unit density and pivots; remove busboy procedural exception; preserve mop phase animation and fallback.
- [ ] Actual browser entry/mop/departure/reset/fallback plus all cells/desktop/phone captures; required character-art/assets/smoke tests.

### 4 — Balance playtest and measurable release checks

- [ ] Build repeatable shifts1–3 scenarios with loaded tray/chair gaps/chase/haze/Alex/bathroom; keyboard/touch browser runs and pressure/path measurements. Human subjective feel remains explicitly untested without participant input.
- [ ] Run all existing and new Node suites, actual desktop/mobile art/collision/effects/HUD/busboy/profile checks; inspect images and evidence, fix regressions.
- [ ] Update help/README/visual standard/audit dispositions/architecture/CI/current handoff/journal. Preserve baseline/failed attempts.
- [ ] Review/stage only task files; commit/push main, independently verify remote/CI/current production and live exact source/asset matches; save publication receipts and final status.

## Coordination

Route worker owns game.js routing changes and collision-routing module/tests. Effects worker owns new input/effects modules/tests/tooling and provides parent integration instructions (does not edit game.js/index.html/smoke.js). Parent owns art/contract/import, index/VM integration, logs/docs and release. No workers commit or push.
