# Code Review

**Date:** 2026-07-15 13:41 WEDT

**Scope:** 1 commit ahead of `origin/master` (`b5fef2f` — "Add basic test harness & AGENT.md to help shape the project")
**Files touched:** `AGENT.md`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `src/features/NpcTable/DropCell.test.tsx`, `src/features/NpcTable/schema.test.ts`, `src/test/setup.ts`, `vite.config.ts`

---

## Findings (most severe first)

### 1. Security — Supply-chain age check bypassed for `@geovi/the-datagrid`

- **File:** `pnpm-workspace.yaml:2`
- **Verdict:** CONFIRMED

**Issue:** `minimumReleaseAgeExclude` whitelists:
```
@geovi/the-datagrid@0.0.5 || 0.0.7 || 0.0.8-preview.20260714T081243Z.7a9b83c || 0.0.8
```
The preview build is timestamped `2026-07-14T08:12:43Z` — about **1 day old** as of this review (2026-07-15).

**Why it matters:** `minimumReleaseAgeExclude` exists specifically to block installing just-published (potentially compromised) package versions until they've had time to age. This entry lets pnpm install that freshly-published version immediately, defeating the guard for exactly the case it's meant to catch.

`package.json` bumps the dependency to `^0.0.8` and `pnpm-lock.yaml` resolves to `0.0.8`, confirming the exclusion is **live and in effect**, not vestigial.

**Risk of recurrence:** The exclusion list only grows (nothing is pruned), so every future bump of this dependency will likely append another entry — permanently disabling the age check for this package going forward.

---

### 2. Simplification — Duplicated test-render helper instead of shared utility

- **File:** `AGENT.md:49`
- **Verdict:** CONFIRMED

**Issue:** AGENT.md instructs contributors to wrap Mantine-rendering tests in `<MantineProvider>`, pointing to `DropCell.test.tsx` "for the pattern" rather than a shared import.

`DropCell.test.tsx:8` defines the helper locally:
```ts
const renderWithProvider = (ui) => render(<MantineProvider>{ui}</MantineProvider>);
```
No shared `src/test/test-utils` module exists in the diff (`src/test/setup.ts` only adds polyfills/matchers).

**Why it matters:** As more `*.test.tsx` files are added following this documented convention, each one redefines the same snippet. Any future change (e.g. adding a router or theme override to the wrapper) has to be hunted down and repeated across every test file instead of being fixed once in a shared helper.

---

### 3. Efficiency — Global jsdom environment applied to pure-logic tests

- **File:** `vite.config.ts:8`
- **Verdict:** CONFIRMED

**Issue:** `test.environment: 'jsdom'` is set globally with no per-file/glob override (no `environmentMatchGlobs`, no `// @vitest-environment node` comments anywhere in the diff).

`src/features/NpcTable/schema.test.ts` only exercises `NPC_COLUMNS` transform functions and never touches `window`/`document`, yet it still pays jsdom's setup/teardown cost on every run.

**Why it matters:** As more logic-only unit tests are added alongside DOM-rendering ones — which the AGENT.md co-location convention encourages — the wasted per-file jsdom bootstrap cost scales with the whole suite instead of only the files that actually render components.

---

## Summary

| # | Category | File | Severity |
|---|----------|------|----------|
| 1 | Security | `pnpm-workspace.yaml:2` | High |
| 2 | Simplification | `AGENT.md:49` | Medium |
| 3 | Efficiency | `vite.config.ts:8` | Low |
