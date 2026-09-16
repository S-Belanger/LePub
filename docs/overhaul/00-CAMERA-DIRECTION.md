# Current direction: overhead gameplay, richly illustrated pub

This revision takes priority over the earlier camera language in this reference pack. The user supplied a current gameplay screenshot and clarified that the intended experience is overhead, with Overcooked-like visibility and spatial readability, while retaining the detailed pixel-art pub aesthetic. This is an analogy for camera and gameplay clarity, not a request to copy another game's characters or visual assets.

## The target

Keep the current game's readable overhead layout. Rebuild the artwork with the original painting's walnut, brass, burgundy upholstery, green enamel, fine material detail, localized warm illumination and cool accents. This requires new asset construction and consistent projection across the scene. Increasing canvas resolution or placing a color filter over the old drawing does not accomplish the redesign.

The earlier frontal character turnarounds remain costume and anatomy references. The earlier angled room remains a material and atmosphere reference. Neither is the final camera reference.

## New images and their roles

| File | Role | Limits |
| --- | --- | --- |
| `source/current-overhead-gameplay.png` | User's current visible layout and overhead presentation | A cropped screenshot, not full map or collider data |
| `overhead/gameplay-modernization-concept.png` | Proposed translation of rich pub materials into that overhead view | Generated concept; geometry, counts, UI and scale are not exact |
| `overhead/character-camera-study.png` | More elevated, foreshortened Doe/hunter body views | Study only; view consistency and native-size readability still need cleanup |
| `overhead/character-camera-study-earlier.png` | Earlier camera trial retained for comparison | Side views remain too frontal; not the preferred target |

The preferred character study omits the hunter's shotgun to isolate the body projection. That omission does not change his canonical design. Reintroduce the slung prop after the body/camera match is stable. The new gameplay concept also does not establish every costume detail perfectly.

## Reference precedence for the next pass

1. Current user direction: overhead visibility and playable spatial clarity.
2. Actual game geometry and rendering code, when available.
3. Supplied gameplay screenshot for the visible arrangement.
4. New overhead mockup for the proposed material upgrade.
5. Original pub painting for atmosphere and surfaces.
6. Earlier character and emotion boards for identity and acting intent.

No architectural plan or repository code was supplied for this revision. Do not infer exact collision coordinates or offscreen room contents from the mockup.

## Camera rules

Favor a high, near-overhead, orthographic-looking presentation. Screen-aligned rectangular surfaces keep parallel edges. Table tops should occupy substantially more screen area than their visible front faces. A short bevel and shallow front lip can communicate depth without hiding the adjacent lane.

In prompts, roughly 65 to 75 degrees above horizontal can communicate the desired elevation; this is a descriptive starting point, not a measured camera angle from the game or a setting that must be implemented. A 2D renderer can author this appearance without a 3D camera or changing the world coordinate system.

Characters reveal crowns of heads, hood/hat tops and shoulder tops. Bodies and legs are foreshortened. When facing upward, faces disappear naturally. When facing downward, only the portion visible beneath the hood/hat should show. The side views must use the same elevation, not an eye-level profile.

Keep character physical scale consistent across directions. A near-overhead projection shortens the on-screen silhouette of the same upright person; do not inflate the head or lengthen the torso just to fill a previous 48px-tall reference. Reconcile the original approximately 48px target with the chosen camera at native size. Retain the 64x64 frame contract and feet/contact anchor only after checking the actual loader contract.

## What the visible game needs visually

| Current impression from screenshot | Upgrade direction |
| --- | --- |
| Repeated flat wood rectangles | Finer staggered boards, controlled grain and localized broken reflections |
| Counter surfaces with little height | Polished tops, bevels, shallow panel fronts, restrained brass details |
| Very small, coarse character silhouettes | Authored overhead sprites with distinct headwear, shoulders and props |
| Large order cards and a wide dialogue panel | Smaller readable status markers and context-aware dialogue placement |
| Large furniture labels | Recognizable taps, kitchen/hatch and bottle shelf construction; minimal signs only where useful |
| Similar visual weight across floor and objects | Quieter lanes, richer perimeter/furniture detail, separated values |
| Strong retro screen treatment | Judge clean artwork first; keep any scanline/noise treatment subtle and optional |

