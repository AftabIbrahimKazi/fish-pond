# Fish behaviour systems

Fish Pond contains three separate behaviour systems. **Only the third, the Underwater fish, uses an AI model** (Laya-AI). The Cognitive Arena and the Benchmark controllers are scripted, deterministic TypeScript simulations, and the interface labels them "no AI".

| System | Where | AI model? |
|---|---|---|
| Cognitive Arena | `src/simulation/arena/` | No, scripted |
| Benchmark controllers | `src/simulation/controllers/` | No, scripted |
| Underwater fish | `src/simulation/underwater/` + `ai/` | **Yes, Laya-AI decides** |

## 1. Cognitive Arena (`src/simulation/arena/`) — scripted, no AI

One fish in a pond 32 by 16 units and 7 tall.

### Stimuli

| Key | Stimulus | Class |
|---|---|---|
| 1 | Looming shadow | Known threat |
| 2 | Glass tap (instant) | Known threat |
| 3 | Light flash (instant) | Known threat |
| 4 | Food pellet | Known food |
| 5 | Novel rock | Unknown |
| 6 | Novel food | Unknown |
| 7 | Drifting leaf | Unknown |
| 8 | Lure | Unknown |

### System 1 (`system1-reflex.ts`)

Reacts only to known stimuli. After a perception latency of 80-120 ms a committed reflex fires. The reflex comes from a weighted lottery over designer presets, the same idea as benchmark Case 2. Threat reflexes always pre-empt food strikes; hunger and fear gate food strikes.

### System 1+2 (`system2-appraiser.ts`)

A per-object state machine: **notice, cautious approach, inspect, probe, verdict**. Duration scales with novelty, from about 0.7 s for a remembered kind to about 4.5 s for a new one. The verdict (food, safe, threat) and a confidence value are written to memory.

### Arbiter (`arbiter.ts`)

1. A reflex always wins. If an appraisal is running it is aborted (mode `S1_OVERRIDE`) and System 2 is locked out for 2.5 s.
2. While locked out, or while fear is above 0.45, the mode is `LOCKOUT`.
3. Otherwise the fish is `S2_DELIBERATING` or `IDLE`.

An override adds a valence penalty (0.35) to the interrupted object. A harmless rock interrupted by a shadow can therefore be judged a threat later, which models a learned association. Revisit this if it ever reads as a bug.

### State and memory

- Hunger starts at 0.45, rises 0.012 per second and drops 0.5 when the fish eats.
- Fear peaks at 1.0 and decays 0.3 per second.
- `FishMemory` keeps each appraised kind for a span (default 30 s, slider 5-120 s). Meeting it again refreshes the timer; expiry makes the kind novel again.

### Scenarios

Interrupted inspection, Hunger versus fear, Novelty meets threat, Learned aversion.

## 2. Benchmark controllers (`src/simulation/controllers/`) — scripted, no AI

| Case | File | Behaviour |
|---|---|---|
| 1 System 0 | `case-1-reflex.ts` | States IDLE, DART, APPROACH. Threat within 7 units triggers a dart (held at least 0.9 s), food within 10 units an approach. Instant, rigid transitions. |
| 2 Preset lottery | `case-2-lottery.ts` | Probabilities over Glide, Startle-Dart, Curious-Hover and Anxious-Freeze, a seeded weighted lottery, then smoothing for momentum. |
| 3 Blended intent | `case-3-reasoning.ts` | No presets. Threat (range 14) and food (range 16) intents drive spine, tail and fins continuously; a conflict threshold of 0.25 produces ambivalent hesitation. |

All controllers are clamped by the same `FISH_SAFETY_LIMITS` (tail 0.8-7.5 Hz, spine curve 0.05-0.95, fin resistance 0.1-1.0, speed 0.2-8).

The `telemetry-bus.ts` singleton distributes identical inputs, owns the 16-second automated cycle (approach 0-6 s, conflict 6-11 s, remainder) and removes a pellet only after every viewport has eaten it.

