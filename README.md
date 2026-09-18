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

The web app starts on <http://localhost:3100>, which opens the sign-in screen —
the root redirects there, and on to `/account` for someone already signed in.
`/design-system` renders the live token palette and every component state.

The sign-up and sign-in screens call the API, so `hireevo-backend` needs to be
running for them to do anything — see its README. Everything else, including the
design system, works without it.

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
   ├─ src/env.ts         the environment schema, validated at build and boot
   ├─ src/app/           routes; /design-system is the component showcase
   ├─ instrumentation.ts where the error reporter and tracing are registered
   └─ Dockerfile         production image, built from the repository root
packages/
├─ tokens/               the single source of truth for the visual language
│  ├─ src/tokens.json    colour ramps, semantic aliases, type, space, motion
│  └─ scripts/           CSS generation and the WCAG contrast gate
└─ ui-web/               shared React primitives, tested where they live
e2e/                     Playwright: smoke, accessibility, security headers
```

`apps/admin`, `apps/mobile`, `packages/ui-native` and the generated
`packages/api-client` slot into the same workspace as their steps come up.

## What CI enforces

Every pull request runs three jobs, all blocking:

1. **verify** — formatting, ESLint, `tsc`, unit tests with coverage thresholds,
   and a production build.
2. **end-to-end** — Playwright against a real production build: the smoke
   journey, axe on every route, a keyboard-only pass, a 360px overflow check,
   and an assertion that the security headers are actually being served.
3. **container** — the production image builds.

Locally, a pre-commit hook formats and lints the staged files, and a pre-push
hook runs `pnpm typecheck`. Both are deliberately cheap; a hook slow enough to
be worth skipping is a hook that gets skipped.

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

**The environment schema is authoritative.** Every variable the app reads is
declared in `apps/web/src/env.ts` and validated with zod. `next.config.ts`
imports it, so a missing or malformed value fails the build rather than the
first request after a deploy. `NEXT_PUBLIC_*` names are written out in full
there because the bundler inlines them by textual substitution — a dynamic
lookup inlines nothing.

**Security headers are asserted, not just configured.** They live in
`next.config.ts` and are pinned by `e2e/tests/security-headers.spec.ts`, because
a header that nothing checks is one refactor away from disappearing. The CSP is
the honest exception: its strict form needs a per-request nonce, which forces
every page to render dynamically, and the public marketing and profile routes
are exactly the ones that must stay static. So `script-src` still allows inline
script and everything else a CSP buys — no third-party script origin, no
plugins, no framing, no cross-origin form posts, no `<base>` hijack — is
enforced today. Tightening it is its own change, made when those routes' caching
story is settled.

**Standalone output is opt-in.** `next start` refuses to serve a standalone
build, so `NEXT_OUTPUT_STANDALONE` is set in the Dockerfile and nowhere else.
Turning it on unconditionally would leave `pnpm start` and the end-to-end suite
running against something the container does not run either.

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

Storybook is a Step 1.2 deliverable and is not here: with one primitive built,
`/design-system` covers the same ground, and the configuration would be rewritten
the moment real components land. It arrives with the component set.

A `CODEOWNERS` file needs the GitHub team handle that should be requested on
review, which is a decision rather than a default.

`packages/api-client` is generated from the backend's published OpenAPI spec and
must never be hand-edited; it arrives with the first API-backed screen, along
with the `.api-version` pin and the compose file that boots the matching backend
image. Until then the app has no network calls.
