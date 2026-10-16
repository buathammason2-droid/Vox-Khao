# KHAO Daily

News reader with NewsAPI and GDELT feeds, Gemini summaries in Thai and English, vocabulary quizzes, and ElevenLabs podcasts and music.

## Automatic deployment

The `main` branch of this private GitHub repository is the production source for the existing Vercel project `khao-daily`.

Push or commit changes to `main` to trigger a production build. Vercel runs `node scripts/build.mjs`, serves `public/`, and routes `/api/*` to the Node server function in `api/index.js`.

Production URL: https://khao-daily.vercel.app/

## Server configuration

Store `NEWSAPI_KEY`, `GEMINI_API_KEY`, and `ELEVENLABS_API_KEY` as Secret environment variables in Vercel. Never commit keys or `.env` files. See `.env.example` for variable names. GDELT requires no key. Redeploy after changing runtime variables.

## Local development

Use a current Node.js release (22 or later). Run `node scripts/build.mjs`, then `node --env-file=.env scripts/preview.mjs` to serve http://127.0.0.1:5182.

Run `node scripts/test-integrations.mjs`, `node scripts/test-ai.mjs`, `node scripts/test-audio.mjs`, and `node scripts/test-article.mjs` for deterministic service checks.

Publisher text extraction supports selected sources and may be incomplete. The UI links to the original article whenever full text is unavailable. Evidence readiness measures supplied information, not the probability that a story is true.
