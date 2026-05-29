## Context

The frontend ships unstyled — browser-default typography, no spacing
system, default form chrome. Behaviour works (43 tests green) but the
visual quality undermines confidence in the rest of the stack.

We're a single-page React 18 + Vite + TypeScript app talking to a
Quarkus backend behind a future Cloudflare Tunnel → AKS deployment.
There is no design team; the developer (and Copilot CLI) is the
designer. The change therefore needs to lean on an opinionated,
well-trodden system rather than bespoke CSS.

Existing test suite uses Testing Library queries by role / label / text;
we should keep markup semantic so the same queries continue to work.

## Goals / Non-Goals

**Goals:**
- Replace browser-default styling with a coherent, modern design system.
- Adopt **Tailwind CSS + shadcn/ui** as the styling foundation.
- Support **light and dark themes** with a header toggle and no flash
  of incorrect theme on first paint.
- Keep all 43 existing tests passing (or trivially updated) and stay
  above the 80 % line/branch coverage gate.
- Keep the bundle within a reasonable budget (< 600 KB raw / < 200 KB
  gzipped on the main chunk).
- Maintain semantic, accessible markup (roles, labels, focus states).

**Non-Goals:**
- No functional changes (no new pages, fields, or API calls).
- No internationalisation work (English only).
- No animation system beyond the small Tailwind transitions shadcn
  provides out of the box.
- No design tokens shared with a hypothetical native mobile app — this
  change is web-only.
- No replacement of `react-router-dom` or `@tanstack/react-query`.

## Decisions

### D1. Use Tailwind CSS + shadcn/ui (not Mantine / MUI / plain CSS)

shadcn/ui is the current pragmatic standard for React + Tailwind in
2025. Components are **copied into the repo** under
`src/components/ui/`, so we own them, can audit them, and avoid
runtime version lock-in. They are built on Radix primitives, so we
inherit accessibility (focus management, keyboard interaction, ARIA).

Alternatives considered:
- **Mantine**: heavier runtime, harder to theme to a custom look once
  you outgrow its defaults.
- **MUI**: opinionated Material design that fights against a custom
  brand; large runtime.
- **Plain CSS + tokens**: lowest dependency cost but the highest
  long-term maintenance — we'd be rebuilding what shadcn already gives.

### D2. Theme model = CSS variables + a `<html data-theme="dark">` attribute

We define semantic colour tokens in `src/index.css` under both
`:root` (light) and `[data-theme="dark"]` (dark) selectors, matching
the shadcn convention. Tailwind reads them via the `tailwind.config.js`
`theme.extend.colors` map (e.g. `bg-background`, `text-foreground`,
`border-border`).

A small **`ThemeProvider`** (custom, ~30 LOC) tracks `theme`
(`system | light | dark`), persists the user's explicit choice to
`localStorage` under key `theme`, and applies the resolved theme to
`document.documentElement` via the `data-theme` attribute.

To avoid the flash of wrong theme on first paint, a tiny inline script
in `index.html` reads `localStorage.theme` (and `prefers-color-scheme`)
before React boots and sets the attribute synchronously.

### D3. Component inventory — only what we need

We will not bulk-install every shadcn component. The pages need:
- `button`, `input`, `label`, `textarea`, `select`, `checkbox`
- `card`, `badge`, `separator`
- `dialog` (edit modal + delete confirm)
- `dropdown-menu` (user menu in header)
- `sonner` (toast for 409s, success messages)
- `skeleton` (loading states)

Each component arrives via `npx shadcn@latest add <name>` and lives at
`src/components/ui/<name>.tsx`. They are excluded from the coverage
gate (they are vendored library code).

### D4. Layout strategy = single max-width container, full-height shell

Header at top, main content in a `max-w-5xl mx-auto px-4 py-8`
container. Empty states use centred cards. The layout is mobile-first
but the primary target is desktop — no hamburger menu in v1.

### D5. Preserve test-friendly markup

- Forms keep `<label htmlFor>` pairs and `<button>` elements so
  `getByLabelText` / `getByRole('button')` queries still match.
- Page headings stay as `<h1>` / `<h2>` so `getByRole('heading')` works.
- Filter `<select>` elements stay native `<select>` (shadcn's `Select`
  is a custom listbox — switching would break the existing TodosPage
  test that uses `userEvent.selectOptions`). We will style the native
  select via Tailwind classes instead.
- Tag deletion dialog: replace `window.confirm` with shadcn `Dialog`
  + `AlertDialog`. The corresponding test will switch from
  `vi.spyOn(window, 'confirm')` to clicking the dialog's Confirm button.
- Tag rename: replace `window.prompt` with an inline form inside a
  `Dialog`. The corresponding test updates the same way.

### D6. CSS / build wiring

- `postcss.config.js` + `tailwind.config.js` at the frontend root.
- `src/index.css` imported once from `src/main.tsx`, containing the
  three `@tailwind` directives, the CSS-variable theme blocks, and a
  short `@layer base` for typography defaults.
- Tailwind's content glob covers `index.html` and `src/**/*.{ts,tsx}`.

## Risks / Trade-offs

- **Test breakage from markup churn** → Mitigation: D5 above. Run
  `npm test` after each page restyle and fix queries incrementally.
- **Coverage drop from vendored shadcn components** → Mitigation: add
  `src/components/ui/**` to the Vitest coverage `exclude` list. These
  are library code we don't author.
- **Bundle size growth** → Mitigation: only `add` the shadcn components
  we use (D3). Tree-shake Radix. Verify with `npm run build` that the
  main chunk stays under 600 KB raw.
- **Theme flash on first load** → Mitigation: inline boot script in
  `index.html` runs before React (D2).
- **Sonner toasts interacting with React Query's automatic refetch
  behaviour** → Low risk; toasts are pure UI and don't trigger queries.
- **Switching `window.confirm` to a Dialog changes the timing of
  delete** (async user click vs sync confirm) → Tests that simulated a
  blocking `confirm` need to `await` the dialog interaction. Acceptable
  trade-off for better UX.

## Migration Plan

1. Land Tailwind + shadcn scaffolding on a feature branch.
2. Restyle screens one at a time, running tests + the dev server after
   each.
3. No backend changes; no database migrations.
4. **Rollback**: pure frontend change; reverting the merge restores the
   old UI immediately.

## Open Questions

- Do we want a brand colour for `primary`, or stick with shadcn's
  default slate / neutral? **Decision deferred to implementation:**
  start with shadcn's default `slate` palette + a `blue` accent for
  primary actions; revisit once we see it in the browser.
- Should the theme toggle expose **system** explicitly, or only
  light/dark? **Decision:** include `system` as the default so the OS
  preference is respected until the user actively chooses.
