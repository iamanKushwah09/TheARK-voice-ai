import 'dotenv/config';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';
import pino from 'pino';

const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-live-2.5-flash-preview-native-audio';
const GEMINI_LIVE_WS_URL = process.env.GEMINI_LIVE_WS_URL;

if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY in .env');
if (!GEMINI_LIVE_WS_URL) throw new Error('Missing GEMINI_LIVE_WS_URL in .env');

app.get('/health', (_req, res) => res.json({ ok: true, name: 'The ARK Gateway' }));

const server = app.listen(PORT, () => log.info({ port: PORT }, 'HTTP server listening'));

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', async (client, req) => {
  const sessionId = uuid();
  log.info({ sessionId, ip: req.socket.remoteAddress }, 'Client connected');

  const qs = new URLSearchParams({ key: GEMINI_API_KEY }).toString();
  const url = `${GEMINI_LIVE_WS_URL}?${qs}`;
  const gemini = new WebSocket(url, { perMessageDeflate: false, headers: { 'x-goog-api-client': 'lang-js/the-ark' } });

  let language = 'en';

  gemini.on('message', (data, isBinary) => {
    if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
  });

  gemini.on('open', () => {
    log.info({ sessionId }, 'Gemini WS opened');
    const setup = {
      setup: {
        model: `publishers/google/models/${GEMINI_MODEL}`,
        generationConfig: { temperature: 0.8 },
        systemInstruction: { parts: [{ text: systemPrompt(language) }] },
        realtimeInputConfig: { automaticActivityDetection: { enable: true } },
        activityHandling: 'START_OF_ACTIVITY_INTERRUPTS'
      }
    };
    gemini.send(JSON.stringify(setup));
  });

  gemini.on('close', (code, reason) => {
    log.warn({ sessionId, code, reason: reason?.toString() }, 'Gemini WS closed');
    if (client.readyState === WebSocket.OPEN) client.close();
  });

  gemini.on('error', (err) => log.error({ sessionId, err }, 'Gemini WS error'));

  client.on('message', (data, isBinary) => {
    if (gemini.readyState !== WebSocket.OPEN) return;
    if (isBinary) { gemini.send(data, { binary: true }); return; }
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'commit') gemini.send(JSON.stringify({ commit: {} }));
      else if (msg.type === 'interrupt') gemini.send(JSON.stringify({ interrupt: {} }));
      else if (msg.type === 'setLanguage') {
        language = (['en','hi','mixed'].includes(msg.language)) ? msg.language : 'en';
        gemini.send(JSON.stringify({ setup: { systemInstruction: { parts: [{ text: systemPrompt(language) }] } } }));
      } else gemini.send(JSON.stringify(msg));
    } catch {}
  });

  client.on('close', () => {
    log.info({ sessionId }, 'Browser WS closed');
    if (gemini.readyState === WebSocket.OPEN) gemini.close();
  });
});

function systemPrompt(lang) {
  const brandTone = "You are Rev, the voice assistant for The ARK.";
  const scope = "Only answer questions about The ARK products, booking, pricing, delivery, service & warranty, charging, finance, and dealership info in India. If asked unrelated questions, politely steer back to The ARK topics.";
  const styleEn = "Be concise, friendly, and accurate. Use Indian English by default. If the user speaks another language, mirror it.";
  const styleHi = "उत्तर संक्षिप्त, मित्रवत और सटीक रखें। उपयोगकर्ता की भाषा के अनुसार उत्तर दें।";
  const styleMixed = "Keep answers short, friendly, and accurate. Respond naturally in Hinglish (mix simple Hindi + English).";
  if (lang === 'hi') return `${brandTone} ${scope} ${styleHi}`;
  if (lang === 'mixed') return `${brandTone} ${scope} ${styleMixed}`;
  return `${brandTone} ${scope} ${styleEn}`;
}
