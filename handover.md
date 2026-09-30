# Handover — fish-pond
Updated: 2026-09-30 (Scene 03 complete for 3D; UI overhaul next) · Repo pushed · Branch: main (pushed)

## Current state
Next.js 16.3.7 + Three.js + Strata CSS app with four routes: `/` landing (3 cards), `/arena` (Cognitive Arena), `/benchmark` (original 3-case benchmark), `/underwater` (Scene 03, new). `tsc --noEmit`, `eslint src` and `npm run build` pass. All experiments were checked in headless Chrome (software rendering) at desktop and 390 px; not yet checked on a real GPU.

## UI overhaul — theme applied (2026-09-30, uncommitted)
Liquid Glass theme applied to existing UI only (no new features; the settings pane and Scene 03 toggles are deferred by decision). Glass on overlays over canvases: arena toolbar, panels, hint and mobile tabs (underline tabs); benchmark pill and FPS chip; underwater chips. Flat with theme shapes: landing cards, benchmark dashboard and viewport header/HUD. New tokens: `--fp-glass-tint-hover`, `-fill`, `-fill-hover`, `-hit`, `--fp-font-size-xl`. Fallbacks (`@supports`, reduced-transparency) added. Checked with tsc, eslint, build and headless screenshots at 1440 and 600 px. Still open: confirm eyeballed values against Figma; real-GPU check; keyboard focus-ring pass by hand.

## Scene 03 settings sidebar (2026-10-01, uncommitted)
Permanent part of the UI (not temporary): a left glass sidebar on `/underwater` (toggle chip "Scene settings") with 10 tabs and about 60 sliders and colour pickers for scene graphics (water, light, caustics, shafts, snow, camera, grade, plants, shadow, surfaces). "Reset all" and "Export JSON" (downloads `fish-pond-underwater-settings.json`). Values persist in localStorage, but only while `SCENE_DEFAULTS` are unchanged.
- **Where:** `src/simulation/underwater/underwater-settings.ts` (`SCENE_DEFAULTS`, `SETTING_DEFINITIONS`), `UnderwaterEngine.applySettings`, `src/components/underwater/UnderwaterSettingsPanel.tsx`, `settings-storage.ts`. Types in `src/types/underwater.ts`.
- **How changes apply:** `LIVE` at once; `GRAPH` (Triforge materials recompiled) and `POST` (compositor rebuilt) after a 250 ms pause, since both read values only at build time. The tunable constants were moved out of `underwater-constants.ts` into `SCENE_DEFAULTS` (same values, scene unchanged).
- **Defaults:** the user's exported JSON (2026-10-01) is now `SCENE_DEFAULTS`. To adopt a newer export, paste its `settings` over `SCENE_DEFAULTS`; the stored browser copy is then ignored automatically. Triforge sun and ambient scaling is pinned to the original reference intensities (`TRIFORGE_*_REFERENCE_INTENSITY`), so changing defaults never re-brightens the Triforge surfaces.
- **HUD:** "Hide HUD" chip (bottom-left) hides the title, sidebar, hint and fish readout. Sliders also have a typed value box. Fish readout (bottom-right, no card, hidden under 768 px) is fed by `onFishTelemetry` (4 Hz snapshots). Icons are inline SVGs in `HudIcons.tsx`.
- **Not tunable yet:** fish behaviour, terrain shape, rock and seagrass placement, the environment reflection map (it is baked once at load, so the Water colour slider does not update it).

## Docs, SEO and deployment (2026-10-01)
Version 0.2.0. New `/docs` page (content in `src/app/docs/docs-content.tsx`) and a fourth landing card. SEO is driven from `src/config/site.ts` (route copy, URL) and `src/config/seo.ts` (metadata and JSON-LD builders); sitemap, robots and manifest are `src/app/*.ts`; OG images are static `public/og/*.jpg` and icons `public/icons/*`. Repo docs: README, `docs/*.md` (settings reference is generated from `underwater-settings.ts`), CHANGELOG, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, CITATION.cff, `.github/` templates. Site URL comes from `NEXT_PUBLIC_SITE_URL` (default `https://fish-pond.vercel.app`); `public/llms.txt` and `public/.well-known/security.txt` hold the default domain as text. No LICENSE file yet: the owner has to choose one. GitHub social preview must be uploaded by hand from `docs/images/social-preview.jpg`.

