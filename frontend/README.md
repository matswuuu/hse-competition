# Frontend

React 19 + TypeScript + Vite + React Router.

## Getting started

```sh
npm install
npm run dev      # http://localhost:5173, /api is proxied to http://localhost:8080
npm run build    # type-check and build into dist/
npm run lint
```

Set `VITE_API_URL` (see `.env.example`) to call a backend on another origin.

## Structure

- `src/api` — fetch wrapper (`get`, `post`, auth token handling)
- `src/components` — shared components, including the app `Layout`
- `src/pages` — route pages, wired up in `src/App.tsx`
