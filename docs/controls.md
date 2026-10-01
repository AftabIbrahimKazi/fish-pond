# Controls

## Underwater (`/underwater`)

| Input | Action |
|---|---|
| Mouse move | Camera parallax. The cursor is the hand Laya-AI judges: fish flee when the model says a hand is next to them (needs Laya-AI enabled). |
| Hover a fish (or its readout block on the right) | An arrow label with the fish's marker, name and state follows it for about 4 seconds, and its readout block scales up. |
| Enable Laya-AI chip | Download and start the model (about 524 MB, cached); click again to switch it off. |
| Click or tap the water | Drop fish food (26 pellets). |
| `W` `S` | Move forward and back along the current heading. |
| `A` `D` | Strafe left and right. |
| `←` `→` | Turn left and right. |
| `↑` `↓` | Look up and down. |
| Move pad (bottom-left) | Touch equivalent of `WASD`. Shown on narrow screens and touch devices. |
| Look pad (bottom-right) | Touch equivalent of the arrow keys. |
| **Scene settings** | Open the settings sidebar. |
| **Hide HUD** | Hide every overlay; press **Show HUD** to bring them back. |

Navigation is added on top of the automatic camera, so the drift and mouse parallax are unchanged. The camera is clamped to the tank and stays above the seabed; rocks have no camera collision. Keys are ignored while a slider, number box or menu has focus, so the sidebar stays keyboard-friendly. Holding several touch buttons at once works (move and turn together).

## Cognitive Arena (`/arena`)

| Input | Action |
|---|---|
| `1`-`8` | Choose a stimulus (`2` and `3` fire instantly). |
| Click the water | Place the chosen stimulus. |
| `Esc` | Cancel placement. |
| `Space` | Pause and resume. |
| `R` | Reset. |
| **Stimuli** chip | Open the palette and scenarios pane (desktop). |
| Tabs at the bottom | The same content as bottom sheets on phones. |
| Speed menu | 0.5x, 1x or 2x. Arrow keys, Enter and Esc work. |

## Benchmark (`/benchmark`)

| Input | Action |
|---|---|
| Move the cursor over any pond | Steer a descending hand threat in all three ponds. |
| Click a pond or **Drop food** | Add a food pellet. |
| **Clear** | Remove pellets. |
| **Cursor / Test cycle** | Switch between live input and the 16-second scripted sequence. |
| **Compare** | Open the architecture comparison matrix. |
| **Hide HUD** | Hide titles, telemetry and the header. |

The cursor threat has no keyboard equivalent yet.
