// Growing glossary. New jargon introduced in any lesson gets an entry here
// (see CLAUDE.md content rules) and is wrapped in <GlossaryTerm> on first use.

export interface GlossaryEntry {
  term: string
  definition: string
}

export const glossary: Record<string, GlossaryEntry> = {
  'data-pipeline': {
    term: 'Data pipeline',
    definition:
      'A sequence of automated steps that moves data from where it is produced to where it is useful, usually cleaning and reshaping it along the way.',
  },
  etl: {
    term: 'ETL',
    definition:
      'Extract, Transform, Load — pull data from a source, reshape it, then write it to a destination. Contrast with ELT, where raw data is loaded first and transformed inside the destination.',
  },
  elt: {
    term: 'ELT',
    definition:
      'Extract, Load, Transform — load raw data into the warehouse/lake first, then transform it there with SQL. The dominant modern pattern because storage is cheap and warehouses are fast.',
  },
  'data-warehouse': {
    term: 'Data warehouse',
    definition:
      'A database optimized for analytical questions over large history ("how did sales trend by region?") rather than fast single-record lookups.',
  },
  'data-lake': {
    term: 'Data lake',
    definition:
      'Cheap object storage (like S3) holding raw files — any format, any size — that engines read directly. Flexible, but without discipline it becomes a swamp.',
  },
  oltp: {
    term: 'OLTP',
    definition:
      'Online Transaction Processing — many small, fast reads/writes of individual records (place order, update profile). What operational app databases do.',
  },
  olap: {
    term: 'OLAP',
    definition:
      'Online Analytical Processing — few, large queries that scan and aggregate millions of rows (sum revenue by month). What warehouses do.',
  },
  idempotency: {
    term: 'Idempotency',
    definition:
      'A property of an operation: running it twice has the same effect as running it once. The single most important property of a reliable pipeline — reruns must not duplicate data.',
  },
  orchestrator: {
    term: 'Orchestrator',
    definition:
      'The system that runs your pipelines on schedule, in the right order, with retries, and tells you when things fail (e.g., Dagster, Airflow).',
  },
  'columnar-storage': {
    term: 'Columnar storage',
    definition:
      'Storing all values of each column together (instead of row by row) so analytical queries read only the columns they need — often 10–100x less I/O.',
  },
  repository: {
    term: 'Repository',
    definition: 'A folder whose entire history of changes is tracked by git. "Repo" for short.',
  },
  commit: {
    term: 'Commit',
    definition:
      'A saved snapshot of your repository at a point in time, with a message describing what changed. The unit of history in git.',
  },
  branch: {
    term: 'Branch',
    definition:
      'A movable pointer to a line of commits, letting you work on changes in parallel without touching the main history until you merge.',
  },
  'virtual-environment': {
    term: 'Virtual environment',
    definition:
      'An isolated per-project Python installation, so each project pins its own package versions without breaking the others.',
  },
  container: {
    term: 'Container',
    definition:
      'A lightweight, isolated box for running software with everything it needs bundled in — the same on every machine. Docker is the standard tool.',
  },
  image: {
    term: 'Image (Docker)',
    definition:
      'The frozen template a container is started from — like a class to a container’s instance. Pulled from registries such as Docker Hub.',
  },
  terminal: {
    term: 'Terminal',
    definition:
      'A text interface for driving your computer with commands. Data engineering work lives here: running pipelines, inspecting servers, using git.',
  },
  'package-manager': {
    term: 'Package manager',
    definition:
      'A tool that installs and updates software libraries and resolves their version requirements (uv/pip for Python, npm for JavaScript).',
  },
  'object-storage': {
    term: 'Object storage',
    definition:
      'Storage that keeps files ("objects") under string keys in buckets, accessed over HTTP — no real folders, no in-place edits. S3 is the archetype; MinIO is the local stand-in.',
  },
  'schema': {
    term: 'Schema',
    definition:
      'The declared shape of data: column names, types, and constraints. Schemas are contracts between producers and consumers of data.',
  },
  // --- added with Phase 1 ---
  repl: {
    term: 'REPL',
    definition:
      'The read-eval-print loop — Python’s interactive prompt (started with uv run python) where each typed expression is evaluated immediately; the standard place to test small ideas before committing them to a script.',
  },
  traceback: {
    term: 'Traceback',
    definition:
      'Python’s crash report: the exception type and message on the last line, preceded by the chain of calls that led there. Read bottom-up, then find the nearest frame in your own code.',
  },
  exception: {
    term: 'Exception',
    definition:
      'An object raised when an operation cannot proceed (KeyError, ValueError, TypeError…). In pipelines, exception types are diagnoses of data problems; catch them narrowly or crash loudly.',
  },
  generator: {
    term: 'Generator',
    definition:
      'A lazily-evaluated producer of values (a function containing yield, or a parenthesized comprehension) that computes one item per next() call in constant memory; single-pass — once exhausted it yields nothing more.',
  },
  'lazy-evaluation': {
    term: 'Lazy evaluation',
    definition:
      'Deferring computation until a result is actually demanded, so data streams item-by-item instead of materializing in memory — the idea shared by Python generators, query executors, and Spark’s deferred execution.',
  },
  encoding: {
    term: 'Encoding',
    definition:
      'The mapping between text characters and bytes (utf-8, cp1252). Every file read needs the right one declared; mismatches cause silent mojibake or loud decode errors.',
  },
  mojibake: {
    term: 'Mojibake',
    definition:
      'Garbled text (Ã© instead of é) produced when bytes written in one encoding are decoded with another — silent corruption, unlike a UnicodeDecodeError.',
  },
  'json-lines': {
    term: 'JSON Lines',
    definition:
      'A text format with one complete JSON object per line (.jsonl/ndjson). Streamable, appendable, and splittable — the default landing format between pipeline stages.',
  },
  'http-api': {
    term: 'HTTP API',
    definition:
      'A service exposing data over HTTP endpoints, usually returning JSON. The front door through which most third-party data enters a pipeline.',
  },
  'rate-limit': {
    term: 'Rate limit',
    definition:
      'A server-enforced cap on request frequency; exceeding it returns HTTP 429, telling the client to back off before retrying.',
  },
  'exponential-backoff': {
    term: 'Exponential backoff',
    definition:
      'A retry strategy that doubles the wait after each failure, combined with random jitter so synchronized clients desynchronize instead of hammering a recovering server together.',
  },
  utc: {
    term: 'UTC',
    definition:
      'Coordinated Universal Time — the DST-free reference clock. Pipeline discipline: convert to UTC at ingestion, compute in UTC, convert to local time only for display.',
  },
  'iso-8601': {
    term: 'ISO 8601',
    definition:
      'The standard text format for dates and times (2026-07-04T12:00:00+00:00): biggest unit first, offset at the end, sorts correctly as plain text.',
  },
  dst: {
    term: 'DST',
    definition:
      'Daylight saving time — twice-yearly clock shifts that make one local hour occur twice and another never; the reason local-time data needs zone rulebooks, not fixed offsets.',
  },
  dataframe: {
    term: 'DataFrame',
    definition:
      'An in-memory table of named, typed columns (pandas, polars) enabling whole-column vectorized operations instead of per-row loops — at the cost of fitting in RAM.',
  },
  vectorization: {
    term: 'Vectorization',
    definition:
      'Executing one operation over a whole typed buffer in compiled code (cache- and SIMD-friendly) rather than an interpreted per-element loop; the source of DataFrame and DuckDB speed.',
  },
  'apache-arrow': {
    term: 'Apache Arrow',
    definition:
      'A standardized columnar in-memory format that lets engines (polars, DuckDB, Spark, pandas) hand tables to each other without copies or serialization.',
  },
  cte: {
    term: 'CTE',
    definition:
      'A Common Table Expression — a subquery named with WITH at the top of a SQL statement, usable like a table; chains of CTEs structure complex queries as readable, top-down pipelines.',
  },
  'window-function': {
    term: 'Window function',
    definition:
      'A SQL function that computes a value for each row over a set of related rows (its window) — ranks, neighbors, running aggregates — without collapsing rows the way GROUP BY does.',
  },
  'window-frame': {
    term: 'Window frame',
    definition:
      'The subrange of an ordered window partition an aggregate sees for the current row (e.g. ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) — the mechanism behind running totals and moving averages.',
  },
  'set-operation': {
    term: 'Set operation',
    definition:
      'An operator combining whole result sets — UNION, UNION ALL, INTERSECT, EXCEPT — matching columns by position; UNION additionally deduplicates entire rows at sort/hash cost.',
  },
  pivot: {
    term: 'Pivot',
    definition:
      'Rotating a long table (one row per fact) into a wide grid (one column per category), via conditional aggregation or engine-specific PIVOT syntax; unpivot is the reverse.',
  },
  linter: {
    term: 'Linter',
    definition:
      'A tool that parses code and mechanically flags rule violations (style and bug-prone patterns); sqlfluff is the standard SQL linter, oxlint/ruff serve JS and Python.',
  },
  'environment-variable': {
    term: 'Environment variable',
    definition:
      'A key-value string the operating system hands to every process it starts; the standard channel for per-machine and per-deploy configuration and secrets, read in Python via os.environ.',
  },
  cli: {
    term: 'CLI',
    definition:
      'Command-line interface — a program’s typed contract of subcommands, flags, and exit codes that lets humans and schedulers drive it without editing code.',
  },
  'exit-code': {
    term: 'Exit code',
    definition:
      'The integer a process returns on termination (0 = success, non-zero = failure); the machine-readable signal schedulers, CI, and shells use to decide what happens next.',
  },
  cron: {
    term: 'cron',
    definition:
      'The Unix time-based job scheduler and its five-field expression syntax (minute hour day-of-month month day-of-week), reused by virtually every modern scheduler and orchestrator.',
  },
  // --- added with Phase 2 ---
  transaction: {
    term: 'Transaction',
    definition:
      'A group of database statements that either all take effect (COMMIT) or none do (ROLLBACK) — the unit of atomicity, and the boundary at which constraints and durability are guaranteed.',
  },
  acid: {
    term: 'ACID',
    definition:
      'Atomicity, Consistency, Isolation, Durability — the four guarantees a transactional database makes about committed work.',
  },
  wal: {
    term: 'WAL',
    definition:
      'Write-ahead log — the append-only journal a database flushes to disk before COMMIT returns; crash recovery replays it, so durability lives in the log rather than the data files.',
  },
  mvcc: {
    term: 'MVCC',
    definition:
      'Multi-version concurrency control — updates write new row versions instead of overwriting, and each transaction reads through a snapshot, so readers never block writers.',
  },
  'isolation-level': {
    term: 'Isolation level',
    definition:
      'The per-transaction setting (in Postgres: Read Committed, Repeatable Read, Serializable) controlling which concurrency anomalies a transaction can observe.',
  },
  constraint: {
    term: 'Constraint',
    definition:
      'A schema rule (NOT NULL, PRIMARY KEY, UNIQUE, CHECK, FOREIGN KEY) the engine enforces on every write path — validation that never sleeps.',
  },
  vacuum: {
    term: 'VACUUM',
    definition:
      'Postgres maintenance that reclaims dead tuples left behind by MVCC updates and deletes; autovacuum runs it automatically.',
  },
  'connection-pooling': {
    term: 'Connection pooling',
    definition:
      'Reusing a small set of long-lived database connections across many clients — needed because Postgres forks an OS process per connection.',
  },
  parquet: {
    term: 'Parquet',
    definition:
      'Open columnar file format for analytics — data stored in row groups of column chunks, with schema, offsets, and min/max statistics embedded in a footer that readers consult before fetching any data.',
  },
  avro: {
    term: 'Avro',
    definition:
      'Row-oriented binary file format with the schema embedded and formal evolution rules (reader vs writer schema resolution); the standard serialization for streaming pipelines such as Kafka.',
  },
  'row-group': {
    term: 'Row group',
    definition:
      'A horizontal slice of a Parquet file holding a contiguous batch of rows for all columns; the unit of parallelism and of statistics-based skipping.',
  },
  'predicate-pushdown': {
    term: 'Predicate pushdown',
    definition:
      'Evaluating a query filter against file/block metadata (e.g. min/max statistics) so blocks that provably cannot match are skipped without being read.',
  },
  'partition-pruning': {
    term: 'Partition pruning',
    definition:
      'Eliminating whole partitions (directories of files) at query-planning time based on partition-key values encoded in storage paths, before any file is opened.',
  },
  'schema-on-read': {
    term: 'Schema-on-read',
    definition:
      'Storing untyped bytes (CSV, JSONL) and applying types at query time — every reader re-interprets the data, so malformed values surface late or silently vanish.',
  },
  compaction: {
    term: 'Compaction',
    definition:
      'Periodically rewriting many small files into fewer large ones (often re-sorting in the same pass) to restore healthy file sizes and statistics-based skipping in a data lake.',
  },
  'small-files-problem': {
    term: 'Small-files problem',
    definition:
      'Collapse of scan throughput when a dataset is split across huge numbers of tiny files, because per-file fixed costs (listing, opens, footer reads, planning) dominate actual data reading.',
  },
  subquery: {
    term: 'Subquery',
    definition:
      'A SELECT query nested inside another statement. Its position sets its shape: scalar (one value, used like a literal), a set behind IN/EXISTS, or a derived table in FROM. The inner query is evaluated before the outer one can use its result.',
  },
  'correlated-subquery': {
    term: 'Correlated subquery',
    definition:
      'A subquery that references a column from the outer query, so it is logically re-evaluated for every outer row (e.g. comparing each row to its own group average). Contrast with an uncorrelated subquery, which ignores the outer row and runs once; optimizers usually decorrelate correlated forms into joins.',
  },
  'derived-table': {
    term: 'Derived table',
    definition:
      'A subquery used in the FROM clause as if it were a real table, requiring an alias. Lets you compute an intermediate result (such as per-group aggregates) and then filter or join against it in the same statement.',
  },
  'semi-join': {
    term: 'Semi-join',
    definition:
      'A join that returns each row of one table where at least one match exists in another, without duplicating rows or adding the other table\'s columns. IN and EXISTS express it; unlike an inner join it never multiplies rows, making it the correct tool for existence tests.',
  },
  'image-layer': {
    term: 'Image layer',
    definition:
      'The read-only filesystem diff produced by a single image build step (the files it added, changed, or deleted). Layers are immutable and content-addressed by hash, so identical layers are stored once and shared across images and containers.',
  },
  'union-filesystem': {
    term: 'Union filesystem',
    definition:
      'A filesystem (overlayfs on Linux) that merges a stack of layers into one coherent tree, with upper layers shadowing lower ones and whiteout markers recording deletions. It is how a container presents many read-only image layers plus its writable layer as a single directory tree.',
  },
  'base-image': {
    term: 'Base image',
    definition:
      'The image named in a Dockerfile\'s FROM instruction — the bottom of the layer stack that everything else builds on (e.g. python:3.13-slim). Many images share one base, so its layers are downloaded and stored a single time.',
  },
  'copy-on-write': {
    term: 'Copy-on-write',
    definition:
      'Sharing data until it is modified: a container reads files straight from the read-only image layers, but the first write to a file copies it up into the writable layer and edits the copy, leaving the underlying image untouched. Cheap to share, with a copy cost on first write.',
  },
  'container-registry': {
    term: 'Container registry',
    definition:
      'A server that stores and serves container images (Docker Hub is the default public one; companies run private ones). docker pull downloads an image by registry/repository:tag; docker push publishes one. Layers are stored once per registry and deduplicated by digest.',
  },
  dockerfile: {
    term: 'Dockerfile',
    definition:
      'A plain-text file of ordered instructions (FROM, COPY, RUN, CMD, …) that Docker executes top-to-bottom to build an image, one layer per instruction.',
  },
  buildkit: {
    term: 'BuildKit',
    definition:
      'The modern Docker build engine that compiles a Dockerfile into a build DAG — content-addressed caching, parallel execution of independent stages, cache mounts, and pruning of unused work.',
  },
  'build-context': {
    term: 'Build context',
    definition:
      'The directory tree sent to the Docker builder when a build starts; COPY and ADD can only reference files inside it, so a bloated context slows builds and can leak secrets into images.',
  },
  dockerignore: {
    term: '.dockerignore',
    definition:
      'A file of glob patterns excluded from the build context before it is sent to the builder — like .gitignore, but for image builds. Keeps contexts small and secrets out.',
  },
  'multi-stage-build': {
    term: 'Multi-stage build',
    definition:
      'A Dockerfile with several FROM stages where a slim final stage copies only the built artifacts from a heavier builder stage, discarding compilers and build tooling to ship a small, safer image.',
  },
  'non-root-user': {
    term: 'Non-root user',
    definition:
      'Running a container\'s main process as an unprivileged USER rather than root, shrinking the blast radius if the process is compromised or escapes.',
  },
  'docker-compose': {
    term: 'Docker Compose',
    definition:
      'A tool that runs a multi-container application declared in a YAML file (services, one network, volumes) with a single up/down command — the standard way to wire local multi-service stacks.',
  },
  'compose-service': {
    term: 'Compose service',
    definition:
      'A single container definition within a docker-compose.yml file — its image (or build), ports, environment, volumes, and dependencies.',
  },
  'service-discovery': {
    term: 'Service discovery',
    definition:
      'Compose\'s shared network plus embedded DNS resolves each service name to its container\'s current IP, so services reach each other by name (e.g. an app connects to host "db") instead of a hardcoded address.',
  },
  'named-volume': {
    term: 'Named volume',
    definition:
      'A Docker-managed persistent volume referenced by name that lives outside any container\'s writable layer and survives container removal — where stateful data (a database\'s files) belongs.',
  },
  'bind-mount': {
    term: 'Bind mount',
    definition:
      'A mount mapping a specific host directory into a container so host and container share files live — used to inject dev code or config, in contrast to a Docker-managed named volume.',
  },
  healthcheck: {
    term: 'Healthcheck',
    definition:
      'A command Docker runs on a schedule to report whether a container is actually ready (exit 0 = healthy). Lets dependents wait for readiness via depends_on: condition: service_healthy, unlike plain depends_on which only waits for start.',
  },
  kubernetes: {
    term: 'Kubernetes',
    definition:
      'A multi-host container orchestrator providing scheduling, self-healing rescheduling, rolling deploys, and autoscaling across a cluster of machines — the production step beyond single-host Compose.',
  },
  'batch-processing': {
    term: 'Batch processing',
    definition:
      'Processing a complete, bounded chunk of data in one pass, usually on a schedule. High throughput, high latency — the classic ETL cadence.',
  },
  'micro-batch': {
    term: 'Micro-batch',
    definition:
      'A stream sliced into a sequence of small bounded batches processed on a short interval — a tunable middle ground between batch and true streaming.',
  },
  'stream-processing': {
    term: 'Stream processing',
    definition:
      'Processing each event as it arrives over unbounded data, for the lowest latency and the highest complexity.',
  },
  'bounded-data': {
    term: 'Bounded data',
    definition:
      'A finite, complete dataset you can see in full before computing a result — the natural input to batch processing.',
  },
  'unbounded-data': {
    term: 'Unbounded data',
    definition:
      'A never-ending stream with no end at which to compute a final answer, so aggregates must be computed over windows.',
  },
  latency: {
    term: 'Latency',
    definition:
      'How stale a pipeline\'s output is — the delay between an event happening and its effect appearing downstream. Traded against throughput and cost.',
  },
  throughput: {
    term: 'Throughput',
    definition: 'The volume of records a pipeline processes per unit time.',
  },
  watermark: {
    term: 'Watermark',
    definition:
      'A moving marker asserting "every event up to here has been seen" — the maximum high-water-mark value already processed. Incremental loads advance it each run; late data arrives behind it.',
  },
  'incremental-load': {
    term: 'Incremental load',
    definition:
      'Loading only the rows changed since last time (cost scales with change volume, not table size), using a high-water-mark column plus an upsert.',
  },
  'high-water-mark': {
    term: 'High-water mark',
    definition:
      'The source column that only increases as rows change (e.g. updated_at or a monotonic id), used to select the delta since the last load.',
  },
  upsert: {
    term: 'Upsert',
    definition:
      'A write that updates a row when its key already exists and inserts it otherwise (MERGE, or INSERT ... ON CONFLICT DO UPDATE). Idempotent per key.',
  },
  backfill: {
    term: 'Backfill',
    definition:
      'Reprocessing a past date range — to fix a bug, fill a gap, or apply new logic to history. Safe to repeat when each partition load is idempotent.',
  },
  'late-data': {
    term: 'Late data',
    definition:
      'An event whose event-time is already behind the watermark when it arrives, so the window it belongs to may have closed. Handled by dropping, dead-lettering, or restating.',
  },
  'allowed-lateness': {
    term: 'Allowed lateness',
    definition:
      'A grace window past the watermark during which a straggler event can still update a window\'s result before its state is discarded.',
  },
  'dead-letter': {
    term: 'Dead letter',
    definition:
      'A side table or queue for records that cannot be processed (bad types, validation failures, poison messages), tagged with a reason so the main flow keeps moving.',
  },
  'poison-message': {
    term: 'Poison message',
    definition:
      'A record that repeatedly fails processing (e.g. a deserialization or type error) and can stall a consumer if it is not routed to a dead-letter store.',
  },
  restatement: {
    term: 'Restatement',
    definition:
      'A backfill that recomputes and republishes already-published results to fold in corrections or late-arriving data.',
  },
  'change-data-capture': {
    term: 'Change data capture (CDC)',
    definition:
      'Capturing row-level inserts, updates, and deletes from a source database as a stream of change events — via the transaction log (log-based), polling a timestamp (query-based), or database triggers.',
  },
  'logical-decoding': {
    term: 'Logical decoding',
    definition:
      'Translating a database\'s physical write-ahead-log entries back into logical row changes (operation plus before/after images) in commit order — the basis of log-based CDC.',
  },
  'replication-slot': {
    term: 'Replication slot',
    definition:
      'A durable cursor in Postgres tracking a CDC consumer\'s position; it pins WAL until changes are acknowledged, so a stalled consumer can grow WAL without bound.',
  },
  tombstone: {
    term: 'Tombstone',
    definition:
      'A delete marker in a change stream or compacted log (often a key with a null value) that signals removal and lets physical cleanup proceed.',
  },
  prefix: {
    term: 'Prefix (object storage)',
    definition:
      'The leading portion of an object key up to a delimiter. Consoles render prefixes as "folders", but the namespace is actually flat — there are no real directories.',
  },
  'strong-consistency': {
    term: 'Strong consistency',
    definition:
      'A read immediately after a write always returns the latest value. Modern S3 and MinIO guarantee it for object operations.',
  },
  'eventual-consistency': {
    term: 'Eventual consistency',
    definition:
      'After a write, reads may briefly return stale data or miss the object before converging — S3\'s pre-2020 behavior, still a hazard in some distributed stores.',
  },
  minio: {
    term: 'MinIO',
    definition:
      'An open-source, S3-compatible object store you can run locally (in Docker) — your data lake and S3 API without a cloud account, ideal for dev and CI parity.',
  },
  's3-api': {
    term: 'S3 API',
    definition:
      'The HTTP REST interface (buckets and keys, PUT/GET/LIST, multipart upload, SigV4 auth) that S3 defines and compatible stores like MinIO implement.',
  },
  httpfs: {
    term: 'httpfs',
    definition:
      'A DuckDB extension for reading and writing over HTTP and S3-compatible object stores via s3:// URLs.',
  },
  'medallion-architecture': {
    term: 'Medallion architecture',
    definition:
      'A data-lake convention of bronze (raw), silver (cleaned/conformed), and gold (business marts) layers, each rebuilt from the one below so you can always replay from raw.',
  },
  'bronze-layer': {
    term: 'Bronze layer',
    definition: 'The raw, as-ingested, append-only copy of source data — the replayable source of truth in a medallion lake.',
  },
  'silver-layer': {
    term: 'Silver layer',
    definition: 'Cleaned, typed, deduplicated, conformed data — one row per real entity, built from bronze.',
  },
  'gold-layer': {
    term: 'Gold layer',
    definition: 'Business-level marts and aggregates shaped for the questions people actually ask, built from silver.',
  },
  'write-amplification': {
    term: 'Write amplification',
    definition:
      'Storing or rewriting the same logical data multiple times (e.g. across bronze/silver/gold copies), multiplying storage and compute cost.',
  },
  'software-defined-asset': {
    term: 'Software-defined asset',
    definition:
      'A persistent data object (a table or file) that Dagster manages, defined by the @asset function that produces it — the unit of an asset-centric orchestrator, as opposed to a task/op.',
  },
  materialization: {
    term: 'Materialization',
    definition:
      'The act (and recorded event) of computing an asset and persisting its value; an orchestrator logs each one with a timestamp and metadata, forming the asset\'s history.',
  },
  'data-lineage': {
    term: 'Data lineage',
    definition:
      'The recorded graph of what each dataset is built from (upstream) and what depends on it (downstream) — used for root-cause and impact analysis.',
  },
  'freshness-policy': {
    term: 'Freshness policy',
    definition:
      'A declared staleness bound on an asset ("no more than an hour old") from which the orchestrator derives when to run, instead of a hand-pinned schedule.',
  },
  'dagster-job': {
    term: 'Job (Dagster)',
    definition: 'A named, runnable selection of assets (or ops) that schedules and sensors launch.',
  },
  schedule: {
    term: 'Schedule',
    definition: 'A time-driven trigger that runs a job on a cron cadence, whether or not new data exists.',
  },
  sensor: {
    term: 'Sensor',
    definition: 'An event-driven trigger that polls a condition (a file landing, an asset materializing) and runs a job when it becomes true.',
  },
  'run-key': {
    term: 'Run key',
    definition:
      'A string on a run request that the orchestrator deduplicates on, making triggering idempotent — no second run launches for a key that already ran.',
  },
  'partitioned-asset': {
    term: 'Partitioned asset',
    definition:
      'A single logical asset divided along a key (commonly one partition per day) whose partitions are materialized and tracked independently.',
  },
  'dagster-resource': {
    term: 'Resource (Dagster)',
    definition:
      'A pluggable external dependency (a database connection, an S3 client) the orchestrator constructs and injects into assets by parameter name — dependency injection, swappable per environment.',
  },
  airflow: {
    term: 'Apache Airflow',
    definition:
      'The mature, ubiquitous open-source workflow orchestrator (from Airbnb, 2015; Apache since 2016). Task-centric and the de facto industry default.',
  },
  'airflow-dag': {
    term: 'DAG (Airflow)',
    definition:
      'In Airflow, a Directed Acyclic Graph whose nodes are tasks (steps) and whose edges are dependencies you declare explicitly, plus a schedule.',
  },
  'airflow-operator': {
    term: 'Operator (Airflow)',
    definition:
      'A reusable template for a task (PythonOperator, BashOperator, and hundreds more from provider packages); instantiating one creates a task node.',
  },
  'airflow-scheduler': {
    term: 'Scheduler (Airflow)',
    definition:
      'The long-running Airflow process that parses DAG files and, from the clock and upstream task states, decides which task instances are ready to run.',
  },
  'airflow-executor': {
    term: 'Executor (Airflow)',
    definition:
      'The pluggable strategy that actually runs ready task instances — LocalExecutor (subprocesses), or CeleryExecutor/KubernetesExecutor for distributed runs.',
  },
  'task-instance': {
    term: 'Task instance',
    definition:
      'One Airflow task on one logical date, with its own state (queued, running, success, failed, up_for_retry) in the metadata database.',
  },
  'taskflow-api': {
    term: 'TaskFlow API',
    definition:
      'The modern Airflow authoring style using @dag/@task decorators: dependencies are wired by calling task functions, and return values pass between tasks as XComs.',
  },
  xcom: {
    term: 'XCom',
    definition:
      'Airflow\'s "cross-communication" mechanism for passing a small value between tasks via the metadata database — for row counts and paths, never large datasets.',
  },
  'data-quality': {
    term: 'Data quality',
    definition:
      'The practice of asserting measurable properties of data — not just that the job ran. A check is a query returning rule-violating rows; zero rows means the rule holds.',
  },
  observability: {
    term: 'Data observability',
    definition:
      'Continuous, out-of-band measurement of data metrics (row counts, null rates, freshness lag) with anomaly detection and alerting — it preserves delivery but detects problems after the fact, in contrast to a blocking test.',
  },
  'data-contract': {
    term: 'Data contract',
    definition:
      'A machine-checkable, owned agreement listing a dataset\'s guaranteed invariants (which properties are blocked and versioned versus best-effort and monitored).',
  },
  freshness: {
    term: 'Freshness',
    definition:
      'The timeliness dimension of data quality — how far behind "now" the newest accepted row is. It fails when the lag exceeds an SLA, even though every value is valid.',
  },
  sla: {
    term: 'SLA',
    definition:
      'Service-level agreement — the agreed limit a dataset must meet (e.g. maximum staleness, or a delivery deadline).',
  },
  quarantine: {
    term: 'Quarantine',
    definition:
      'Routing rule-violating rows to a dead-letter table so clean rows keep flowing — partial delivery now, replay the quarantined rows after a fix.',
  },
  'continuous-integration': {
    term: 'Continuous integration (CI)',
    definition:
      'Automatically building and testing every change against the shared codebase before merge, in a clean reproducible environment — for data, running dbt build + tests on each pull request.',
  },
  'branch-protection': {
    term: 'Branch protection',
    definition: 'A repository rule requiring a CI check to pass before a pull request can merge to a protected branch like main.',
  },
  'slim-ci': {
    term: 'Slim CI',
    definition:
      'Building only the changed models and their downstream dependents (dbt state:modified+) against a saved manifest, so CI time scales with the change rather than the whole project.',
  },
  defer: {
    term: 'Defer (dbt)',
    definition:
      'dbt --defer references unchanged upstream models from a production environment instead of rebuilding them in CI — the other half of slim CI.',
  },
  'ephemeral-environment': {
    term: 'Ephemeral environment',
    definition:
      'A throwaway, per-run schema/warehouse (or DuckDB file) created and dropped for each CI run, so tests are isolated and leave no residue.',
  },
  sqlfluff: {
    term: 'SQLFluff',
    definition: 'A SQL linter that parses SQL and flags style and rule violations, exiting non-zero on a problem — the SQL analogue of a code linter, runnable in CI.',
  },
}
