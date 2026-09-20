# Filey

A mobile-first, visual personal file manager. Files live on a freeform canvas instead of a
list — drag to reposition, drag the corner to resize, and the layout persists to the cloud.

## Stack

- **Expo (React Native) + TypeScript** — one codebase for iOS and Android, file-based routing via
  `expo-router`.
- **react-native-gesture-handler + react-native-reanimated** — the drag/resize gestures on the
  canvas run entirely on the UI thread for 60fps feel.
- **Supabase** — Postgres (`files` table: name, mime type, storage path, x/y/width/height/z-index)
  + Storage (the raw file bytes, in a private `files` bucket) + Auth (anonymous sessions for now,
  see below).
- **zustand** — canvas state (positions/sizes) lives in a single store so gesture updates don't
  re-render the whole screen.

Why this stack over Flutter: React Native's gesture/animation story
(`react-native-gesture-handler` + Reanimated running gesture math on the UI thread) is purpose-built
for exactly this kind of direct-manipulation canvas, and Expo's config-plugin system is the
smoothest path to the native Share Extension in phase 2 without giving up managed-workflow
tooling entirely.

## Project layout

```
app/                      expo-router screens (index = the canvas screen)
src/
  features/
    auth/                 anonymous-session bootstrap
    canvas/
      components/         CanvasWorkspace, FileCard (drag+resize), FAB, empty state, toolbar
      state/               useCanvasStore (zustand)
      hooks/               debounced Supabase layout sync
      types.ts             CanvasFile shape shared across the feature
    files/
      api/filesApi.ts      Supabase queries: fetch, upload+insert, update layout, delete
  lib/
    supabase/              client.ts + hand-written database.types.ts
supabase/
  migrations/0001_init.sql  files table, RLS policies, storage bucket + policies
```

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the migration.** Either paste `supabase/migrations/0001_init.sql` into the SQL editor in
   the dashboard, or, if you use the Supabase CLI:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Enable anonymous sign-ins**: Dashboard → Authentication → Sign In / Providers → toggle
   "Allow anonymous sign-ins". The MVP has no sign-up screen yet — every device gets its own
   anonymous user and canvas on first launch (see `src/features/auth/useEnsureSession.ts`).
4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
   # (Project Settings -> API in the dashboard)
   ```
5. **Install and run**:
   ```bash
   npm install
   npx expo start
   ```
   Open in Expo Go, an Android emulator, or an iOS simulator.

## Using the canvas (MVP)

- Tap **+** to add a photo (from the library) or any document.
- Drag a card anywhere on the canvas; it snaps back inside the canvas bounds.
- Drag the small circular handle in a card's bottom-right corner to resize it.
- Tap a card to select it (brings it to front); a bar with the file name and a delete action
  appears at the top.
- Layout changes are debounced (400ms after you let go) and written to Supabase, so state
  survives an app restart.

## Roadmap

- **Now (this scaffold):** canvas + drag/resize + Supabase persistence + manual add-file flow via
  the system photo/document picker.
- **Next: native Share Extensions.** "Share to Filey" from any app requires native code Expo's
  managed workflow doesn't provide out of the box:
  - iOS: a `Share Extension` target (a small `ShareViewController`) that writes the shared file
    into an App Group container and hands off to the main app.
  - Android: an `<intent-filter>` for `ACTION_SEND` / `ACTION_SEND_MULTIPLE` on an activity that
    forwards the received URI into the app.
  - The practical path in Expo is `npx expo prebuild` (generating the native `ios`/`android`
    projects) plus a config plugin — either an existing one (e.g. `expo-share-extension`) or a
    small custom plugin — so the extension keeps regenerating on every prebuild instead of being
    hand-maintained in Xcode/Android Studio. This trades a bit of "managed workflow" convenience
    for the native capability the product needs; it does not require fully ejecting or rewriting
    the JS app.
  - Once files can arrive via the share sheet, `uploadAndCreateFile` in
    `src/features/files/api/filesApi.ts` is the same function that will handle them — the share
    extension only needs to hand the OS file URI + name + mime type to the running app (via a deep
    link/App Group hand-off), the upload/insert path is already built.
- **After that:** real sign-in (swap anonymous → email/OAuth, same `owner_id`), file previews for
  non-image types (PDF/doc thumbnails), multi-select, canvas panning/zoom for larger collections,
  offline queueing for layout syncs made without a connection.
