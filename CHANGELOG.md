# Changelog

All notable changes to Fish Pond are recorded here. The version format is `major.feature.patch` (see [versioning standards](coding-standards/versioning-standards.md)); one push is one version bump.

## [0.3.0] - 2026-10-02

### Added
- **Laya-AI drives the underwater fish.** An open System 1 decision model ([Laya](https://huggingface.co/convaiinnovations/laya), 8-bit browser build) runs in a Web Worker through ONNX Runtime Web. It decides whether each goldfish flees the cursor, goes for food and where it swims next. Opt-in from the new **Enable Laya-AI** chip; the weights (about 524 MB) come from Hugging Face and are cached by the browser.
- `src/simulation/underwater/ai/`: inference engine, token-for-token sequence builder, worker, perception wording and the fish intent controller.
- Compact fish readout with a unique marker per fish and the model's latest flee and eat answers, plus a status chip with download progress and time per decision.
- Hover tooltip: an arrow label with a fish's marker, name and state that follows it for about 4 seconds, with the matching readout block scaling up.
- "Scripted · no AI" labels on the Arena, the Benchmark and their landing cards, and a "Laya-AI decides" label on the Underwater card.
- Cross-origin isolation headers (needed for threaded WebAssembly) and `scripts/copy-ort.ts`, which copies the ONNX Runtime wasm into `public/ort/` on install.
- Credits for Laya, its authors, and the nvkudva laya-web build and runtime.

### Changed
- The underwater fish no longer decide anything in code. `fish-school-controller.ts` is motor control only; destination scoring, threat radius, food appetite rules, schooling and food yielding were removed.
- Fish are held inside the tank (hard wall clamp) once they have entered.
- Benchmark and Arena copy, SEO descriptions and `llms.txt` no longer claim an AI model (the benchmark subtitles mentioned Laya-AI and ReasonLite; they are scripted).
- Node.js 22.6 or newer is required (the install script runs TypeScript directly).

### Fixed
- Underwater: after the camera was moved with the keyboard or pads, the cursor ray was cast with the camera's previous matrices, so the pointer no longer lined up with the fish under it and flee decisions stopped triggering. The camera matrices are refreshed before the ray is cast.
- The Cognitive Arena toolbar was not positioned, so its title and clock were painted under the canvas and never visible. They show now.

### Removed
- The deterministic fallback behaviour of the underwater fish. With Laya-AI off, the fish only drift.

## [0.2.1] - 2026-10-01

### Changed
- Point the site URL, sitemap, social previews, `llms.txt`, `security.txt` and documentation at the live production domain, `https://fish-pond-mu.vercel.app`.

## [0.2.0] - 2026-10-01

### Added
- **Underwater scene settings sidebar** with 62 settings, typed values, reset and JSON export; the exported values are now the defaults.
- **Fish behaviour readout** (bottom-right, plain text on the scene) with state, speed, depth, appetite, panic and target distance, colour-coded when active.
- **Free navigation** on `/underwater`: `WASD` to move, arrow keys to look, plus glass touch pads for phones and touch devices.
- **Documentation page** at `/docs` and a fourth landing card, with the full project documentation shown on the site.
- **Landing backdrop**: the underwater scene now runs behind the landing and docs pages.
- **Glass dropdown**, shared line icons and a Hide HUD button on every experiment.
- **Soft page transitions** (React view transitions), scene fade-in and eased HUD show and hide, all honouring reduced motion.
- **SEO**: per-route metadata, canonical URLs, Open Graph and Twitter cards with generated previews, JSON-LD, sitemap, robots, manifest, icons, `llms.txt`, `humans.txt`, `security.txt` and security headers.
- **Repository documentation**: README rewrite, `docs/` guides, changelog, contributing guide, security policy, code of conduct, citation file and GitHub templates.

### Changed
- Restyled the landing, arena, benchmark and underwater pages to the Liquid Glass theme: glass only over canvases, flat surfaces elsewhere, thin scrollbars everywhere.
- Arena and benchmark now follow the underwater HUD pattern: floating header, glass chips, readouts as plain text, panes that open on demand.
- Benchmark is now three full-bleed viewports with a fixed-height header; layout no longer shifts while telemetry updates.
- Shared pond scene re-themed to the underwater palette with a floor that fades into the water.
- Tunable underwater constants moved into `SCENE_DEFAULTS` (`underwater-settings.ts`).

### Fixed
- Benchmark jitter caused by a wrapping header and a probability bar that appeared and disappeared.
- Landing backdrop stayed dark until the 12 MB goldfish models loaded; it now reveals as soon as the water is drawn.
- Missing `--fp-font-size-xl` token.

## [0.1.0] - 2026-09-30

### Added
- Landing page, Cognitive Arena, Visual Telemetry Benchmark and the first underwater scene with Triforge shading, real goldfish models, food and cursor-aware fleeing.
- Coding standards, workflow skills and the development kit.
