# Fish Pond — Architectural Visual Telemetry Benchmark

A high-fidelity 3D visual telemetry benchmark comparing three distinct agent control architectures running identical procedural aquatic scenes in real time.

---

## 1. Overview & Objective

Based on the [Architectural Benchmark Specification](project-statement/fish_pond_benchmark_specification.md), **Fish Pond** demonstrates the transition from mechanical, code-bound transitions to autonomous, context-aware aesthetics without incurring main-thread runtime bottlenecks or memory leaks.

The benchmark evaluates:
1. **Case 1 (System 0 - Programmed Reflex):** Static threshold tree logic (`if/else`), yielding instantaneous, rigid animation snapping without muscular inertia.
2. **Case 2 (System 1 - Intuitive Preset Lottery):** Laya-AI classification running via ONNX Web in a Web Worker, mapping threat/food vectors into probability distributions over designer-approved presets (`Glide`, `Startle-Dart`, `Curious-Hover`, `Anxious-Freeze`) with smooth lerping.
3. **Case 3 (Dual-Process - Autonomous Organism):** Laya-AI (System 1) emotional intent combined with ReasonLite-0.6B (System 2 INT4 ONNX) continuous multi-axis reasoning for dynamic spine deformation, fin resistance, and hue modulation bounded by safety limits.

---

## 2. Technical Stack

| Category | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16.3.7 (App Router, Turbopack) | Application runtime, layout orchestration, client component hosting |
| **Styling** | `strata-css` (v1.9.0) | Responsive viewport layout via `@layer` cascade, PostCSS compilation, zero-overhead utility generation |
| **3D Engine** | Three.js (`three`) | WebGL/WebGPU context, camera management, scene graph |
| **Node / Procedural Suite** | `@triforge/shader-core`, `@triforge/geometry-nodes`, `@triforge/compositor-core` | Volumetric water shaders, procedural mesh skinning, post-processing |
| **AI Inference** | `onnxruntime-web` | Client-side sandboxed Web Worker execution of System 1 & System 2 models |
| **Design Standards** | Layered Coding Standards (`coding-standards/`) | Deterministic CSS, TypeScript, and AI behavioral rules |

---

## 3. Behavioral Matrix

The interactive pond environment maps mouse and touch inputs directly to threat vectors and food drops:
- **Hand Only (Cursor Threat):** The fish calculates an avoidance trajectory, increasing velocity and body tension to flee.
- **Food Only (Click/Tap):** The fish switches to an approach trajectory, decelerating as it feeds.
- **Hand + Food Conflict:** The threat overrides the food particle, inducing an ambiguous "anxious hesitation" state where survival competes against feeding.

---

## 4. Architecture & File Layout

```
fish-pond/
├── ai-dev-kit/             # Local library copy of skills & standards
├── coding-standards/       # Universal standards (CSS, TS, AI, QA)
├── project-statement/      # Benchmark specification document
├── public/                 # Static assets, ONNX model weights, worker scripts
├── src/
│   ├── app/
│   │   ├── variables.css   # Single source of truth for all --fp- design tokens
│   │   ├── globals.css     # Global stylesheet, @strata directives, base styles
│   │   ├── layout.tsx      # Root application layout
│   │   └── page.tsx        # Orchestration interface (3-viewport comparison)
│   └── components/         # Viewport modules & telemetry overlays
├── .claude/                # Installed workflow skills and hook configs
├── postcss.config.mjs      # PostCSS plugin registration for Strata CSS
└── package.json            # Dependencies and build scripts
```

---

## 5. Project Conventions

- **CSS Token Prefix:** `--fp-` (all design tokens defined exclusively in `src/app/variables.css`).
- **Selector Signature:** `fp-` for custom component classes.
- **CSS Framework Rules:** Utility classes follow `strata-css` conventions. Never use `!important` or pseudo-class prefixes on utilities.
- **Standards Chain:** Always load `coding-standards/index.md` and the appropriate role partials before modifying code.

---

## 6. Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm run start
```
