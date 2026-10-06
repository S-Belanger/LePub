# LePub collaborator changelog

This is the shared, versioned index of what each collaborator requested and did,
how it was done, what failed, what passed and what was published. Newest entries
come first. Detailed conversation/prompt journals live in
[docs/collaboration](docs/collaboration/README.md); current working state lives
in [HANDOFF.md](HANDOFF.md). All contributors must follow [AGENTS.md](AGENTS.md).

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
