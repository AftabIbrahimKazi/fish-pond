# Deployment

Fish Pond is a static Next.js build: every route is prerendered and there is no server code or API.

## Local production build

```bash
npm install
npm run build
npm run start   # http://localhost:3000
```

## Vercel

1. Import the GitHub repository in Vercel (or run `vercel` from the project folder).
2. Framework preset: **Next.js**. No build settings need changing.
3. Add the environment variable `NEXT_PUBLIC_SITE_URL` with your final address, for example `https://fish-pond.vercel.app`.
4. Deploy. Pushes to `main` redeploy automatically.

### Command line

```bash
npm i -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SITE_URL production
vercel deploy --prod
```

## After deploying

- Open `/sitemap.xml`, `/robots.txt` and `/manifest.webmanifest` and check the domain.
- Update the domain in `public/llms.txt` and `public/.well-known/security.txt` if it differs from the default.
- Share a page URL in a chat or social tool to confirm the preview card.
- Add the site to Google Search Console and submit the sitemap.

## Assets and caching

- `public/*.glb` (about 12 MB of goldfish models) is cached for a week with stale-while-revalidate.
- `public/og/` and `public/icons/` are cached for a day.
- Security headers are set in `next.config.ts`.

## Notes

- The `ai-dev-kit` submodule is development-only and is not needed to build.
- WebGL 2 is required in the visitor's browser.
