# Approved audit follow-up — October 10–11, 2026

The user authorized every audit recommendation and publication to `main`, then
confirmed no phone testing was available. The implementation preserves existing
speeds, patience, scoring, hitboxes and the original pub art. Physical-phone
performance and subjective human difficulty remain unverified.

| Recommendation | Delivered |
| --- | --- |
| Safe failed routes | Search returns an empty path; all seven follower roles retain destinations, wait and retry once per second. Newly added furniture/body blockers invalidate a leg before movement or arrival. Own-table/self exclusions survive retries. Smoke timeouts cancel in place. |
| Chase/balance review | Six controlled shifts1–3 keyboard/native-touch scenarios exercise loaded tray, haze, urgency/bathroom, Alex spill/lock/recovery/delivery and actual pursuit. A playable scenario page supports future human review. No arbitrary difficulty tuning. |
| Authored busboy | Thirteen production families now include20 complete busboy frames: four directions, idle, opposite strides, two mop phases. Existing outfit/body/cleanup timing preserved; ghost remains intentional procedural art. |
| Haze cost | Renderer crops to the visible scene, caches canvas/context/gradient, groups strips and caps them at64. Normal/reduced-motion haze and clear HUD/order bubbles are retained. Matched old/new benchmarks and a playable device meter are provided. |
| Runtime organization | Dependency-free `src/collision-routing.js`, `src/input.js` and `src/effects.js`; game state, NPC lifecycle, DOM events and scene rendering remain in `game.js`. Thirteen classic scripts, no build/install requirement. |

Independent review found a chase regression caused by the hunter's wider footprint
rejecting a legal Doe position at a counter edge. Chase now selects a reachable
approach within the existing catch radius when its endpoint is blocked to the
hunter. Every approach requires a clear physical connection and safe route;
permanent walls still produce no route. Two RED regressions became GREEN. A further
independent full-height-wall probe confirms no cross-wall approach.

## Evidence

- Eleven Node suites pass: character contract13families, assets31checks,
  smoke40shipped routes/full mechanics, Alex13gates, cellar, HUD4portrait sizes,
  collision13cases, effects6cases, routing31cases, input and haze renderer.
- Independent actual-caller probes: all40customer entries arrive within15simulation
  seconds;80waiter station/exit legs arrive, slowest8.98seconds.
- [Route recovery](routing/report.json): desktop/mobile failed search and newly
  blocked leg wait, then resume at the retained destination.
- [Busboy source/game review](../../art-review/busboy/README.md): real routed entry,
  mop phases, cleanup/exit/reset,16runtime mappings per viewport and fallback.
- [Balance report](balance/report.json): targets100/140/180; loaded speed54 versus
  hunter40/42.5/45. Alex recovery and two deliveries7.995–10.20simulation seconds,
  zero lost orders/hits in these controlled scenarios. A0.7second clear chase run
  gains separation. These are focused scenarios, not complete winning shifts.
- [Performance report](performance/report.json):300matched render submissions per
  scene/renderer and180actual game-loop submissions per scene, six desktop/mobile
  scenes. Initial flawed warmup/cloud measurements remain [separate](performance/report-initial.json).
- [Playable meter check](performance/playable-harness.json): actual10second native
  RAF meter, keyboard/touch/reset/comparison, no browser errors. Phone controls in
  the iframe require scrolling them into the outer viewport.
- [Original collision/effect/HUD evidence](README.md#evidence-and-reproduction),
  [exact session journal](../../collaboration/2026-10-10-collision-game-audit.md).

Rendering samples measure synchronous CPU/canvas submission, not GPU completion.
Final October11matched haze calls fall182→53 on mobile and92→43 on desktop.
Mobile haze median submission falls0.8→0.6ms, p951.5→1.1ms on this host;
live game-loop p95 across scenes is1.4–2.1ms. Normal matched measurements include
occasional55–90ms outliers, so these short samples do not establish sustained
performance or a universal speedup. The actual warmup-separated RAF samples
have no intervals over20ms here.
The headless Edge host refreshes around75Hz; reported RAF intervals are not a
phone/60fps guarantee. Live profiling explicitly anchors a controlled cloud to the
player to hold peak haze during actual updates/chase. Matched captures hold room,
viewport and wall time fixed. Native images preserve the cast, double image,
green wash and crisp HUD; no claim of pixel-identical haze motion is made.

## Repeatable checks

Run the eleven suites listed in the root README and CI. Browser commands:

```powershell
node tools/validate-collision.js docs/game-audit/2026-10-10
node tools/validate-effects.js docs/game-audit/2026-10-10/effects
node tools/validate-routing.js
node tools/validate-busboy.js
node tools/validate-art.js docs/game-audit/2026-10-10/full-cast
node tools/validate-hud.js docs/game-audit/2026-10-10/hud
node tools/validate-balance.js docs/game-audit/2026-10-10/balance
node tools/profile-game.js docs/game-audit/2026-10-10/performance
```

With the local server running, open [balance review](../../../tools/balance-review.html)
and [performance review](../../../tools/performance-review.html). On a future phone,
record model/browser, play each scene and save the10second report. Human review
should play complete shifts1–3 and assess sightlines, tray recovery and chase feel
before changing difficulty. Device absence does not establish target performance.

## Publication

Implementation and verification are recorded in the collaborator journal and
latest HANDOFF checkpoint. Publication receipts are appended after independently
checking the actual remote SHA, CI and live Git-blob equality; a push alone does
not establish deployment.

Implementation [`5460c5f`](https://github.com/S-Belanger/LePub/commit/5460c5f97b52847acde7f97f369f355c6d1d410b)
was pushed and independently remote-matched. Vercel deployment6998393060 is successful;
[production receipt](production-receipt.json) verifies34exact Git blobs,
3excluded private-image404s and desktop/mobile13readyatlases/176pose mappings with
zero errors. [Live desktop](live-desktop.png) and [live phone emulation](live-mobile.png)
were inspected.

The initial CI run failed one chase test that checked an unseeded final position
after3seconds of isolated pursuit. The hunter had reached catch range at0.35seconds
then drifted past the target because the fixture omitted normal hit handling.
Tests now stop at first contact, seed the jitter and check every step for collision;
the reviewer confirms both guards still fail when approach routing is disabled.
The runtime/art remain unchanged. Fresh11local suites pass; the follow-up CI result
will be recorded in the release journal and latest handoff.
