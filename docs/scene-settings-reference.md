# Scene settings reference

Generated from `src/simulation/underwater/underwater-settings.ts`. Defaults are the values currently in `SCENE_DEFAULTS`.
There are **62 settings** in ten groups.

**Apply modes:** *Live* applies at once; *Materials* recompiles the Triforge node graphs after a 250 ms pause; *Grade* rebuilds the compositor after a 250 ms pause.

## Water

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Water colour | `fogColor` | colour | - | `#4b5658` | Materials |
| Fog density | `fogDensity` | 0 to 0.12 | 0.001 | `0.015` | Live |
| Red absorption | `absorptionRed` | 0 to 0.6 | 0.005 | `0.5` | Materials |
| Green absorption | `absorptionGreen` | 0 to 0.6 | 0.005 | `0.1` | Materials |
| Blue absorption | `absorptionBlue` | 0 to 0.6 | 0.005 | `0.05` | Materials |
| Exposure | `exposure` | 0.3 to 2.5 | 0.01 | `0.75` | Live |
| Surface brightness | `surfaceBrightness` | 0 to 3 | 0.05 | `1` | Materials |
| Sun glow | `domeGlowGain` | 0 to 2 | 0.05 | `0.5` | Materials |

## Light

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Sun intensity | `sunIntensity` | 0 to 8 | 0.05 | `5.75` | Live |
| Sun colour | `sunColor` | colour | - | `#c8e1e1` | Live |
| Ambient intensity | `hemiIntensity` | 0 to 3 | 0.05 | `1.5` | Live |
| Ambient colour | `hemiSkyColor` | colour | - | `#64c8c8` | Live |
| Reflections | `environmentIntensity` | 0 to 3 | 0.05 | `0.75` | Live |
| Rim intensity | `rimIntensity` | 0 to 4 | 0.05 | `2.75` | Live |
| Rim colour | `rimColor` | colour | - | `#96afc8` | Live |
| Fill intensity | `fillIntensity` | 0 to 3 | 0.05 | `2.75` | Live |
| Fill colour | `fillColor` | colour | - | `#c86432` | Live |
| Dappling amount | `dappleAmount` | 0 to 0.6 | 0.01 | `0.25` | Live |
| Dappling speed | `dappleSpeed` | 0 to 4 | 0.05 | `2` | Live |

## Caustics

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Strength | `causticStrength` | 0 to 6 | 0.05 | `1.75` | Materials |
| Scale A | `causticScaleA` | 20 to 400 | 1 | `340` | Materials |
| Scale B | `causticScaleB` | 20 to 400 | 1 | `120` | Materials |
| Speed A | `causticSpeedA` | 0 to 80 | 0.5 | `20` | Materials |
| Speed B | `causticSpeedB` | 0 to 80 | 0.5 | `55` | Materials |
| Depth falloff | `causticDepthFalloff` | 0 to 0.3 | 0.005 | `0.11` | Materials |
| Colour | `causticColor` | colour | - | `#c8fafa` | Materials |

## Shafts

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Intensity | `shaftIntensity` | 0 to 1.5 | 0.01 | `0.25` | Materials |
| Count | `shaftCount` | 0 to 24 | 1 | `10` | Live |
| Width | `shaftWidthScale` | 0.3 to 3 | 0.05 | `1` | Live |

## Snow

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Count | `particleCount` | 0 to 1800 | 10 | `1150` | Live |
| Size | `particleSize` | 0.01 to 0.2 | 0.005 | `0.15` | Live |
| Opacity | `particleOpacity` | 0 to 1 | 0.01 | `0.25` | Live |
| Drift speed | `particleDriftSpeed` | 0 to 0.5 | 0.005 | `0.225` | Live |

## Camera

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Field of view | `cameraFov` | 20 to 90 | 0.5 | `50` | Live |
| Drift radius | `cameraDriftRadius` | 0 to 3 | 0.05 | `2.5` | Live |
| Drift speed | `cameraDriftSpeed` | 0 to 0.4 | 0.005 | `0.1` | Live |
| Bob amount | `cameraBobAmplitude` | 0 to 0.6 | 0.01 | `0.5` | Live |
| Parallax X | `cameraParallaxX` | 0 to 4 | 0.05 | `2` | Live |
| Parallax Y | `cameraParallaxY` | 0 to 3 | 0.05 | `2` | Live |
| Parallax damping | `cameraParallaxDamping` | 0.3 to 6 | 0.05 | `1.5` | Live |

## Grade

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Bloom threshold | `bloomThreshold` | 0 to 1.5 | 0.01 | `0.25` | Grade |
| Bloom strength | `bloomStrength` | 0 to 2 | 0.01 | `0.75` | Grade |
| Bloom radius | `bloomRadius` | 0 to 1 | 0.01 | `0.75` | Grade |
| Vignette darkness | `vignetteDarkness` | 0 to 1 | 0.01 | `0.75` | Grade |
| Vignette offset | `vignetteOffset` | 0.05 to 1 | 0.01 | `0.25` | Grade |
| Film grain | `grainIntensity` | 0 to 0.3 | 0.005 | `0.225` | Grade |
| Shadows red | `gradeLiftR` | -0.1 to 0.1 | 0.002 | `-0.06` | Grade |
| Shadows green | `gradeLiftG` | -0.1 to 0.1 | 0.002 | `0.04` | Grade |
| Shadows blue | `gradeLiftB` | -0.1 to 0.1 | 0.002 | `0.08` | Grade |
| Highlights red | `gradeGainR` | 0.6 to 1.4 | 0.005 | `1.25` | Grade |
| Highlights green | `gradeGainG` | 0.6 to 1.4 | 0.005 | `1` | Grade |
| Highlights blue | `gradeGainB` | 0.6 to 1.4 | 0.005 | `1.175` | Grade |
| Saturation | `gradeSaturation` | 0 to 2 | 0.01 | `1.15` | Grade |

## Plants

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Sway speed | `seagrassSwaySpeed` | 0 to 3 | 0.05 | `1.5` | Live |
| Sway amount | `seagrassSwayAmplitude` | 0 to 1 | 0.01 | `0.5` | Live |

## Shadow

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Opacity | `fishShadowOpacity` | 0 to 1 | 0.01 | `0.75` | Materials |
| Size | `fishShadowSize` | 0.3 to 3 | 0.05 | `0.75` | Live |
| Spread with height | `fishShadowSpread` | 0 to 0.4 | 0.005 | `0.35` | Live |

## Surfaces

| Setting | Key | Range | Step | Default | Applies |
|---|---|---|---|---|---|
| Sand bump | `seabedBump` | 0 to 3 | 0.05 | `2.25` | Materials |
| Sand caustics | `seabedCausticGain` | 0 to 2 | 0.05 | `1.75` | Materials |
| Rock bump | `rockBump` | 0 to 5 | 0.05 | `3.25` | Materials |
| Rock caustics | `rockCausticGain` | 0 to 2 | 0.05 | `1.55` | Materials |
