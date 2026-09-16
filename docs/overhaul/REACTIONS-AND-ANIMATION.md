# Reactions, emotions and animation handoff

> Current camera direction: read `00-CAMERA-DIRECTION.md` first. The user clarified that gameplay stays overhead. Earlier frontal character boards and the angled pub painting are identity/material references, not the final camera. Re-author poses and furniture at a consistent high overhead elevation.

## Status

The new boards contain 12 Doe key poses and 12 hunter key poses. They are expression and action references, not 12-frame animations. Each cell suggests a state or a key pose within a state. They share a four-column, three-row reading order, left to right and then downward.

These additional reactions are requested art concepts. They do not establish new scoring, damage, stun, hunter-service or movement rules. Trigger them from actual game events only after those events and their existing behavior are inspected. If a gameplay state does not exist, retain the pose as an optional visual proposal.

## Doe board

File: `doe/doe-reactions-and-hit-reference.png`.

| Cell | Proposed ID | Visual intent | Possible use |
| --- | --- | --- | --- |
| R1 C1 | `idle_neutral` | Relaxed body, calm face | Resting baseline |
| R1 C2 | `carry_focused` | Upright mug, attentive brow | Carrying an order |
| R1 C3 | `serve_perfect` | Extended upright pint, pleased smile | Confirmed excellent service, if such a result exists |
| R1 C4 | `success_proud` | Small smile and modest fist pump | Brief celebration after a successful result |
| R2 C1 | `spill_mistake` | Tipped mug, alarm, small spill | Existing spill/error event only |
| R2 C2 | `embarrassed` | Lowered head, hand to hood | Nonblocking acknowledgement of a mistake |
| R2 C3 | `danger_panic` | Wide eyes, lifted shoulders and hands | Nearby immediate threat |
| R2 C4 | `exhausted` | Forward slump, hands on knees | End-of-shift or optional fatigue presentation |
| R3 C1 | `hit_impact` | Torso recoil, bent elbows, closed eyes | Contact feedback |
| R3 C2 | `hit_stunned` | Dazed eyes and lowered posture | Brief post-impact visual hold |
| R3 C3 | `hit_stagger` | Recovery step, arms balancing | Regaining balance |
| R3 C4 | `hit_recover` | Stable feet, determined expression | Return toward normal pose |

The first eight cells are alternatives, not one timeline. Only the last row has an intended impact-to-recovery progression. The original ART-PLAN asks for one hit frame; a four-stage hit sequence is a proposed expansion.

## Hunter board

File: `hunter/hunter-reactions-reference.png`.

| Cell | Proposed ID | Visual intent | Possible use |
| --- | --- | --- | --- |
| R1 C1 | `idle_stern` | Neutral stern face | Idle baseline |
| R1 C2 | `scan` | Hand shading eyes, searching posture | Existing look-around state |
| R1 C3 | `suspicious` | Narrowed eyes, hand at beard | Suspicion transition if supported |
| R1 C4 | `spotted` | Alert face, pointing | Detecting Doe |
| R2 C1 | `chase` | Forward lean and running limbs | Chase pose reference |
| R2 C2 | `missed_catch` | Overreaching hand, off-balance stance | Failed catch feedback |
| R2 C3 | `startled` | Raised hands and shoulders | Surprise or ghost interaction if appropriate |
| R2 C4 | `hit_recoil` | Bent arms, body recoil | Optional impact response; not proof hunter takes damage |
| R3 C1 | `stunned` | Drooping posture and dazed eyes | Existing stun/pause presentation if supported |
| R3 C2 | `frustrated` | Lowered brow and tense fists | Losing a target or failed pursuit |
| R3 C3 | `drink` | Pint raised toward mouth | Existing drinking state |
| R3 C4 | `service_satisfied` | Smile, relaxed pint and thumbs-up | Positive service reaction if hunter can receive service |

The shotgun stays slung. This board does not introduce aiming or firing animations. The service-satisfied pose answers the request for a positive hunter emotion, but its gameplay trigger remains a design decision.

## Suggested motion treatment

The following timings and counts are starting points for a future artist/developer, not extracted game constants and not verified animation already contained in this pack.

| Reaction | Suggested authored frames | Suggested total time | Behavior |
| --- | --- | --- | --- |
| Perfect serve | 3 to 4 | 240 to 400 ms | Reach, readable delivery pose, release/settle |
| Proud success | 2 to 3 | 300 to 500 ms | Small accent, returns cleanly to locomotion |
| Spill/error | 3 to 4 | 280 to 500 ms | React once; visual effect follows actual spill event |
| Doe hit/recovery | 4 to 6 | 350 to 600 ms | Impact, brief hold, regain balance, settle |
| Hunter spotted | 2 to 3 | 150 to 300 ms | Quick recognition before pursuit |
| Missed catch | 3 to 4 | 250 to 450 ms | Reach, miss, recover |
| Drink/appreciation | 3 to 5 | 500 to 900 ms | Raise, sip or acknowledge, lower |

Do not delay a required game transition to satisfy these numbers. If the game already has a short hit-stop, reuse it instead of stacking another freeze. If a hit ends the run, show the appropriate terminal state rather than returning to idle just because the art board contains recovery.

## Recommended state integration

Keep gameplay state, locomotion and cosmetic expression distinct. A proud smile should not stop movement unless the design intentionally calls for a lock. If frame-specific limb poses conflict with movement, use a short torso/face accent or a dedicated moving variant.

A possible priority order is: caught/terminal state, actual hit response, mandatory interaction animation, locomotion, optional expression. This is a proposal; reconcile it with the real implementation. Never let an old celebration replace a current hit or let a cosmetic timer re-enable input after the game has ended.

Trigger a reaction once per authoritative event. For service, read the existing result and order identity. Do not award perfect service from the presence of a mug, distance alone, or a visual timer. If no perfect-service metric exists, use ordinary success feedback until the metric is explicitly defined. Repeated frames of the same event should not restart the reaction continuously.

Use short holds or a return-to-current-state rule rather than queueing long chains of reactions. A second hit or new threat may interrupt a cosmetic response. Prevent repeated danger alerts from flickering between neutral and panic every frame.

## Pose and attachment rules

- Keep the head, glasses, beard, hood/hat and antlers consistent with the chosen cleaned base frame. The generated expressions vary these slightly and should not become new character designs.
- Preserve feet anchors. A recovery step changes the pictured limbs, not automatically the entity's world position.
- Store mug and effect attachment positions per authored frame if the renderer supports attachments. Do not assume one fixed hand coordinate fits all poses.
- Keep successful delivery clean. No spill should appear in perfect-service frames. Render a spill as a separate effect when practical, so its lifetime is not tied to the torso pose.
- The beard hides much of the mouth. Use brows, eyelids, shoulders and hand gesture to make emotion readable at 48px height.
- Face changes must survive native-size inspection. Avoid relying on tiny teeth, detailed pupils, or a subtle smile that disappears at 1x.
- Keep hit feedback non-graphic, as in the reference board. No new wounds or costume damage are implied.

## Checks before accepting a sequence

1. Read the emotion at the game's actual scale over dark boards and a bright lamp pool.
2. Play the sequence and verify stable size, consistent feet and continuous hand/prop attachment.
3. Interrupt celebration with movement and a hit; ensure no stuck pose or stale input lock.
4. Re-trigger an event rapidly and confirm it does not create an endless animation or repeated gameplay reward.
5. Verify that artwork changes do not alter hitboxes, collision routes, scoring or hunter behavior.
6. Confirm the behavior with reduced camera motion and without depending only on color or flashes.

No new state machine has been implemented in the repository by this pack.
