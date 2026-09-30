# Design system

## Liquid Glass

A rounded, frosted pane floats over busy imagery. The background shows through, heavily blurred and slightly tinted. White text, two weights of emphasis, hairline dividers and small pill controls. Nothing is saturated except the scene behind it.

### Tokens

All tokens live in `src/app/variables.css`, prefixed `--fp-`.

| Token | Value | Use |
|---|---|---|
| `--fp-glass-blur` | 28px | `backdrop-filter: blur()` |
| `--fp-glass-saturate` | 140% | Saturation in the same filter |
| `--fp-glass-tint` | `rgba(14, 38, 34, 0.38)` | Pane fill |
| `--fp-glass-tint-strong` | `rgba(14, 38, 34, 0.62)` | Fallback fill |
| `--fp-glass-fill` / `-hover` | white at 8% / 14% | Inner layer, no blur |
| `--fp-glass-border` | white at 20% | Pane edge |
| `--fp-glass-divider` | white at 16% | Hairlines |
| `--fp-glass-radius-pane` / `-control` | 1.75rem / pill | Panes and controls |
| `--fp-glass-hit` | 2.5rem | Minimum hit area |

The blur, tint and radius values were eyeballed from a design screenshot and still need confirming against the original Figma file.

### Rules

1. Glass only over imagery or the canvas. On flat colour use a surface token.
2. At most two stacked glass layers. The inner layer is a plain translucent fill.
3. Text contrast of at least 4.5:1 against the worst background pixel; raise the tint before changing the text colour.
4. Ship the fallbacks: a stronger fill when `backdrop-filter` is unsupported or `prefers-reduced-transparency` is set, and no transform transitions when `prefers-reduced-motion` is set.
5. `:focus-visible` shows a 2px white ring with a 2px offset on every control.
6. Keep panes small over a WebGL canvas (under about 35% of the viewport).
7. Layout and spacing use Strata utilities; the CSS Module holds only surface, typography, colour and state.

### Colour

Semantic accents are kept for meaning and used on small indicators only: rose for threat, amber for food, cyan for telemetry, emerald for calm, purple for conflict. They are never used as pane fills.

## CSS conventions

- Tokens only; no hard-coded colours, spacing or sizes.
- Properties are ordered alphabetically; shorthand is preferred; no `!important`; no nesting.
- Selectors use the `fp-` signature, with a `-ts` suffix when TypeScript drives them.
- State is a `data-*` attribute value (`data-state="open"`), never a toggled class.
- Media queries are range-based and sit at the bottom of each file.
- Transitions name the property, take their duration from a token and use `ease-in-out` for soft motion.

## Motion

- Page changes cross-fade over 400 ms (`src/app/template.tsx`, `globals.css`).
- Scenes fade in when ready; HUD layers fade with `--fp-duration-slow` in both directions.
- Everything respects `prefers-reduced-motion`.

## Full standards

The project follows layered standards in [`coding-standards/`](../coding-standards/index.md): CSS, HTML, TypeScript, SEO, performance, accessibility and QA.
