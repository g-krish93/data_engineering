# HANDOVER — Session of 2026-07-21/22 (Claude Fable 5)

Read this first if you are a new Claude session (or any collaborator) picking up this repo.
It records exactly what exists, how it was built, what is unfinished, and how to continue
without re-deriving anything. Companion documents: [CLAUDE.md](CLAUDE.md) (repo contract),
[de-learnings/AUTHORING.md](de-learnings/AUTHORING.md) (lesson-writing mechanics), [README.md](README.md) (roadmap).

---

## 1. What this repo is

A living, self-paced data engineering curriculum for the user (true beginner, ~20 hrs/week,
Windows 11) in two halves:

- **`de-learnings/`** — an interactive learning web app (Vite 8 + React 19 + TS 6 + React Three Fiber 9 +
  Tailwind 4 + zustand 5 + framer-motion 12). Every lesson: three content tiers (Layman/Student/PhD),
  ≥1 interactive visualization, runnable in-browser code, trade-offs, a machine lab with observable
  checkpoints, quiz, interview Q&A, key takeaways.
- **`de-portfolio/`** — real projects the USER builds in their terminal, coached via SPEC.md +
  BUILD-GUIDE.md per project. Claude coaches, user codes.

Remote: `https://github.com/g-krish93/data_engineering` (origin). Deploy workflow
`.github/workflows/deploy.yml` builds `de-learnings` → GitHub Pages on push to main.
**User action still pending:** enable Pages (repo Settings → Pages → Source: GitHub Actions).

## 2. Current inventory (ground truth at commit time)

### Lessons authored: 51 (Phase 0 complete; Phase 1 = 29/30; Phase 2 = 19/19)

| Module | Lessons | State |
|---|---|---|
| 0.1 dev environment | 0.1.1–0.1.3 | complete, browser-verified |
| 1.1 Python fundamentals | 1.1.1–1.1.5 | complete, agent self-verified (tsc+oxlint) |
| 1.2 Python for real programs | 1.2.1–1.2.6 | complete files; **QA pass advised** (see §4.2) |
| 1.3 working with data | 1.3.1–1.3.5 | complete, agent-verified incl. live Open-Meteo call + snippet execution |
| 1.4 SQL fundamentals | 1.4.1–1.4.4 | complete files; **1.4.5 MISSING** (see §4.1); QA pass advised |
| 1.5 SQL intermediate | 1.5.1–1.5.5 | complete, agent-verified (every query executed on real DuckDB) |
| 1.6 CLI & automation | 1.6.1–1.6.4 | complete, agent self-verified |
| 2.1 Postgres & relational engine | 2.1.1–2.1.4 | complete, agent-verified (SQL snippets executed) |
| 2.2 indexes & performance | 2.2.1–2.2.4 | complete files; QA pass advised |
| 2.3 OLTP/OLAP, row vs column | 2.3.1–2.3.4 | complete files; QA pass advised |
| 2.4 dimensional modeling | 2.4.1–2.4.4 | complete files; QA pass advised |
| 2.5 file formats | 2.5.1–2.5.3 | complete, agent-verified |

All 48 Phase 1–2 files: `tsc -b` clean, structurally complete (Quiz/Lab/Tiered×3/InterviewAngle/
KeyTakeaways/export default), unique correct `const ID`, registered in `src/lessons/index.ts`,
flagged in the `AUTHORED` set in `src/curriculum.ts`.

### App platform

- **In-browser engines** (this session): `src/runners/python.ts` (Pyodide, dynamic import, CDN
  `indexURL` version-locked to the npm package), `src/runners/sql.ts` (DuckDB-WASM, jsDelivr bundles,
  worker via blob-URL importScripts), `src/runners/status.ts` (shared engine-state zustand store).
  UI: `src/components/CodeRunner.tsx` — editable textarea, Run, reset, python stdout/value/error,
  SQL result table (50-row cap), `setup` prop for idempotent seeds (**convention: CREATE OR REPLACE TABLE**).
  Both engines verified live (python 10 ms; DuckDB GROUP BY 67 ms).
- **Viz library** `src/viz/`: VizCanvas (shared canvas card; `zoomable` default FALSE — wheel-zoom
  steals page scroll), DataJourney, GitGraph3D (scripted stepper), CurriculumMap3D (home),
  CollectionsViz (list-vs-dict race), RetryBackoffViz (jitter toggle), RowVsColumn3D (layout × query
  page-cost demo), BTreeViz (real order-4 insert/split + search), StarSchema3D (clickable dims),
  ParquetFileViz (pruning/pushdown I/O counter), BenchBars (animated comparison bars).
- **Pages**: Home (3D map + tier picker + phase grid + progress export/import), PhasePage, LessonPage
  (tier switch, mark-done, prev/next), PortfolioPage, **/playground** (unlisted route: both engines +
  every viz — use it to smoke-test primitives).
