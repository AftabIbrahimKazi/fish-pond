# Architectural Benchmark Specification: "Fish in a Pond" Visual Telemetry Test Case

This specification defines the implementation strategy for an independent, verifiable 3D visual benchmark. The goal is to evaluate the organic fidelity, stability, and rendering performance of three distinct control architectures running identical, highly realistic procedural scenes.

The benchmark demonstrates how a user interface can shift from mechanical, code-bound transitions to autonomous, context-aware aesthetics without incurring main-thread runtime bottlenecks or memory leaks.

---

## Technical Stack & Infrastructure

To ensure zero-performance-drain execution and strict layout correctness, the benchmark leverages the following core tools:

*   **3D Framework (`triforge`):** Handles the procedural scene compilation, geometric batching, hardware-accelerated vertex deformations, custom shader bindings, and spatial coordinate clamping.
*   **CSS Framework (`strata-css`):** Manages the responsive viewport layout using custom cascade layers (`@layer`) and native CSS variable configurations, keeping the DOM structure lightweight and avoiding style recalculation overhead.
*   **AI Engine Layer:**
    *   **System 1 (Instinct Engine):** **Laya-AI** running client-side via ONNX Runtime Web. It handles ultra-fast, discrete classification vectors in a background Web Worker thread.
    *   **System 2 (Reasoning Engine):** **ReasonLite-0.6B** compiled to ONNX Runtime Web (4-bit INT4 quantization). It processes multi-axis mathematical slider dependencies inside the sandboxed worker.

---

## The Simulation Scenario: "The Interactive Pond"

To evaluate behavioral intent and intuitive response, the environment bypasses standard scroll/click triggers and maps mouse/touch coordinates directly to an active physical agent within a hyper-realistic, procedurally generated 3D pond canvas.

### Environmental Elements
1.  **The Fish:** A procedurally generated aquatic creature. Its skeleton, fins, tail-flapping frequencies, and body curvature are computed entirely on the GPU via vertex deformation logic managed by `triforge`.
2.  **The Mouse Cursor (The Hand):** The screen cursor acts as a simulated human hand descending into the water. The fish perceives this vector path as an immediate, high-priority threat vector.
3.  **The Food Element:** The user can click/tap to drop a procedural particle (food item) into the pond canvas. The food emits an attraction vector field.

### Behavioral Matrix Rules
*   **Hand Only:** The fish calculates an avoidance path, adjusting its velocity and body tension to flee the threat organically.
*   **Food Only:** The fish shifts into an approach pattern, slowing its momentum as it nears the particle to feed.
*   **Hand + Food Conflict:** The threat overrides the food. The fish enters a high-friction, ambiguous "anxious hesitation" state, balancing the urge to eat against the necessity to survive.

---

## File Architecture Specification (4-File Distribution Layout)

The project repository will isolate each vector test environment into its own standalone module, concluding with a master benchmarking orchestration layout.

### File 1: `case-1-system-0.js` (The Programmed Reflex)
*   **Architecture:** Core `triforge` rendering layer controlled exclusively by static JavaScript threshold trees.
*   **Logic Implementation:** 
    *   Strict binary logic boundaries: `if (handDistance < threshold) { state = DART } else if (foodPresent) { state = APPROACH }`
*   **Visual Characteristic:** The fish behaves like an automated mechanical toy. When the threat boundary is crossed, animation properties (tail speed, steering angle) snap instantly from one rigid value array to another. The transitions are jagged, lack muscular inertia, and fail to interpret the nuance of the conflict state.

### File 2: `case-2-hybrid-s1.js` (The Intuitive Preset Lottery)
*   **Architecture:** `triforge` engine + **Laya-AI** System 1 Classification Layer.
*   **Logic Implementation:**
    *   The framework registers an explicit dictionary of designer-approved behavioral presets (`Glide`, `Startle-Dart`, `Curious-Hover`, `Anxious-Freeze`).
    *   System 1 evaluates the multi-variable telemetry array (hand velocity, food distance, time-elapsed conflict) and assigns a calibrated probability distribution across the presets.
    *   The engine runs a weighted lottery to select a single preset key. `triforge` smoothly interpolates (lerps) the visual state variables between the old and new presets.
*   **Visual Characteristic:** The fish moves with beautiful organic momentum. It never reacts identically to the exact same threat timeline because the lottery occasionally picks minor probability moods, but the output remains 100% correct, fluid, and bounded within designer standards.

### File 3: `case-3-dual-process.js` (The Autonomous Organism)
*   **Architecture:** `triforge` engine + **Laya-AI** System 1 + **ReasonLite-0.6B** System 2 Reasoning Layer.
*   **Logic Implementation:**
    *   Pre-designed presets are completely removed. The framework only defines the absolute boundary limits (`min`/`max`) for individual muscle, speed, and hue sliders to ensure safety.
    *   System 1 identifies the high-level emotional intent vector string.
    *   System 2 (ReasonLite) processes that intent against the slider properties in real time, logically reasoning out the proportional, multi-axis values (e.g., matching a high-frequency tail wag with a specific geometric spine curve and fin resistance to simulate realistic tension).
    *   The continuous decimal outputs are fed to `triforge`, which enforces final safety boundary clamping.
*   **Visual Characteristic:** The fish functions as a living, self-governing creature. It dynamically generates completely un-programmed postures, turns, and muscle responses on the fly to navigate the threat/food conflict. The movement looks highly realistic and uniquely complex, while remaining physically stable.

### File 4: `index.html` (The Side-by-Side Combined Benchmark)
*   **Architecture:** A unified orchestration interface structured cleanly using `strata-css` grid grids.
*   **Execution Grid:**
    *   Displays three identical `<canvas>` viewports rendering side-by-side simultaneously.
    *   Viewport A maps to File 1 (System 0).
    *   Viewport B maps to File 2 (System 0 + System 1).
    *   Viewport C maps to File 3 (System 0 + System 1 + System 2).
*   **Benchmark Injection Pipeline:** A centralized timeline script pipes identical, pre-recorded coordinate streams simulating the "Indecisive Shopper/Threat" behavior into all three viewports concurrently. This layout allows for immediate, empirical visual comparison of behavioral correctness, layout transition fluidities, and frame rendering speeds under stress.

---

## Procedural Visual Requirements (Ensuring Realism)

To protect the validity of the visual benchmark, the scene must maintain uncompromising fidelity. If the graphics appear low-tier, subtle behavioral variations will look like rendering glitches rather than organic intentional adjustments.

1.  **Ray-Marched Volumetric Water:** The pond canvas must utilize custom fragment shaders inside `triforge` to handle continuous light-ray attenuation (God rays) and chromatic dispersion through water depth layers.
2.  **Procedural Mesh Skinning:** The fish body must not use pre-baked standard skeleton animations. Its shape transformations must be mathematically driven using continuous 3D noise fields warped by the input parameters, ensuring that the visual deformation maps accurately to the slider decimals.
3.  **Physical Boundary Clamping:** While the behavioral architectures vary completely across the three files, the final safety check remains uniform. Every viewport runs the identical low-level `triforge` constraint engine, guaranteeing that the fish mesh never passes through boundary walls, clips into itself, or breaks its vertex limits under any circumstance.