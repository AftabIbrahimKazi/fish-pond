---
name: liquid-glass-taste
description: Liquid Glass UI taste: frosted translucent panels, pill toggles, underline tabs over imagery or a WebGL canvas. Trigger when building or restyling panels, overlays, HUDs, toggles, tabs, settings or any UI on top of the scene.
---

# Liquid Glass Taste — the house look for overlays
Source: one Figma "Settings – Liquid Glass UI" screenshot (values below are **estimated by eye**; confirm against the design when a finer export is available). Stops UI from defaulting to flat dark cards that fight a rich background.

## Self-improvement (first and last)
1. Start: read `learnings.md` in this folder.
2. End: append one dated, concrete, mergeable bullet (what worked or was missed); merge duplicates.

## The look in one paragraph
A rounded frosted pane floats over busy imagery. The background shows through, heavily blurred and slightly darkened and tinted by the scene. White text, two weights of emphasis, hairline dividers, small pill toggles. Calm, airy spacing. Nothing is saturated except the scene behind it.

## Tokens (add to the project token file, prefix per project; here `--fp-`)
| Token | Value | Use |
|---|---|---|
| `glass-blur` | 28px | `backdrop-filter: blur()` |
| `glass-saturate` | 140% | `saturate()` in the same filter |
| `glass-tint` | rgba(14, 38, 34, 0.38) | pane fill (scene-tinted dark teal) |
| `glass-tint-strong` | rgba(14, 38, 34, 0.62) | fallback and reduced-transparency fill |
| `glass-border` | rgba(255, 255, 255, 0.2) | 1px pane edge |
| `glass-highlight` | rgba(255, 255, 255, 0.28) | inner top edge (inset 0 1px 0) |
| `glass-shadow` | rgba(0, 0, 0, 0.28) | soft drop shadow, 0 18px 48px |
| `glass-divider` | rgba(255, 255, 255, 0.16) | hairlines, tab rule |
| `glass-text` | #ffffff | titles, active labels |
| `glass-text-muted` | rgba(255, 255, 255, 0.64) | descriptions |
| `glass-radius-pane` / `-control` | 28px / 999px | panes / pills and chips |
| `glass-toggle-on` | rgba(255, 255, 255, 0.62) | on track (knob white) |
| `glass-toggle-off` | rgba(255, 255, 255, 0.22) | off track (knob white) |

## Recipes (checkable)
- **Pane:** `background: glass-tint; backdrop-filter: blur(28px) saturate(140%); border: 1px solid glass-border; border-radius: 28px; box-shadow: inset 0 1px 0 glass-highlight, 0 18px 48px glass-shadow;` padding 24px.
- **Title:** 20px, weight 500, letter-spacing -0.01em, white. One per pane.
- **Tabs:** 12px, muted; active = white with a 1px white underline 10px below the label; a full-width `glass-divider` hairline under the row.
- **Row:** title 12px/500 white over description 11px `glass-text-muted`, 16–20px vertical rhythm, toggle on the left (24×14 pill, 10px knob) or chip on the right.
- **Chip / button:** same tint, `glass-radius-control`, 12px/600 text, hover raises tint alpha by 0.1 (no colour change).
- **Toggle state:** drive with `data-state="on|off"` (value update only, never add/remove classes), knob moves with `transform`, 150–250ms ease.

## Rules
1. Glass only over imagery or the canvas. On a flat colour, use a plain surface token. Stop: glass on nothing looks like a blurry grey box.
2. Max 2 stacked glass layers; never glass inside glass inside glass (blur cost and mud).
3. Text contrast ≥ 4.5:1 against the *worst* background pixel beneath; if unsure, raise the tint alpha; keep the text white.
4. Always ship the fallbacks: `@supports not (backdrop-filter: blur(1px))` and `@media (prefers-reduced-transparency: reduce)` → `glass-tint-strong`, no blur.
5. `@media (prefers-reduced-motion: reduce)` → no transform transitions on toggles.
6. Focus: `:focus-visible` 2px white ring with 2px offset on every control; hit area ≥ 40px tall even when the visual pill is 24px.
7. Backdrop blur costs GPU: on a WebGL canvas keep panes small (< ~35% of viewport) and avoid animating their size.
8. Use project tokens and Strata utilities for layout/spacing; put only the glass surface, typography and colour in the CSS Module. No inline styles.
9. Keep copy short: one-line descriptions, sentence case, no icons unless they carry meaning.

## Do not
Colourful gradients on panes, drop-shadow glows, sharp corners under 12px, borders thicker than 1px, pure-black tints, more than one accent, centred body text.
