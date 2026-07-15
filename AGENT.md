# AGENT.md

## Project overview

L2Drop is a browser tool for exploring Lineage 2 NPC drop and spoil tables. It's a
single-page React app: search/filter NPCs by name, level, type, or dropped item, and
see drop/spoil chances (including group-pool drops) in a virtualized data grid.

## Tech stack

- React 19 + TypeScript, built with Vite 8
- UI: Mantine 9 (`core`, `hooks`, `notifications`)
- Grid: `@geovi/the-datagrid` (virtualized `ReactDataGrid`); `@tanstack/react-table` and
  `mantine-datatable` are also installed but not currently used by `NpcTable`
- Lint: ESLint 10 flat config (`eslint.config.js`) with `typescript-eslint`,
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Package manager: **pnpm** (`pnpm-workspace.yaml`/`pnpm-lock.yaml` are authoritative;
  ignore the stale `package-lock.json`)

## Commands

```bash
pnpm dev         # start Vite dev server
pnpm build       # tsc -b (project refs) + vite build
pnpm lint        # eslint .
pnpm preview     # preview a production build
pnpm serve       # build then preview
pnpm test        # vitest in watch mode
pnpm test:run    # vitest once (use this in CI / before committing)
pnpm coverage    # vitest run --coverage
pnpm parse       # regenerate public/npcdata_parsed.json from src/data/npcdata.csv
```

Treat `pnpm build` (typecheck), `pnpm lint`, and `pnpm test:run` as the correctness
gates before considering a change done.

## Testing

Vitest + React Testing Library, configured via the `test` block in `vite.config.ts`
(the vitest-recommended single-config-file approach — `defineConfig` comes from
`vitest/config`, not `vite`).

- Environment: `jsdom`, with a setup file at `src/test/setup.ts` that imports
  `@testing-library/jest-dom/vitest` (adds `toBeInTheDocument()`-style matchers) and
  polyfills `ResizeObserver`/`matchMedia`, which jsdom doesn't implement but Mantine and
  the virtualized data grid require.
- Test files are co-located with the code they test (`Foo.test.ts(x)` next to `Foo.ts(x)`).
- Any test that renders a component using Mantine (directly or via a child) must wrap it
  in `<MantineProvider>` — see `DropCell.test.tsx` for the pattern.
- No `globals: true` — import `describe`/`it`/`expect`/etc. from `vitest` explicitly in
  each test file rather than relying on injected globals.

## Data pipeline

Source data is a raw Lineage 2 server data file at `src/data/npcdata.csv`
(tab-separated, UTF-16LE or UTF-8, using L2's `npc_begin`/`npc_end` block format with
inline `key=value` fields).

`src/scripts/parseData.cjs` parses it into `public/npcdata_parsed.json`:
- `corpse_make_list` → `spoil` (flat drop list, parsed by `parseMakeList`)
- `additional_make_multi_list` → `drop` (grouped drop pools, parsed by
  `parseMultiMakeList`; per-item `chance` is derived as `internal_chance% × group_chance%`)

At runtime, `useNpcData` (`src/features/NpcTable/useNpcData.ts`) fetches
`/npcdata_parsed.json`, filters to `warrior`/`boss`/`treasure` types with at least one
drop or spoil, transforms rows via the column definitions in `schema.ts`, and caches the
result in IndexedDB (`NpcDatabase`/`NpcStore`). The cache key embeds `DATA_VERSION` and
the active column keys — **bump `DATA_VERSION` in `useNpcData.ts` whenever you change
`NPC_COLUMNS` or the transform logic**, otherwise users get stale cached shapes.

## Architecture

- `src/App.tsx` — wraps the app in `MantineProvider` + `Notifications`, renders
  `NpcTable`
- `src/features/NpcTable/` — the one feature, feature-folder style:
  - `schema.ts` — `NPC_COLUMNS`: single source of truth for both the data transform
    (`transform(rawValue, rawRow)`) and the grid's column list
  - `types.ts` — `NpcData` / `DropItem` interfaces
  - `useNpcData.ts` — fetch/cache/transform hook described above
  - `NpcTable.tsx` — filters (name/item/level/type), derives grid columns from
    `NPC_COLUMNS`, renders `ReactDataGrid`
  - `DropCell.tsx` — memoized renderer for a drop/spoil list cell (handles group-pool
    display and highlighting search matches)
  - `index.ts` — barrel export

## Conventions

- Add a new displayed NPC field by adding an entry to `NPC_COLUMNS` in `schema.ts`
  (with a `transform`), not by hand-editing the grid's column list.
- Keep cell renderers that are expensive to re-render wrapped in `React.memo` (see
  `DropCell`).
- Debounce free-text filter inputs with Mantine's `useDebouncedCallback` (500ms) rather
  than filtering on every keystroke — the grid is virtualized but the dataset is large.
