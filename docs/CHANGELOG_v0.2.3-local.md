# Changelog: v0.2.2-local -> v0.2.3-local

## Summary
- Scope: add SVG export as a targeted patch.
- Direction: preserve UI/UX declutter while extending export options.
- Contracts: no schema or import/export JSON contract changes.

## Product Delta
- Added `Export SVG` in topbar File actions (`More` menu).
- Added `Export SVG` in Inspector `Export` tab.
- Added SVG export pipeline using `html-to-image` SVG output.
- Added acceptance coverage for JSON/SVG/PNG/PDF export download flows.

## QA Delta
- `npm run build`: PASS
- `PW_PORT=4273 npx playwright test e2e/connect-human.spec.ts`: PASS (7/7)
- `PW_PORT=4273 npm run test:smoke`: PASS (7/7)
- `PW_PORT=4273 npm run test:acceptance`: PASS (10/10)
- `PW_PORT=4273 npm run test:a11y`: PASS (3/3)

## Public Contract Safety
- No changes to `types.ts` payload contracts (`nodes`, `edges`, `drawings`, `layout`).
- No breaking changes to import/export JSON format.

## Tag Metadata
- Target tag: `v0.2.3` (annotated)
- Message: `Local patch release: SVG export workflow`
