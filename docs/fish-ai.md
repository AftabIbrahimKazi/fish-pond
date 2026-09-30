# Fish behaviour systems

Fish Pond contains three separate behaviour systems. None of them uses a machine-learning model: they are deterministic, seeded TypeScript simulations.

## 1. Cognitive Arena (`src/simulation/arena/`)

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

## 2. Benchmark controllers (`src/simulation/controllers/`)

| Case | File | Behaviour |
|---|---|---|
| 1 System 0 | `case-1-reflex.ts` | States IDLE, DART, APPROACH. Threat within 7 units triggers a dart (held at least 0.9 s), food within 10 units an approach. Instant, rigid transitions. |
| 2 System 1 | `case-2-lottery.ts` | Probabilities over Glide, Startle-Dart, Curious-Hover and Anxious-Freeze, a seeded weighted lottery, then smoothing for momentum. |
| 3 Dual-process | `case-3-reasoning.ts` | No presets. Threat (range 14) and food (range 16) intents drive spine, tail and fins continuously; a conflict threshold of 0.25 produces ambivalent hesitation. |

All controllers are clamped by the same `FISH_SAFETY_LIMITS` (tail 0.8-7.5 Hz, spine curve 0.05-0.95, fin resistance 0.1-1.0, speed 0.2-8).

The `telemetry-bus.ts` singleton distributes identical inputs, owns the 16-second automated cycle (approach 0-6 s, conflict 6-11 s, remainder) and removes a pellet only after every viewport has eaten it.

> The original specification names Laya-AI and ReasonLite ONNX models for Cases 2 and 3. The runtime is installed but not wired in; the controllers above keep the same structure.

## 3. Underwater fish (`src/simulation/underwater/`)

System 1 only. One large Jikin and two small Tosakin goldfish.

### Temperaments

| Fish | Temperament | Boldness | Greed | Sociability | Speed | Wander |
|---|---|---|---|---|---|---|
| Jikin | Calm elder | 0.75 | 0.8 | 0.2 | 0.9 | 0.6 |
| Tosakin | Bold forager | 0.8 | 1.25 | 0.5 | 1.2 | 1.5 |
| Tosakin | Shy follower | 1.4 | 0.65 | 1.5 | 0.85 | 0.8 |

### Priority (`fish-school-controller.ts`)

Cursor threat, then food, then social, then path following.

- **Cursor:** a ray through the scene; only fish close to the ray flee, with a radius scaled by size and boldness.
- **Path picking:** each fish scores random spots by taste (cover versus open water, company, trip length, crowding), swims there in wide curves with speed variation, dwells 1-3 s and repeats.
- **Entrance:** fish spawn beyond the frame on random left or right edges with staggered delays.
- **Food:** a click drops 26 pellets (instanced, drag-limited sinking, slight drift). Ground pellets trigger a head-down nibble. Settled pellets dissolve after 34 s.
- **Collision:** nose, middle and tail samples against the seabed and rock ellipsoids, plus fish-versus-fish push-apart.

The HUD readout shows each fish's state, speed, depth, appetite, panic and target distance four times a second.
