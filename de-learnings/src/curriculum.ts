// The single source of truth for the curriculum: every phase, module, and lesson.
// `authored: true` means the interactive lesson exists in src/lessons/ and is
// registered in src/lessons/index.ts. The "next lesson" workflow (see /CLAUDE.md)
// authors the first lesson found here with `authored: false`.

export interface LessonMeta {
  id: string
  title: string
  minutes: number
  authored: boolean
}

export interface ModuleMeta {
  id: string
  title: string
  summary: string
  lessons: LessonMeta[]
}

export interface ProjectMeta {
  code: string
  name: string
  pitch: string
}

export interface PhaseMeta {
  number: number
  slug: string
  title: string
  tagline: string
  weeks: number
  color: string
  project: ProjectMeta | null
  modules: ModuleMeta[]
}

// Lessons authored so far (component exists in src/lessons/ and is registered
// in src/lessons/index.ts). Update this set as new lessons land.
const AUTHORED = new Set([
  '1.1.1', '1.1.2', '1.1.3', '1.1.4', '1.1.5',
  '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.2.6',
  '1.3.1', '1.3.2', '1.3.3', '1.3.4', '1.3.5',
  '1.4.1', '1.4.2', '1.4.3', '1.4.4', '1.4.5',
  '1.5.1', '1.5.2', '1.5.3', '1.5.4', '1.5.5',
  '1.6.1', '1.6.2', '1.6.3', '1.6.4',
  '2.1.1', '2.1.2', '2.1.3', '2.1.4',
  '2.2.1', '2.2.2', '2.2.3', '2.2.4',
  '2.3.1', '2.3.2', '2.3.3', '2.3.4',
  '2.4.1', '2.4.2', '2.4.3', '2.4.4',
  '2.5.1', '2.5.2', '2.5.3',
])

function l(id: string, title: string, minutes = 60, authored = false): LessonMeta {
  return { id, title, minutes, authored: authored || AUTHORED.has(id) }
}

