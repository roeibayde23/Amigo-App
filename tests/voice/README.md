# Voice capture tests

The phone records with `MediaRecorder` (iPhone: `audio/mp4` AAC, Chrome: `audio/webm` Opus) and posts the
clip to `/api/voice`, which transcribes **and** parses it (Gemini, one call) or only transcribes it
(Groq/OpenAI Whisper → Amigo's local parser). Fixtures: Hebrew TTS of "פגישה עם מאיה מחר ב-9".

```bash
# 1. route checks with a fake Gemini (no real key): dev server on :3100 pointed at the mocks
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test \
SUPABASE_SECRET_KEY=test GOOGLE_CLIENT_ID=test GOOGLE_CLIENT_SECRET=test \
TOKEN_ENCRYPTION_KEY=MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA= \
GEMINI_API_KEY=test-not-a-real-key GEMINI_API_BASE=http://localhost:54322 npx next dev -p 3100
npx tsx tests/voice/run-tests.mjs gemini

# 2. real Hebrew speech-to-text without any cloud key: local Whisper behind the Groq code path
python tests/voice/local-whisper.py large-v3-turbo 54323      # needs faster-whisper + ffmpeg
#    dev server as above but GROQ_API_KEY=test-not-a-real-key WHISPER_API_BASE=http://127.0.0.1:54323
npx tsx tests/voice/run-tests.mjs whisper

# 3. the real provider with the real key (reads the key file, never prints it)
npx tsx --conditions=react-server tests/voice/smoke-real.mjs /home/box/amigo-secrets/gemini_api_key
```

Server env: `GEMINI_API_KEY` (preferred; optional `GEMINI_MODEL`, comma-separated fallbacks), or
`GROQ_API_KEY` / `OPENAI_API_KEY`. Without any of them `/api/voice` says `configured:false` and the app
falls back to the browser's speech recognition (with a 4 s "not responding" watchdog) and typing.
