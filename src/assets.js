// ============================================================================
// Le Pub — raster asset registry
// Optional PNG sprite atlases with a JSON description (docs/overhaul,
// ARCHITECTURAL-OVERHAUL-PLAN §8). Everything here is presentation: the
// registry never touches colliders, score or input. A family that has no
// valid atlas — or whose atlas fails to load, validate or decode — renders
// through the procedural string sprites exactly as before, so art can arrive
// one file at a time and a broken file can never stop play.
//
// Contract (schemaVersion 1), per atlas JSON:
//   assetId, image (relative to the JSON), imageSize {width,height},
//   frameSpace "untrimmed-source-pixels", pivotSpace "frame-local-pixels",
//   authoredPixelsPerWorldUnit (2 for this game's backing grid),
//   alphaPolicy "binary" | "translucent", palettePolicy (string, informative),
//   fallbackKey (the SPRITES family this atlas replaces),
//   directions [...], frames { id: { rect {x,y,width,height}, pivot {x,y} } },
//   animations { id: { loop, sequence: [{ frameId, durationMs }] } }.
// Units: rects and pivots are image pixels; durations are milliseconds;
// drawing converts to world units by dividing by authoredPixelsPerWorldUnit.
// Collision data is deliberately not part of this contract.
// ============================================================================

