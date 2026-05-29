# frontend-ui Specification

## Purpose
TBD - created by archiving change modernize-frontend-ui. Update Purpose after archive.
## Requirements
### Requirement: Design system foundation
The frontend SHALL ship a design system based on Tailwind CSS and shadcn/ui that defines a consistent palette, typography scale, and spacing scale used across every screen.

#### Scenario: Page rendered with the new system
- **WHEN** any page in the SPA is rendered in the browser
- **THEN** body text uses the system's typography defaults rather than browser defaults
- **AND** colours come from the semantic token set (`background`, `foreground`, `primary`, `muted`, `destructive`, `border`, `ring`)
- **AND** interactive elements (buttons, inputs, links) share a consistent visual style across pages

#### Scenario: shadcn primitives live in the repository
- **WHEN** a developer inspects the project source
- **THEN** every shadcn component used by the app exists as a file under `frontend/src/components/ui/`
- **AND** the component is editable in place without depending on a runtime package version

### Requirement: Light and dark themes with a header toggle
The frontend SHALL support both light and dark themes, expose a theme toggle in the header that offers `system`, `light`, and `dark` options, and persist the user's explicit choice so it survives page reloads.

#### Scenario: Default theme follows the operating system
- **WHEN** a user opens the app for the first time and has not chosen a theme
- **THEN** the app renders in the theme that matches the OS-level `prefers-color-scheme` setting

#### Scenario: User explicitly picks a theme
- **WHEN** an authenticated or anonymous user selects `light` or `dark` from the header theme toggle
- **THEN** the app immediately re-renders in the selected theme
- **AND** the choice is persisted to `localStorage` under the key `theme`
- **AND** reloading the page renders the same theme without flashing the opposite theme first

#### Scenario: Reverting to system preference
- **WHEN** a user selects `system` from the theme toggle
- **THEN** the persisted choice is cleared
- **AND** the app re-renders using the OS-level `prefers-color-scheme` setting

### Requirement: Restyled application surfaces
Every existing screen and shared component in the SPA SHALL be rendered with shadcn/ui primitives and the new design tokens, replacing browser defaults.

#### Scenario: Header and navigation
- **WHEN** any page is rendered
- **THEN** the header shows the app title, the primary navigation links, the theme toggle, and the auth controls
- **AND** the currently active navigation link is visually distinguished from inactive ones

#### Scenario: Landing page
- **WHEN** an anonymous visitor lands on `/`
- **THEN** the landing page renders a styled hero with the app title, a short description, and a primary `Log in` call to action

#### Scenario: Tags page
- **WHEN** an authenticated user opens `/tags`
- **THEN** tags are displayed using shadcn `Card`-style rows or chips with consistent spacing
- **AND** create / rename / delete actions use shadcn `Button` and `Dialog` components
- **AND** deletion requires confirmation via an accessible dialog rather than `window.confirm`
- **AND** rename uses an in-app dialog rather than `window.prompt`

#### Scenario: Todos page
- **WHEN** an authenticated user opens `/todos`
- **THEN** the filter bar (completed / priority / tag / sort) is rendered as a styled toolbar
- **AND** each todo is rendered as a styled row showing title, due date, priority badge, completion checkbox, and tag chips
- **AND** the create form and the edit dialog use shadcn `Input`, `Label`, `Select`, `Textarea`, and `Button` primitives
- **AND** deletion requires confirmation via an accessible dialog rather than `window.confirm`

#### Scenario: User feedback surfaces
- **WHEN** an API call returns a 409 conflict or another non-fatal error
- **THEN** the error is surfaced via a toast (shadcn `Sonner`)
- **AND** the toast announces the message to assistive technology via `aria-live`

### Requirement: Accessibility baseline
The new design SHALL preserve semantic, accessible markup so that keyboard navigation, screen readers, and existing Testing Library queries continue to work.

#### Scenario: Keyboard navigation
- **WHEN** a keyboard-only user tabs through any page
- **THEN** every interactive element receives a visible focus ring
- **AND** dialogs trap focus while open and restore focus to the trigger on close

#### Scenario: Form labelling
- **WHEN** a form is rendered (tag create, todo create, todo edit)
- **THEN** every input has an associated `<label>` (`htmlFor` matches the input `id`)
- **AND** `getByLabelText(<label text>)` continues to resolve the input in Vitest tests

#### Scenario: Headings remain semantic
- **WHEN** any page is rendered
- **THEN** the primary page title is a single `<h1>` and section titles use `<h2>` / `<h3>`
- **AND** `getByRole('heading', { name: ... })` continues to resolve those headings in Vitest tests

#### Scenario: Colour contrast on both themes
- **WHEN** the app renders in either light or dark mode
- **THEN** body text against background meets WCAG 2.1 AA contrast (4.5:1 for normal text, 3:1 for large text)

### Requirement: Test and coverage continuity
The styling change SHALL not weaken the test suite or the coverage gate. The 80 % line and 80 % branch coverage thresholds on the frontend bundle continue to apply, and shadcn-vendored UI primitives are explicitly excluded from coverage measurement.

#### Scenario: Full suite still green after restyle
- **WHEN** a developer runs `npm test` after the change
- **THEN** all previously-passing tests (43 at the start of this change) still pass — adjusted only to follow new markup, never weakened in intent

#### Scenario: Coverage gate still enforced
- **WHEN** a developer runs `npm run test:coverage` after the change
- **THEN** the v8 coverage thresholds for lines and branches remain at 80 %
- **AND** `frontend/src/components/ui/**` is listed under coverage `exclude` (vendored library code, not authored by the project)
- **AND** the gate fails (non-zero exit) if either threshold is missed
