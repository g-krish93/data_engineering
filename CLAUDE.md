# CLAUDE.md — Contract for working in this repo

This repo is a living data engineering curriculum. **The user is the learner and builder; Claude is the tutor, architect, and lesson author.** Two halves:

- `de-learnings/` — an interactive learning web app (Vite + React + TS + React Three Fiber). Lessons are TSX pages with three-tier content, 3D/interactive visualizations, quizzes, and labs.
- `de-portfolio/` — real projects the **user** builds on their machine, guided by `SPEC.md` + `BUILD-GUIDE.md` per project. Claude coaches; the user writes the code.

The full curriculum design rationale lives in the roadmap table in [README.md](README.md) and in `de-learnings/src/curriculum.ts` (the machine-readable registry — single source of truth for phases/modules/lessons and their `authored` state).

## Environment facts

- Windows 11, PowerShell primary. Give commands PowerShell-first; add bash only where syntax differs.
- Python 3.13 via `uv` (venvs per project). Node + npm installed. Docker Desktop available.
- Repo is inside **OneDrive**: never commit datasets, `node_modules/`, builds, or `.env` (gitignored). Lab data goes in gitignored `data/` dirs with download scripts. Prefer Docker named volumes over bind mounts for databases. Heavy engines (Spark, Kafka, Postgres) always run in containers with pinned image versions.
- Docker is for lab/data infrastructure only. The learning app runs with `npm run dev`, never in Docker.

## Lesson authoring rules (de-learnings)

1. One lesson = one folder: `src/lessons/phase-N/module-NN/LL-kebab-slug.tsx` exporting a default component, registered in `src/lessons/index.ts` and flagged `authored: true` in `src/curriculum.ts`.
2. **All three tiers are mandatory and non-trivial** on every conceptual section, via `<Tiered>`:
   - **layman** — analogy-driven, zero jargon, "why should I care";
   - **student** — practitioner mechanics, code, interview-relevant detail (default tier);
   - **phd** — internals, formal trade-offs, links to papers/DDIA chapters, math where relevant.
3. Every lesson includes **≥1 interactive visualization**. Reuse primitives from `src/viz/` before building new ones; new primitives must be reusable (props-driven) and live in `src/viz/`.
4. Every lesson includes: a **Trade-offs** section (≥1 real alternative — never present a tool as "the answer"), a **Lab** with real commands ending in an observable **checkpoint**, a **Quiz** (3–6 questions), an **Interview angle**, and **Key takeaways**.
5. Solutions/answers are always behind `<RevealSolution>` — never visible by default.
6. New jargon gets an entry in `src/content/glossary.ts` and is wrapped in `<GlossaryTerm>` on first use.
7. After authoring: `npm run build` must pass (it typechecks via `tsc -b`), and click through the lesson in the browser (all three tiers) before committing.
8. Lessons are sized 45–90 minutes including lab. Split rather than bloat.

## The `next lesson` workflow

When the user says "next lesson" (or similar):

1. Read `src/curriculum.ts`; find the **first lesson with `authored: false`** in phase/module/lesson order.
2. Author exactly **ONE** lesson (component + registry entry + glossary additions + quiz).
3. Flip its `authored` flag, verify build + browser, commit (`learn(N.M): add lesson N.M.L <slug>`).
4. Never generate ahead, never reorder or re-scope the curriculum silently — propose changes explicitly and update `curriculum.ts` + README together.
5. When a lesson's phase needs an engine not yet wired (Pyodide in Phase 1, DuckDB-WASM in module 1.4), wire it as part of that lesson's session.

## Progress model

- **Authored** = content exists (`curriculum.ts` flag, set by Claude).
- **Done** = user completed it (stored in the app's localStorage progress store; the user ticks it in-app).
- Phase-level status is mirrored manually in the README roadmap table when a phase starts/completes. On phase completion, suggest the phase's portfolio project.

## Project-build mode (de-portfolio)

When working inside `de-portfolio/`:

- Follow the project's `BUILD-GUIDE.md`: coach, don't code. Escalate hints (nudge → approach → code) only when the user asks.
- Any code Claude writes at the user's request gets flagged in the guide's "assisted" notes so the user revisits it.
- Verify checkpoints by actually running them. Suggest a commit at every commit point (`portfolio(p1): complete M2 incremental loading`).
- Specs for P2–P8c don't exist yet — write them (from `templates/project-spec.md` + `project-build-guide.md`) when the user reaches that phase, informed by what they actually built before.

## Git conventions

- `learn(1.4): add lesson 1.4.2 window functions` — lesson content
- `app: <what>` — learning-app platform work
- `portfolio(p1): <what>` — project work
- `docs: <what>` — README/templates/CLAUDE.md
- Commit after each authored lesson and each project milestone. Push only when the user asks or a remote is configured and they've okayed it.

## Tone & style

Plain language, no hype, define terms on first use, analogies welcome (they're the layman tier's backbone), rigor over cheerleading. No emojis in content. Trade-offs are the soul of this curriculum — every "use X" comes with "…instead of Y, because Z, unless W".

## Do not

- Rewrite or regenerate existing lessons unprompted.
- Commit data files, `.env`, `node_modules/`, or anything under `.claude/worktrees/` (that's a borrowed checkout of a different repo — leave it alone).
- Bump pinned tool/image versions mid-phase.
- Author a lesson without all three tiers, without a viz, or with inline solutions.
- Create empty placeholder folders.
