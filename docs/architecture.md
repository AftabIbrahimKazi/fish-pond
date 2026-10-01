# Architecture

A guided tour of how Fish Pond is put together. For the user-facing version see the [documentation page](https://fish-pond-mu.vercel.app/docs).

## Layers

```text
Route (src/app/*/page.tsx)           server component, metadata, JSON-LD
  └─ Client component (Stage/Scene)  React state, HUD, settings
       └─ Engine / controller        owns the WebGL scene and the simulation loop
            └─ Modules               Triforge graphs, fish AI, pellets, settings
```

- **Routes** are thin. Each route layout builds its metadata and structured data from `src/config/site.ts` through `src/config/seo.ts`.
- **Client components** own React state (HUD visibility, settings, telemetry) and hand plain values to the engine.
- **Engines** are classes that follow the project class rules: the constructor only assigns, `init()` starts work, `destroy()` releases every listener, loop and GPU resource.

## The underwater engine

`src/simulation/underwater/underwater-engine.ts` is the entry point.

| Module | Responsibility |
|---|---|
| `triforge-graph.ts` | Reusable Triforge node fragments: water column, caustics, display decode |
| `surface-materials.ts` | Sand, rock and seagrass graphs |
| `atmosphere-materials.ts` | Dome, water surface, light shafts, fish contact shadow |
| `scene-geometry.ts` | Seabed, rocks and the terrain height sampler |
| `seagrass-animation.ts` | One merged, CPU-bent blade mesh |
| `fish-loader.ts`, `fish-orientation.ts` | Load the GLB templates and detect head and up axes |
| `fish-school-controller.ts` | Motor control only: steering, flee direction, personal space, tank walls, food contact, collisions; describes the world to the model |
| `ai/` | Laya-AI: inference engine, worker, sequence builder, perception wording, `fish-intent-controller.ts` (the fish's decisions) |
| `fish-body-animation.ts` | Body bend, roll and nibble animation |
| `food-pellet-simulation.ts` | Instanced pellets: drop, sink, settle, dissolve |
| `underwater-settings.ts` | `SCENE_DEFAULTS`, slider definitions, JSON export |
| `underwater-constants.ts` | Non-tunable constants (layout, species, behaviour) |

### Frame loop

1. Update the camera (automatic drift and parallax, then keyboard or touch navigation on top).
2. Update seagrass, marine snow, the fish intent controller (asks Laya the next question) and the fish motor simulation.
3. Update sun dappling and emit fish telemetry at 4 Hz.
4. Render through the Triforge compositor.
5. Sample frame time and step the pixel ratio down if frames are slow.

### Settings pipeline

`UnderwaterEngine.applySettings(next)` compares the new snapshot with the old one:

- **Live** values (lights, fog, exposure, camera, snow, seagrass) are applied immediately.
- **Material** values mark the Triforge graphs dirty. After 250 ms of quiet every registered material is rebuilt and swapped onto the meshes that use it.
- **Grade** values mark the compositor dirty. After 250 ms a new compositor is built and swapped in, so the canvas never goes blank.

Triforge sun and ambient light uniforms are scaled from fixed reference intensities (`TRIFORGE_*_REFERENCE_INTENSITY`), so changing the defaults never re-brightens the shaded surfaces.

### Laya-AI layer

```text
FishIntentController (main thread)   describes a fish's situation, picks whom to ask, records answers on the fish
  └─ LayaWorkerController            request ids, progress callbacks
       └─ laya-worker.ts (Web Worker)
            └─ LayaInferenceEngine   tokenise → encoder (int8) → head → temperature softmax (ONNX Runtime Web, wasm threads)
```

The engine fetches `encoder_q8` and `head_q8` from Hugging Face (about 524 MB, cached in the Cache API). `FishSchoolController` reads `agent.intent` (flee and eat probabilities) and the chosen destination; it never produces them. The flow and the wording research are in [fish-ai.md](fish-ai.md).

## Arena and benchmark (scripted, no AI)

- `src/simulation/arena/` holds System 1 reflexes, the System 2 appraiser, the arbiter, fish memory, stimuli, scenarios and the world.
- `src/simulation/controllers/` holds the three benchmark controllers.
- `src/simulation/telemetry-bus.ts` distributes identical inputs to every benchmark viewport and runs the automated cycle.
- `src/simulation/pond-environment.ts` builds the shared pond scene (teal water, fading floor, plankton).

## UI layer

- `src/components/HudIcons.tsx`: shared line icons.
- `src/components/GlassSelect.tsx`: the glass dropdown.
- `src/components/landing/LandingBackdrop.tsx`: the underwater scene used behind the landing and docs pages.
- `src/app/template.tsx`: wraps every route in a React `<ViewTransition>` for the page cross-fade.

## Conventions

State is driven by `data-*` attribute values, scripts never touch `style`, and types shared by more than one file live in `src/types/`. See [design-system.md](design-system.md) and [`coding-standards/`](../coding-standards/index.md).
