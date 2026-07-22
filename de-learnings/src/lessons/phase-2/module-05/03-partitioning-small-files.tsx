import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeBlock } from '../../../components/CodeBlock'
import { CodeRunner } from '../../../components/CodeRunner'
import { BenchBars } from '../../../viz/BenchBars'

const ID = '2.5.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The most powerful — and most misused — lever in lake storage">
        <Tiered
          layman={
            <>
              <p>
                Picture a warehouse with one aisle per delivery date. Need Tuesday's stock? Walk one aisle and ignore the other 364 — you never even glance at them. That is partitioning: organize storage by the question you ask most, and most of the building becomes irrelevant to any one search.
              </p>
              <p>
                Now imagine a manager who takes the idea too far: one labeled shelf per <em>screw</em>. Millions of shelves, each holding almost nothing. Finding anything now means reading millions of labels and opening millions of tiny doors — the organizing scheme itself became the bottleneck. Both failure modes are real, both are common, and the second one — the "small-files problem" — is almost always self-inflicted. This lesson teaches the lever and the discipline.
              </p>
            </>
          }
          student={
            <>
              <p>
                Files in a <GlossaryTerm k="data-lake">lake</GlossaryTerm> live in directories, and <strong>hive-style partitioning</strong> encodes column values in directory names: <code>dt=2026-07-01/city=london/part-0.parquet</code>. Engines parse those paths, so a query filtering <code>dt = '2026-07-01'</code> plans I/O for one directory and never lists, opens, or reads any other — <strong>partition pruning</strong>. It is 2.5.2's skipping story one level up: footer stats prune row groups <em>inside</em> a file; partitioning prunes <em>whole files</em> before any footer is read.
              </p>
              <p>
                The lever misfires in two directions. Partition by a high-cardinality key (user_id) and you mint millions of directories holding tiny files. Write with too many small batches and even a sane key produces thousands of files per partition. Either way you hit the small-files problem: per-file overhead swamps actual data reading. The numbers, the arithmetic, and the fixes follow.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Partitioning is coarse-grained indexing: a partition key is a zone map at directory granularity, with exact (not min/max) value knowledge because the value <em>is</em> the path. Pruning happens at plan time from the namespace alone — zero data I/O — which is both its power and its constraint: it only serves predicates on the partition key, and only at the granularity chosen at write time.
              </p>
              <p>
                The cost model that punishes over-partitioning is dominated by per-object fixed costs. On <GlossaryTerm k="object-storage">object storage</GlossaryTerm>, every file costs a LIST share plus a GET (or several ranged GETs: footer length, footer, data) with per-request latency and per-request billing; metadata about N files must also be held and planned over, so planner memory and plan time scale with file count, not bytes. A dataset of fixed size split into k files costs roughly O(k) fixed overhead plus O(bytes) streaming — small files push you into the regime where O(k) dominates. Phase 3's MinIO lab makes the request economics concrete; Phase 4's Iceberg attacks both the metadata explosion (manifest files) and the coupling of partition scheme to query text (hidden partitioning).
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Choosing partition keys: cardinality discipline">
        <Tiered
          layman={
            <>
              <p>
                The whole game is picking what gets an aisle. Good aisle labels are things you always search by and that come in modest numbers: dates (365 a year), regions (a handful). Terrible labels are things that come in millions: customer numbers, order numbers — that is the shelf-per-screw warehouse.
              </p>
              <p>
                Before building, do the arithmetic on paper: how many aisles will exist after a year? How much stock lands in each? If an aisle would hold less than a good boxful, the label is too fine. If one aisle would hold half the warehouse, it is too coarse. The runnable calculator below does exactly this math.
              </p>
            </>
          }
          student={
            <>
              <p>Three questions, in order, before any PARTITION BY:</p>
              <ul>
                <li><strong>Do queries filter on it?</strong> Pruning only fires for predicates on the partition key. Time is nearly universal (dashboards, backfills, retention), which is why <code>dt</code> is the default partition key of the industry.</li>
                <li><strong>What is its cardinality?</strong> Dates: 365 per year — fine. user_id: millions — catastrophe. Every distinct value becomes at least one directory and one file; a million users partitioned daily is 365M+ files a year.</li>
                <li><strong>What lands per partition per write?</strong> Files = partitions x writers x batches. 500 cities x hourly loads x 8 writers = 96,000 files per day of a few KB each. The arithmetic is trivial; skipping it is how lakes die.</li>
              </ul>
              <p>
                Target file sizes in the ~100MB-1GB band (2.5.2's row-group logic scaled up). If a candidate key yields partitions much smaller than one good file, it is too fine — drop it and rely on <em>sorting within files</em> for that column instead: partition pruning and row-group skipping are complementary levers, coarse then fine.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Over-partitioning also breaks the <em>planner</em>, independent of read throughput: partition discovery is a namespace enumeration (LIST calls scale with directory count), and the file manifest must be materialized in planner memory before pruning can run. Hive metastores famously fell over at millions of partitions; even modern engines pay plan latency linear in file count. Iceberg's answer is to move file listing into indexed manifest metadata (avoiding LIST entirely) and to make partitioning <em>hidden</em>: the table declares a transform like day(ts), writers apply it automatically, and queries on raw <code>ts</code> prune correctly without the analyst knowing the scheme exists — eliminating the classic bug where <code>WHERE ts &gt;= '2026-07-01'</code> scans everything because only <code>dt</code> literals prune. Phase 4 covers it properly.
              </p>
              <p>
                Design heuristic worth memorizing: partition for <em>pruning and lifecycle</em> (time-based retention, backfill isolation), cluster/sort for <em>selectivity</em> within partitions, and let file counts be governed by target file size — three separate dials, three separate mechanisms.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          label="partitions as directories: the pruning concept"
          setup={`CREATE OR REPLACE TABLE rides AS
SELECT
  (DATE '2026-07-01' + INTERVAL (i % 6) DAY)::DATE AS dt,
  ['london','paris','berlin','rome'][1 + i % 4] AS city,
  round(5 + (i * 37) % 60 + 0.25, 2) AS amount
FROM range(24) t(i);`}
          code={`-- Each distinct dt below = one directory on disk: dt=2026-07-01/, dt=2026-07-02/, ...
SELECT dt, count(*) AS rows_in_partition, sum(amount) AS revenue
FROM rides GROUP BY dt ORDER BY dt;

-- A one-day query only ever enters ONE of those directories. In this seeded
-- table DuckDB scans all 24 rows; over real files, the 5 other directories
-- are never listed, opened, or read. The lab measures the real thing.
-- SELECT count(*) FROM rides WHERE dt = DATE '2026-07-03';`}
        />
        <CodeRunner
          language="sql"
          label="the partition-count arithmetic, runnable"
          setup={`CREATE OR REPLACE TABLE keys(partition_key VARCHAR, partitions_per_year BIGINT);
INSERT INTO keys VALUES
  ('dt (day)', 365),
  ('dt (hour)', 8760),
  ('dt x city (500 cities)', 182500),
  ('user_id (10M users)', 10000000);`}
          code={`-- files/year = partitions x writer tasks (8 here) x batches per partition (1 here).
-- 50 GB/year of data: what does each file weigh?
SELECT
  partition_key,
  partitions_per_year,
  partitions_per_year * 8 AS files_per_year,
  round(50e9 / (partitions_per_year * 8) / 1e6, 3) AS avg_file_MB
FROM keys
ORDER BY partitions_per_year;
-- Day: healthy files. user_id: 80M files of ~0.0006 MB. Do this math BEFORE the COPY.`}
        />
      </Section>

      <Section kicker="core concepts" title="The small-files problem and its fixes">
        <BenchBars
          title="Full scan, same 3 GB of Parquet, three layouts (illustrative)"
          items={[
            { label: '1 file x 3 GB', value: 2.1, unit: 's', note: 'one footer, long sequential reads' },
            { label: '100 files x 30 MB', value: 2.6, unit: 's', note: 'fine — overhead still amortized' },
            { label: '10,000 files x 300 KB', value: 41, unit: 's', note: 'per-file overhead dominates' },
          ]}
          betterIs="lower"
          caption="Illustrative local-NVMe numbers; the lab measures a real two-point version on your machine. On object storage the cliff is steeper: every file adds request latency and per-request cost."
        />
        <Tiered
          layman={
            <>
              <p>
                Why are 10,000 tiny doors so much worse than one big door? Because every door has a fixed toll: find it, unlock it, read its manifest — before touching a single box inside. With one big door you pay the toll once and then move boxes continuously. With 10,000 doors the tolls add up to more than the moving.
              </p>
              <p>
                The fix is boring and effective: fewer, bigger doors. Either write bigger batches in the first place, or run a nightly tidy-up that merges the day's dribble of small files into a few large ones — the janitor is called "compaction".
              </p>
            </>
          }
          student={
            <>
              <p>
                Per file, a reader pays: a directory-listing share, an open (on object storage, HTTP requests with real latency and per-request billing), a footer fetch and parse, planner bookkeeping, and a scheduling slot. At 300 KB per file, those fixed costs exceed the cost of reading the actual bytes — throughput collapses while total data volume is unchanged. Writers create the mess innocently: streaming jobs flushing every minute, over-partitioning, or many parallel writer tasks each emitting a shard per partition.
              </p>
              <p>Mitigations, in order of preference:</p>
              <ul>
                <li><strong>Don't create them:</strong> batch writes, coarser partitions, fewer writer tasks per partition, target ~100MB-1GB files.</li>
                <li><strong>Compaction:</strong> periodically rewrite many small files into few large ones — in Phase 4 this is a scheduled Iceberg maintenance job, not a bespoke script.</li>
                <li><strong>Prune harder:</strong> partitioning (this lesson) and sorted-file row-group skipping (2.5.2) don't shrink file counts, but they shrink how many files any one query touches — complementary, not competing.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                Model scan time as T(k) = k(L + F) + B/W for k files: L per-object request latency (LIST + GET rounds, tens of ms on object stores), F footer fetch/parse, B total bytes, W streaming bandwidth. B/W is invariant in file count; k(L + F) is linear in it. The crossover where fixed costs exceed streaming sits around single-digit MB per file on object storage — hence the industry's 100MB-1GB target. Add the planner side (manifests, statistics, task scheduling all O(k)) and file count becomes the primary health metric of a lake table — monitored, alerted on, and repaired by compaction the way 2.2's indexes are repaired by VACUUM.
              </p>
              <p>
                Compaction has its own economics: it re-reads and re-writes B bytes to reduce future k, so it is amortized prepayment — worth it when read frequency is high, wasted on write-once cold data. Iceberg's rewrite_data_files with a sort order does double duty: it fixes file counts <em>and</em> restores clustering so 2.5.2's zone maps bite again. Streaming ingestion makes small files a permanent tax rather than a one-time mistake — the Phase 5 latency-vs-file-size tension, resolved there with the same compaction machinery.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="The classic self-inflicted wound">
          Nobody decides to create 100,000 tiny files. A streaming job flushes every 60 seconds into dt=.../city=... for 500 cities: that is 720,000 files per day, each a few KB, written by a pipeline that is "working perfectly". Detection is one query away — count files and divide bytes by count. Make it a habit before it becomes an incident.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Partition granularity: day, hour, or month?">
        <p>Time is almost always the partition key; the real decision is grain. It is a bet about your query patterns and your data rate — sized with the arithmetic from above.</p>
        <Tradeoffs
          options={[
            {
              name: 'Partition by month',
              strengths: ['Tiny namespace (12/year) — trivial planning, zero small-file risk at modest volumes', 'Big partitions keep files chunky even with many writers'],
              weaknesses: ['A one-day query still scans a whole month (~30x extra data)', 'Retention and backfills operate in clumsy month-sized units'],
              chooseWhen: 'low data rates (a month is only ~100MB-1GB) or queries that are monthly anyway.',
            },
            {
              name: 'Partition by day',
              strengths: ['Matches the dominant query and lifecycle grain (dashboards, backfills, retention)', '365/year keeps namespace and file counts comfortable at most volumes'],
              weaknesses: ['Hour-level queries still scan 24x more than needed', 'Very high daily volume may need day plus a second low-cardinality key'],
              chooseWhen: 'the default — pick day unless the arithmetic clearly argues otherwise.',
            },
            {
              name: 'Partition by hour',
              strengths: ['Sharpest pruning for recent-window, ops-style queries', 'Small blast radius for late-data rewrites'],
              weaknesses: ['8,760 partitions/year; with several writers, small files almost guaranteed', 'Historical scans touch thousands of partitions — planning cost balloons'],
              chooseWhen: 'genuinely high hourly volume (an hour is ~100MB+) and hot recent-window queries.',
            },
          ]}
          note={
            <>Partition-by vs sort-by is not either/or: partition by day for pruning and lifecycle, sort within files by the next hottest filter (hour, city) for row-group skipping. Coarse lever, then fine lever.</>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: prune partitions, then feel the small-files pain">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Three measurements in <code>warehouse-lab</code>: a partitioned dataset that prunes to one day, then a deliberately shattered 1,000-file dataset that makes the overhead visible. Requires the <code>rides</code> table and <code>data/rides.parquet</code> from the 2.5.1 lab.
            </p>
          }
          steps={[
            {
              title: 'Write the day-partitioned dataset',
              body: (
                <>
                  <p>Save as <code>write_partitioned.py</code> and run. PARTITION_BY writes hive-style <code>dt=...</code> directories — 180 of them, one per day in the data:</p>
                  <CodeBlock
                    label="write_partitioned.py"
                    code={`import duckdb

con = duckdb.connect("data/formats.duckdb")
con.sql("""
    COPY (SELECT *, CAST(date_trunc('day', ts) AS DATE) AS dt FROM rides)
    TO 'data/rides_by_day'
    (FORMAT PARQUET, COMPRESSION ZSTD, PARTITION_BY (dt), OVERWRITE_OR_IGNORE)
""")
con2 = duckdb.connect()
n = con2.sql(
    "SELECT count(*) FROM glob('data/rides_by_day/**/*.parquet')"
).fetchone()[0]
print("partition files written:", n)`}
                  />
                </>
              ),
              commands: [
                { ps: 'uv run python write_partitioned.py' },
                { ps: 'Get-ChildItem data\\rides_by_day | Select-Object -First 5 Name', bash: 'ls data/rides_by_day | head -5' },
              ],
              checkpoint: (
                <>~180 files written; the directory listing shows names like <code>dt=2026-01-01</code>. The column value is literally the folder name — that is all "hive-style" means.</>
              ),
            },
            {
              title: 'One-day query: partitioned vs single file',
              body: (
                <>
                  <p>Save as <code>bench_pruning.py</code>. Same question, two layouts — watch both the timings and the profiled plan:</p>
                  <CodeBlock
                    label="bench_pruning.py"
                    code={`import duckdb, time

con = duckdb.connect()
q_part = """
  SELECT count(*), sum(amount)
  FROM read_parquet('data/rides_by_day/**/*.parquet', hive_partitioning = true)
  WHERE dt = DATE '2026-03-01'
"""
q_single = """
  SELECT count(*), sum(amount)
  FROM read_parquet('data/rides.parquet')
  WHERE CAST(date_trunc('day', ts) AS DATE) = DATE '2026-03-01'
"""
for name, q in [("partitioned", q_part), ("single file", q_single)]:
    t0 = time.perf_counter()
    con.sql(q).fetchall()
    print(f"{name:12s} {(time.perf_counter() - t0)*1000:7.0f} ms")
print("--- partitioned plan:")
con.sql("EXPLAIN ANALYZE " + q_part).show()`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python bench_pruning.py' }],
              checkpoint: (
                <>The partitioned query is the faster of the two, and its profiled plan shows a file/partition filter on <code>dt</code> with the scan reading ~1/180th of the rows (~28k, not 5M). Record both timings and the rows-scanned figure — that is partition pruning, measured.</>
              ),
            },
            {
              title: 'Now shatter it: ~1,000 tiny files',
              body: (
                <>
                  <p>Save as <code>make_tiny.py</code>. Partitioning by a 1,000-value bucket column stands in for every over-partitioning mistake ever made:</p>
                  <CodeBlock
                    label="make_tiny.py"
                    code={`import duckdb, time

con = duckdb.connect("data/formats.duckdb")
con.sql("""
    COPY (SELECT *, CAST(amount * 10 AS INT) % 1000 AS bucket FROM rides)
    TO 'data/rides_tiny'
    (FORMAT PARQUET, COMPRESSION ZSTD, PARTITION_BY (bucket), OVERWRITE_OR_IGNORE)
""")
con2 = duckdb.connect()
n = con2.sql("SELECT count(*) FROM glob('data/rides_tiny/**/*.parquet')").fetchone()[0]
print("tiny files:", n)
for name, path in [("1 file    ", "data/rides.parquet"),
                   ("1000 files", "data/rides_tiny/**/*.parquet")]:
    t0 = time.perf_counter()
    con2.sql(f"SELECT city, sum(amount) FROM read_parquet('{path}') GROUP BY city").fetchall()
    print(f"{name} full scan: {(time.perf_counter() - t0)*1000:7.0f} ms")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python make_tiny.py' }],
              checkpoint: (
                <>~1,000 files reported, and the same full-scan aggregation is clearly slower against them than against the single file — same 5M rows, same bytes of data, only the file count changed. Record both timings; on local NVMe expect a noticeable gap, and remember the object-storage version adds request latency and billing per file.</>
              ),
            },
            {
              title: 'Close out Phase 2',
              body: (
                <>
                  <p>
                    Final notes entry: partitioned vs single-file timings, rows scanned, tiny-files vs single-file timings, and one sentence on when you would partition vs sort. Then clean up if you want the disk back (<code>data\rides_tiny</code> alone is ~1,000 files).
                  </p>
                  <Callout kind="tip" title="Phase 2 complete">
                    That's the whole storage story: Postgres and indexes (2.1-2.2), row vs columnar with compression and encodings (2.3), dimensional modeling (2.4), and now file formats, Parquet internals, and partitioning on disk (2.5). Project P2 — the NYC Taxi Warehouse — awaits in <code>de-portfolio</code>: it uses every lesson in this phase, from schema design to partitioned Parquet. Build it before starting Phase 3.
                  </Callout>
                </>
              ),
              checkpoint: (
                <>All measurements recorded, and your notes can answer: "why is one 3 GB file faster to scan than 10,000 files holding the same bytes?"</>
              ),
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Where does partition pruning actually happen?',
              options: [
                'Inside each Parquet footer, using min/max stats',
                'At plan time, from directory names alone — irrelevant partitions are never listed, opened, or read',
                'In a background index maintained by the engine',
                'At write time, by sorting the data',
              ],
              answer: 1,
              explain:
                'The partition value is encoded in the path, so the planner eliminates directories before any file I/O. Footer min/max skipping (2.5.2) is the complementary, finer mechanism that runs afterwards inside the files that survive.',
            },
            {
              q: 'Why is PARTITION BY user_id (10M distinct users) a catastrophe?',
              options: [
                'User IDs are personal data and cannot appear in paths',
                'Engines only support date-typed partition keys',
                'It mints millions of directories of tiny files: per-file overhead swamps data reading, and planner metadata explodes with file count',
                'It makes the data impossible to sort',
              ],
              answer: 2,
              explain:
                'Every distinct key value becomes at least one directory and one file per write. The arithmetic — partitions x writers x batches — lands in the millions, each file far below the ~100MB-1GB healthy band. High-cardinality columns belong in sort orders, not partition keys.',
            },
            {
              q: '10,000 files of 300 KB scan far slower than one 3 GB file with identical content because…',
              options: [
                'small files cannot be compressed',
                'each file pays fixed costs — listing share, open/GET requests, footer fetch and parse, planner bookkeeping — and at 300 KB those tolls exceed the cost of reading the actual bytes',
                'engines refuse to parallelize over more than 1,000 files',
                'tiny files lose their schema information',
              ],
              answer: 1,
              explain:
                'Scan time ~ k x (per-file overhead) + bytes / bandwidth. The second term is identical in both layouts; the first is 10,000x larger. On object storage each open is an HTTP request with latency and a price, making the cliff steeper.',
            },
            {
              q: 'What is compaction?',
              options: [
                'Re-compressing files with a stronger codec',
                'Deleting rows that fail quality checks',
                'Periodically rewriting many small files into few large ones (often re-sorting in the same pass) to restore healthy file sizes',
                'Merging partitions into a single directory',
              ],
              answer: 2,
              explain:
                'Compaction prepays read costs: re-read and re-write the same bytes once so every future query touches far fewer files. Done with a sort order it also restores clustering, re-arming row-group skipping. In Phase 4 it is a scheduled Iceberg maintenance job.',
            },
            {
              q: 'How do partitioning and sorting-within-files relate?',
              options: [
                'They are alternatives — a table uses one or the other',
                'Complementary levers: partitioning prunes whole directories on the coarse key (usually day); sorting tightens row-group min/max inside surviving files for the next filter column',
                'Sorting replaces partitioning in modern engines',
                'Partitioning implies files are sorted by the partition key',
              ],
              answer: 1,
              explain:
                'Coarse then fine: pruning eliminates directories at plan time, then footer stats skip row groups within the files that remain. Partition by the lifecycle/query grain, sort by the next hottest predicate — three dials (partitions, file size, sort) tuned separately.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How do you choose a partition key for a lake table?',
            a: (
              <p>
                Filter frequency, cardinality, resulting file sizes — in that order. Pick a key most queries filter on (almost always event date), check its cardinality stays in the hundreds-per-year range, then do the files arithmetic: partitions x writers x batches, and confirm average file size lands near 100MB-1GB. High-cardinality candidates move to sort orders instead. Mentioning the arithmetic step is what separates candidates who have operated a lake from those who have read about one.
              </p>
            ),
          },
          {
            q: 'A streaming job has written 500,000 small files into a table. What do you do?',
            a: (
              <p>
                Stop the bleeding, then clean up: batch the writer's flushes (or add a buffer stage) so new files are larger, and run compaction to rewrite existing small files into ~256MB-1GB files, ideally sorted on the hot filter column so statistics skipping is restored too. In an Iceberg shop that is a scheduled rewrite-data-files maintenance job. Then monitor files-per-partition and average file size as standing health metrics.
              </p>
            ),
          },
          {
            q: "What problem does Iceberg's hidden partitioning solve?",
            a: (
              <p>
                Classic hive partitioning couples queries to the layout: pruning only fires when the query names the partition column literally, so filtering raw <code>ts</code> instead of derived <code>dt</code> silently scans everything. Iceberg stores a transform — day(ts) — in table metadata: writers partition automatically and queries on <code>ts</code> prune correctly without knowing the scheme, which can also evolve without rewriting queries.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Hive-style partitioning encodes column values in directory names; pruning eliminates whole directories at plan time, before any file is opened.</>,
          <>Partition keys need cardinality discipline: dates yes, user_id never. Always run the arithmetic — partitions x writers x batches — before the first write.</>,
          <>The small-files problem is per-file fixed costs (list, open, footer, planning) dominating byte streaming; on object storage every file is also a billed request. Target ~100MB-1GB files.</>,
          <>Fixes in order: write bigger batches, partition coarser, compact regularly. Compaction with a sort order also restores row-group skipping.</>,
          <>Partitioning and sorting are complementary pruning levers: directories first (coarse), footer stats inside surviving files (fine).</>,
          <>Phase 2 is complete — storage from pages and indexes to formats, footers, and file layout. Project P2 (NYC Taxi Warehouse) in <code>de-portfolio</code> is where it all gets used at once.</>,
        ]}
      />
    </>
  )
}
