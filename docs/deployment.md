# Deployment

Fish Pond is a static Next.js build: every route is prerendered and there is no server code or API.

## Local production build

```bash
npm install     # also copies the ONNX Runtime wasm into public/ort/
npm run build
npm run start   # http://localhost:3000
```

Node.js 22.6 or newer is required: the install script (`scripts/copy-ort.ts`) runs TypeScript directly. Set the Node version of the Vercel project to 22.x or 24.x.

## Vercel

1. Import the GitHub repository in Vercel (or run `vercel` from the project folder).
2. Framework preset: **Next.js**. No build settings need changing.
3. Add the environment variable `NEXT_PUBLIC_SITE_URL` with your final address, for example `https://fish-pond-mu.vercel.app`.
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

## Laya-AI and the free plan

The Underwater fish are driven by the Laya model, which runs in the visitor's browser. Nothing about it runs on Vercel:

- The weights (about 524 MB) are fetched by the browser from Hugging Face (`https://huggingface.co/nvkudva/laya-web-q8/resolve/main/v1`, set in `laya-constants.ts`) and cached in the Cache API. They are not part of the deployment, so they do not count toward Vercel's size or bandwidth limits.
- `public/ort/` (the ONNX Runtime wasm and loader, about 14 MB) is generated at install time and ignored by git; it is served as a normal static file.
- Threaded WebAssembly needs a cross-origin isolated page. `next.config.ts` sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on every route. Hugging Face answers the weight requests with CORS, which this policy allows. If a third-party embed or script is ever added, it must be CORS- or CORP-enabled.
- If the Hugging Face repository moves or is removed, change `LAYA_MODEL_URL` (or host the files yourself: `encoder_q8.onnx(.data)`, `head_q8.onnx(.data)`, `tokenizer.json`, `tokenizer_config.json`, `rl_agent_config.json` under one folder with CORS enabled).

## Assets and caching

- `public/*.glb` (about 12 MB of goldfish models) is cached for a week with stale-while-revalidate.
- `public/og/` and `public/icons/` are cached for a day.
- Security and cross-origin isolation headers are set in `next.config.ts`.

## Notes

- The `ai-dev-kit` submodule is development-only and is not needed to build.
- WebGL 2 is required in the visitor's browser; Laya-AI additionally needs WebAssembly threads (a cross-origin isolated page) and a lot of memory while loading.
