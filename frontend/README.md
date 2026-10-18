# Frontend

React 19 + TypeScript + Vite + React Router. The same app ships as the website and, wrapped with
[Capacitor](https://capacitorjs.com), as the Android and iOS apps.

Part of the npm workspace at the repo root, together with `shared` (`@hse/shared`): logic, API calls,
texts and the color palette live there; this package renders them.

## Getting started

```sh
npm install                        # at the repo root, installs all workspaces
npm run dev -w frontend            # http://localhost:5173, /api is proxied to http://localhost:8080
npm run build -w frontend          # type-check and build into frontend/dist/
npm run lint -w frontend
```

Set `VITE_API_URL` (see `.env.example`) to call a backend on another origin.

The Docker image is built from the repo root: `docker build -f frontend/Dockerfile .`

## Mobile apps

`android/` and `ios/` are Capacitor projects that load `dist/` in a WebView. After changing the web
app, rebuild and copy it in:

```sh
npm run build && npx cap sync      # in frontend/
npx cap open android               # or: npx cap run android / ios (needs Android Studio / Xcode 26)
```

The apps call the production API cross-origin (`https://localhost` / `capacitor://localhost`), which
the backend allows via `CORS_ALLOWED_ORIGINS`. To use a local backend, build with
`VITE_API_URL=http://<your-ip>:8080`.

CI builds a release APK and an unsigned IPA and attaches them to a GitHub release. Without the
`ANDROID_KEYSTORE_*` secrets, the APK is signed with the public `android/app/debug.keystore`.

## Structure

- `src/platform.ts` — glue for `@hse/shared`: storage, API origin, palette as CSS variables, `<html>`
  attributes, and native-app behavior (back button, in-app browser for external links)
- `src/components` — components, including the app `Layout`
- `src/pages` — route pages, wired up in `src/App.tsx`
- `capacitor.config.ts`, `android/`, `ios/` — the native app shells
