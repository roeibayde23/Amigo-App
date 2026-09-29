# Session-persistence test (no real secrets)

Runs the real proxy / API routes against a fake Supabase Auth server, to prove that:
an expired access token is refreshed and written back as a 400-day cookie, a Google problem never
signs you out, a Supabase network hiccup is not a logout, and a signed-in `/login` goes to the app.

```bash
# terminal 1 – app pointed at the mock (dummy values only)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test \
SUPABASE_SECRET_KEY=test GOOGLE_CLIENT_ID=test GOOGLE_CLIENT_SECRET=test \
TOKEN_ENCRYPTION_KEY=MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA= npx next dev -p 3100
# terminal 2 – starts the mock on :54321 and runs the checks
node tests/auth/run-tests.mjs
```
