## What this changes

<!-- One paragraph. What behaviour is different after this merges? -->

## Why

<!-- The problem, not the patch. Link the plan step or issue. -->

## Evidence

<!-- A step is done when its gate evidence is attached. Delete what does not apply. -->

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass locally
- [ ] `pnpm e2e` passes, including the axe and keyboard checks
- [ ] New or changed routes are listed in `e2e/tests/accessibility.spec.ts`
- [ ] Any new colour pair is in `packages/tokens/scripts/check-contrast.ts`
- [ ] Screenshots at 360 / 768 / 1280 for anything visual

## Privacy

- [ ] No private profile field reaches server-rendered HTML, the hydration
      payload, a log line or an analytics event
- [ ] Nothing new is read from the API that the page does not render

## Notes for the reviewer

<!-- Anything you want a second opinion on. -->