- **Stores** `src/app/stores.ts`: tier (persisted 'de-tier'), theme ('de-theme', dark default),
  progress ('de-progress': done dates, quiz scores, labChecks keyed `"<lessonId>:<stepIdx>"`).

### Portfolio

- `de-portfolio/README.md` (index P1–P8c) + `p1-pipeline-zero/` complete SPEC.md + BUILD-GUIDE.md
  (M0–M5, Open-Meteo → DuckDB; API verified reachable). P2+ specs are intentionally NOT written yet —
  write each when the user reaches it (CLAUDE.md rule).

## 3. How this session built Phases 1–2 (replicate this for Phase 3+)

1. Infrastructure first: engines + the viz primitives the phase's concepts need.
2. `de-learnings/AUTHORING.md` is the single authoring contract (component API, hard TS rules,
   mandatory anatomy, voice). Keep it current — agents follow it literally.
3. One background general-purpose agent per module, all launched in parallel. Each prompt contained:
   read-first list (AUTHORING.md + Phase 0 exemplar lessons), learner-context paragraph, per-lesson
   outline (concept bullets + REQUIRED viz + trade-off topic + lab focus + tier angles), hard-rules
   recap, and a final-report format (files written / new glossary terms / deviations).
4. Agents were FORBIDDEN to touch `curriculum.ts`, `lessons/index.ts`, `glossary.ts` (single-writer
   integration prevents conflicts). They report needed glossary terms; the integrator adds them.
5. Integration (this session's pattern): inventory files → `tsc -b` → structural grep (Quiz/Lab/
   Tiered/InterviewAngle/KeyTakeaways/export per file) → ID-uniqueness grep → registry entries →
   `AUTHORED` set in curriculum.ts → glossary append → `npm run build` → browser spot-checks →
   commits (`app:` / `learn(N):` / `docs:`).
6. The best agents verified by EXECUTING their snippets (DuckDB via a scratch venv, Python locally)
   and checking exact checkpoint values. Treat that as the QA gold standard.

**Failure mode encountered:** five agents died mid-polish on an API session limit. Damage was minor
(files were already written; one lesson lost entirely) — but future sessions should stagger agent
batches (3–4 at a time) if account limits are tight.

## 4. UNFINISHED WORK (prioritized)

### 4.1 Author lesson 1.4.5 — 'Subqueries and CASE' (the only missing lesson)

File: `de-learnings/src/lessons/phase-1/module-04/05-subqueries-case.tsx`, `const ID = '1.4.5'`.
After writing: add to `lessonComponents` in `src/lessons/index.ts` and to `AUTHORED` in
`src/curriculum.ts` (both have `1.4.5 pending` comments marking the spot). Original brief, verbatim:

> **05-subqueries-case.tsx** (ID '1.4.5', ~65 min)
> - Concepts: scalar subqueries; IN (subquery); correlated vs uncorrelated; derived tables
>   (FROM (SELECT ...)); EXISTS; CASE WHEN for bucketing/labeling; NULLIF.
> - Runnable SQL: rewrite the same question three ways (subquery / derived table / join) and compare.
> - Tiers: layman = answering a question that needs the answer to another question first;
>   phd = decorrelation (how optimizers rewrite correlated subqueries), semi-join semantics of
>   EXISTS/IN, NULL pitfalls of NOT IN (runnable!).
> - Trade-offs: subquery vs join vs (teaser) CTE — "CTEs arrive first thing in module 1.5".
> - Lab: bucket cities into climate bands with CASE; find above-city-average days via correlated
>   subquery; checkpoints exact. (Lab project: `sql-lab` uv project from 1.4.1.)
> Style: match module 1.4's existing four lessons (weather/trips seed data, CodeRunner language="sql"
> with CREATE OR REPLACE setup, ≤30-row seeds). Note 1.5.1 already references "the nested monster
> refactor" — keep continuity.

### 4.2 QA pass over the five orphaned modules (1.2, 1.4, 2.2, 2.3, 2.4)

Their files compile and are structurally complete, but their agents died BEFORE final
self-verification. For each file: (a) run `npx oxlint` (repo-wide it currently passes, so this is
belt-and-braces), (b) execute every CodeRunner snippet (python via any Python 3.12+, SQL via a
`duckdb` pip install) and confirm outputs match the prose, (c) sanity-check lab checkpoint values,
(d) click through all three tiers in the browser. Fix in place; commit as `learn(N.M): QA fixes`.

### 4.3 Per-phase content status housekeeping

- README roadmap Status column tracks USER progress (currently "in progress" on Phase 0) — leave
  unless the user reports progress. The map/phase pages derive authored counts automatically.
