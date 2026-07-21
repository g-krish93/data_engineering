# Data Engineering — From Zero to Internals

A self-paced, ~52-week data engineering curriculum built as an **interactive 3D learning app** plus a set of **real portfolio projects**. Every topic is taught at three depths — **Layman / Student / PhD** — with hands-on labs, trade-off analysis, and a resume-worthy project per phase.

- **`de-learnings/`** — the learning platform: a React + Three.js web app. Lessons are interactive pages with 3D visualizations, quizzes, labs with checkpoints, and a tier switcher that re-explains every concept at your chosen depth.
- **`de-portfolio/`** — real projects built on your machine (Docker, DuckDB, Postgres, MinIO, Dagster, dbt, Spark, Kafka, AWS). Claude coaches via step-by-step build guides; **you** write the code.

## Quick start

```powershell
cd de-learnings
npm install
npm run dev     # open http://localhost:5173
```

The app also auto-deploys to GitHub Pages on every push to `main` (see `.github/workflows/deploy.yml`), so the curriculum is available at a public URL once the repo is on GitHub.

## The roadmap

| Phase | Focus | ~Weeks | Portfolio project | Status |
|---|---|---:|---|---|
| 0 | Orientation — workstation, git, how this works | 1 | — (ship this scaffold) | in progress |
| 1 | Python & SQL foundations (DuckDB) | 6 | **P1 Pipeline Zero** — tested API→DuckDB ingestion CLI | not started |
| 2 | Databases, modeling & file formats | 5 | **P2 NYC Taxi warehouse** — star schema + engine benchmark | not started |
| 3 | Pipelines, Dagster, dbt & the lake | 7 | **P3 Local Lakehouse v1** — the platform anchor | not started |
| 4 | Spark, tuning & Iceberg | 6 | **P4 Lakehouse v2** — Iceberg + Spark at local scale | not started |
| 5 | Streaming — Kafka, CDC, watermarks | 6 | **P5 Real-time extension** — CDC → Kafka → streaming → Iceberg | not started |
| 6 | Cloud (AWS), Terraform, cost & ops | 6 | **P6 Cloud lakehouse** — Terraformed S3/Glue/Athena + cost model | not started |
| 7 | Staff-level architecture & DDIA | 5 | **P7 Architecture portfolio** — design docs + v3 redesign | not started |
| 8 | Papers & mini-engines | 10 | **P8a LSM store · P8b columnar engine · P8c stream processor** | not started |

Durations assume ~20 hrs/week. It's a pace target, not a deadline. *Designing Data-Intensive Applications* (DDIA) is assigned reading from Phase 2 onward.

## How to learn here

1. Open the app (`npm run dev`) — the home screen is a 3D map of the whole curriculum.
2. Pick the next unlocked lesson. Choose your tier: **Layman** (analogies, zero jargon), **Student** (practitioner mechanics — the default), or **PhD** (internals, papers, formal trade-offs). Switch any time; the same lesson re-explains itself.
3. Do the lab (real commands on your machine — every lab ends with an observable checkpoint) and the quiz, then mark the lesson **Done** in-app. Progress is stored in your browser (exportable as JSON).
4. At the end of each phase, build the phase's portfolio project from its `SPEC.md` + `BUILD-GUIDE.md` in `de-portfolio/`. Claude coaches; you code.
5. To get new content: open Claude Code in this repo and say **`next lesson`**. One lesson is authored per request, following the conventions in [CLAUDE.md](CLAUDE.md).

## Stack (and why)

| Tool | Why this one |
|---|---|
| DuckDB | Zero-setup analytical SQL — learning SQL starts on day one, no server needed |
| Postgres | The reference OLTP database: transactions, indexes, EXPLAIN |
| MinIO | S3-compatible object storage, runs locally in Docker — the data lake |
| Parquet / Iceberg | The open columnar format + the open table format on top of it |
| Dagster | Primary orchestrator — asset-based, great local dev (one Airflow-translation module covers interview vocabulary) |
| dbt | SQL transformations with tests, docs, and software-engineering discipline |
| Spark | Distributed processing — architecture, tuning, and when *not* to use it |
| Kafka | The distributed log — streaming, CDC, delivery guarantees |
| AWS (Phase 6 only) | One cloud, mapped from the local stack: MinIO→S3, DuckDB→Athena, etc. |

Everything runs locally and free until Phase 6.

> **Note (OneDrive):** this repo currently lives inside OneDrive. `node_modules/`, `data/`, and builds are gitignored, but OneDrive sync will still fight large folders. Consider moving the repo to e.g. `C:\repos\` before Phase 4 (large datasets).

## Portfolio index

See [de-portfolio/README.md](de-portfolio/README.md) for the full project list with pitches and status.
