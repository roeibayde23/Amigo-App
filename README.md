# Amigo 🐾

<div dir="rtl">

## עברית (בקצרה)

**אמיגו** הוא עוזר אישי בעברית: מיילים (Gmail, קריאה בלבד), לו"ז יומי ומשימות, עם הכלב אמיגו.
האפליקציה בנויה ב-Next.js 16, Tailwind 4 ו-Supabase (התחברות עם Google ושמירת נתונים), וה-Gmail נקרא דרך השרת.

### הרצה מקומית
1. צריך Node.js 22 (עובד גם על 20.9 ומעלה).
2. מריצים `npm install` ואז `npm run dev`, ופותחים את http://localhost:3000.
3. **בלי מפתחות האפליקציה עולה במצב הדגמה**, עם נתוני דוגמה שנשמרים בדפדפן. זה מספיק כדי לראות את כל המסכים.

### חיבור אמיתי (Supabase + Gmail)
1. מעתיקים את `.env.example` לקובץ `.env.local` וממלאים את המפתחות (הטבלה למטה). **לא מעלים את `.env.local` ל-GitHub.**
2. ב-Supabase: SQL Editor, מדביקים את התוכן של `supabase/migrations/0001_init.sql` ומריצים.
3. מריצים שוב `npm run dev`, לוחצים "התחברות עם Google" ומאשרים את הרשאת ה-Gmail.

### מגבלות חשובות
- כל עוד אפליקציית Google במצב **Testing**, ההרשאה ל-Gmail **פגה אחרי 7 ימים**. כשזה קורה, אמיגו מציג כפתור "חבר מחדש את Gmail".
- הזיהוי הקולי עדיין מדומה: כותבים טקסט ואמיגו מזהה אם זו משימה או אירוע.
- הלו"ז נשמר ב-Supabase בלבד, בלי סנכרון ל-Google Calendar.

</div>

---

## English

Amigo is a Hebrew-first (RTL) personal assistant: Gmail (read-only), a daily schedule and tasks, with a dog mascot.
Stack: **Next.js 16 (App Router), Tailwind CSS 4, TypeScript, Supabase (Google OAuth, Postgres + RLS), Gmail REST API**, targeting Vercel.

### Quick start
```bash
npm install
npm run dev          # http://localhost:3000
```
Without env vars the app runs in **demo mode**: the prototype's mock mails, events and tasks, stored in `localStorage`, with no login.
Set `NEXT_PUBLIC_DEMO_MODE=1` to force demo mode even when keys exist.

### Environment variables (`.env.local` / Vercel)
| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | `https://ywapvsoiqgujxcmvyscp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase → Project Settings → API Keys (`sb_publishable_…`). Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works |
| `SUPABASE_SECRET_KEY` | **server only** | `sb_secret_…` (or legacy `SUPABASE_SERVICE_ROLE_KEY`). Used only for the `google_tokens` table |
| `GOOGLE_CLIENT_ID` | server | Same OAuth client that is configured in Supabase → Auth → Google |
| `GOOGLE_CLIENT_SECRET` | **server only** | Needed to refresh Gmail access tokens |
| `TOKEN_ENCRYPTION_KEY` | **server only** | `openssl rand -base64 32` (AES-256-GCM key for the Google refresh token) |
| `ALLOWED_EMAILS` | server | Comma-separated allow-list. Default `23roei23@gmail.com` |
| `NEXT_PUBLIC_SITE_URL` | public | `http://localhost:3000` locally, the Vercel URL in production |
| `NEXT_PUBLIC_APP_TIMEZONE` | optional | Default `Europe/Prague` (greeting, "today", recurring tasks) |
| `GMAIL_QUERY` | optional | Default `in:inbox newer_than:14d -category:promotions -category:social` |

Never commit real values. `.gitignore` ignores every `.env*` file except `.env.example`.

### Database
Run `supabase/migrations/0001_init.sql` in the Supabase SQL Editor. It creates `profiles`, `tasks`, `events`, `mail_state` and `google_tokens`, and sets up:
- RLS on every table, with policies that limit each user to their own rows.
- **Explicit GRANTs**, because Supabase stops auto-exposing new `public` tables (enforced 2026-10-30).
- `google_tokens` readable by `service_role` only.

### How auth and Gmail work
1. `/login` calls `supabase.auth.signInWithOAuth({ provider: 'google', scopes: gmail.readonly, queryParams: { access_type: 'offline', prompt: 'consent' } })`.
2. Google → `https://ywapvsoiqgujxcmvyscp.supabase.co/auth/v1/callback` → `/auth/callback`.
3. `/auth/callback`:
   - calls `exchangeCodeForSession`,
   - checks `ALLOWED_EMAILS`,
   - takes `provider_refresh_token` (available only at this moment), encrypts it with AES-256-GCM and upserts it into `google_tokens` with the secret key.
4. `src/proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the Supabase session and redirects signed-out users to `/login`.
5. `GET /api/gmail/messages`:
   - refreshes a Google access token from the stored refresh token,
   - lists recent inbox messages (metadata only) plus the unread count,
   - merges `mail_state` (important/hidden),
   - returns `409 reconnect` on `invalid_grant`, which makes the UI show "Reconnect Gmail".

### Scripts
`npm run dev` · `npm run build` · `npm run start` · `npm run lint`

### Deploy (Vercel)
1. Import the repo and set **Node.js 22.x** (`engines` and `.nvmrc` already say 22).
2. Add the env vars above and deploy.
3. Add `https://<app>.vercel.app/**` to Supabase → Auth → URL Configuration (Redirect URLs), and set it as the Site URL.

### Project layout
```
src/
  proxy.ts                     session refresh + auth guard (skipped in demo mode)
  app/(app)/                   dashboard, mail, calendar, tasks (+ layout with top bar, sheets, toast)
  app/login, app/auth/*        Google sign-in, OAuth callback, sign-out, error page
  app/api/gmail/messages       server route: Gmail list + unread count
  components/                  UI ported from the prototype (BottomSheet, MicSheet, EventSheet, …)
  lib/                         i18n, dates (Europe/Prague), recurrence, suggestion, classify, crypto,
                               supabase clients, google token + gmail helpers, data repos (demo / live)
supabase/migrations/0001_init.sql
reference/                     original static prototype (amigo.html, prototype-index.html)
```

### Known limitations
- **Google "Testing" mode:** refresh tokens for `gmail.readonly` expire 7 days after consent, so you reconnect weekly. Publishing the Google app to "In production" (it can stay unverified for personal use) removes the 7-day limit, but the "unverified app" warning stays.
- Voice input is simulated (typed text → task/event classifier).
- The calendar is stored in Supabase only (no Google Calendar sync).
- Access tokens are cached in memory per server instance; every cold start refreshes once.