## Benchmark layout stability (2026-10-01)
Benchmark jitter came from layout shifts: a wrapping header and hint text of varying length resized the three canvases, and the probability bar appeared and disappeared. Now: fixed-height one-line header (chip labels drop to icons at 992 to 1199 px), constant-length hint, ellipsised titles, tabular numerals, bar always rendered. Measured: layout is identical while hovering in and out at 1920, 1280 and 1000 px.

## Clean HUD for arena and benchmark (2026-10-01, uncommitted)
Both now follow the underwater pattern: floating header (no bar), glass chips, data as plain text on the scene, panes that open on demand. Arena: "Stimuli" chip opens the palette and scenarios pane (closed by default on desktop); Mind, Memory and the control timeline are flat readouts (`data-surface="flat"`); phones keep the tabbed glass sheets. Benchmark: three full-bleed viewports across the screen, the whole surface steers the interactive threat, hint text replaces the banner, the matrix opens from a "Compare" chip; stacked on screens under 992 px. Hide HUD hides all overlays.

## Touch pads and soft transitions (2026-10-01, uncommitted)
Touch: `UnderwaterNavPad` (Move = WASD, Look = arrows) shows on narrow screens and `(pointer: coarse)`; the engine takes them via `setVirtualKeys`. Transitions: `src/app/template.tsx` wraps routes in React `<ViewTransition>` (400 ms ease-in-out cross-fade, CSS in `globals.css`); WebGL canvases fade in when ready (`data-ready-state`); HUD show/hide and the settings pane use `--fp-duration-slow` with `ease-in-out`; landing cards lift softly on hover; all honour `prefers-reduced-motion`. Known: the WebGL canvas may appear blank in the outgoing page snapshot during a route cross-fade.

## Keyboard navigation (2026-10-01, uncommitted)
`/underwater` only (`isNavigable` option on `UnderwaterEngine`): WASD moves, arrow keys rotate. It adds an offset and yaw/pitch on top of the automatic camera, so mouse parallax, cursor scare and click-to-feed are unchanged. The camera is clamped to the tank and above the seabed; rocks have no camera collision. Keys are ignored while an input or select has focus. No touch controls yet. Shaft billboards face the original camera position, so they look wrong from far off-axis.

## Shared HUD across routes (2026-10-01, uncommitted)
Landing now runs the Underwater scene as a fixed backdrop (`src/components/landing/LandingBackdrop.tsx`, default settings, glass cards). Arena and benchmark got icons (shared `src/components/HudIcons.tsx`), a "Hide/Show HUD" chip and mobile rules (icon-only toolbar buttons under 576 px; arena HUD chip moves to the top on phones). Benchmark hiding keeps the interaction banner because it is the threat input surface. The landing backdrop adds a full WebGL scene to the home page; check its cost on a real GPU.

## Earlier plan (superseded by the above)
- **Scope:** restyle all UI to the `liquid-glass-taste` skill (`.claude/skills/liquid-glass-taste/SKILL.md`; load it first). Only the 3D content of Scene 03 is considered correct for now; do not retune the scene, fish, lighting or shaders.
- **Already done:** glass tokens in `src/app/variables.css` (`--fp-glass-*`) and the `/underwater` overlay chips (back button, hint, loading status) in `src/components/underwater/underwater.module.css`. They sit over a dark area so the glass reads faintly.
- **To do:**
  - Build the skill's components: a settings-style glass pane with underline tabs, toggle rows (pill toggles driven by `data-state`) and chips. Candidate Scene 03 toggles: light shafts, dappling, marine snow, food mode.
  - Restyle the landing cards, then arena and benchmark panels, onto the same tokens (glass only over imagery/canvas, flat surface tokens elsewhere).
  - Confirm the skill's eyeballed values (blur 28px, tint, radius 28px) against the Figma design once an export or the Figma connector is available; the Figma embed is blocked from this machine (CloudFront 403), so work from the user's screenshot.
  - Check contrast (4.5:1), reduced-transparency/motion fallbacks, focus rings and 40px hit areas.
