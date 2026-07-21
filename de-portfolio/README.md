# Portfolio Projects

Real data engineering projects, one per curriculum phase. **You build these in your own terminal** — Claude coaches through each project's `SPEC.md` and `BUILD-GUIDE.md`, but the code is yours (see the project-build rules in the repo's [CLAUDE.md](../CLAUDE.md)).

Each project is written to be self-contained (own README, own dependencies, own compose file where relevant) so it can later be extracted to a standalone GitHub repo for your resume.

| # | Project | One-line pitch | Phase | Status |
|---|---|---|---|---|
| P1 | [Pipeline Zero](p1-pipeline-zero/SPEC.md) | Tested, idempotent API→DuckDB ingestion CLI with retries and incremental loading | 1 | **spec ready** |
| P2 | NYC Taxi Warehouse | Star-schema warehouse with SCD2, benchmarked across Postgres / DuckDB / Parquet | 2 | planned |
| P3 | Local Lakehouse v1 | One compose stack: Postgres + MinIO + Dagster + dbt + DuckDB + BI, tested incremental ELT | 3 | planned |
| P4 | Lakehouse v2 | Migration to Iceberg + Spark at local scale; a skewed join tuned and documented | 4 | planned |
| P5 | Real-Time Extension | Debezium CDC → Kafka → windowed streaming → Iceberg, with chaos drills | 5 | planned |
| P6 | Cloud Lakehouse | Terraform-provisioned S3/Glue/Athena slice with least-privilege IAM and a cost model | 6 | planned |
| P7 | Architecture Portfolio | Three polished design docs + a bottleneck/cost retrospective of P3–P5 | 7 | planned |
| P8a | Toy LSM Store | Log-structured KV store: WAL, SSTables, compaction, bloom filters — benchmarked | 8 | planned |
| P8b | Mini Columnar Engine | Vectorized columnar query engine with a SQL frontend, raced against DuckDB | 8 | planned |
| P8c | Mini Stream Processor | Event-time windows, watermarks, checkpoint/recovery over real Kafka | 8 | planned |

Specs for P2 onward are written when you reach that phase (informed by what you actually built before). Later projects deliberately build on earlier ones: P3 is the platform anchor that P4/P5/P6/P7 extend, migrate, and critique.
