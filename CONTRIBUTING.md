# Contributing to Fish Pond

Thanks for your interest. Fish Pond is a small research and design project, and thoughtful contributions are welcome.

## Before you start

- Search existing [issues](https://github.com/AftabIbrahimKazi/fish-pond/issues) and pull requests.
- For anything larger than a small fix, open an issue first so we can agree on the approach.
- Read the [code of conduct](CODE_OF_CONDUCT.md).

## Setup

```bash
git clone --recurse-submodules https://github.com/AftabIbrahimKazi/fish-pond.git
cd fish-pond
npm install
npm run dev
```

Node.js 20 or newer is required. A browser with WebGL 2 is needed to see the scenes.

## Standards

The project follows layered coding standards. Read [`coding-standards/index.md`](coding-standards/index.md) and the partial for the kind of file you are editing before changing it. The essentials:

- **CSS:** design tokens only (`--fp-*` from `src/app/variables.css`), properties in alphabetical order, no `!important`, no nesting, range-based media queries, selectors with the `fp-` signature, state through `data-*` values.
- **TypeScript:** explicit types, no magic numbers (name your constants), no `console.log`, event listeners cleaned up, classes implement `destroy()`, private members use `private _name`.
- **HTML and accessibility:** one `h1` per page, sequential headings, labelled controls, visible focus, 40 px hit areas, support for reduced motion and reduced transparency.
- **SEO:** every page has a unique title (50-60 characters) and description (120-155), a canonical URL and social tags. Edit copy in `src/config/site.ts`.
- **Glass UI:** glass only over the canvas, at most two layers, with the standard fallbacks. See [docs/design-system.md](docs/design-system.md).

## Workflow

1. Create a branch from `main` named `type/short-description`, for example `feature/keyboard-threat` or `fix/arena-lockout`.
2. Make focused changes. Keep unrelated work in separate pull requests.
3. Check your work:
   ```bash
   npx tsc --noEmit
   npx eslint src
   npm run build
   ```
4. Look at the result in a browser at desktop and phone width, and with the reduced-motion and reduced-transparency settings if you touched the UI.
5. Open a pull request using the template and describe what changed and why.

## Commit messages

Conventional Commits, present tense, 50 characters or fewer in the summary, no full stop:

```text
feat: add keyboard control for the benchmark threat
fix: stop arena lockout ignoring fear
docs: explain the settings JSON workflow
```

Types: `feat`, `fix`, `patch`, `style`, `refactor`, `chore`, `docs`, `test`, `remove`. Declare breaking changes in the footer with `BREAKING CHANGE:`.

## Versioning

Versions use `major.feature.patch`. The bump happens once per push, as the last step, and is recorded in [CHANGELOG.md](CHANGELOG.md). Maintainers handle this when merging.

## Reporting bugs and ideas

Use the issue templates. For security problems follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
