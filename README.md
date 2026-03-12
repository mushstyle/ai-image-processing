# Nano Banana Playground

Private internal playground for testing AI image generation and image-conditioned prompting.

This repo is a Vite React frontend plus a single Express backend for the private "Nano Banana" workshop UI. It is focused on Gemini image experiments with prompts, uploaded images, pasted images, and image URLs.

## What It Does

- Run prompt-only or image-conditioned Gemini requests from a browser UI
- Upload files, paste from clipboard, or provide image URLs
- Save prompts, preview outputs, download results, and reuse generated images as inputs
- Convert HEIC/HEIF uploads automatically

## Run The Playground

Requirements:

- Node.js 22.10+
- `GEMINI_API_KEY`
- Clerk environment variables for the private app

Start the web app:

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:5173`.

## Deploy Notes

- Host: `mush-etl`
- Domain: `banana1.mush.style`
- Remote path: `/root/pkg/nano-banana`
- Port: `3001`
- Reverse proxy: Caddy should point `banana1.mush.style` to `localhost:3001`
- Runtime: source NVM on the server before starting the app
- Required Node version on the server: `>= 22.10.0`
- Process model: internal-use manual `node dist/server/index.js` via the scripts in `scripts/`

## Notes

- The web app is the primary interface.
- The current web playground targets Google's `gemini-3.1-flash-image-preview` by default.
- Access is restricted through Clerk auth and an allowlist.
- Saved prompts are stored in `data/prompts.json`.