export const phases: PhaseMeta[] = [
  {
    number: 0,
    slug: 'orientation',
    title: 'Orientation',
    tagline: 'Your workstation, git, and how this curriculum works.',
    weeks: 1,
    color: '#94a3b8',
    project: null,
    modules: [
      {
        id: '0.1',
        title: 'Dev environment & workflow',
        summary: 'Set up a professional Windows data engineering workstation and learn the daily loop.',
        lessons: [
          l('0.1.1', 'Your Windows data engineering workstation', 75, true),
          l('0.1.2', 'Git & GitHub for a one-person portfolio', 75, true),
          l('0.1.3', 'How this curriculum works', 45, true),
        ],
      },
    ],
  },
  {
    number: 1,
    slug: 'python-and-sql',
    title: 'Python & SQL Foundations',
    tagline: 'Enough Python and SQL to be dangerous — with a testing habit from day one.',
    weeks: 6,
    color: '#22d3ee',
    project: {
      code: 'P1',
      name: 'Pipeline Zero',
      pitch: 'A tested, idempotent API-to-DuckDB ingestion CLI with retries and incremental loading.',
    },
    modules: [
      {
        id: '1.1',
        title: 'Python fundamentals',
        summary: 'Types, collections, control flow, functions — and your first taste of algorithmic cost.',
        lessons: [
          l('1.1.1', 'Values, types, and variables'),
          l('1.1.2', 'Collections: lists, dicts, sets, tuples'),
          l('1.1.3', 'Control flow and functions'),
          l('1.1.4', 'Comprehensions, iteration, and generators'),
          l('1.1.5', 'Errors and debugging basics'),
        ],
      },
      {
        id: '1.2',
        title: 'Python for real programs',
        summary: 'Projects, packaging, error handling, typing, and pytest — the professional habits.',
        lessons: [
          l('1.2.1', 'Projects, venvs, and uv'),
          l('1.2.2', 'Modules, packages, and imports'),
          l('1.2.3', 'Error handling and context managers'),
          l('1.2.4', 'Type hints and dataclasses'),
          l('1.2.5', 'Testing with pytest'),
          l('1.2.6', 'Logging, not print'),
        ],
      },
      {
        id: '1.3',
        title: 'Working with data in Python',
        summary: 'Files, CSV, JSON, HTTP APIs, datetimes — the raw materials of every pipeline.',
        lessons: [
          l('1.3.1', 'Files, CSV, and encodings'),
          l('1.3.2', 'JSON and nested data'),
          l('1.3.3', 'HTTP APIs: requests, pagination, retries'),
          l('1.3.4', 'Dates, times, and timezones'),
          l('1.3.5', 'pandas vs polars vs plain Python'),
        ],
      },
      {
        id: '1.4',
        title: 'SQL fundamentals',
        summary: 'DuckDB from day one: select, filter, aggregate, join — and NULL semantics.',
        lessons: [
          l('1.4.1', 'Meet DuckDB: your first queries'),
          l('1.4.2', 'Filtering, sorting, and expressions'),
          l('1.4.3', 'Aggregation and GROUP BY'),
          l('1.4.4', 'Joins — and NULL semantics'),
          l('1.4.5', 'Subqueries and CASE'),
        ],
      },
      {
        id: '1.5',
        title: 'SQL intermediate',
        summary: 'CTEs, window functions, set operations — the SQL that analytics actually runs on.',
        lessons: [
          l('1.5.1', 'CTEs and query structure'),
          l('1.5.2', 'Window functions I: ranking and offsets'),
          l('1.5.3', 'Window functions II: frames and rolling'),
          l('1.5.4', 'Set operations and pivots'),
          l('1.5.5', 'SQL style and readability'),
        ],
      },
      {
        id: '1.6',
        title: 'Command line & automation',
        summary: 'PowerShell essentials, environment variables, argparse CLIs, and scheduling.',
        lessons: [
          l('1.6.1', 'PowerShell essentials (and bash survival)'),
          l('1.6.2', 'Environment variables and configuration'),
          l('1.6.3', 'Building a CLI with argparse'),
          l('1.6.4', 'Scheduling: cron and Task Scheduler'),
        ],
      },
    ],
  },
  {
    number: 2,
    slug: 'databases-and-modeling',
    title: 'Databases, Modeling & File Formats',
    tagline: 'How data is stored, modeled, and queried — the conceptual core of DE.',
    weeks: 5,
    color: '#34d399',
    project: {
      code: 'P2',
      name: 'NYC Taxi Warehouse',
      pitch: 'A star-schema warehouse with an SCD2 dimension, benchmarked across Postgres, DuckDB, and Parquet.',
    },
    modules: [
      {
        id: '2.1',
        title: 'Postgres & the relational engine',
        summary: 'Transactions, ACID, isolation levels, MVCC — the OLTP reference machine.',
        lessons: [
          l('2.1.1', 'Postgres in Docker'),
          l('2.1.2', 'DDL, constraints, and data types'),
          l('2.1.3', 'Transactions and ACID'),
          l('2.1.4', 'Isolation levels and MVCC'),
        ],
      },
      {
        id: '2.2',
        title: 'Indexes & query performance',
        summary: 'B-trees, EXPLAIN ANALYZE, index design, and when indexes hurt.',
        lessons: [
          l('2.2.1', 'B-trees: how indexes work'),
          l('2.2.2', 'Reading EXPLAIN ANALYZE'),
          l('2.2.3', 'Index design: composite, partial, covering'),
          l('2.2.4', 'When indexes hurt'),
        ],
      },
      {
        id: '2.3',
        title: 'OLTP vs OLAP, row vs column',
        summary: 'Workload characterization, columnar mechanics, compression, vectorized execution.',
        lessons: [
          l('2.3.1', 'Workloads: OLTP vs OLAP'),
          l('2.3.2', 'Columnar storage mechanics'),
          l('2.3.3', 'Compression and encodings'),
          l('2.3.4', 'Vectorized execution: DuckDB internals teaser'),
        ],
      },
      {
        id: '2.4',
        title: 'Dimensional modeling',
        summary: 'Kimball stars, facts and dimensions, slowly changing dimensions, and the OBT counterpoint.',
        lessons: [
          l('2.4.1', 'Why model? Kimball in context'),
          l('2.4.2', 'Facts and dimensions'),
          l('2.4.3', 'Slowly changing dimensions'),
          l('2.4.4', 'Star vs snowflake vs One Big Table'),
        ],
      },
      {
        id: '2.5',
        title: 'File formats on disk',
        summary: 'CSV to Parquet: a hands-on shootout, Parquet internals, partitioning, small files.',
        lessons: [
          l('2.5.1', 'The file-format shootout'),
          l('2.5.2', 'Parquet internals'),
          l('2.5.3', 'Partitioning and the small-files problem'),
        ],
      },
    ],
  },
  {
    number: 3,
    slug: 'pipelines-and-orchestration',
    title: 'Pipelines, Dagster & the Modern ELT Stack',
    tagline: 'Production-shaped pipelines: the birth of your platform.',
    weeks: 7,
    color: '#a78bfa',
    project: {
      code: 'P3',
      name: 'Local Lakehouse v1',
      pitch: 'One compose stack — Postgres, MinIO, Dagster, dbt, DuckDB, BI — running tested incremental ELT.',
    },
    modules: [
      {
        id: '3.1',
        title: 'Docker & Compose properly',
        summary: 'Images, layers, volumes, networks, healthchecks — on Windows, without pain.',
        lessons: [
          l('3.1.1', 'Images, containers, and layers'),
          l('3.1.2', 'Writing Dockerfiles'),
          l('3.1.3', 'Compose: networks, volumes, healthchecks'),
        ],
      },
      {
        id: '3.2',
        title: 'Ingestion patterns',
        summary: 'Full vs incremental, watermarks, idempotency, backfills, late data, dead letters.',
        lessons: [
          l('3.2.1', 'Batch, micro-batch, streaming'),
          l('3.2.2', 'Incremental loads and watermarks'),
          l('3.2.3', 'Idempotency and backfills'),
          l('3.2.4', 'Late data and dead letters'),
          l('3.2.5', 'Change data capture: the concept'),
        ],
      },
      {
        id: '3.3',
        title: 'The data lake & MinIO',
        summary: 'Object storage semantics, lake layout, and the medallion architecture (and its critics).',
        lessons: [
          l('3.3.1', 'Object storage semantics'),
          l('3.3.2', 'MinIO: your local S3'),
          l('3.3.3', 'Medallion architecture and its critics'),
        ],
      },
      {
        id: '3.4',
        title: 'Orchestration with Dagster',
        summary: 'Software-defined assets, schedules, sensors, partitions, backfills.',
        lessons: [
          l('3.4.1', 'Assets: the mental model'),
          l('3.4.2', 'Schedules, sensors, and jobs'),
          l('3.4.3', 'Partitions and backfills'),
          l('3.4.4', 'Retries, resources, and run config'),
        ],
      },
      {
        id: '3.5',
        title: 'The Airflow translation',
        summary: 'The same pipeline in Airflow — vocabulary and trade-offs for the interview.',
        lessons: [l('3.5.1', 'The same pipeline in Airflow')],
      },
      {
        id: '3.6',
        title: 'dbt',
        summary: 'Models, refs, materializations, tests, snapshots — SQL with engineering discipline.',
        lessons: [
          l('3.6.1', 'dbt mental model: models and refs'),
          l('3.6.2', 'Materializations and their trade-offs'),
          l('3.6.3', 'Tests, sources, and docs'),
          l('3.6.4', 'Snapshots: SCD2 revisited'),
          l('3.6.5', 'Project structure conventions'),
        ],
      },
      {
        id: '3.7',
        title: 'Data quality & CI',
        summary: 'Quality strategies, data contracts, and GitHub Actions for data projects.',
        lessons: [
          l('3.7.1', 'Data quality strategies'),
          l('3.7.2', 'CI for data projects'),
        ],
      },
    ],
  },
  {
    number: 4,
    slug: 'spark-and-iceberg',
    title: 'Distributed Processing: Spark & Iceberg',
    tagline: 'Think in distributed terms; make the lakehouse scale-shaped.',
    weeks: 6,
    color: '#fb923c',
    project: {
      code: 'P4',
      name: 'Lakehouse v2',
      pitch: 'The lakehouse migrated to Iceberg + Spark, with a deliberately skewed join tuned and documented.',
    },
    modules: [
      {
        id: '4.1',
        title: 'Distributed fundamentals',
        summary: 'Partitioning, shuffles, skew — and the "your data fits in RAM" argument taken seriously.',
        lessons: [
          l('4.1.1', 'Why distribute (and why not)'),
          l('4.1.2', 'Partitioning and shuffles'),
          l('4.1.3', 'Skew, stragglers, and the DAG'),
        ],
      },
      {
        id: '4.2',
        title: 'Spark architecture & PySpark',
        summary: 'Driver, executors, lazy evaluation, DataFrames, and the cost of UDFs.',
        lessons: [
          l('4.2.1', 'Driver, executors, cluster managers'),
          l('4.2.2', 'DataFrames and lazy evaluation'),
          l('4.2.3', 'Spark SQL and UDF cost'),
          l('4.2.4', 'Reading and writing the lake'),
        ],
      },
      {
        id: '4.3',
        title: 'Spark performance tuning',
        summary: 'Catalyst, AQE, join strategies, salting skew, memory and spill — staff-depth flagship.',
        lessons: [
          l('4.3.1', 'Catalyst and AQE'),
          l('4.3.2', 'Joins: broadcast vs sort-merge'),
          l('4.3.3', 'Fixing skew: salting and beyond'),
          l('4.3.4', 'Memory, caching, and spill'),
          l('4.3.5', 'The Spark UI lab'),
        ],
      },
      {
        id: '4.4',
        title: 'Apache Iceberg',
        summary: 'Why table formats exist, the metadata model, schema evolution, time travel, compaction.',
        lessons: [
          l('4.4.1', 'The Hive table problem'),
          l('4.4.2', 'The Iceberg metadata model'),
          l('4.4.3', 'Schema evolution and hidden partitioning'),
          l('4.4.4', 'Time travel, compaction, maintenance'),
        ],
      },
      {
        id: '4.5',
        title: 'Lakehouse architecture',
        summary: 'Warehouse vs lake vs lakehouse — the decision framework and where it fails.',
        lessons: [
          l('4.5.1', 'Warehouse vs lake vs lakehouse'),
          l('4.5.2', 'Engine interop and where it breaks'),
        ],
      },
    ],
  },
  {
    number: 5,
    slug: 'streaming',
    title: 'Streaming & Real-Time',
    tagline: 'Event-driven pipelines and the semantics that make them hard.',
    weeks: 6,
    color: '#f472b6',
    project: {
      code: 'P5',
      name: 'Real-Time Extension',
      pitch: 'CDC from Postgres through Kafka into windowed streaming aggregates on Iceberg — with chaos drills.',
    },
    modules: [
      {
        id: '5.1',
        title: 'Streaming theory',
        summary: 'Event time, watermarks, windows, delivery guarantees, state, backpressure.',
        lessons: [
          l('5.1.1', 'Event time vs processing time'),
          l('5.1.2', 'Windows and watermarks'),
          l('5.1.3', 'Delivery guarantees'),
          l('5.1.4', 'State and backpressure'),
        ],
      },
      {
        id: '5.2',
        title: 'Kafka fundamentals',
        summary: 'The log, partitions, offsets, producers, consumer groups, retention vs compaction.',
        lessons: [
          l('5.2.1', 'The log'),
          l('5.2.2', 'Topics, partitions, offsets'),
          l('5.2.3', 'Producers: acks and idempotence'),
          l('5.2.4', 'Consumer groups and rebalancing'),
          l('5.2.5', 'Retention, compaction, ordering'),
        ],
      },
      {
        id: '5.3',
        title: 'Schemas & CDC',
        summary: 'Schema Registry, Avro, evolution rules, Debezium, and the outbox pattern.',
        lessons: [
          l('5.3.1', 'Schema Registry and Avro'),
          l('5.3.2', 'Schema evolution rules'),
          l('5.3.3', 'Debezium: CDC from Postgres'),
          l('5.3.4', 'The outbox pattern'),
        ],
      },
      {
        id: '5.4',
        title: 'Stream processing',
        summary: 'Structured Streaming: state, watermarks, checkpoints — and the Flink comparison.',
        lessons: [
          l('5.4.1', 'The Structured Streaming model'),
          l('5.4.2', 'Stateful aggregations and watermarks'),
          l('5.4.3', 'Checkpoints and sinks'),
          l('5.4.4', 'Flink: the comparison'),
        ],
      },
      {
        id: '5.5',
        title: 'Streaming into the lakehouse',
        summary: 'Streaming writes to Iceberg, small files under streaming, Lambda vs Kappa.',
        lessons: [
          l('5.5.1', 'Streaming into Iceberg'),
          l('5.5.2', 'Lambda vs Kappa'),
        ],
      },
    ],
  },
  {
    number: 6,
    slug: 'cloud-aws',
    title: 'Cloud (AWS), IaC & Production',
    tagline: 'Map the local platform to AWS; add the senior engineer’s ops, cost, and security lens.',
    weeks: 6,
    color: '#fbbf24',
    project: {
      code: 'P6',
      name: 'Cloud Lakehouse',
      pitch: 'A Terraform-provisioned serverless lakehouse on AWS with least-privilege IAM and a real cost model.',
    },
    modules: [
      {
        id: '6.1',
        title: 'AWS core for DE',
        summary: 'Billing alarms first, IAM, S3 deeply, and the local-to-cloud mapping table.',
        lessons: [
          l('6.1.1', 'Accounts, billing alarms, IAM'),
          l('6.1.2', 'S3 deeply'),
          l('6.1.3', 'The local-to-cloud map'),
        ],
      },
      {
        id: '6.2',
        title: 'Terraform',
        summary: 'State, plan/apply, modules — infrastructure as code vs ClickOps.',
        lessons: [
          l('6.2.1', 'State, plan, apply'),
          l('6.2.2', 'Modules and project structure'),
        ],
      },
      {
        id: '6.3',
        title: 'Serverless analytics',
        summary: 'Glue, Athena, Lambda — and how warehouse pricing models really compare.',
        lessons: [
          l('6.3.1', 'Glue catalog and Athena'),
          l('6.3.2', 'Lambda ingestion'),
          l('6.3.3', 'Warehouse pricing models compared'),
        ],
      },
      {
        id: '6.4',
        title: 'Observability & reliability',
        summary: 'Logging, metrics, data observability, lineage, SLOs, incident runbooks.',
        lessons: [
          l('6.4.1', 'Logging, metrics, alerting'),
          l('6.4.2', 'Data observability and lineage'),
          l('6.4.3', 'SLOs and runbooks'),
        ],
      },
      {
        id: '6.5',
        title: 'Cost & FinOps',
        summary: 'Storage vs compute pricing mechanics, partition pruning as cost control, a cost-review method.',
        lessons: [
          l('6.5.1', 'Where the money goes'),
          l('6.5.2', 'A cost review method'),
        ],
      },
      {
        id: '6.6',
        title: 'Security & governance',
        summary: 'Encryption, secrets, PII, retention, access control.',
        lessons: [
          l('6.6.1', 'Encryption, secrets, PII'),
          l('6.6.2', 'Access control and catalogs'),
        ],
      },
    ],
  },
  {
    number: 7,
    slug: 'architecture',
    title: 'Staff-Level Architecture',
    tagline: 'Synthesis: design and defend data systems on paper.',
    weeks: 5,
    color: '#38bdf8',
    project: {
      code: 'P7',
      name: 'Architecture Portfolio',
      pitch: 'Three polished design docs plus a bottleneck-and-cost retrospective of your own platform.',
    },
    modules: [
      {
        id: '7.1',
        title: 'DDIA consolidation',
        summary: 'Replication, partitioning, transactions, consensus, consistency models, clocks.',
        lessons: [
          l('7.1.1', 'Replication'),
          l('7.1.2', 'Partitioning'),
          l('7.1.3', 'Transactions revisited'),
          l('7.1.4', 'Consensus and Raft'),
          l('7.1.5', 'Consistency models, CAP, PACELC'),
          l('7.1.6', 'Clocks and time'),
        ],
      },
      {
        id: '7.2',
        title: 'Data architecture patterns',
        summary: 'Batch/Lambda/Kappa, platform vs mesh, build vs buy, migration strategies.',
        lessons: [
          l('7.2.1', 'Batch, Lambda, Kappa'),
          l('7.2.2', 'Central platform vs data mesh'),
          l('7.2.3', 'Build vs buy and migrations'),
        ],
      },
      {
        id: '7.3',
        title: 'Capacity planning & estimation',
        summary: 'Back-of-envelope method, latency numbers, load modeling.',
        lessons: [
          l('7.3.1', 'The back-of-envelope method'),
          l('7.3.2', 'Latency numbers and load models'),
        ],
      },
      {
        id: '7.4',
        title: 'Design-doc practice',
        summary: 'Write ADRs and design docs, then four timed design exercises.',
        lessons: [
          l('7.4.1', 'Writing ADRs and design docs'),
          l('7.4.2', 'Design: clickstream analytics'),
          l('7.4.3', 'Design: experimentation pipeline'),
          l('7.4.4', 'Design: CDC search indexing'),
          l('7.4.5', 'Design: multi-tenant reporting'),
        ],
      },
    ],
  },
  {
    number: 8,
    slug: 'papers-and-mini-engines',
    title: 'Papers & Mini-Engines',
    tagline: 'Read the canon; build toy engines to make it stick.',
    weeks: 10,
    color: '#e879f9',
    project: {
      code: 'P8',
      name: 'The Mini-Engine Trilogy',
      pitch: 'An LSM storage engine, a vectorized columnar query engine, and a checkpointed stream processor — from scratch.',
    },
    modules: [
      {
        id: '8.1',
        title: 'Reading papers',
        summary: 'How to read a systems paper, plus a guided tour of the canon.',
        lessons: [
          l('8.1.1', 'How to read a systems paper'),
          l('8.1.2', 'The canon: a guided tour'),
        ],
      },
      {
        id: '8.2',
        title: 'LSM storage engine (build P8a)',
        summary: 'Memtables, WAL, SSTables, compaction, bloom filters — paired with the LSM/Bigtable/Dynamo papers.',
        lessons: [
          l('8.2.1', 'LSM trees: memtables and SSTables'),
          l('8.2.2', 'WAL and crash recovery'),
          l('8.2.3', 'Compaction strategies'),
          l('8.2.4', 'Bloom filters and read paths'),
        ],
      },
      {
        id: '8.3',
        title: 'Columnar query engine (build P8b)',
        summary: 'Column formats, pushdown, vectorized operators — paired with C-Store/MonetDB/Dremel/Snowflake.',
        lessons: [
          l('8.3.1', 'Columnar formats from scratch'),
          l('8.3.2', 'Predicate pushdown and statistics'),
          l('8.3.3', 'Vectorized operators'),
          l('8.3.4', 'Volcano vs vectorized execution'),
        ],
      },
      {
        id: '8.4',
        title: 'Stream processor (build P8c)',
        summary: 'Event-time windows, watermarks, checkpointing — paired with Kafka/Dataflow/MillWheel.',
        lessons: [
          l('8.4.1', 'Event-time windowing from scratch'),
          l('8.4.2', 'Watermarks and late data'),
          l('8.4.3', 'Checkpointing and recovery'),
        ],
      },
    ],
  },
]

