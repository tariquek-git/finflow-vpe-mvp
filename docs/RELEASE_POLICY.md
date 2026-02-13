# Release Policy (MVP)

## Tags
- `v0.1.0-mvp-rc1`: first release candidate
- `v0.1.0`: public MVP launch
- `v0.1.2-local-ux-rc1`: current local UX release candidate
- `v0.1.2-local`: current local release tag of record
- `v0.1.3-public-rc1`: reserved first hosted public RC tag
- `v0.1.3`: reserved first hosted public launch tag

## Merge Requirements
- Protected `main`
- Required passing status check: `qa`
- PR review required before merge

## Hosted Launch Rule
- Do not reuse `v0.1.2` for hosted/public release because that tag already exists on unrelated remote history.
- First hosted launch must use `v0.1.3-public-rc1` and `v0.1.3`.
