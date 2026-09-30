# Changelog

All notable changes to Fish Pond are recorded here. The version format is `major.feature.patch` (see [versioning standards](coding-standards/versioning-standards.md)); one push is one version bump.

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
