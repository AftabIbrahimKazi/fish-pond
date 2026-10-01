/**
 * Documentation content for /docs. Each entry becomes a table-of-contents link and an <h2>
 * section, so headings stay sequential (h1 on the page, h2 per section, h3 inside).
 */

import React from 'react';

export interface DocSection {
  id: string;
  title: string;
  summary: string;
  content: React.ReactNode;
}

export const DOC_SECTIONS: readonly DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    summary: 'What Fish Pond is and what each route shows.',
    content: (
      <>
        <p>
          Fish Pond is a set of browser experiments about how an artificial fish can decide what to do. It is built with Next.js, TypeScript,
          Three.js and Triforge shader graphs, and runs entirely in the browser: there is no backend, no account and no tracking.
        </p>
        <aside data-callout="note">
          <p>
            <strong>Where the AI is.</strong> Only the Underwater scene uses an AI model: Laya-AI, an open System 1 decision model that runs in your
            browser once you enable it, decides what each goldfish does. The Cognitive Arena and the Visual Telemetry Benchmark are scripted
            simulations written in TypeScript. They use no AI model, and the interface says so.
          </p>
        </aside>
        <table>
          <caption>The four routes</caption>
          <thead>
            <tr><th scope="col">Route</th><th scope="col">What it is</th><th scope="col">Interaction</th></tr>
          </thead>
          <tbody>
            <tr><td>/</td><td>Landing page over the live underwater scene</td><td>Open an experiment; click the water to feed the fish</td></tr>
            <tr><td>/arena</td><td>Cognitive Arena: one fish, instinct versus deliberation (scripted, no AI)</td><td>Place stimuli, pause, change speed, inspect the fish mind</td></tr>
            <tr><td>/benchmark</td><td>Visual Telemetry Benchmark: three scripted controllers, identical inputs (no AI)</td><td>Steer a threat with the cursor, drop food, run the test cycle</td></tr>
            <tr><td>/underwater</td><td>A realistic goldfish scene whose fish are driven by Laya-AI, with a full settings sidebar</td><td>Enable Laya-AI, feed, fly with WASD and arrows, tune about 60 graphics settings</td></tr>
          </tbody>
        </table>
        <p>
          The experiments share one visual language (Liquid Glass overlays over a WebGL canvas), one set of design tokens and one set of
          coding standards. Everything described here is implemented in the repository; where something is a simulation rather than a real
          model, this page says so.
        </p>
      </>
    ),
  },
  {
    id: 'arena',
    title: 'Cognitive Arena',
    summary: 'Instinct (System 1) versus deliberation (System 1+2) in one fish. Scripted, no AI model.',
    content: (
      <>
        <aside data-callout="note">
          <p>
            <strong>No AI model.</strong> System 1 and System 2 here are scripted code (a seeded lottery and a state machine), written to illustrate the
            idea of dual-process thinking. Nothing in this experiment is machine learning.
          </p>
        </aside>
        <p>
          The arena places a single fish in a wide pond (32 by 16 units, 7 tall). You place stimuli; the fish either reacts instantly from
          instinct or investigates slowly. The point is to make the difference between the two modes of thought visible.
        </p>
        <h3>Stimuli</h3>
        <p>Eight stimuli are available, each with a hotkey. Two are instant (they fire as soon as you choose them); the rest are placed by clicking the water.</p>
        <table>
          <caption>Stimulus palette</caption>
          <thead>
            <tr><th scope="col">Key</th><th scope="col">Stimulus</th><th scope="col">Class</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>Looming shadow</td><td>Known threat (System 1)</td></tr>
            <tr><td>2</td><td>Glass tap (instant)</td><td>Known threat (System 1)</td></tr>
            <tr><td>3</td><td>Light flash (instant)</td><td>Known threat (System 1)</td></tr>
            <tr><td>4</td><td>Food pellet</td><td>Known food (System 1)</td></tr>
            <tr><td>5</td><td>Novel rock</td><td>Unknown (System 1+2)</td></tr>
            <tr><td>6</td><td>Novel food</td><td>Unknown (System 1+2)</td></tr>
            <tr><td>7</td><td>Drifting leaf</td><td>Unknown (System 1+2)</td></tr>
            <tr><td>8</td><td>Lure</td><td>Unknown (System 1+2)</td></tr>
          </tbody>
        </table>
        <h3>System 1: instinct</h3>
        <p>
          System 1 only reacts to <em>known</em> stimuli. A reaction latency of 80 to 120 ms passes, then a committed reflex fires. The reflex
          is chosen by a weighted lottery over designer presets (the same idea as benchmark Case 2). Threat reflexes always pre-empt food
          strikes, and hunger or fear gate whether a food strike happens at all.
        </p>
        <h3>System 1+2: deliberation</h3>
        <p>
          Unknown objects trigger a slow, per-object appraisal with five phases: <strong>notice, cautious approach, inspect, probe, verdict</strong>.
          The duration scales with novelty, from about 0.7 s for something the fish remembers up to about 4.5 s for something completely new.
          The verdict (food, safe or threat) is written to short-term memory with a confidence value. Deliberation is a deterministic
          simulation, so the same inputs always give the same result; it is not a language model.
        </p>
        <h3>The arbiter</h3>
        <ul>
          <li>System 1 always wins. A reflex aborts any running appraisal.</li>
          <li>After an override, System 2 is locked out for 2.5 seconds, and stays blocked while fear is above 0.45.</li>
          <li>An override adds a valence penalty (0.35) to the interrupted object, so a harmless rock interrupted by a shadow can be judged a threat later. This is intentional: it models a learned association.</li>
        </ul>
        <h3>Fish state and memory</h3>
        <p>
          Hunger starts at 0.45 and rises 0.012 per second; eating relieves 0.5. Fear peaks at 1.0 and decays 0.3 per second. Short-term memory
          keeps each appraised kind for a span (default 30 s, adjustable from 5 to 120 s with the slider); meeting it again refreshes the
          timer, and when it expires the kind is novel again.
        </p>
        <h3>Scenarios and controls</h3>
        <p>Four scripted scenarios reproduce the interesting cases: Interrupted inspection, Hunger versus fear, Novelty meets threat, and Learned aversion.</p>
        <ul>
          <li>Keys 1 to 8 choose a stimulus, click the water to place it, Esc cancels.</li>
          <li>Space pauses, R resets, and the speed menu offers 0.5x, 1x and 2x.</li>
          <li>The Stimuli button opens the palette and scenarios pane. On phones the same content lives in tabbed bottom sheets.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'benchmark',
    title: 'Visual Telemetry Benchmark',
    summary: 'Three scripted controllers, one set of inputs, compared live. No AI model.',
    content: (
      <>
        <p>
          The benchmark runs three fish in three side-by-side ponds. A shared telemetry bus feeds them identical inputs, so any difference in
          behaviour comes only from the controller.
        </p>
        <table>
          <caption>The three controllers</caption>
          <thead>
            <tr><th scope="col">Case</th><th scope="col">Idea</th><th scope="col">How it behaves</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>1 · System 0, programmed reflex</td>
              <td>Binary threshold tree</td>
              <td>States IDLE, DART and APPROACH. A threat inside 7 units triggers a dart; food inside 10 units triggers an approach. A dart holds for at least 0.9 s. Transitions are instant, so motion snaps.</td>
            </tr>
            <tr>
              <td>2 · Preset lottery (scripted)</td>
              <td>Weighted lottery over designer presets</td>
              <td>Presets Glide, Startle-Dart, Curious-Hover and Anxious-Freeze are chosen by probability, then blended with smoothing so the fish keeps momentum.</td>
            </tr>
            <tr>
              <td>3 · Blended intent (scripted)</td>
              <td>Continuous multi-axis blending</td>
              <td>No presets. Threat and food intents (ranges 14 and 16 units) drive spine curve, tail frequency and fin resistance continuously. When threat and food are both strong, an ambivalent hesitation appears.</td>
            </tr>
          </tbody>
        </table>
        <h3>Inputs</h3>
        <ul>
          <li><strong>Cursor:</strong> move over any pond to steer a descending hand threat; click a pond or press Drop food to add a pellet.</li>
          <li><strong>Test cycle:</strong> a 16-second scripted sequence (approach, then a hand-and-food conflict, then the remainder) piped to all three ponds at once.</li>
        </ul>
        <h3>Telemetry</h3>
        <p>
          Each pond overlays its state, frames per second, tail frequency, spine curvature, tension and a probability bar. All three controllers
          are clamped by the same physical safety limits (tail 0.8 to 7.5 Hz, spine curve 0.05 to 0.95, fin resistance 0.1 to 1.0, speed 0.2 to 8).
          Randomness is seeded, and every fish eats a shared pellet independently so the comparison stays fair.
        </p>
        <p>
          The Compare button opens a matrix that summarises the decision mechanism, transition fidelity, conflict behaviour and performance of each case.
        </p>
        <aside data-callout="note">
          <p>
            <strong>No AI model.</strong> The original specification describes ONNX models (Laya-AI and ReasonLite) for Cases 2 and 3. They are not used
            here: all three controllers are deterministic TypeScript, and the labels on this page say so. The real AI in Fish Pond is the Laya-AI
            model that drives the fish in the Underwater scene.
          </p>
        </aside>
      </>
    ),
  },
  {
    id: 'underwater',
    title: 'Underwater scene',
    summary: 'How the realistic scene is shaded, lit and graded.',
    content: (
      <>
        <p>
          The scene is drawn with Three.js, but every custom material is a Triforge node graph: there is no hand-written GLSL in the project.
          Graphs cover the sandy seabed, rocks, seagrass, the backdrop dome, the mirror-like water surface seen from below, the light shafts and
          the contact shadow under each fish.
        </p>
        <h3>The water column</h3>
        <p>
          Light is absorbed per colour channel with a Beer-Lambert model (red dies first, blue survives) and scattered toward the water colour with
          distance, so far surfaces dissolve into the fog. Absorption and water colour are adjustable in the settings sidebar.
        </p>
        <h3>Caustics, shafts and surface</h3>
        <ul>
          <li><strong>Caustics:</strong> two animated ridged-noise layers multiplied together, faded with depth and with surfaces facing away from the sun.</li>
          <li><strong>Light shafts:</strong> additive billboards along the sun direction with streaked noise, up to 24 of them.</li>
          <li><strong>Surface:</strong> seen from below, a bright Snell window straight up and total internal reflection beyond it.</li>
          <li><strong>Dappling:</strong> the sun light flickers through three sine waves so moving light reaches the fish.</li>
          <li><strong>Seagrass and snow:</strong> blades are bent on the CPU each frame in one draw call; up to 1,800 marine-snow particles drift downward.</li>
        </ul>
        <h3>Post-processing</h3>
        <p>
          A Triforge compositor chain applies bloom, colour balance (lift and gain per channel), hue and saturation, a vignette and film grain.
          Its render targets are multisampled to avoid edge aliasing.
        </p>
        <h3>Adaptive quality</h3>
        <p>
          The engine samples frame time. If frames average over 27 ms it lowers the pixel ratio by 0.25 (between 1 and 1.5), so weaker GPUs stay fluid.
        </p>
      </>
    ),
  },
  {
    id: 'fish-ai',
    title: 'Fish behaviour and Laya-AI (underwater)',
    summary: 'How an AI model, not code, decides what each goldfish does.',
    content: (
      <>
        <p>
          The scene holds one large Jikin goldfish and two smaller Tosakin goldfish, loaded once from real GLB models and cloned. Their decisions come
          from <strong>Laya-AI</strong>, an open System 1 decision model that runs in your browser through ONNX Runtime Web. Switch it on with the
          Enable Laya-AI chip. With it off, the fish only drift: there is no scripted fallback that decides for them.
        </p>
        <h3>What the model decides</h3>
        <table>
          <caption>Decisions made by Laya-AI</caption>
          <thead>
            <tr><th scope="col">Decision</th><th scope="col">What the model is asked</th><th scope="col">What happens</th></tr>
          </thead>
          <tbody>
            <tr><td>Flee</td><td>Yes or no: &quot;A human hand is next to the goldfish&quot;, given a plain description of where the hand is</td><td>At 50% or more the fish flees away from the cursor</td></tr>
            <tr><td>Eat</td><td>Yes or no: &quot;The fish should go and eat the food now&quot;, given the fish&apos;s first-person view</td><td>At 50% or more the fish swims to the nearest pellet</td></tr>
            <tr><td>Where to swim</td><td>Choice between four candidate spots, each described in words (distance, cover, company, depth)</td><td>The chosen spot becomes the next destination</td></tr>
          </tbody>
        </table>
        <h3>What stays in code</h3>
        <p>
          Code only carries out what the model decided and keeps the world physical: steering and speed, the direction that points away from the
          cursor, personal space between fish, the seabed and rocks, the tank walls, body pose, and swallowing a pellet that reaches the mouth. It never
          chooses to flee, eat or travel. A question is only asked when it applies: the flee question while a hand is near and the eat question while food
          is near, and a fish with a hand near is asked at once, nearest first, ahead of everything else.
        </p>
        <h3>Temperaments</h3>
        <table>
          <caption>Temperaments</caption>
          <thead>
            <tr><th scope="col">Fish</th><th scope="col">Temperament</th><th scope="col">Effect on movement</th></tr>
          </thead>
          <tbody>
            <tr><td>Jikin</td><td>Calm elder</td><td>Slow, wanders gently</td></tr>
            <tr><td>Tosakin</td><td>Bold forager</td><td>Fast, wanders more</td></tr>
            <tr><td>Tosakin</td><td>Shy follower</td><td>Slightly slower, wanders steadily</td></tr>
          </tbody>
        </table>
        <p>The temperament label is also given to the model when it picks a destination.</p>
        <h3>How fast it is</h3>
        <p>
          A flee decision takes about 0.7 s on a desktop with hardware graphics, and the first fish reacts 1.1 to 1.9 s after the pointer enters the scene (measured on a 16-thread laptop); eat and destination decisions take about 1.2 s.
          The model runs in a Web Worker, so the scene stays smooth, and a fish keeps acting on its last answer until the next one arrives. The first
          visit downloads about 524 MB of model weights; the browser keeps them, so later visits start in seconds. Slow or small devices can take much longer
          or fail to start, in which case the fish stay idle and the chip says so.
        </p>
        <h3>The wording is part of the experiment</h3>
        <p>
          Laya is a text classifier trained on business workflows such as support tickets, invoices and security incidents. It is not trained on fish. Testing
          it on this task showed what it can and cannot do:
        </p>
        <ul>
          <li>It answers &quot;should the fish eat?&quot; reliably (86 to 93% when food is in view, near 0% when it is not).</li>
          <li>It cannot grade a danger by distance or speed. Asked &quot;is the fish in danger?&quot; it gave about the same answer for a hand 10 cm away and one 3 m away, with both published checkpoints. The only wording that separated them put the word &quot;danger&quot; into the situation text, which would have been code making the decision, so it was not used.</li>
          <li>It does recognise a plain description of closeness. &quot;A human hand is in the water right next to the goldfish&quot; scored 76 to 80%, and &quot;far across the tank&quot; scored 3 to 31%. So the situation is described in place words, and the model decides on those.</li>
          <li>Small changes in wording change the answer a lot, so the exact sentences are fixed in <code>fish-perception-text.ts</code>.</li>
        </ul>
        <p>
          These are limits of the model, not tuning that code covers up. When the model disagrees with what you would expect, that is the experiment working.
        </p>
        <h3>Food and collisions</h3>
        <p>
          A click drops a cluster of 26 pellets (instanced, drag-limited sinking, slight drift). Settled pellets dissolve after 34 seconds, and pellets on
          the ground trigger a head-down nibble with a bobbing gulp. Fish collide with the seabed and rocks using nose, middle and tail samples, and
          push apart from each other.
        </p>
        <h3>The live readout</h3>
        <p>
          The bottom-right text on the underwater page shows, for each fish, a unique marker (#1, #2, #3), its state, appetite, panic and the latest Laya answers (flee and eat,
          as percentages), updated four times a second. A dash means the model has not answered yet. Hover a fish, or its block, and a small arrow label with the marker,
          name and state follows the fish for about four seconds while its block scales up. The chip bottom-left shows the
          model status and the time per decision.
        </p>
      </>
    ),
  },
  {
    id: 'controls',
    title: 'Controls',
    summary: 'Mouse, keyboard and touch on every route.',
    content: (
      <>
        <table>
          <caption>Underwater controls</caption>
          <thead>
            <tr><th scope="col">Input</th><th scope="col">Action</th></tr>
          </thead>
          <tbody>
            <tr><td>Mouse move</td><td>Camera parallax; the cursor is the hand Laya-AI judges (when enabled)</td></tr>
            <tr><td>Hover a fish or its readout block</td><td>An arrow label with the fish&apos;s #marker, name and state follows it for about 4 seconds and its readout block scales up</td></tr>
            <tr><td>Enable Laya-AI chip</td><td>Downloads and starts the model (about 524 MB, kept by the browser); click again to switch it off</td></tr>
            <tr><td>Click or tap the water</td><td>Drop fish food</td></tr>
            <tr><td>W A S D</td><td>Move forward, left, back, right</td></tr>
            <tr><td>Arrow keys</td><td>Turn left and right, look up and down</td></tr>
            <tr><td>Touch pads</td><td>Move (bottom-left) and Look (bottom-right) on phones and touch screens</td></tr>
            <tr><td>Hide HUD</td><td>Hides every overlay for a clean view</td></tr>
          </tbody>
        </table>
        <p>
          Navigation is added on top of the automatic camera, so mouse behaviour is unchanged. The camera stays inside the tank and above the
          seabed, and the keys are ignored while a slider, number box or menu has focus so the sidebar stays usable from the keyboard.
        </p>
        <p>
          The arena and benchmark use their own controls (see those sections), and all three experiments have a Hide HUD button.
        </p>
      </>
    ),
  },
  {
    id: 'settings',
    title: 'Scene settings and the JSON workflow',
    summary: 'Tune about 60 graphics values, export them, make them the defaults.',
    content: (
      <>
        <p>
          The Scene settings sidebar on /underwater exposes 62 graphics values in ten tabs: Water, Light, Caustics, Shafts, Snow, Camera, Grade, Plants,
          Shadow and Surfaces. Each has a slider and a typed value box; colours use a picker. Changes apply in one of three ways.
        </p>
        <table>
          <caption>How a change reaches the screen</caption>
          <thead>
            <tr><th scope="col">Mode</th><th scope="col">What happens</th><th scope="col">Examples</th></tr>
          </thead>
          <tbody>
            <tr><td>Live</td><td>Applied at once</td><td>Exposure, fog density, sun and ambient light, camera, snow, seagrass sway</td></tr>
            <tr><td>Materials</td><td>Triforge graphs are recompiled after a 250 ms pause</td><td>Water colour, absorption, caustics, shaft intensity, bump and caustic gain</td></tr>
            <tr><td>Grade</td><td>The compositor is rebuilt after a 250 ms pause</td><td>Bloom, vignette, grain, lift, gain, saturation</td></tr>
          </tbody>
        </table>
        <h3>Making values the new defaults</h3>
        <ol>
          <li>Tune until you are happy, then press <strong>Export JSON</strong>. A file named <code>fish-pond-underwater-settings.json</code> is downloaded.</li>
          <li>Paste its <code>settings</code> object over <code>SCENE_DEFAULTS</code> in <code>src/simulation/underwater/underwater-settings.ts</code>.</li>
          <li>Rebuild. Your browser&rsquo;s saved tuning is ignored automatically once the defaults change, so nothing stale overrides them.</li>
        </ol>
        <p>
          Tuning is remembered in the browser (local storage) between visits. Reset all returns to the shipped defaults.
        </p>
      </>
    ),
  },
  {
    id: 'design',
    title: 'Design system',
    summary: 'Liquid Glass tokens, rules and the CSS architecture.',
    content: (
      <>
        <p>
          The interface follows a house look called Liquid Glass: frosted, translucent panes floating over the canvas, white text in two weights,
          hairline dividers and pill controls. Nothing is saturated except the scene behind it.
        </p>
        <h3>Rules</h3>
        <ul>
          <li>Glass only appears over imagery or the canvas; on flat colour a plain surface token is used.</li>
          <li>At most two stacked glass layers, and the inner layer is a plain translucent fill with no extra blur.</li>
          <li>Text contrast is checked against the worst background pixel, with a stronger tint as the fallback.</li>
          <li>Fallbacks ship with every glass surface: a stronger fill without blur when backdrop-filter is unsupported or transparency is reduced, and no transform transitions when reduced motion is requested.</li>
          <li>Every control has a visible focus ring and a hit area of at least 40 px.</li>
          <li>State is driven by <code>data-*</code> attribute values, never by toggling classes.</li>
        </ul>
        <h3>Tokens and naming</h3>
        <p>
          All design tokens live in one file, <code>src/app/variables.css</code>, prefixed <code>--fp-</code>. Custom classes carry the signature <code>fp-</code>, with a
          <code>-ts</code> suffix when TypeScript touches them. Layout and spacing come from Strata CSS utilities first; custom CSS covers surfaces,
          typography, colour, pseudo-classes and state. Properties are ordered alphabetically, there is no <code>!important</code>, and media queries are range-based.
        </p>
        <h3>Transitions</h3>
        <p>
          Pages cross-fade over 400 ms with React view transitions, scenes fade in when ready, and the HUD eases in and out with the same duration in both
          directions.
        </p>
      </>
    ),
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    summary: 'Keyboard, screen readers, motion and transparency preferences.',
    content: (
      <>
        <ul>
          <li>Every page has one h1 and a sequential heading order; overlays use landmarks such as header, nav, aside and section.</li>
          <li>Every icon-only button has an accessible name; decorative icons are hidden from assistive technology.</li>
          <li>Canvases have text alternatives; the landing backdrop is hidden from assistive technology because it is decorative.</li>
          <li>The custom dropdown supports arrow keys, Enter, Escape and outside click, and exposes listbox roles.</li>
          <li>The arena is fully operable from the keyboard; the benchmark cursor threat has no keyboard equivalent yet (see Known limits).</li>
          <li>Reduced motion removes transform transitions and animations; reduced transparency swaps blur for a stronger solid tint.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'performance',
    title: 'Performance',
    summary: 'What costs what, and how it is kept in check.',
    content: (
      <>
        <ul>
          <li>One WebGL engine per route, destroyed on navigation; scenes pause while scrolled out of view.</li>
          <li>The landing page reveals the water as soon as it is drawn and loads the two goldfish models (about 12 MB) afterwards in the background.</li>
          <li>React state from telemetry is throttled (10 Hz in the benchmark, 4 Hz for the fish readout); the simulations themselves run every frame.</li>
          <li>Layout is stable while data updates (fixed-height rows, tabular numerals), so nothing resizes the canvases during play.</li>
          <li>Adaptive pixel ratio steps resolution down on slow frames. Backdrop blur costs GPU time, so glass panes stay small.</li>
        </ul>
        <p>Everything was checked in headless Chrome with software rendering; real-GPU frame rates still need measuring on your devices.</p>
      </>
    ),
  },
  {
    id: 'seo',
    title: 'SEO and sharing',
    summary: 'Metadata, structured data, sitemap and social previews.',
    content: (
      <>
        <ul>
          <li>Unique title (50 to 60 characters) and description (120 to 155 characters) per route, canonical URLs, Open Graph and Twitter cards with a 1200 by 630 preview image per route.</li>
          <li>JSON-LD for the website, a WebApplication per experiment, breadcrumbs and an experiment list; a TechArticle on this page.</li>
          <li>A generated sitemap and robots file, a web app manifest, favicon set and apple touch icon, plus an llms.txt summary for AI crawlers.</li>
          <li>The site address comes from <code>NEXT_PUBLIC_SITE_URL</code>, so every absolute URL follows your domain.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'stack',
    title: 'Tech stack and structure',
    summary: 'Libraries and where things live.',
    content: (
      <>
        <table>
          <caption>Stack</caption>
          <thead>
            <tr><th scope="col">Area</th><th scope="col">Technology</th></tr>
          </thead>
          <tbody>
            <tr><td>Framework</td><td>Next.js 16 (App Router), React 19, TypeScript</td></tr>
            <tr><td>3D</td><td>Three.js, Triforge shader-core and compositor-core</td></tr>
            <tr><td>Styling</td><td>Strata CSS utilities plus CSS Modules and design tokens</td></tr>
            <tr><td>Fish AI</td><td>Laya-AI (ONNX, int8) through ONNX Runtime Web in a Web Worker, tokenised with Hugging Face Tokenizers</td></tr>
            <tr><td>Hosting</td><td>Vercel (static pages, no server code); model weights are fetched from Hugging Face by the browser</td></tr>
          </tbody>
        </table>
        <pre>
          <code>{`src/
  app/                 routes, global CSS, tokens, sitemap, robots, manifest
  components/          shared UI: HUD icons, glass select, landing backdrop
    arena/             Cognitive Arena panels and scene
    underwater/        stage, canvas, settings panel, touch pads, readout
  config/              site constants and SEO builders
  simulation/
    arena/             System 1, System 2, arbiter, memory, scenarios
    controllers/       benchmark Cases 1 to 3
    underwater/        engine, Triforge graphs, fish motor control, settings
      ai/              Laya runtime, worker, perception wording, fish intent controller
  types/               shared types for arena, benchmark and underwater
scripts/               copy-ort.ts (copies the ONNX Runtime wasm into public/ort)
public/                goldfish models, icons, social preview images`}</code>
        </pre>
      </>
    ),
  },
  {
    id: 'run',
    title: 'Run, build and deploy',
    summary: 'Commands and hosting.',
    content: (
      <>
        <pre>
          <code>{`git clone --recurse-submodules https://github.com/AftabIbrahimKazi/fish-pond.git
cd fish-pond
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the build`}</code>
        </pre>
        <p>
          The site is a static Next.js build and deploys to Vercel with no configuration. Set <code>NEXT_PUBLIC_SITE_URL</code> to the final address so canonical
          URLs, the sitemap and social previews point at it. <code>npm install</code> copies the ONNX Runtime wasm files into <code>public/ort</code>, and the
          site sends cross-origin isolation headers (needed for threaded WebAssembly). The model weights are not part of the deployment: the browser fetches them
          from Hugging Face, so the hosting plan only serves the small app.
        </p>
      </>
    ),
  },
  {
    id: 'limits',
    title: 'Known limits and roadmap',
    summary: 'What is not finished, stated plainly.',
    content: (
      <>
        <ul>
          <li>Not yet tested on a real GPU: frame rates, the automated benchmark cycle and the arena need measuring on real hardware.</li>
          <li>The benchmark cursor threat has no keyboard equivalent.</li>
          <li>The environment reflection map is baked once at load, so changing the water colour does not update reflections until a reload.</li>
          <li>Rocks have no collision for the free camera.</li>
          <li>Fish behaviour, terrain shape and scenery placement are not yet adjustable in the settings sidebar.</li>
          <li>Laya-AI is a general text classifier, not a fish model. It cannot grade danger by distance, so flee decisions rest on plain place words (see the wording notes above).</li>
          <li>A decision takes about a second per fish and the model needs a large download and a lot of memory while loading (estimated at 1 to 2 GB, not yet measured). Phones and low-end laptops may not manage it.</li>
          <li>Without Laya-AI enabled the underwater fish only drift. The landing page backdrop runs the same scene without the model, so its fish drift too.</li>
          <li>Fish do not school: grouping would have to come from the model choosing destinations near each other.</li>
          <li>The Arena and Benchmark are scripted. A second model (ReasonLite, a reasoning model) for System 2 is not implemented.</li>
          <li>Next on the list: System 2 reasoning for the underwater fish, more feeding animation, and touch support for feeding in the benchmark.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'credits',
    title: 'Credits',
    summary: 'Built on open tools.',
    content: (
      <>
        <p>
          Fish Pond is written by Aftab Ibrahim Kazi. It stands on Next.js, React, Three.js, the Triforge shader and compositor packages and Strata CSS.
          The goldfish models ship in the repository; confirm their licences before redistributing them elsewhere. The source is on
          {' '}
          <a href="https://github.com/AftabIbrahimKazi/fish-pond" rel="noopener noreferrer">GitHub</a>.
        </p>
        <h3>Laya-AI</h3>
        <ul>
          <li>
            <strong>Laya</strong> (the decision model) was created by Nandakishor M and Convai Innovations:
            {' '}
            <a href="https://huggingface.co/convaiinnovations/laya" rel="noopener noreferrer">convaiinnovations/laya</a> (Apache-2.0).
          </li>
          <li>
            The <strong>8-bit browser build and the runtime</strong> that Fish Pond&apos;s Laya code is ported from were made by nvkudva:
            {' '}
            <a href="https://github.com/nvkudva/laya-web" rel="noopener noreferrer">github.com/nvkudva/laya-web</a> and
            {' '}
            <a href="https://huggingface.co/nvkudva/laya-web-q8" rel="noopener noreferrer">nvkudva/laya-web-q8</a> (Apache-2.0 weights). The laya-web repository does not
            state a licence for its code; it is used here with credit, and will be removed or replaced if its author asks.
          </li>
          <li>
            Also used: <a href="https://github.com/microsoft/onnxruntime" rel="noopener noreferrer">ONNX Runtime Web</a> by Microsoft and
            {' '}
            <a href="https://github.com/huggingface/tokenizers.js" rel="noopener noreferrer">Tokenizers</a> by Hugging Face.
          </li>
        </ul>
      </>
    ),
  },
];