These are visual observations and design proposals, not a source-code audit. Keep any information or interaction affordance that labels and UI currently provide when changing their presentation.

## Level design under this camera

The screenshot shows a tall room with a horizontal taps area at upper left, a horizontal kitchen area below, a narrow vertical shelf/counter near center-right, and a long table on a green rug at upper right. Preserve these relationships for a layout-faithful art pass. The screenshot cuts off portions of the room; it does not reveal the full world bounds.

Use the existing collider data to produce a precise layout template before painting final surfaces. Keep obstacle footprints and route widths fixed during an appearance-only change. Visible front faces can extend from a footprint without becoming a new collision wall. Test that their drawn depth does not imply walkable space where collision blocks it, or imply a barrier where movement is allowed.

Peripheral wall detail, bottles, taps, rugs, plants and seat construction can provide richness without filling the lanes. Hanging fixtures must not hide the player; use placement, cutaways or an appropriate foreground treatment rather than sacrificing visibility for a dramatic lamp view.

Depth sorting and foreground occlusion still matter from overhead. Furniture and characters need consistent floor-contact anchors, with separate treatment where a tall or elongated object cannot be sorted correctly as one image.

## Reactions from overhead

The earlier 12-pose boards describe acting intent, not the final camera. Re-author them at the overhead elevation.

- Perfect service: readable arm reach with upright pint, short confident settle, optional small success UI accent tied to the actual service result.
- Mistake: tipped prop where appropriate, brief shoulder drop or hesitation. Do not depend on a tiny embarrassed mouth.
- Panic: tighter shoulders, head orientation toward threat and a readable movement posture. A face hidden by the hood is expected.
- Hit: quick compressed body recoil, antler/hat movement consistent with the head, clear recovery of balance. No new gameplay knockback is implied.
- Hunter spotted/chasing: changed head direction, shoulders and stride. Keep the cap's orange silhouette identifiable from behind.
- Appreciation: small nod, arm gesture or raised glass, with face changes secondary.

Put finer facial expressions in dialogue portraits only if the UI design actually calls for portraits. Do not enlarge in-world heads merely to expose every facial emotion.

## One-room production proof before a full asset rebuild

1. Inspect actual scaling, geometry and loader code. HANDOFF already records ART_SCALE=2; do not blindly double the game again.
2. Author one overhead Doe frame, one hunter frame, a floor sample, a counter corner, a table and a chair using the same projection.
3. Render those in one real gameplay area at native scale, with current colliders unchanged.
4. Compare head/shoulder visibility, furniture depth, object scale, floor contrast and the sizes of order markers.
5. Add one carry pose and a short hit response. Check moving behind furniture and reaching service points.
6. Once the camera and material treatment work together, expand directions, animations and room modules. Keep old fallback assets until replacements pass review.

The first proof should visibly change authored shapes and materials, not merely decorate the existing procedural forms. The supplied overhead mockup is a proposed target, not an implemented preview or a claim that the full upgrade is complete.

## Copyable camera override

Use this with the master style block in PROMPT-TEMPLATES, and attach the gameplay screenshot first.

```text
CAMERA OVERRIDE: This is an overhead game. The attached gameplay screenshot
governs layout and spatial readability. The rich pub painting governs
materials and lighting only. Preserve screen-aligned rectangular surfaces,
parallel edges and visible walk lanes. Use a high orthographic-looking
camera, large visible tabletops and shallow furniture fronts. Characters
show the tops of heads and shoulders with foreshortened torsos and legs.
Do not paste frontal sprites onto this floor or turn the room into a
diamond-isometric tavern. Rebuild surface detail, furniture construction,
lighting and character silhouettes while preserving actual game geometry.
Do not claim exact geometry or implementation from a generated mockup.
```