> The original specification names Laya-AI and ReasonLite ONNX models for Cases 2 and 3. **They are not used.** The benchmark stays scripted so that the three architectures can be compared deterministically, and its labels say "no AI". The Laya-AI model is used for the Underwater fish instead (below). ReasonLite is not implemented.

## 3. Underwater fish (`src/simulation/underwater/`) — Laya-AI decides

One large Jikin and two small Tosakin goldfish. Every decision about what a fish does is made by **Laya-AI**, a System 1 decision model that runs in the browser. There is no coded fallback: with Laya-AI off, the fish only drift.

### What the model decides

| Decision | Question put to Laya | Acted on when |
|---|---|---|
| Flee | Yes/no: "A human hand is next to the goldfish", given a description of where the hand is | probability >= 0.5 |
| Eat | Yes/no: "The fish should go and eat the food now", given the fish's first-person view | probability >= 0.5 |
| Where to swim | Choice of four candidate spots, each described in words (distance, cover, company, height) | the chosen spot becomes the destination |

Answers are held until the next answer for that fish arrives, and are ignored after 8 s without a refresh.

### What stays in code

Code carries out decisions and keeps the world physical. It never chooses to flee, eat or travel:

- steering toward the chosen destination, speed, glide and acceleration;
- the direction that points away from the cursor (geometry only);
- personal space between fish, collision with the seabed and rocks, the tank walls;
- body pose, nibble animation and swallowing a pellet that reaches the mouth;
- the entrance script (fish swim in from beyond the frame before their first decision).

A question is only asked when it applies: the flee question while a hand is within 8 body lengths (or a fear answer is still lingering) and the eat question while food is perceived (or an eat answer lingers). A fish with a hand near is asked at once, nearest first, with the flee question only (one question, about 0.7 s), ahead of every other request. A fish that needs a destination is served ahead of routine questions, alternating with them so neither starves.

### How it runs (`src/simulation/underwater/ai/`)

| File | Role |
|---|---|
| `laya-inference-engine.ts` | Loads the encoder and head, runs a question: tokenise, encode, head, temperature-scaled softmax |
| `laya-sequence.ts`, `laya-postprocess.ts`, `laya-tokenizer-loader.ts` | Build the exact token sequence Laya expects and turn logits into answers |
| `laya-worker.ts`, `laya-worker-controller.ts` | Run the engine in a Web Worker and resolve requests by id |
| `fish-perception-text.ts` | Wording of the situation (see below) |
| `fish-intent-controller.ts` | Chooses whom to ask, asks, and records the answers on each fish |
| `fish-intent-constants.ts`, `laya-constants.ts` | Thresholds, wording limits, model URL |

