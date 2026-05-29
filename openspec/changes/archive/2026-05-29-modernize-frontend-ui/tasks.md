## 1. Tooling and scaffolding

- [x] 1.1 Install Tailwind, PostCSS, Autoprefixer, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react` as frontend devDependencies / dependencies
- [x] 1.2 Generate `frontend/tailwind.config.js` and `frontend/postcss.config.js`; set the Tailwind content glob to `./index.html` and `./src/**/*.{ts,tsx}`
- [x] 1.3 Create `frontend/src/index.css` with the three `@tailwind` directives, a `:root` light-theme CSS variable block, a `[data-theme="dark"]` dark-theme block matching shadcn semantics, and an `@layer base` block for body/typography defaults
- [x] 1.4 Import `./index.css` from `frontend/src/main.tsx`
- [x] 1.5 Run `npx shadcn@latest init` in `frontend/`, accepting defaults that align with the design (TypeScript, Tailwind, `src/components/ui`, slate base colour, CSS variables); commit the generated `components.json` and `src/lib/utils.ts`
- [x] 1.6 Add `frontend/src/components/ui/**` to the Vitest coverage `exclude` array in `frontend/vitest.config.ts`

## 2. Theme system

- [x] 2.1 Add an inline boot script to `frontend/index.html` that reads `localStorage.theme` (and `window.matchMedia('(prefers-color-scheme: dark)')` when the key is absent) and sets `document.documentElement.dataset.theme` before React mounts
- [x] 2.2 Create `frontend/src/theme/ThemeProvider.tsx` exporting `ThemeProvider`, `useTheme()`, and a `Theme` type (`'system' | 'light' | 'dark'`); it persists explicit choices to `localStorage` and subscribes to OS preference changes when in `system` mode
- [x] 2.3 Wrap the app in `<ThemeProvider>` inside `frontend/src/main.tsx`
- [x] 2.4 Create `frontend/src/components/ThemeToggle.tsx` rendering a `DropdownMenu` (shadcn) with System / Light / Dark options and a sun/moon icon trigger

## 3. shadcn component inventory

- [x] 3.1 Add shadcn `button`, `input`, `label`, `textarea`, `checkbox`, `card`, `badge`, `separator`, `skeleton`
- [x] 3.2 Add shadcn `dialog` and `alert-dialog`
- [x] 3.3 Add shadcn `dropdown-menu`
- [x] 3.4 Add shadcn `sonner` and mount the `<Toaster />` once at the app root (in `App.tsx` or `main.tsx`)

## 4. Shell, header, and auth controls

- [x] 4.1 Restyle `frontend/src/App.tsx` to render a sticky header containing the app title, primary navigation links, the `ThemeToggle`, and the auth controls; main content sits inside a centred `max-w-5xl mx-auto px-4 py-8` container
- [x] 4.2 Indicate the active navigation link visually using `NavLink`'s `isActive` prop and Tailwind utilities
- [x] 4.3 Restyle `frontend/src/components/AuthControls.tsx` so the authenticated view renders a `DropdownMenu` showing the user's name/avatar with a `Log out` item, and the anonymous view renders a primary `Button` labelled `Log in`

## 5. Page restyling

- [x] 5.1 Restyle `frontend/src/pages/LandingPage.tsx` with a hero (title, tagline, primary `Log in` CTA) using shadcn primitives
- [x] 5.2 Restyle `frontend/src/pages/TagsPage.tsx`: tag list as `Card`/chip rows, create form using `Input` + `Button`, rename via shadcn `Dialog` (replace `window.prompt`), delete via shadcn `AlertDialog` (replace `window.confirm`), errors via `toast.error`
- [x] 5.3 Restyle `frontend/src/pages/TodosPage.tsx`: filter toolbar with styled native `<select>` elements (preserve `userEvent.selectOptions` compatibility), todo rows showing checkbox + title + due date + priority `Badge` + tag chips, create form and edit `Dialog` with `Input` / `Label` / `Textarea` / native `<select>` styled / `Button`, delete via `AlertDialog`, errors via `toast.error`

## 6. Tests and coverage

- [x] 6.1 Update tests that asserted on `window.confirm` / `window.prompt` (TagsPage, TodosPage) to interact with the new dialogs (`getByRole('dialog')`, click the Confirm button) instead
- [x] 6.2 Add a focused unit test for `ThemeProvider` covering the system / light / dark transitions and `localStorage` persistence
- [x] 6.3 Add a focused unit test for `ThemeToggle` verifying that selecting each option updates the resolved theme
- [x] 6.4 Run `npm test` from `frontend/` until all suites pass
- [x] 6.5 Run `npm run test:coverage` from `frontend/` and confirm line and branch coverage both stay ≥ 80 %

## 7. Verification

- [x] 7.1 Run `npm run lint` from `frontend/` and resolve any new findings
- [x] 7.2 Run `npm run build` from `frontend/`; confirm the build succeeds and the main chunk stays under 600 KB raw (warn-only threshold)
- [x] 7.3 Run `openspec validate modernize-frontend-ui --strict` and confirm it passes
- [x] 7.4 Manually verify in the dev server: the landing page, tags page, and todos page render with the new design in both light and dark themes; the theme toggle persists across reloads; no FOUC on first paint
- [x] 7.5 Update `frontend/README.md` to document the new Tailwind + shadcn setup, the `npm` scripts, and how to add additional shadcn components