- When the user finishes Phase 1 → write P1 retro notes if asked; finishes Phase 2 → **write P2
  NYC Taxi Warehouse SPEC.md + BUILD-GUIDE.md** from templates, informed by what they built in P1.

### 4.4 Phase 3+ authoring (the next big arc)

Scope is already encoded in `src/curriculum.ts` (modules 3.1–3.7 with lesson titles) and the README
roadmap. Recommended approach: same per-module agent pattern (§3). Before launching Phase 3 agents,
build the viz primitives that phase needs (suggested: PipelineDAG viz for Dagster assets,
MedallionFlow (bronze/silver/gold), WatermarkTimeline for incremental loads, ContainerLayers for
Docker images; Kafka/LSM/Shuffle vizzes belong to phases 4–5). Also wire nothing new engine-wise —
Phase 3 labs are Docker-heavy (MinIO, Dagster, dbt run on the user's machine).

### 4.5 Known tech debt / gotchas (deliberate, documented)

- Vite build warns about one >500 kB chunk — three.js inside the VizCanvas chunk. Acceptable;
  fix later with `manualChunks` if desired.
- drei logs a `THREE.Clock deprecated` console warning — cosmetic, upstream.
- The in-app browser pane occasionally drops WebGL contexts (`Context Lost` logs) under StrictMode
  double-mount; real browsers are fine. Max 2 canvases per lesson page keeps this safe.
- `useFrame` MUST be called inside a component rendered under `<Canvas>` (i.e., inside VizCanvas
  children). Calling it in the component that renders VizCanvas blanks the whole app (hit this once —
  fixed in StarSchema3D by extracting `FactCore`).
- Engines must stay DYNAMICALLY imported (`await import('pyodide')` inside the runner) — top-level
  imports of pyodide/duckdb-wasm broke the page bundle once already.
- After `npm install` of new deps while the dev server runs: restart it AND `rm -rf node_modules/.vite`,
  or you get phantom "Invalid hook call / two Reacts" errors.
- Repo lives in OneDrive: `node_modules/`, `data/`, `dist/` are gitignored; advise moving repo to
  `C:\repos\` before Phase 4 (big datasets). `**/.claude/worktrees/` is gitignored — it contains a
  borrowed checkout of a DIFFERENT repo; never commit or clean it.
- tsconfig is strict-template: `verbatimModuleSyntax` (use `import type`), `noUnusedLocals/Parameters`
  (unused imports fail the BUILD), `erasableSyntaxOnly` (no enums).
- The user's host has Docker and git but **uv is not installed yet** (lesson 0.1.1's lab installs it).
- Dev server: `.claude/launch.json` config "de-learnings" runs `npm run dev --prefix de-learnings`
  (port 5173). HashRouter + `base: './'` — deep links use `/#/lesson/1.4.1`.

## 5. Conventions quick-reference (full versions in CLAUDE.md / AUTHORING.md)

- **`next lesson`**: find first `authored: false` in curriculum order → author ONE lesson → register
  (index.ts) → flag (AUTHORED set) → build + click through → commit `learn(N.M): add lesson N.M.L slug`.
- **Progress model**: Authored (content exists, Claude flips) vs Done (user ticks in-app, localStorage).
- **Glossary**: agents/authors never edit `glossary.ts`; they report `key: definition` pairs and the
  integrator appends. `GlossaryTerm` with an unknown key safely renders plain text (no crash).
- **Commits**: `app:` platform · `learn(N.M):` lessons · `portfolio(pN):` projects · `docs:` docs.
  Push at session end (remote exists now).
- **Project-build mode** (de-portfolio): coach, don't code; escalating hints; flag any Claude-written
  code as [assisted]; verify checkpoints by running them.

## 6. Session log (what happened, in order)

1. Planned with user: interactive 3D app (not markdown), 3-tier model, Dagster-primary, local-first,
   GitHub Pages delivery. Built app scaffold + design system + stores + curriculum registry +
   3 Phase-0 lessons + 3D map + P1 spec/guide + deploy workflow. Committed (3 commits) after
   full browser verification.
2. User: "build the next 2 phases at least." Built Pyodide/DuckDB-WASM runners + CodeRunner,
   7 new viz primitives, /playground, AUTHORING.md. Launched 11 parallel authoring agents
   (one per module) with detailed per-lesson briefs.
3. Six agents finished + self-verified (1.1, 1.3, 1.5, 1.6, 2.1, 2.5). Five hit the account session
   limit mid-polish (1.2, 1.4, 2.2, 2.3, 2.4) — their files survived complete except lesson 1.4.5.
4. Integrated all 48 lessons (registry, AUTHORED flags, 43 glossary terms), verified build + browser,
   wrote this handover, committed and pushed.

— end of handover —
