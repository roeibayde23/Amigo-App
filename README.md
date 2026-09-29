# Amigo 🐾

<div dir="rtl">

## עברית (בקצרה)

**אמיגו** הוא עוזר אישי בעברית: מיילים (Gmail, קריאה בלבד, עם סימון "דחוף"), לו"ז שמסונכרן עם **יומן Google**, ומשימות שנשלחות ל**תזכורות באייפון**, עם הכלב אמיגו (שנובח כשלוחצים עליו 🐶).
האפליקציה בנויה ב-Next.js 16, Tailwind 4 ו-Supabase (התחברות עם Google ושמירת נתונים), ו-Gmail / יומן Google נקראים דרך השרת.

### הרצה מקומית
1. צריך Node.js 22 (עובד גם על 20.9 ומעלה).
2. מריצים `npm install` ואז `npm run dev`, ופותחים את http://localhost:3000.
3. **בלי מפתחות האפליקציה עולה במצב הדגמה**, עם נתוני דוגמה שנשמרים בדפדפן. זה מספיק כדי לראות את כל המסכים.

### חיבור אמיתי (Supabase + Gmail)
1. מעתיקים את `.env.example` לקובץ `.env.local` וממלאים את המפתחות (הטבלה למטה). **לא מעלים את `.env.local` ל-GitHub.**
2. ב-Supabase: SQL Editor, מדביקים את התוכן של `supabase/migrations/0001_init.sql, 0002_task_due_sender_prefs.sql
tests/                         unit tests (node:test via tsx)` ומריצים. אחר כך את `0002_task_due_sender_prefs.sql` (תאריך יעד למשימות + זיכרון "זה חשוב?" לכל שולח).
3. מריצים שוב `npm run dev`, לוחצים "התחברות עם Google" ומאשרים את ההרשאות (Gmail לקריאה + יומן Google).

### תזכורות באייפון (Shortcuts)
כל משימה חדשה נפתחת בקיצור **Amigo Reminder** באייפון, שמוסיף אותה לאפליקציית התזכורות. ההוראות לבניית הקיצור (פעם אחת) נמצאות באפליקציה: ⚙️ הגדרות ← "איך בונים את הקיצור". אפשר לכבות את זה באותו מקום.

### מגבלות חשובות
- כל עוד אפליקציית Google במצב **Testing**, ההרשאה ל-Gmail **פגה אחרי 7 ימים**. כשזה קורה, אמיגו מציג כפתור "חבר מחדש את Gmail".
- זיהוי דיבור אמיתי (עברית) עובד בדפדפנים שתומכים בו (Safari באייפון, Chrome). בדפדפן שלא תומך – מקלידים.
- משימות חוזרות נשלחות לתזכורות בלי חזרה (החזרה מנוהלת באמיגו עצמו).

</div>

---

## English

Amigo is a Hebrew-first (RTL) personal assistant: Gmail (read-only, with urgency sorting), a schedule that **is** the user's primary Google Calendar, and tasks that are handed to **iPhone Reminders** via Apple Shortcuts – with a dog mascot that really barks.
Stack: **Next.js 16 (App Router), Tailwind CSS 4, TypeScript, Supabase (Google OAuth, Postgres + RLS), Gmail + Google Calendar REST APIs**, on Vercel.

### What lives where (live mode)
| Data | Source of truth |
|---|---|
| Events | Primary **Google Calendar** (`/api/calendar/events`, timezone Europe/Prague, recurrence ↔ RRULE) |
| Tasks | Supabase `tasks` (+ optional due date/time). On create Amigo opens `shortcuts://run-shortcut?name=Amigo%20Reminder&input=text&text=<JSON>` so the iOS shortcut adds a Reminder |
| Mail | Gmail (metadata only); Amigo keeps important/hidden choices (`mail_state`) and "is this sender important?" answers (`mail_sender_prefs`) |
| Settings | `profiles` (language, dark mode); the Reminders toggle is per device (localStorage) |

