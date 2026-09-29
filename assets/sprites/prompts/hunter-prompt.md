# Hunter likeness revision — September 23, 2026

Created with built-in imagegen, using the user-supplied portrait as identity
reference, the previous hunter atlas as the edit target, and Jay's illustrated
sheet as the style reference. The personal photograph remains outside the
public repository. The original hunter is recoverable from Git history.

The photo supersedes the earlier generic cap/heavy-beard identity. Keep the
high forehead, short swept brown hair, wide black rectangular glasses, fuller
cheeks, slight smile and light salt-and-pepper chin/jaw stubble consistent in
future edits. The hunting vest, plaid sleeves and slung shotgun retain his
gameplay silhouette. This is a stylized likeness at a small overhead scale.

## Exact generation prompt

```text
Use case: identity-preserve / stylized-concept. Production replacement transparent PNG game sprite atlas for LePub. Input image 1 is the identity reference photo: match this person's likeness. Input image 2 is the existing hunter sprite atlas to edit: keep its illustrated finish, camera, outfit, equipment, 4x4 layout and poses. Input image 3 is the shipped waiter style reference. Replace the hunter's head/face consistently in ALL 16 cells with the man in the photo. Remove the orange cap entirely so his actual hairline and hair are visible: short side-swept dark brown hair with subtle warm/grey strands, a high forehead with slightly receded temples, fuller broad oval cheeks, large wide black rectangular eyeglasses, mild friendly closed-mouth smile, light short salt-and-pepper stubble strongest on chin and lower jaw. Do NOT give him the existing thick solid black beard or a huge moustache. Preserve the likeness within the game's stylized proportions, not a photoreal face pasted onto a cartoon. Keep olive hunting vest, red/black plaid sleeves, olive trousers, brown boots, and wooden shotgun slung over anatomical right shoulder from the old sprite; last row still holds/drinks golden pint. High overhead camera with crowns and shoulders visible, foreshortened bodies, same elevation on side views. Warm upper-left shading, detailed fabric seams, hair clumps, crisp dark contours, same density and body scale as shipped sheets. Square sheet, strict FOUR equally spaced columns x FOUR equally spaced rows, exactly 16 complete isolated figures. Columns DOWN toward viewer, RIGHT, UP away, LEFT. Rows idle, left-foot stride, right-foot stride, drinking with pint. Every figure including equipment must fit fully INSIDE its own quarter-width/quarter-height cell with generous transparent margins on all sides; keep consistent body scale/center across poses. Truly transparent RGBA background with actual alpha; no backdrop, checkerboard, floor, shadow, captions, labels, grid, logo or watermark. Only head identity changes; preserve pose structure and outfit. Back views show his short brown hair, never a cap.
```

Import with `node tools/import-illustrated.js hunter`. The importer measures
source alpha, cell boundaries, feet pivots and one family-wide density;
source pixels are preserved. Pose names, gameplay and hitboxes stay unchanged.
