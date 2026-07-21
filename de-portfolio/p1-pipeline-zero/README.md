# Pipeline Zero

> Skeleton README — replaced by the builder at milestone M5 (see [BUILD-GUIDE.md](BUILD-GUIDE.md)).

A tested, idempotent CLI pipeline: Open-Meteo weather → DuckDB, incrementally.

## Status

Not started. Spec: [SPEC.md](SPEC.md) · Build guide: [BUILD-GUIDE.md](BUILD-GUIDE.md)

## Quick start (M5 will make this true)

```powershell
uv sync
uv run pipeline-zero ingest --city london
uv run pipeline-zero query --name daily-summary
```