Google Tasks is intentionally **not** used.

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
Run `supabase/migrations/0001_init.sql, 0002_task_due_sender_prefs.sql
tests/                         unit tests (node:test via tsx)`, then `0002_task_due_sender_prefs.sql`, in the Supabase SQL Editor.
0002 adds `tasks.due_date/due_time` and the `mail_sender_prefs` table (RLS + grants). The app degrades gracefully without it (due dates aren't persisted, sender answers stay in the browser).
0001 creates `profiles`, `tasks`, `events`, `mail_state` and `google_tokens`, and sets up:
- RLS on every table, with policies that limit each user to their own rows.
- **Explicit GRANTs**, because Supabase stops auto-exposing new `public` tables (enforced 2026-10-30).
- `google_tokens` readable by `service_role` only.

### How auth and Gmail work
1. `/login` calls `supabase.auth.signInWithOAuth({ provider: 'google', scopes: 'gmail.readonly calendar.events', queryParams: { access_type: 'offline', prompt: 'consent' } })`.
2. Google → `https://ywapvsoiqgujxcmvyscp.supabase.co/auth/v1/callback` → `/auth/callback`.
3. `/auth/callback`:
   - calls `exchangeCodeForSession`,
   - checks `ALLOWED_EMAILS`,
   - takes `provider_refresh_token` (available only at this moment), encrypts it with AES-256-GCM and upserts it into `google_tokens` with the secret key, together with the scopes Google actually granted (tokeninfo).
   - If a stored token lacks `calendar.events`, the API answers `409 reconnect / missing_scopes` and the UI shows a one-time "Reconnect Google" card.
4. `src/proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the Supabase session and redirects signed-out users to `/login`.
5. `GET /api/gmail/messages`:
   - refreshes a Google access token from the stored refresh token,
   - lists recent inbox messages (metadata only) plus the unread count,
   - merges `mail_state` (important/hidden),
   - returns `409 reconnect` on `invalid_grant`, which makes the UI show "Reconnect Gmail".

6. `GET/POST /api/calendar/events`, `PATCH/DELETE /api/calendar/events/:id` – the same token pattern against the primary Google Calendar.

### Mail priority
`src/lib/mailPriority.ts`: Gmail IMPORTANT label, starred, urgent keywords (דחוף / urgent / deadline / תשלום …), real person vs newsletter/no-reply, Gmail category tabs, and the user's own per-sender answers. Urgent mail goes to a top section with a badge; uncertain mail gets an inline "זה חשוב?" yes/no that is remembered per sender.

### Voice + bark
Real speech recognition via the Web Speech API (`he-IL`, iPhone Safari's `webkitSpeechRecognition`, Chrome), with typing as the fallback. The dog plays `/public/sounds/bark.mp3` through an `<audio>` element from the tap (works on iPhone, even on silent), and listening starts after the bark.
Bark sound: excerpt of "Barking of a dog.ogg" by Amada44, Wikimedia Commons, CC BY-SA 3.0 (see `public/sounds/CREDITS.txt`).

### Scripts
`npm run dev` · `npm run build` · `npm run start` · `npm run lint` · `npm test` (parser, mail priority, reminders payload, calendar mapping, recurrence)

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
  app/api/calendar/events      server routes: Google Calendar list/create/update/delete
  components/                  UI ported from the prototype (BottomSheet, MicSheet, EventSheet, …)
  lib/                         i18n, dates (Europe/Prague), recurrence, suggestion, classify, crypto,
                               supabase clients, google token + gmail helpers, data repos (demo / live)
supabase/migrations/0001_init.sql, 0002_task_due_sender_prefs.sql
tests/                         unit tests (node:test via tsx)
reference/                     original static prototype (amigo.html, prototype-index.html)
```

### Known limitations
- **Google "Testing" mode:** refresh tokens for `gmail.readonly` expire 7 days after consent, so you reconnect weekly. Publishing the Google app to "In production" (it can stay unverified for personal use) removes the 7-day limit, but the "unverified app" warning stays.
- Speech recognition depends on the browser (none in Firefox → typing).
- Editing a recurring Google event changes that occurrence only; recurring tasks are sent to Reminders without a repeat rule.
- The Reminders hand-off only runs on iPhone/iPad and needs the "Amigo Reminder" shortcut (guide in Settings).
- Access tokens are cached in memory per server instance; every cold start refreshes once.
