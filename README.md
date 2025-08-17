# The ARK — Gemini Live Voice Bot (Server-to-Server, Bilingual)

Low‑latency voice assistant via **Gemini Live (native audio)**, with React client (**push‑to‑talk**, **barge‑in**) and **English / हिंदी / Hinglish** switch.

## Local Run
### Server
```bash
cd server
cp .env.example .env
# Add GEMINI_API_KEY and current GEMINI_LIVE_WS_URL (from Google docs)
npm i
npm run start
```
Health: http://localhost:8080/health

### Client
```bash
cd ../client
npm i
npm run dev
```
Open http://localhost:5173

## Free Deploy (Infra only — API usage may be billed)
### Backend on Render (Free) + Frontend on Netlify (Free)
- Render: Web Service from `server/`
  - Build: `npm ci`
  - Start: `node index.js`
  - Env: `PORT=8080`, `GEMINI_API_KEY=...`, `GEMINI_MODEL=gemini-live-2.5-flash-preview-native-audio`, `GEMINI_REGION=us-central1`, `GEMINI_LIVE_WS_URL=wss://<current-google-live-ws-endpoint>`
  - After deploy: note `https://<name>.onrender.com`, WS is `wss://<name>.onrender.com/ws`
- Netlify: Site from `client/`
  - Build: `npm run build`
  - Publish: `dist`
  - Env: `VITE_GATEWAY_URL=wss://<name>.onrender.com/ws`

### Backend on Fly.io + Frontend on Vercel
- Fly.io: `fly launch` in `server/`, set secrets, deploy. WS `wss://<app>.fly.dev/ws`
- Vercel: import `client/`, set `VITE_GATEWAY_URL` to Fly WS.

## Notes
- If Google’s endpoint emits Opus/webm instead of PCM16, replace `pcm-player` with a decoder pipeline.
- Use HTTPS + WSS in production.
- Headphones reduce echo-triggered self interruptions.