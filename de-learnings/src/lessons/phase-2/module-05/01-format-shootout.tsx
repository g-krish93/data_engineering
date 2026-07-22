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

const ID = '2.5.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The file format decision you pay for every day after">
        <Tiered
          layman={
            <>
              <p>Imagine three ways to record the same delivery: a handwritten note, a printed form, and a barcoded label. Anyone can read the handwriting — but a machine can't, and every reader interprets "7" vs "1" differently. The printed form is stricter. The barcode is unreadable to humans, but a scanner processes thousands per minute, flawlessly, and the label even encodes what the fields mean.</p>
              <p>Data files work the same way. CSV is the handwritten note: universal, fragile. Formats like Parquet are the barcode: opaque to your eyes, built for machines. When a company lands billions of records into a <GlossaryTerm k="data-lake">data lake</GlossaryTerm>, the format choice silently sets the storage bill, how fast every future query runs, and whether a typo in one field can poison a report years later. This lesson is the shootout.</p>
            </>
          }
          student={
            <>
              <p>
                Everything downstream of ingestion reads files. Pick a format when you build the <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> and you have implicitly decided: how many bytes you store (and pay for), how many bytes every query must scan, whether engines can parallelize reads, and whether the file itself enforces a <GlossaryTerm k="schema">schema</GlossaryTerm> or leaves types as every reader's problem.
              </p>
              <p>
                You already know the storage half of this story: 2.3 showed why <GlossaryTerm k="columnar-storage">columnar layout</GlossaryTerm> plus encodings crushes analytical scans. This lesson applies that lens to the files on disk: CSV, JSONL, Avro, Parquet (and ORC in passing), scored on six axes — row vs columnar, schema handling, splittability, compressibility, human-readability, ecosystem. There is no overall winner; there is a right tool per job, and interviewers love asking which.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A file format is a serialization contract: a mapping from a logical relation (or record stream) to a byte layout, plus metadata conventions that let readers reconstruct types without out-of-band agreements. The design space is the trade-off between self-description (schema embedded vs external vs absent), access pattern (sequential record iteration vs projected columnar scans), and parallel decomposability (can byte range [a, b) be decoded without the bytes before a?).
              </p>
              <p>
                Text formats sit at one corner: maximally interoperable, zero enforced structure, worst-case entropy (numbers as digit strings). Avro and Parquet occupy the other corners — Avro optimizes record-at-a-time streaming with first-class schema evolution; Parquet optimizes scan-heavy <GlossaryTerm k="olap">OLAP</GlossaryTerm> with statistics-driven skipping. Phase 4 (Spark, Iceberg) and Phase 5 (Kafka) build directly on this lesson's vocabulary.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The contenders, on six axes">
        <Tiered
          layman={
            <>
              <p>Meet the four formats you will actually encounter, in plain terms:</p>
              <ul>
                <li><strong>CSV</strong> — a spreadsheet saved as text: one line per record, commas between fields. Everything can open it; nothing agrees on the fine print (quotes, commas inside values, what "empty" means).</li>
                <li><strong>JSONL</strong> — one JSON object per line. Like CSV but each record can nest: a customer with a list of orders inside it. Still plain text, still no enforced types.</li>
                <li><strong>Avro</strong> — a binary format that ships its own field list and types inside the file, storing whole records one after another. Built for streams of events arriving one-by-one.</li>
                <li><strong>Parquet</strong> — a binary format that stores each column together (the barcode of the bunch), with a built-in table of contents. Built for questions like "average of one column across a billion rows".</li>
              </ul>
              <p>Rule of thumb: text formats are for people and interchange; binary formats are for machines and scale.</p>
            </>
          }
          student={
            <>
              <p>Score each format on the axes that matter operationally:</p>
              <ul>
                <li><strong>CSV</strong> — text, row-oriented, schema-less (types exist only in readers' heads), universally supported. Compresses moderately, but gzip makes it unsplittable (one worker per file). The lingua franca of interchange with third parties.</li>
                <li><strong>JSONL</strong> — text, row-oriented, schema-less but self-labeling (keys repeat in every record — verbose) and handles nested and optional fields naturally. The default shape of API responses and event payloads; great for debugging because you can read it.</li>
                <li><strong>Avro</strong> — binary, ROW-oriented, schema embedded in the file header plus formal evolution rules (add a field with a default and old readers still work). Written in blocks with sync markers, so it is splittable. The de facto format for Kafka pipelines — full treatment in Phase 5.</li>
                <li><strong>Parquet</strong> — binary, COLUMNAR, schema and per-chunk min/max statistics embedded in a footer. Compresses dramatically (similar values adjacent, encoded before compression — the 2.3.3 story). Splittable by row group. The analytics default and the bedrock of the lakehouse; next lesson dissects it.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                <strong>Splittability mechanics.</strong> gzip is a single DEFLATE stream: decoding byte offset k requires the window history before k, so a 10 GB rides.csv.gz is one worker's job no matter how big the cluster — a classic Spark anti-pattern you will meet in Phase 4. Avro interleaves 16-byte sync markers between blocks; a worker assigned an arbitrary byte range scans forward to the next marker and decodes independently. Parquet goes further: the footer stores explicit row-group byte offsets, so a planner assigns whole row groups to workers without scanning anything.
              </p>
              <p>
                <strong>Schema evolution semantics.</strong> Avro resolves a writer's schema (what the file was written with) against a reader's schema (what the consumer expects) at read time: new fields need defaults, removed fields are ignored, some type promotions (int to long) are legal. This is what lets a Kafka topic's producers and consumers upgrade independently — full rules and the schema registry arrive in Phase 5. CSV's "evolution" is someone reordering columns and silently breaking every downstream parser.
              </p>
              <p>
                <strong>Human-readability is a real ops feature</strong>, not sentimentality: when a pipeline breaks at 3am, opening the offending file in a pager and seeing the malformed record shortens incidents. That is a genuine point for text formats at low-volume edges of a system — and why raw/landing zones often keep JSONL alongside the Parquet they compile it into.
              </p>
            </>
          }
        />
        <BenchBars
          title="Same 10M-row rides dataset, five ways on disk (illustrative)"
          items={[
            { label: 'JSONL', value: 2150, unit: 'MB', note: 'keys repeated in every record' },
            { label: 'CSV', value: 780, unit: 'MB', note: 'numbers stored as digit strings' },
            { label: 'CSV + gzip', value: 230, unit: 'MB', note: 'smaller, but now unsplittable' },
            { label: 'Avro (deflate)', value: 195, unit: 'MB', note: 'binary rows, block-compressed, splittable' },
            { label: 'Parquet (zstd)', value: 95, unit: 'MB', note: 'columnar + encodings + compression' },
          ]}
          betterIs="lower"
          caption="Illustrative numbers for a ts/city/amount/riders table — real ratios depend on the data. The lab has you measure your own 5M-row dataset; expect the same ordering."
        />
        <Callout kind="info" title="ORC, in one paragraph">
          ORC (Optimized Row Columnar) is Parquet's sibling from the Hive world: also binary, columnar, compressed, with embedded schema and min/max statistics (in "stripes" rather than row groups). Feature-for-feature the two are close; Parquet won the broader ecosystem (Spark, DuckDB, Iceberg, pandas), while ORC remains strong in Hive-legacy shops. Understand Parquet internals — next lesson — and you understand ORC by analogy.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Schema-on-write vs schema-on-read — run the bug">
        <Tiered
          layman={
            <>
              <p>
                A CSV file has no opinion about types. The string "12.50" might be money; "9.9O" (that is a letter O, not a zero) is a typo that looks like money. The file happily stores both. Only when someone finally does math does the typo surface — or worse, silently disappear from a total.
              </p>
              <p>
                Formats with embedded schemas refuse the bad value at the door, when it is written. That is the whole argument in one sentence: do you want to find bad data on the day it arrives, or on the day the CFO asks why revenue looks low?
              </p>
            </>
          }
          student={
            <>
              <p>
                <strong>Schema-on-write</strong> (Avro, Parquet, and every <GlossaryTerm k="data-warehouse">warehouse</GlossaryTerm> table): types are enforced when data lands; a malformed value fails the load, loudly, at the pipeline boundary. <strong>Schema-on-read</strong> (CSV, JSONL): the bytes always land; every reader re-applies types at query time, and every reader can disagree. Load the same CSV in pandas, DuckDB, and Spark and you can get three different type inferences for the same column.
              </p>
              <p>
                The two runners below stage the failure mode. The first shows what a CSV really hands you — strings — and how TRY_CAST turns corruption into silent NULLs. The second shows a typed table rejecting the same value at write time. The error you will see is not a bug in the demo; it is the feature.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Schema-on-read is late binding of types, and its cost model is subtle. Every scan pays parsing and inference again (CPU), and correctness degrades non-deterministically: inference is sample-based in most engines, so a column that is integer-like for 100k rows and then contains "N/A" can flip type between runs or between engines. The dataset's schema becomes a function of (file, reader, reader version, sample size) — a reproducibility hazard.
              </p>
              <p>
                Schema-on-write moves validation to the point of least ambiguity — the producer, which actually knows what the field means. The trade is friction: evolving the schema now requires coordination (hence Avro's formalized evolution rules, and Phase 4's Iceberg schema evolution, which does the same for tables of Parquet files). The consensus for curated zones is emphatic: pay the write-time friction; query-time surprises cost more.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          label="what a CSV actually gives you"
          setup={`CREATE OR REPLACE TABLE rides_from_csv AS
SELECT * FROM (VALUES
  ('2026-07-01 08:15:00', 'london', '12.50', '4'),
  ('2026-07-01 08:22:00', 'paris',  '8.00',  '1'),
  ('2026-07-01 09:05:00', 'berlin', '9.9O',  '2'),
  ('2026-07-01 09:31:00', 'london', '',      '3'),
  ('2026-07-01 10:02:00', 'rome',   '21.75', '2')
) t(ts, city, amount, riders);`}
          code={`-- rides_from_csv landed from a schema-less file: EVERY column is text.
-- Run DESCRIBE first, then swap in the SELECT below and re-run.
DESCRIBE rides_from_csv;

-- SELECT
--   count(*)                                AS rows_in_file,
--   count(TRY_CAST(amount AS DECIMAL(8,2))) AS rows_that_parse,
--   sum(TRY_CAST(amount AS DECIMAL(8,2)))   AS revenue_you_would_report
-- FROM rides_from_csv;
-- The '9.9O' typo and the empty string become NULL and silently
-- vanish from the sum. No error. No warning. Wrong number.`}
        />
        <CodeRunner
          language="sql"
          label="schema-on-write rejects it at the door"
          setup={`CREATE OR REPLACE TABLE rides_typed (
  ts TIMESTAMP, city VARCHAR, amount DECIMAL(8,2), riders TINYINT
);
INSERT INTO rides_typed VALUES
  ('2026-07-01 08:15:00', 'london', 12.50, 4),
  ('2026-07-01 08:22:00', 'paris', 8.00, 1),
  ('2026-07-01 10:02:00', 'rome', 21.75, 2);`}
          code={`-- rides_typed declares: amount DECIMAL(8,2). Now try to land the typo.
-- This FAILS — and that failure is the feature. Fix '9.9O' to 9.90
-- and re-run to see it accepted.
INSERT INTO rides_typed VALUES ('2026-07-01 09:05:00', 'berlin', '9.9O', 2);
SELECT * FROM rides_typed ORDER BY ts;`}
        />
        <Callout kind="warn" title="The most expensive bugs are the silent ones">
          The first runner's sum is wrong and nothing told you. In production, that is a revenue number drifting a fraction of a percent for months. Schema-less formats do not cause typos — they defer their discovery to whoever aggregates last. This is why pipelines convert text formats to typed formats at the earliest sensible boundary.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="The format table">
        <p>The table to internalize — four formats, honest weaknesses, and the situation where each is the right answer.</p>
        <Tradeoffs
          options={[
            {
              name: 'CSV',
              strengths: ['Opens everywhere: Excel, editors, every language and tool ever made', 'The interchange format third parties actually accept'],
              weaknesses: ['No schema, no types — every reader re-guesses; quoting/escaping dialects bite', 'Largest scans; gzipped CSV is unsplittable (single-worker reads)'],
              chooseWhen: 'exchanging data with humans or external parties you do not control.',
            },
            {
              name: 'JSONL',
              strengths: ['Nested and optional fields come naturally; self-labeling records', 'Human-readable — grep-able during incidents; append-friendly for logs'],
              weaknesses: ['Most verbose of the four (keys repeated per record)', 'Still schema-less: types drift, and parsing is CPU-heavy at scale'],
              chooseWhen: 'landing raw API/event payloads or debugging a feed — the raw-zone format.',
            },
            {
              name: 'Avro',
              strengths: ['Embedded schema + formal evolution rules (readers and writers upgrade independently)', 'Compact binary rows, splittable blocks — ideal for record-at-a-time streams'],
              weaknesses: ['Row-oriented: analytical scans read every column whether needed or not', 'Not human-readable; weaker support in quick ad-hoc tools'],
              chooseWhen: 'streaming pipelines (Kafka, Phase 5) where records flow one at a time.',
            },
            {
              name: 'Parquet',
              strengths: ['Columnar + encodings + stats: smallest files, fastest analytical scans', 'Schema and min/max statistics embedded; splittable by row group'],
              weaknesses: ['Not human-readable; not appendable (files are written whole)', 'Poor fit for record-at-a-time writes — needs batching before write'],
              chooseWhen: 'analytics at rest — the default for lakes, warehouses, and Phase 4 Iceberg.',
            },
          ]}
          note={
            <>A real pipeline commonly uses three of these at once: JSONL in the raw zone, Avro on the stream, Parquet in the curated zone. "Which format?" is really "which stage?".</>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: the shootout, measured">
        <Lab
          lessonId={ID}
          intro={
            <p>
              In your <code>warehouse-lab</code> project you will generate a 5M-row dataset once, export it to four formats, and measure what the slides only claimed: sizes and full-scan times. Keep the numbers — 2.5.2 and 2.5.3 reuse this dataset.
            </p>
          }
          steps={[
            {
              title: 'Generate the 5M-row rides table',
              body: (
                <>
                  <p>
                    In <code>warehouse-lab</code>, make sure a gitignored <code>data/</code> folder exists, then save this as <code>gen_data.py</code> and run it. It builds a deterministic 5M-row table inside a DuckDB database file:
                  </p>
                  <CodeBlock
                    label="gen_data.py"
                    code={`import duckdb

con = duckdb.connect("data/formats.duckdb")
con.sql("""
    CREATE OR REPLACE TABLE rides AS
    SELECT
        TIMESTAMP '2026-01-01 00:00:00'
            + INTERVAL (i % 180) DAY
            + INTERVAL (i % 86399) SECOND AS ts,
        ['london','paris','berlin','madrid','rome','lisbon'][1 + i % 6] AS city,
        round(0.01 * ((i * 2654435761) % 10000), 2) AS amount,
        1 + i % 4 AS riders
    FROM range(5000000) t(i)
""")
print(con.sql("SELECT count(*) AS rows, min(ts), max(ts) FROM rides").fetchall())`}
                  />
                </>
              ),
              commands: [
                { ps: 'mkdir -Force data | Out-Null', bash: 'mkdir -p data' },
                { ps: 'uv run python gen_data.py' },
              ],
              checkpoint: (
                <>The script prints a row count of <code>5000000</code> and timestamps spanning January to late June 2026. <code>data\formats.duckdb</code> exists.</>
              ),
            },
            {
              title: 'Export to four formats',
              body: (
                <>
                  <p>Save as <code>export_formats.py</code> and run. Note the write times too — they are part of the trade-off:</p>
                  <CodeBlock
                    label="export_formats.py"
                    code={`import duckdb, time

con = duckdb.connect("data/formats.duckdb")
jobs = [
    ("csv",     "COPY rides TO 'data/rides.csv' (FORMAT CSV, HEADER)"),
    ("csv.gz",  "COPY rides TO 'data/rides.csv.gz' (FORMAT CSV, HEADER, COMPRESSION GZIP)"),
    ("jsonl",   "COPY rides TO 'data/rides.jsonl' (FORMAT JSON)"),
    ("parquet", "COPY rides TO 'data/rides.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)"),
]
for name, sql in jobs:
    t0 = time.perf_counter()
    con.sql(sql)
    print(f"{name:8s} written in {time.perf_counter() - t0:5.1f} s")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python export_formats.py' }],
              checkpoint: (
                <>Four files exist under <code>data\</code>. (DuckDB reads Avro via an extension but cannot write it — itself a data point about ecosystem support.)</>
              ),
            },
            {
              title: 'Measure the sizes',
              commands: [
                {
                  ps: "Get-ChildItem data\\rides.* | Sort-Object Length -Descending | Format-Table Name, @{n='SizeMB'; e={[math]::Round($_.Length/1MB,1)}}",
                  bash: 'ls -lh data/rides.*',
                },
              ],
              checkpoint: (
                <>A size table prints. Expected ordering: JSONL largest, then CSV, then CSV.gz, then Parquet smallest — typically 5-10x smaller than the raw CSV. Write all four numbers down.</>
              ),
            },
            {
              title: 'Time a full-scan aggregation per format',
              body: (
                <>
                  <p>Save as <code>bench_scan.py</code> — the same GROUP BY against each file. Run it twice and keep the second run (the first pays OS cache warm-up):</p>
                  <CodeBlock
                    label="bench_scan.py"
                    code={`import duckdb, time

queries = [
    ("csv",     "SELECT city, sum(amount) FROM read_csv('data/rides.csv') GROUP BY city"),
    ("csv.gz",  "SELECT city, sum(amount) FROM read_csv('data/rides.csv.gz') GROUP BY city"),
    ("jsonl",   "SELECT city, sum(amount) FROM read_json_auto('data/rides.jsonl') GROUP BY city"),
    ("parquet", "SELECT city, sum(amount) FROM read_parquet('data/rides.parquet') GROUP BY city"),
]
con = duckdb.connect()
for name, q in queries:
    t0 = time.perf_counter()
    con.sql(q).fetchall()
    print(f"{name:8s} {time.perf_counter() - t0:6.2f} s")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python bench_scan.py' }],
              checkpoint: (
                <>Four timings print. Parquet should win clearly (often 10x+ over JSONL); gzipped CSV scans slower than plain CSV despite being smaller — decompression is single-threaded.</>
              ),
            },
            {
              title: 'Record your results table',
              body: (
                <p>In your lab notes, fill in one row per format: size in MB, write seconds, scan seconds. This table is your evidence in 2.5.2, where Parquet's internals explain why its column wins.</p>
              ),
              checkpoint: <>All four rows filled with real measured numbers from your machine — not the illustrative chart above.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Why can a 10 GB rides.csv.gz only be read by one worker, while Avro and Parquet files of the same size can be read by many in parallel?',
              options: [
                'gzip is proprietary, so open-source engines throttle it',
                'gzip produces one continuous compressed stream with no valid mid-file entry points; Avro sync markers and Parquet row-group offsets give workers independent starting positions',
                'CSV rows are variable length, and that alone prevents parallelism',
                'Avro and Parquet files are always smaller, so parallelism is unnecessary',
              ],
              answer: 1,
              explain:
                'Splittability is about decode entry points, not size. Decoding a DEFLATE stream at byte k needs the history before k; block/row-group structure removes that dependency. (Variable-length CSV rows alone are fine — uncompressed CSV splits by scanning to the next newline.)',
            },
            {
              q: 'What does "schema-on-read" mean in practice for a CSV-based pipeline?',
              options: [
                'The schema is stored in a sidecar file read before the data',
                'Types are enforced when the file is written',
                'The file stores untyped text; every reader applies types at query time, so bad values surface (or silently vanish) at query time',
                'The file cannot be read without a schema registry',
              ],
              answer: 2,
              explain:
                "Schema-on-read defers typing to consumers. The lesson's runner showed the failure mode: TRY_CAST quietly turns a typo into NULL, and an aggregate is wrong with no error raised.",
            },
            {
              q: 'A pipeline consumes events one at a time from Kafka and producers evolve their schemas over time. Which landing format fits best?',
              options: [
                'Parquet — it is the analytics standard',
                'Avro — row-oriented binary with embedded schema and formal reader/writer evolution rules',
                'CSV — simplest to produce',
                'JSONL — humans can read it',
              ],
              answer: 1,
              explain:
                'Record-at-a-time writes fit a row format; Parquet wants large batched columnar writes. Avro adds the schema-evolution contract that lets producers and consumers upgrade independently — the Phase 5 streaming story.',
            },
            {
              q: 'Your measured Parquet file is far smaller than the gzipped CSV of the same data. The main reason?',
              options: [
                'zstd is simply a stronger algorithm than gzip, end of story',
                'Parquet stores each column contiguously and applies type-aware encodings (dictionary, RLE) before compression, so the compressor sees highly regular bytes',
                'Parquet silently drops rows it considers redundant',
                'Parquet stores numbers with less precision',
              ],
              answer: 1,
              explain:
                'Codec choice matters at the margin, but the structural win is columnar grouping plus encodings — the 2.3.3 lesson. A column of six repeated city names dictionary-encodes to almost nothing; interleaved in CSV rows, that redundancy is diluted.',
            },
            {
              q: 'When is JSONL genuinely the right choice, not just a lazy default?',
              options: [
                'For the curated analytics zone queried by dashboards',
                'Never — binary formats dominate on every axis',
                'For raw landing of nested API/event payloads, where fidelity to the source and human-debuggability matter more than scan cost',
                'Whenever files must be split across many workers',
              ],
              answer: 2,
              explain:
                'The raw zone optimizes for capturing exactly what arrived and for 3am grep-ability. Nested, evolving payloads fit JSONL naturally; the pipeline then compiles them to Parquet for the curated zone.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'You are landing 10 million events per day. CSV, JSONL, Avro, or Parquet?',
            a: (
              <p>
                Strong answers refuse to pick one until they know the stage and read pattern: JSONL (or the raw payload as-is) in the landing zone for fidelity and debuggability; Avro on the stream if records flow one at a time and schemas evolve; Parquet in the curated zone where analytics scans dominate; CSV only at external interchange boundaries. Then name the axes — schema enforcement, splittability, columnar scan cost — rather than brand loyalty.
              </p>
            ),
          },
          {
            q: 'Why is querying gzipped CSV in a data lake an anti-pattern?',
            a: (
              <p>
                Three compounding costs: every query re-parses text and re-infers types (CPU plus correctness risk); the whole file must be scanned for every query since there are no column projections or statistics; and gzip makes each file a single-worker read, so the cluster cannot parallelize. Converting once to Parquet pays for itself in a handful of queries.
              </p>
            ),
          },
          {
            q: 'What does it mean that Avro supports schema evolution, and why do streaming teams care?',
            a: (
              <p>
                Every Avro file (or Kafka message) carries or references the writer's schema; consumers read with their own reader's schema and the runtime resolves the two — new fields need defaults, missing ones are ignored, some promotions are legal. Producers and consumers can therefore deploy on independent schedules without coordinated big-bang upgrades — essential when dozens of services share one topic.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>The format choice silently sets storage cost, scan speed, parallelism, and type safety — for years. It is an architecture decision, not a save-dialog dropdown.</>,
          <>Text formats (CSV, JSONL) are schema-on-read: universal and debuggable, but every reader re-guesses types and bad values surface late — or never.</>,
          <>Avro = binary rows + embedded schema + evolution rules: the streaming format. Parquet = binary columns + stats: the analytics format. ORC is Parquet's Hive-world sibling.</>,
          <>Splittability is about decode entry points: gzip'd CSV is one worker's job; Avro blocks and Parquet row groups parallelize.</>,
          <>Real pipelines use several formats deliberately: raw JSONL, streaming Avro, curated Parquet. Answer "which format?" with "which stage?".</>,
          <>Your lab table of measured sizes and scan times is the evidence — keep it for 2.5.2.</>,
        ]}
      />
    </>
  )
}