// ---------- helpers ----------

export interface LessonRef {
  lesson: LessonMeta
  module: ModuleMeta
  phase: PhaseMeta
}

const flat: LessonRef[] = phases.flatMap((phase) =>
  phase.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module, phase }))),
)

export function allLessons(): LessonRef[] {
  return flat
}

export function findLesson(id: string): LessonRef | undefined {
  return flat.find((r) => r.lesson.id === id)
}

export function findPhase(num: number): PhaseMeta | undefined {
  return phases.find((p) => p.number === num)
}

export function lessonNeighbors(id: string): { prev?: LessonRef; next?: LessonRef } {
  const i = flat.findIndex((r) => r.lesson.id === id)
  if (i === -1) return {}
  return { prev: flat[i - 1], next: flat[i + 1] }
}

export function firstUnauthored(): LessonRef | undefined {
  return flat.find((r) => !r.lesson.authored)
}

export function totalLessonCount(): number {
  return flat.length
}

export function authoredLessonCount(): number {
  return flat.filter((r) => r.lesson.authored).length
}

/** Progress for a phase given the progress store's `done` map. */
export function phaseProgress(phase: PhaseMeta, done: Record<string, string>) {
  const lessons = phase.modules.flatMap((m) => m.lessons)
  const doneCount = lessons.filter((les) => done[les.id]).length
  const authored = lessons.filter((les) => les.authored).length
  return { done: doneCount, authored, total: lessons.length }
}