- **Repo:** public at https://github.com/AftabIbrahimKazi/fish-pond, single `main` branch (deliberate deviation from git-standards branch flow). `ai-dev-kit` is a submodule: clone with `--recurse-submodules`. The pre-commit hook needs `.claude/.pre-commit-declared` created in a separate call before each commit (the hook clears it after every commit).

## Scene 03 — Underwater (`/underwater`)
**Scene (Triforge only, no hand-written GLSL):** `@triforge/shader-core` node graphs for seabed, rocks, seagrass, backdrop dome, mirror water surface (Snell's window), light shafts and fish contact shadows; `@triforge/compositor-core` for Bloom, ColorBalance, HueSaturation, Vignette, FilmGrain. Pointer parallax moves camera and look target; adaptive pixel ratio steps down 0.25 when frames exceed 27 ms.

**Fish (System 1 only):**
- Population: 1 big Jikin + 2 small Tosakin (`SPECIES_PROFILES` counts). Real GLBs are loaded once as templates and cloned; head/up axes are detected from eye and dorsal-fin meshes (`fish-orientation.ts`).
- Personality: `TEMPERAMENTS` (calm elder, bold forager, shy follower) scale boldness, greed, sociability, speed, wander rate and depth.
- `fish-school-controller.ts` priority: cursor threat > food > social > path following. The cursor is a ray; only fish near it flee (radius scales with size and boldness).
- Path picking: each fish scores random spots by taste (cover vs open, mates, trip length, crowding), swims there in wide curves with swim-glide speed variation, dwells 1-3 s, repeats.
- Social: same species school loosely; small fish avoid the big one and yield food to it.
- Entrance: fish spawn beyond the frame (`ENTRY_EDGE_X`), on alternating left/right edges chosen at random each visit, with shuffled staggered `ENTRY_DELAYS`; y/z and first destination are random (`Math.random`, so `SPAWN_SEED` is unused).
- Food: click drops a 26-pellet cluster (`food-pellet-simulation.ts`, InstancedMesh, drag-limited sinking, drift, settle, dissolve after 34 s). Ground pellets trigger a head-down nibble (`feedPitch`, bobbing `gulp`).
- Collision: nose/middle/tail vs seabed, rock ellipsoids, fish-vs-fish push-apart.
- Lighting: warm key with dappling, cool rim, cyan fill, stronger environment reflections.
- Files: `src/simulation/underwater/` (`underwater-engine` entry class; `underwater-constants` holds all tuning; `triforge-graph`, `surface-materials`, `atmosphere-materials`, `scene-geometry`, `seagrass-animation`, `fish-loader`, `fish-orientation`, `fish-body-animation`, `fish-school-controller`, `food-pellet-simulation`), `src/components/underwater/`, `src/app/underwater/`, `src/types/underwater.ts`.
- Test rig: scratchpad `drive.mjs` (Chrome DevTools driver) clicks, moves and screenshots. Headless software rendering runs the sim at about 1% speed, so fast-forward via a temporary `window.__uw` hook (remove before commit).

## Earlier session
- **Review fixes (benchmark):** per-viewport food eating (`telemetryBus.reportFoodEaten`, `foodId` on `SimulationInputs`), seeded PRNG (`src/simulation/prng.ts`), Case 3 smoothing capped and retuned (threat range 14, food 16, smoothing 8), `ResizeObserver`/`IntersectionObserver`, telemetry state throttled to 10 Hz, dead code removed.
- **Camera fix:** `frameCameraToPond` in `pond-environment.ts` fits the pond width to each viewport's aspect, so fish no longer leave the frame. `createPondEnvironment` and `clampFishToPondBounds` accept optional bounds.
- **CSS:** inline styles removed everywhere. Strata utilities wrap `--fp-` tokens for layout and spacing; typography, colour and borders live in CSS Modules; state is driven by `data-*`. The unlayered `*` padding/margin reset was removed because it overrode Strata utilities.
- **Landing and routing:** `src/app/page.tsx` (two links), `/benchmark` moved with its own layout metadata, `/arena` added. Size scale reordered (`--fp-size-md` 60rem, `--fp-size-lg` 87.5rem); new tokens for panels, stacking and scrims in `src/app/variables.css`.
- **Cognitive Arena:** one fish in a wide pond (`ARENA_BOUNDS`), stimulus palette (hotkeys 1-8; tap and flash fire instantly, the rest are placed by clicking the water), four scripted scenarios, mind/memory/timeline panels, mobile tabbed bottom sheet.
  - `src/simulation/arena/`: `system1-reflex` (Case 2 presets, 80-120 ms latency, known stimuli only), `system2-appraiser` (notice, approach, inspect, probe, verdict; 0.7-4.5 s by novelty), `arbiter` (S1 always aborts S2 and locks it out 2.5 s), `fish-memory` (default 30 s span, slider 5-120 s), `arena-world`, `arena-controller`, `stimulus-catalog`, `stimulus-meshes`, `scenarios`.
  - UI in `src/components/arena/` plus `src/app/arena/page.tsx`; types in `src/types/arena.ts`.

## Decisions & why
- Strata is the declared framework (CLAUDE.md), so the SC rules apply.
- System 2 is a simulated deliberation, not a real model: deterministic and reproducible against Case 2.
- An S1 override adds a valence penalty to the interrupted object, so a harmless rock interrupted by a shadow can be judged a THREAT. This is intended (learned association); revisit if it reads as a bug.
- Food is masked per viewport locally, so all three benchmark fish see identical inputs.
- Plankton particles still use `Math.random` (visual only).

## Known issues
- Triforge quirks worked around: `MapRange` SMOOTHSTEP applies the polynomial before clamping (use `buildRange` in `triforge-graph.ts`); `Vignette` (three backend) only behaves for offset <= 1; `AnimatedNoiseTexture` only reads world XZ and needs the shared `time` uniform added by hand; compiled fragment shaders use `precision mediump` (patched to highp); compositor render targets are not multisampled (set through its private `_composer`).
- Triforge shading is not colour-managed: colours are authored in sRGB and gamma-decoded (2.2) at the end of each graph; fish (standard PBR) use scene fog and the two only match by eye.
- Underwater cost is untested on real GPUs (many noise lookups per pixel on seabed and shafts).
- Not tested on a real GPU: check pointer feel, the automated benchmark cycle and arena frame rate.
- Naming rules not applied: `create*` factory verbs (TS-N-03) and boolean fields such as `threatActive`/`foodActive` without `is`/`has` (TS-N-05). Renaming touches shared types.
- Typography, colour and border styling are in CSS Modules, not Strata utilities (partial SC-01 compliance).
- No keyboard way to steer the benchmark threat; the arena is keyboard-operable.
- `@triforge/*` and `onnxruntime-web` are installed but unused; benchmark copy still mentions Triforge.
- `npm run lint` errors only in `ai-dev-kit/` and `coding-standards/tooling/`.

## Next steps
1. `npm run dev`, then try all three experiments on a real GPU (Scene 03 frame rate and fish behaviour at real speed first).
2. Scene 03 next: System 2 (deliberation) for the fish, more nibble/feeding animation polish, optional keyboard access for feeding.
3. Tune arena stimuli and behaviour from what you see (shadow visibility, timings, habituation to known stimuli is not modelled).
4. Decide on the naming renames and unused dependencies.
5. Commit in stages (bugs, TS, CSS, landing, arena, docs) after loading `git-standards.md`.

## Don't touch / gotchas
- `AGENTS.md` top block (`nextjs-agent-rules`) is regenerated by `next dev`; keep edits outside it.
- `CLAUDE.md` begins with `@AGENTS.md`; keep it.
- Python on this Windows machine writes cp1252 by default; write source as UTF-8 or non-ASCII characters break the Turbopack build.
- Bash heredocs containing certain quote patterns failed silently here; use the Write tool for larger files.
