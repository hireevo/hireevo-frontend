# hireevo-frontend

The HireEvo web app, its design tokens and the shared React primitives. The API
this consumes lives in [`hireevo-backend`](https://github.com/hireevo/hireevo-backend).

- **Plan:** `docs/phase-1-implementation-plan.md` in the workspace root
- **Decisions:** ADR-001 (two repositories, one contract) governs how this repo
  relates to the backend

## Requirements

| Tool | Version | Notes                    |
| ---- | ------- | ------------------------ |
| Node | 24.x    | `nvm use` reads `.nvmrc` |
| pnpm | 11.x    | `corepack enable pnpm`   |

## Getting started

```bash
nvm use
corepack enable pnpm
pnpm install
cp apps/web/.env.example apps/web/.env.local

pnpm dev
```

The web app starts on <http://localhost:3100>. `/design-system` renders the live
token palette and every component state.

## Commands

Run from the repository root; Turborepo fans them out across the workspace.

| Command                | Does                                      |
| ---------------------- | ----------------------------------------- |
| `pnpm dev`             | Next.js dev server                        |
| `pnpm build`           | Production build                          |
| `pnpm start`           | Serve the production build                |
| `pnpm typecheck`       | `tsc --noEmit`                            |
| `pnpm lint`            | ESLint                                    |
| `pnpm test`            | Vitest, plus the contrast check           |
| `pnpm tokens:build`    | Regenerate the token stylesheets          |
| `pnpm tokens:contrast` | Fail on any documented pair below WCAG AA |
| `pnpm format`          | Prettier write                            |

## Layout

```
apps/
└─ web/                  Next.js 16, App Router — public site + freelancer app
   └─ src/app/           routes; /design-system is the component showcase
packages/
├─ tokens/               the single source of truth for the visual language
│  ├─ src/tokens.json    colour ramps, semantic aliases, type, space, motion
│  └─ scripts/           CSS generation and the WCAG contrast gate
└─ ui-web/               shared React primitives
```

`apps/admin`, `apps/mobile`, `packages/ui-native` and the generated
`packages/api-client` slot into the same workspace as their steps come up.

## Conventions worth knowing before the first pull request

**Only semantic token names reach a component.** `bg-surface-accent` is allowed;
`bg-green-800` does not exist as a utility. The ramps live in `tokens.json` and
nowhere else, which is what makes a palette change one reviewable diff instead
of a repository-wide find-and-replace.

**The token stylesheets are generated, not written.** `packages/tokens/dist` is
gitignored and rebuilt by `pnpm tokens:build` (Turborepo runs it before anything
that depends on it). Adding a semantic token to `tokens.json` is all it takes to
get the matching Tailwind utility.

**Contrast is checked by a script, not by eye.** `scripts/check-contrast.ts`
holds the list of foreground/background pairs the design system actually puts on
screen and fails the build if one drops below WCAG AA — 4.5:1 for body text,
3:1 for UI boundaries. Adding a pair to the palette means adding it to that list.

**Both colour schemes are real.** `tokens.css` defines light on `:root`, dark
under `prefers-color-scheme`, and both again under `[data-theme]` so an explicit
choice wins in either direction. Dark mode inverts the accent pairing — a light
green fill with a dark label — because a `green-800` fill cannot clear 3:1
against a near-black surface.

**Workspace packages ship TypeScript source.** They are listed in
`transpilePackages`, so editing a primitive hot-reloads in the app rather than
needing a build first. Imports carry the `.ts`/`.tsx` extension for that reason.

**Dependencies must be declared.** Hoisting is off, so importing a package an
app does not list in its own `package.json` fails here rather than later when a
transitive dependency moves.

**New packages wait three days.** `minimumReleaseAge` in `pnpm-workspace.yaml`
rejects freshly published versions; most registry compromises are caught within
hours. Accepting one sooner means adding it to the exclude list on purpose.

**ESLint is pinned to 9 here and 10 in the backend.** `eslint-plugin-react`
still calls an API that ESLint 10 removed, and it arrives through
`eslint-config-next`. The pin moves up when that plugin does.

## What is not here yet

`packages/api-client` is generated from the backend's published OpenAPI spec and
must never be hand-edited; it arrives with the first API-backed screen, along
with the `.api-version` pin and the compose file that boots the matching backend
image. Until then the app has no network calls.
