# 2. The complete Claude-to-production-art workflow

[Start here](README.md) · [Reference standard](01-STYLE-AND-REFERENCES.md) · [Copyable prompts](03-PROMPTS.md)

## Phase A — recover the project before editing

In a Claude Code session, open the repository root and ask Claude to read
`HANDOFF.md` completely, then `AGENTS.md`, `docs/VISUAL-SYSTEM.md` and this folder.
Inspect the working tree:

```powershell
git status --short --branch
git rev-parse HEAD
git rev-list --left-right --count HEAD...origin/main
```

The final command compares local tracking refs; it does not prove the live
remote has not moved. Do not pull, switch branches, overwrite assets or discard
files just to get a clean tree. Preserve the collaborator's local work and
respect the task's existing authorization.

For Claude web/Desktop without repository access, give it the current brief,
visual standard and actual reference images. Have a person with the checkout
perform the Git/import/browser steps. A chat file upload does not grant access
to your disk or make shell commands run on your machine.

## Phase B — separate the three deliverables

1. **Character behavior:** where the character appears, facing, routes, events,
   special-pose state and reset behavior. Existing behavior may already be done.
2. **Source artwork:** actual illustrated RGBA raster pixels for every required cell.
3. **Integration and evidence:** imported metadata, manifest, runtime selection,
   native-size review, tests and recorded proof.

For Nick, behavior already existed. The missing deliverable was illustrated
art plus its integration. Rewriting his movement would not fix his visual style.

Fill in [the character brief](templates/CHARACTER-BRIEF.md). Enumerate the
four directions and every special pose used by actual gameplay. Agree on
identity and costume before spending generation attempts.

## Phase C — establish a real generation route

### Route 1: Claude prepares; a human uses an image generator

This route works when Claude has no callable raster generator.

1. Ask Claude to produce the exact prompt and ordered attachment list.
2. Open the image-generation environment used for the project's artwork, if
   available, or another generator supporting reference images and transparency.
3. Upload the actual portrait/Jay/Alex files. Confirm all expected images are
   attached and their order matches the prompt.
4. Submit the generation prompt. Request actual transparent output using the
   tool's transparency control as well as the prompt when such a control exists.
5. Download the original generated PNG. Do not use a screenshot of its preview.
6. Give Claude the output image for visual analysis and the exact downloaded
   file path for integration. Give it dimensions/format only after measuring them.
7. If a correction is needed, upload the draft as the edit target and follow
   one of the targeted prompts. Preserve the successful parts explicitly.
8. Keep rejected drafts outside production assets; record why they were rejected.

Do not stop at “here is a good prompt” if the task includes finished sprites.
When generation is unavailable, report that exact missing capability and
prepare everything useful for the handoff, then continue once art is supplied.

### Route 2: Claude calls an already configured external image tool

In Claude Code, inspect available MCP connections with `/mcp`; the CLI also
provides `claude mcp list`. Configuration and transport details are covered
in [Anthropic's MCP reference](https://code.claude.com/docs/en/mcp).

Before using a tool, check its actual schema and establish:

| Capability | Evidence to obtain |
| --- | --- |
| Raster image generation | A real image-producing tool, not merely a web-page/artifact renderer |
| Reference inputs | Supported image uploads, handles, URLs, or paths; how local bytes reach it |
| Reference-guided editing | The draft can be passed as an edit target, with style references separately |
| Alpha output | It can deliver transparent RGBA output, or a documented extraction stage is needed |
| Original file retrieval | The full generated image can be downloaded or written locally |
| Generation provenance | Tool/provider and any returned model/options/job information can be recorded |

A path argument is only useful if that tool's process can read that path.
Remote servers generally need uploaded bytes or a supported asset handle.
File-system access in Claude does not automatically carry over to the tool.

Use the configured tool's real parameter names. Do not paste Codex's
`referenced_image_paths` or `transparent_background` keys into an unrelated
server unless its schema actually defines them.

If installation/configuration is needed, make it a separate concrete setup
task. This guide intentionally does not invent a server URL, package name,
API-key requirement or verified image connector. The manual route remains
usable without pretending an unconfigured integration exists.

### Route 3: reuse an already accepted sprite

For exact Nick reproduction, there is no generation step. Preserve:

- `assets/sprites/nick-illustrated.png`;
- `assets/sprites/nick-illustrated.json`;
- Nick's entry in `src/character-art.js`;
- Nick's production-manifest entry;
- the runtime pose-selection behavior.

Use file hashes to establish source identity. Do not run a generator because
a different coding assistant is now working on the same character.

## Phase D — generate and inspect before promotion

Keep initial downloads in a task working folder outside the served production
tree. Keep a private portrait outside the public repository unless the user
has specifically directed otherwise. Nick's original portrait was already
tracked before this upgrade; do not duplicate it into the guide or reference pack.

Inspect the entire output as an image, then inspect each cell. Check:

- actual reference finish, overhead camera and identity;
- exactly four correctly ordered directions;
- both distinct strides in every direction;
- required special action and anatomical hand/prop ownership;
- complete figures, clear gutters, no labels, floor, grid or baked shadow;
- real alpha, rather than a painted checkerboard or opaque backdrop.

An edit instruction is a request, not proof that all untouched pixels stayed
identical. Inspect the complete edited output again. A stride correction can
also shift spacing or subtly alter the face. Select the accepted file after review.

## Phase E — integrate the accepted source

Follow [the integration chapter](04-ATLAS-INTEGRATION.md): declare the family,
copy the accepted PNG unchanged, import measured metadata, add the production
manifest entry, and verify actual facing/pose events.

Do not guess source dimensions or write all crop coordinates manually from
the requested grid. Use the importer's measured output. If it fails, diagnose
the image and seams; do not remove guards to force an import.

Record a `HANDOFF.md` checkpoint after meaningful changes and before long
checks. Include exact files, branch/HEAD/upstream state, tests, unresolved
issues and whether anything has been committed or pushed.

## Phase F — validate technically and visually

Run the required checks from [review and troubleshooting](05-REVIEW-TROUBLESHOOTING.md).
Use a supporting-character validator as a starting pattern, but adapt its
fixture and assertions to this character's real event.

Inspect both strides and special poses beside Jay at 1280x720 and 390x844
touch/phone emulation. Also inspect the person in the real pub, including
warm lamp pools and dark lanes. Exercise the actual transition that sets
the pose, its return to walking/idle, reset cleanup, and missing-image fallback.

If an unrelated test fails, reproduce it against committed code and identify
the cause. Do not silently change gameplay to satisfy an old assertion. Nick's
work uncovered a stale Alex test, which was corrected without timing changes.

## Phase G — deliver something the user can inspect

Provide the accepted source location, prompt/provenance location, actual
desktop/mobile room captures and a cast comparison. State precisely which
tests ran and which environment they used.

Use these distinct statuses:

| Status | Meaning |
| --- | --- |
| Brief prepared | The art requirements and prompts are written |
| Generated draft | An image exists, but has not passed review/import |
| Source accepted | Full source and all cells inspected; correct artwork selected |
| Integrated locally | Production contract/metadata/manifest/runtime use it locally |
| Validated locally | Required checks and inspected browser captures pass |
| Committed/pushed | Verified Git operations completed |
| Deployed/live verified | Actual deployment plus served-asset/browser verification completed |

Do not collapse those into “done.” A placeholder or an unrun prompt is not
production artwork; local captures do not establish live deployment.

Finish the handoff so the next Claude/Codex session can continue without
recreating accepted art or losing uncommitted work. Publish only within the
user's instruction; no extra approval is needed for already authorized work.