const Assets = (function () {
  const SCHEMA_VERSION = 1;
  const entries = new Map();     // assetId -> entry
  const byFamily = new Map();    // fallbackKey -> entry (ready only)
  let generation = 0;            // bumped by reset(); stale loads are dropped
  let io = null;                 // { fetchJson(url), loadImage(url) }
  const log = [];                // bounded diagnostics for the debug console

  function note(msg) {
    log.push(msg);
    if (log.length > 40) log.shift();
  }

  function isFiniteNum(v) { return typeof v === 'number' && Number.isFinite(v); }
  function isInt(v) { return isFiniteNum(v) && Math.floor(v) === v; }

  // Pure. Returns null when valid, else a reason string.
  function validate(meta) {
    if (!meta || typeof meta !== 'object') return 'metadata is not an object';
    if (meta.schemaVersion !== SCHEMA_VERSION) return 'unsupported schemaVersion ' + meta.schemaVersion;
    if (typeof meta.assetId !== 'string' || !meta.assetId) return 'assetId missing';
    if (typeof meta.image !== 'string' || !meta.image) return 'image path missing';
    const size = meta.imageSize;
    if (!size || !isInt(size.width) || !isInt(size.height) || size.width <= 0 || size.height <= 0) return 'imageSize invalid';
    if (meta.frameSpace !== 'untrimmed-source-pixels') return 'frameSpace must be untrimmed-source-pixels';
    if (meta.pivotSpace !== 'frame-local-pixels') return 'pivotSpace must be frame-local-pixels';
    if (!isFiniteNum(meta.authoredPixelsPerWorldUnit) || meta.authoredPixelsPerWorldUnit <= 0) return 'authoredPixelsPerWorldUnit invalid';
    if (meta.alphaPolicy !== 'binary' && meta.alphaPolicy !== 'translucent') return 'alphaPolicy invalid';
    if (typeof meta.fallbackKey !== 'string' || !meta.fallbackKey) return 'fallbackKey missing';
    if (!meta.frames || typeof meta.frames !== 'object') return 'frames missing';
    const frameIds = Object.keys(meta.frames);
    if (!frameIds.length) return 'no frames';
    for (const id of frameIds) {
      const f = meta.frames[id];
      const r = f && f.rect;
      if (!r || !isInt(r.x) || !isInt(r.y) || !isInt(r.width) || !isInt(r.height)) return 'frame ' + id + ': rect invalid';
      if (r.width <= 0 || r.height <= 0) return 'frame ' + id + ': rect empty';
      if (r.x < 0 || r.y < 0 || r.x + r.width > size.width || r.y + r.height > size.height) return 'frame ' + id + ': rect outside image';
      const p = f.pivot;
      if (!p || !isFiniteNum(p.x) || !isFiniteNum(p.y)) return 'frame ' + id + ': pivot invalid';
      if (p.x < 0 || p.y < 0 || p.x > r.width || p.y > r.height) return 'frame ' + id + ': pivot outside frame';
    }
    if (!meta.animations || typeof meta.animations !== 'object') return 'animations missing';
    for (const id in meta.animations) {
      const a = meta.animations[id];
      if (!a || typeof a.loop !== 'boolean') return 'animation ' + id + ': loop must be boolean';
      if (!Array.isArray(a.sequence) || !a.sequence.length) return 'animation ' + id + ': empty sequence';
      for (const step of a.sequence) {
        if (!step || !meta.frames[step.frameId]) return 'animation ' + id + ': unknown frame ' + (step && step.frameId);
        if (!isFiniteNum(step.durationMs) || step.durationMs <= 0) return 'animation ' + id + ': duration invalid';
      }
    }
    return null;
  }

  // Precompute total durations so frame lookup is arithmetic, not a scan.
  function compile(meta, image) {
    const anims = {};
    for (const id in meta.animations) {
      const a = meta.animations[id];
      let total = 0;
      const steps = a.sequence.map(step => {
        const start = total;
        total += step.durationMs;
        return { frame: meta.frames[step.frameId], start, end: total };
      });
      anims[id] = { loop: a.loop, steps, total };
    }
    return { meta, image, anims, density: meta.authoredPixelsPerWorldUnit };
  }

  function setEntry(assetId, patch) {
    const e = entries.get(assetId) || { assetId, state: 'unloaded', reason: null, url: null, family: null, compiled: null };
    Object.assign(e, patch);
    entries.set(assetId, e);
    return e;
  }

  // Loads one atlas JSON (+ image). Idempotent per URL: a second call while
  // the first is in flight returns the same promise.
  const inflight = new Map();
  function load(url) {
    if (!io) return Promise.resolve(null);
    if (inflight.has(url)) return inflight.get(url);
    const gen = generation;
    const assetKey = url;
    setEntry(assetKey, { state: 'loading', url });
    const p = io.fetchJson(url).then(meta => {
      const reason = validate(meta);
      if (reason) throw new Error(reason);
      const imageUrl = url.slice(0, url.lastIndexOf('/') + 1) + meta.image;
      return io.loadImage(imageUrl).then(image => {
        if (image.naturalWidth !== meta.imageSize.width || image.naturalHeight !== meta.imageSize.height) {
          throw new Error('image is ' + image.naturalWidth + 'x' + image.naturalHeight + ', metadata says ' + meta.imageSize.width + 'x' + meta.imageSize.height);
        }
        return { meta, image };
      });
    }).then(({ meta, image }) => {
      if (gen !== generation) { note(url + ': dropped (stale generation)'); return null; }
      const compiled = compile(meta, image);
      const e = setEntry(assetKey, { state: 'ready', reason: null, family: meta.fallbackKey, compiled, assetId: meta.assetId });
      byFamily.set(meta.fallbackKey, e);
      note(url + ': ready (' + meta.assetId + ' → ' + meta.fallbackKey + ')');
      return e;
    }).catch(err => {
      if (gen !== generation) return null;
      setEntry(assetKey, { state: 'failed', reason: String(err && err.message || err) });
      note(url + ': failed — ' + (err && err.message || err));
      return null;
    }).finally(() => inflight.delete(url));
    inflight.set(url, p);
    return p;
  }

  // A manifest is optional: { atlases: ["doe.json", ...] } next to the sheets.
  function loadManifest(url) {
    if (!io) return Promise.resolve([]);
    const base = url.slice(0, url.lastIndexOf('/') + 1);
    return io.fetchJson(url).then(m => {
      if (!m || !Array.isArray(m.atlases)) throw new Error('manifest has no atlases array');
      return Promise.all(m.atlases.map(f => load(base + f)));
    }).catch(err => { note(url + ': ' + (err && err.message || err)); return []; });
  }

  // Frame for a family at a time. Returns null when the family has no ready
  // atlas or no such animation, and the caller falls back to procedural art.
  function frameFor(family, animId, timeMs) {
    const e = byFamily.get(family);
    if (!e || e.state !== 'ready') return null;
    const anim = e.compiled.anims[animId];
    if (!anim) return null;
    let t = anim.loop ? ((timeMs % anim.total) + anim.total) % anim.total : Math.min(timeMs, anim.total - 0.001);
    const steps = anim.steps;
    for (let i = 0; i < steps.length; i++) {
      if (t < steps[i].end) return { image: e.compiled.image, rect: steps[i].frame.rect, pivot: steps[i].frame.pivot, density: e.compiled.density };
    }
    return { image: e.compiled.image, rect: steps[steps.length - 1].frame.rect, pivot: steps[steps.length - 1].frame.pivot, density: e.compiled.density };
  }

  function hasFamily(family) { const e = byFamily.get(family); return !!(e && e.state === 'ready'); }

  // A restart drops nothing that is ready (textures are immutable) but makes
  // any load still in flight stale, so an old reload can't replace a newer
  // registry entry.
  function reset() { generation++; }

  function status() {
    const out = {};
    for (const [k, e] of entries) out[k] = { state: e.state, reason: e.reason, family: e.family, assetId: e.assetId };
    return out;
  }

  function configure(next) { io = next; }

  // Browser defaults: fetch + Image.decode.
  function browserIO() {
    return {
      fetchJson: url => fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
      loadImage: url => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const done = () => resolve(img);
          if (img.decode) img.decode().then(done, () => reject(new Error('decode failed')));
          else done();
        };
        img.onerror = () => reject(new Error('image failed to load'));
        img.src = url;
      }),
    };
  }

  return { SCHEMA_VERSION, validate, compile, configure, browserIO, load, loadManifest, frameFor, hasFamily, reset, status, log };
})();
