# Frontend

React + TypeScript + Vite single-page app for the Todo application.

See the root `README.md` for monorepo layout and the full end-to-end run
instructions. Project-specific commands and environment variables are
documented here once the app is scaffolded.

## Quick start (after scaffolding)

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in Auth0 + API URL
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:8080` so the SPA
and backend share an origin during development.

## Environment variables

| Variable               | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `VITE_AUTH0_DOMAIN`    | Auth0 tenant domain (e.g. `example.auth0.com`)            |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA client ID                                       |
| `VITE_AUTH0_AUDIENCE`  | API audience identifier configured in Auth0               |
| `VITE_API_BASE_URL`    | Base URL for API calls (leave empty in dev to use proxy)  |

Copy `.env.example` to `.env.local` and fill in the values. `.env.local`
is gitignored.

## Scripts

```bash
npm run dev            # Vite dev server (proxies /api → :8080)
npm run build          # Type-check + production bundle into dist/
npm run preview        # Serve the built bundle
npm test               # Vitest in watch-once mode
npm run test:coverage  # Vitest with coverage + 80% gate
npm run lint           # Placeholder (ESLint config is TODO)
```

## Test coverage policy

Coverage is enforced by Vitest's v8 provider. The gate is **80 % line and
80 % branch coverage at bundle level** (`vitest.config.ts`). `npm run
test:coverage` exits non-zero if either threshold is missed.

How it works:

- Vitest runs all `*.test.ts(x)` files under `src/` in `jsdom`.
- The v8 coverage provider produces a text summary plus an HTML report at
  `coverage/index.html`.
- Tests use a shared Auth0 mock (`src/test/utils.tsx`) so component tests
  do not need a live OIDC provider.

Exclusions (and why):

- `src/main.tsx` — composition root that only wires `Auth0Provider`,
  `QueryClientProvider`, and `BrowserRouter`; behaviour is exercised by
  the page/component tests.
- `src/components/ui/**` — vendored shadcn/ui primitives. Editable in
  place but treated as library code; not authored here.
- `src/lib/utils.ts` — one-line `cn()` wrapper over `tailwind-merge`.
- `src/test/**`, `src/**/*.test.tsx`, `src/**/*.d.ts` — test scaffolding
  and ambient types.

Run the gate locally before opening a PR:

```bash
npm run test:coverage
```

See `openspec/specs/test-coverage/spec.md` for the cross-cutting policy.

## Design system

The UI is built on **Tailwind CSS** + **shadcn/ui** primitives copied
into `src/components/ui/`. Theme is driven by HSL CSS variables in
`src/index.css`, scoped under `:root` (light) and `[data-theme="dark"]`
(dark). A small `ThemeProvider` in `src/theme/ThemeProvider.tsx` tracks
`system | light | dark`, persists explicit choices to
`localStorage["theme"]`, and reacts to OS-level changes when in system
mode. An inline boot script in `index.html` sets the initial theme
attribute before React mounts to avoid a flash of incorrect theme.

User-facing transient errors are surfaced through
[`sonner`](https://sonner.emilkowal.ski/) toasts mounted once in
`src/main.tsx`.

### Adding shadcn components

The shadcn config is committed at `components.json`. To add a new
primitive:

```bash
cd frontend
npx shadcn@latest add <component>
```

The CLI writes the new component into `src/components/ui/`. Update the
`@/` path alias is already configured in `tsconfig.json`, `vite.config.ts`,
and `vitest.config.ts`. Vendored UI files are excluded from ESLint and
from the coverage gate.

### Theme toggle

`ThemeToggle` (in `src/components/ThemeToggle.tsx`) renders a dropdown
in the header with three options: **System**, **Light**, **Dark**.
Selecting `System` clears the persisted choice and re-resolves from
`prefers-color-scheme`.
