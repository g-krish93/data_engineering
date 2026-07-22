# Lesson Authoring Guide (for Claude sessions and subagents)

How to write a DE Academy lesson. The canonical exemplar is
`src/lessons/phase-0/module-01/01-windows-de-workstation.tsx` — read it before writing anything.
Repo-wide rules live in `/CLAUDE.md`; this file is the per-file mechanics.

## File shape

One lesson = one file: `src/lessons/phase-N/module-NN/LL-kebab-slug.tsx` (LL = 2-digit lesson number).

```tsx
import { Section } from '../../../components/Section'
// ...other imports actually used (unused imports FAIL the build)

const ID = 'N.M.L'   // e.g. '1.2.4' — used by Lab and Quiz

export default function Lesson() {
  return (
    <>
      {/* 3–6 Sections, then Lab section, Quiz section, InterviewAngle, KeyTakeaways */}
    </>
  )
}
```

## Component API (exact props)

| Component | Usage |
|---|---|
| `Section` | `<Section kicker="why this exists" title="…">children</Section>` |
| `Tiered` | `<Tiered layman={<>…</>} student={<>…</>} phd={<>…</>} />` — all three REQUIRED, each non-trivial (2+ paragraphs or a meaty list). Layman = analogy, zero jargon. Student = practitioner mechanics (default). PhD = internals/theory/papers. |
| `Callout` | `<Callout kind="info"\|"tip"\|"warn" title="optional">…</Callout>` |
| `Tradeoffs` | `<Tradeoffs options={[{ name, strengths: string[], weaknesses: string[], chooseWhen: string }]} note={<>…</>} />` — 2–3 options, honest weaknesses |
| `Lab` | `<Lab lessonId={ID} intro={<p>…</p>} steps={[{ title, body?: ReactNode, commands?: [{ ps, bash?, label? }], checkpoint?: ReactNode }]} />` — PowerShell-first; every step that does something has a `checkpoint` (observable proof) |
| `Quiz` | `<Quiz lessonId={ID} questions={[{ q, options: string[], answer: <index>, explain }]} />` — 4–6 questions; `explain` teaches the near-miss |
| `InterviewAngle` | `<InterviewAngle items={[{ q, a: <p>…</p> }]} />` — 2–3 real interview questions |
| `KeyTakeaways` | `<KeyTakeaways points={[<>…</>, …]} />` — 4–6 bullets |
| `RevealSolution` | `<RevealSolution label="Reveal answer">…</RevealSolution>` — ALL solutions/answers hide behind this |
| `GlossaryTerm` | `<GlossaryTerm k="existing-key">display text</GlossaryTerm>` — only keys already in `src/content/glossary.ts` |
| `CodeBlock` | `<CodeBlock code={\`…\`} label="powershell" />` — display only |
| `CodeRunner` | `<CodeRunner language="python"\|"sql" code={\`…\`} setup={\`…\`} />` — RUNS in the browser (Pyodide / DuckDB-WASM). `setup` is hidden SQL run first — must be idempotent (`CREATE OR REPLACE TABLE`). Use small inline datasets (≤ ~30 rows). |

Viz components (import from `'../../../viz/Name'`): `DataJourney`, `GitGraph3D({script?})`,
`CollectionsViz`, `RetryBackoffViz`, `RowVsColumn3D`, `BTreeViz`, `StarSchema3D({fact?, measures?, dims?, caption?})`,
`ParquetFileViz`, `BenchBars({title?, items: [{label, value, unit?, note?}], betterIs?: 'lower'|'higher', caption?})`.

## Mandatory lesson anatomy

1. Opening `Section` ("why this exists"): the problem this topic solves — `Tiered`, all three tiers.
2. 2–4 concept `Section`s — `Tiered` for every conceptual explanation. Interleave `CodeRunner` examples
   (Python lessons: runnable Python; SQL lessons: runnable DuckDB SQL with `setup` seeds) so the reader
   executes while reading. Use `CodeBlock` only for shell/config that can't run in a browser.
3. One `Section` kicker="trade-offs" with a `Tradeoffs` block — a real decision, never a strawman.
4. ≥1 interactive element beyond quizzes: a viz component and/or CodeRunner (both where natural).
5. `Section` kicker="hands-on" with `Lab` — real commands on the learner's machine (Windows,
   PowerShell-first, uv for Python, Docker for services). Checkpoints are observable ("X prints", "table
   shows N rows"), never "it works".
6. `Section` kicker="check yourself" with `Quiz`.
7. `InterviewAngle`, then `KeyTakeaways`. Nothing after KeyTakeaways.

## Hard TypeScript rules (the build fails otherwise)

- `verbatimModuleSyntax`: type-only imports must use `import type { X } from …`.
- `noUnusedLocals` / `noUnusedParameters`: every import must be used. Double-check before finishing.
- `erasableSyntaxOnly`: no enums, no parameter properties.
- JSX text: apostrophes/quotes fine; escape literal `<` and `>` as `&lt;`/`&gt;` or write words.
- Template literals in `code={\`…\`}`: no un-escaped backticks or `${` inside sample code (write `\\\${` or rephrase).
- Windows paths in JSX/strings: `C:\de-lab` is fine in template literals; in JSX text prefer `<code>C:\de-lab</code>`.

## Voice

Plain language, no hype, no emojis. Define terms on first use. Trade-offs are the soul: every "use X"
comes with "instead of Y, because Z, unless W". Sized 45–90 minutes including lab. The reader is a
motivated beginner on Windows 11 with PowerShell, uv, Docker Desktop, and VS Code (set up in Phase 0).

## What lesson authors must NOT touch

`src/curriculum.ts`, `src/lessons/index.ts`, `src/content/glossary.ts` — the integrating session updates
those centrally. If a lesson needs new glossary terms, list them (key + definition) in your final report.