The engine, worker and sequence code are ported from [nvkudva/laya-web](https://github.com/nvkudva/laya-web). The sequence builder is checked token-for-token against the author's 26 reference fixtures.

- **Weights:** [nvkudva/laya-web-q8](https://huggingface.co/nvkudva/laya-web-q8), an 8-bit build of [convaiinnovations/laya](https://huggingface.co/convaiinnovations/laya), about 524 MB, fetched by the browser from Hugging Face and kept in the Cache API (`laya-weights-v1`).
- **Runtime:** ONNX Runtime Web (wasm, threaded). The runtime files are copied to `public/ort/` by `scripts/copy-ort.ts` on install. Threads need cross-origin isolation, so `next.config.ts` sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. The weights are fetched in CORS mode, which the policy allows.
- **Speed:** a flee decision takes about 0.7 s (one question) and the first fish flees 1.1 to 1.9 s after the pointer enters the scene (measured over seven pointer positions, 8 threads, 16-thread laptop, hardware graphics, 31 to 44 fps with the model running). Eat checks and destination choices take about 1.2 s. Slow devices take longer.
- **Opt-in:** the Enable Laya-AI chip starts the download. The choice is remembered in `localStorage` (`fp-laya-enabled`).

### The wording is part of the experiment

Laya is a text classifier trained on business workflows (tickets, invoices, security incidents). It is not trained on fish, so the way the situation is worded decides what it answers. Tests run during development (one question at about 1 s each):

- **Eat works well.** With a first-person view that also says what the fish sees of the hand ("I am a goldfish. I see no hand. Food is 20 cm away. I am hungry."), "The fish should go and eat the food now" scored 86 to 93% with food in view and 0 to 16% with none. Without the "I see no hand" sentence the same question dropped to 0 to 23%.
- **Danger by distance does not work.** "The fish is in danger and should flee", "I am in danger", score questions (how dangerous?) and two-option choices gave about the same answer for a hand 10 cm away as for one 3 m away, on both the base checkpoint and `laya-typed-decisions`, and also when the situation was framed as a security incident (the gap between the cases that should flee and those that should not was between -20 and +11 points). The one wording that did separate them put the word "DANGER" into the situation text, which would have been code making the decision, so it was not used.
- **Closeness in place words does work.** "A human hand is in the water right next to the goldfish" with "A human hand is next to the goldfish" scored 76 to 80% for a hand within about 50 cm and 3 to 31% for a hand 90 cm to 3 m away. So the flee question asks about closeness, described in place words, and the model's answer decides.
- **Multiple-choice questions are biased** toward their first option, so the destination options are shuffled for every request.
- **Small wording changes move answers a lot.** The sentences are fixed in `fish-perception-text.ts`; change them only with a re-test.

These are limits of the model that the project reports rather than hides. A model fine-tuned on this task, or ReasonLite for System 2, would be the way to improve them.

### Temperaments

| Fish | Temperament | Speed | Wander |
|---|---|---|---|
| Jikin | Calm elder | 0.9 | 0.6 |
| Tosakin | Bold forager | 1.2 | 1.5 |
| Tosakin | Shy follower | 0.85 | 0.8 |

Temperament scales speed, wander rate and preferred depth. The label is also part of the destination question. Boldness, greed and sociability are no longer used by code, because those choices now belong to the model.

### Food and collisions

A click drops 26 pellets (instanced, drag-limited sinking, slight drift). Ground pellets trigger a head-down nibble. Settled pellets dissolve after 34 s. Collision uses nose, middle and tail samples against the seabed and rock ellipsoids, plus fish-versus-fish push-apart.

### Known limits

- Without the model the fish drift. This includes the landing page backdrop, which runs the same scene without the model.
- The model must be downloaded (about 524 MB) and needs a lot of memory while loading; low-end and mobile devices may fail, in which case the chip says so and the fish stay idle.
- Fish do not school: grouping would have to come from the model choosing destinations near each other.
- Decisions lag by about a second per fish, and a fish keeps acting on its last answer meanwhile.

The HUD readout shows, for each fish, a unique marker (#1, #2, #3), its state, appetite, panic and the model's latest flee and eat answers, four times a second. Hovering a fish (or its readout block) raises a small arrow label with the marker, name and current state and scales up that fish's block, so the on-screen fish and its numbers can be matched at a glance. The label follows the fish and hides after about 4 seconds.

## Credits

- **Laya** by Nandakishor M and Convai Innovations: [convaiinnovations/laya](https://huggingface.co/convaiinnovations/laya) (Apache-2.0).
- **8-bit browser build and runtime** by nvkudva: [github.com/nvkudva/laya-web](https://github.com/nvkudva/laya-web) and [huggingface.co/nvkudva/laya-web-q8](https://huggingface.co/nvkudva/laya-web-q8) (weights Apache-2.0). The laya-web repository does not state a licence for its code; the ported code here is used with credit and will be removed or replaced if the author asks.
- ONNX Runtime Web by Microsoft and Tokenizers by Hugging Face.
