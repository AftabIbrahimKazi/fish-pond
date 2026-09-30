# Handover — fish-pond
Updated: 2026-09-30 (Scene 03 behaviour, entrances, collision) · Branch: master (all work uncommitted)

## Current state
Next.js 16.3.7 + Three.js + Strata CSS app with four routes: `/` landing (3 cards), `/arena` (Cognitive Arena), `/benchmark` (original 3-case benchmark), `/underwater` (Scene 03, new). `tsc --noEmit`, `eslint src` and `npm run build` pass. All experiments were checked in headless Chrome (software rendering) at desktop and 390 px; not yet checked on a real GPU.

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
