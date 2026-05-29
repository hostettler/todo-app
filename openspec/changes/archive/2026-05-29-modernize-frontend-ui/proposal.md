## Why

The frontend currently uses unstyled browser defaults: black text on white,
underlined links, default button chrome. It looks like a 1998 web form and
makes the otherwise-modern app feel unfinished. A coherent visual design
is needed before we share the app with anyone or use it as a demo for the
scalability work.

## What Changes

- Add **Tailwind CSS** and the **shadcn/ui** component library to the
  frontend toolchain.
- Establish a small design system: typography scale, spacing scale, colour
  palette with semantic tokens (`background`, `foreground`, `primary`,
  `muted`, `destructive`, `border`, `ring`), light + dark themes wired
  through CSS variables.
- Add a **theme toggle** in the header (system / light / dark), persisted
  to `localStorage` and applied before first paint to avoid a flash of the
  wrong theme.
- Restyle every existing screen and shared component with shadcn primitives:
  - Header / nav with active-link styling
  - Landing page hero
  - Auth controls (avatar + dropdown when authenticated)
  - Tags page (card layout, inline edit, confirm dialog for delete)
  - Todos page (filter bar, todo cards / list rows, modal edit dialog,
    confirm dialog for delete, optimistic checkbox styling)
  - Forms use shadcn `Input`, `Select`, `Button`, `Label`, `Textarea`
  - Errors / 409 conflicts surface via a toast (shadcn `Sonner`)
- Ensure the new UI passes basic accessibility hygiene: focus rings,
  keyboard navigation, sufficient colour contrast, `aria-live` for toasts.
- Update the Vitest test suite so existing tests (which currently rely on
  text/role queries) keep passing — no behavioural changes, only markup.

## Capabilities

### New Capabilities
- `frontend-ui`: Visual design system, theme toggle, and shadcn/ui-based
  component conventions used across every screen in the SPA.

### Modified Capabilities
<!-- None: the functional specs (authentication, tag-management,
     todo-management) describe behaviour, not visual presentation. This
     change introduces a new presentation capability without altering
     any existing requirement. -->

## Impact

- **Code**: every file under `frontend/src/components/`, `frontend/src/pages/`,
  plus a new `frontend/src/components/ui/` directory for shadcn primitives,
  a new `frontend/src/lib/` for utilities (`cn`, theme helpers), and global
  CSS in `frontend/src/index.css`.
- **Dependencies**: adds `tailwindcss`, `postcss`, `autoprefixer`,
  `tailwindcss-animate`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `lucide-react`, `sonner`, plus the Radix primitives
  pulled in by each shadcn component.
- **Build**: a Tailwind directive enters the Vite pipeline; bundle size
  grows by ~30–50 KB gzipped depending on which shadcn components ship.
- **Tests**: existing 43 tests must continue to pass. Test queries that
  rely on `getByRole`, `getByLabelText`, and visible text will not need
  changes; queries that rely on tag names or DOM shape may.
- **Coverage gate**: the 80 % line/branch threshold still applies.
- **Backend**: no changes.
- **Out of scope**: no functional changes (no new pages, no new API calls,
  no new fields). Pure presentation refresh.
