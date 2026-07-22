import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeRunner } from '../../../components/CodeRunner'
import { CodeBlock } from '../../../components/CodeBlock'
import { RevealSolution } from '../../../components/RevealSolution'
import { RowVsColumn3D } from '../../../viz/RowVsColumn3D'

const ID = '2.3.2'

const WIDE_SETUP = `CREATE OR REPLACE TABLE wide AS
SELECT i AS id, 'city_' || (i % 50) AS city, (i % 1000) / 7.0 AS amount,
       (i * 3) % 997 AS m01, (i * 5) % 997 AS m02, (i * 7) % 997 AS m03,
       (i * 11) % 997 AS m04, (i * 13) % 997 AS m05, (i * 17) % 997 AS m06,
       (i * 19) % 997 AS m07, (i * 23) % 997 AS m08, (i * 29) % 997 AS m09
FROM range(300000) t(i);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="You never read a value. You read a page.">
        <Tiered
          layman={
            <>
              <p>
                Picture two warehouses selling the same goods. In the first, every <em>order</em> is boxed together: order 4711's screws, invoice,
                and label share one box — one box, one trip. In the second, <em>identical items</em> share shelves: all screws on one shelf. Count
                every screw in the building? Walk one shelf, done.
              </p>
              <p>
                The twist: workers cannot carry a single screw — they carry whole boxes. So the real cost of any errand is <em>how many boxes you
                touch</em>, not how many items you wanted. Databases work exactly this way; this lesson arranges the boxes so errands touch few.
              </p>
            </>
          }
          student={
            <>
              <p>
                Storage transfers data in fixed-size chunks — <strong>pages</strong>, typically 4-8 KB for OLTP engines, hundreds of KB for
                analytical formats. A database never reads "just the <code>amount</code> of row 105"; it reads the entire page that byte lives on.
                Module 2.2's B-trees found the right page fast. This lesson is the other lever: <em>deciding what shares a page</em>.
              </p>
              <p>
                Two pure answers exist. <strong>Row layout</strong> (Postgres): all fields of one row contiguous, then the next row.{' '}
                <strong><GlossaryTerm k="columnar-storage">Columnar layout</GlossaryTerm></strong> (DuckDB, Parquet,{' '}
                <GlossaryTerm k="data-warehouse">warehouse</GlossaryTerm> engines): all values of one column contiguous. Same logical table, same
                total bytes — radically different bytes <em>per query</em>. Everything else here is arithmetic on that choice.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The page is the outermost rung of a ladder of transfer units: SSD block, page, 64-byte cache line, vector register lane. The layout
                decision replays at every rung: a row-wise <code>SUM(amount)</code> drags 100-column tuples through cache lines that each contribute
                8 useful bytes; a columnar scan makes every cache line 100% payload, in exactly the shape SIMD and prefetchers love (lesson 2.3.4).
              </p>
              <p>
                Pure row and pure column are ends of a spectrum. PAX (Ailamaki et al. 2001) keeps a page's worth of rows together but organizes
                columns <em>within</em> the page — row-store I/O, column-store cache behavior. Its descendants are everywhere: Parquet's row groups
                with column chunks inside, and DuckDB's row-group storage, are both PAX-shaped — rows in megabyte-scale groups, columns within them.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The I/O arithmetic, and the red blocks explained">
        <p>
          Same viz as lesson 2.3.1 — but now you own the explanation. Set <strong>row store</strong>, press <strong>SELECT AVG(amount)</strong>.
          Before reading on: in your own words, why is there wasted I/O, and why does it vanish in column store? Then check yourself.
        </p>
        <RowVsColumn3D />
        <RevealSolution label="Reveal the explanation">
          <p>
            The engine only reads whole pages. In the row layout each page holds one row, so fetching the 8 <code>amount</code> values means
            fetching 8 pages containing 32 values: the other 24 are hauled off disk and ignored. Those are the red blocks — touched because they
            share a page with something needed, wasted because the query never looks at them. In the column layout every <code>amount</code> lives
            on one page: all 8 needed values, no red. Flip to the point lookup and the roles reverse — one perfectly useful page for the row layout,
            four pages to reassemble one row for the column layout. The waste is never a bug. It is geometry: whatever shares a page with what you
            want comes along for the ride.
          </p>
        </RevealSolution>
        <Tiered
          layman={
            <>
              <p>
                Scale the toy up and the difference becomes absurd. If each order box holds 100 items and the errand cares about 1, boxed-by-order
                means opening every box and ignoring 99% of what you see; shelved-by-item means walking straight to one shelf — 1% of the building.
              </p>
              <p>That is not a 10% improvement; it is one-hundredth of the work. Queries dropping from minutes to seconds is mostly this shelving change.</p>
            </>
          }
          student={
            <>
              <p>
                The production-scale arithmetic, once by hand: 100 equal-width columns, 10 GB of data, query <code>SELECT AVG(amount) FROM t</code>.
                Row store: every page interleaves all 100 columns, so the scan reads <strong>10 GB</strong> to use 0.1 GB — 99% waste. Column
                store: the scan reads only <code>amount</code>, <strong>0.1 GB</strong> — 100x less I/O before compression shrinks it further.
              </p>
              <p>
                Reading only the columns a query mentions is <strong>projection</strong> (pushed to storage: "projection pushdown"). It is why{' '}
                <code>SELECT *</code> is an anti-pattern in analytics — naming every column forfeits the layout's advantage — and why warehouse
                tables can afford to be shamelessly wide, a fact module 2.4 builds on.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Projection is the first of a family of pushdowns that columnar metadata enables. Column chunks carry min/max statistics (zone
                maps), so a range predicate skips chunks whose bounds exclude it — filter pushdown. DuckDB exploited exactly this in lesson 2.3.1's
                point-lookup test, which is why it embarrassed the naive expectation.
              </p>
              <p>
                A subtler question: after filtering on column A and aggregating column B, <em>when</em> do you reassemble rows?{' '}
                <strong>Early materialization</strong> stitches surviving rows immediately; <strong>late materialization</strong> carries only
                row-id selections between operators and fetches B at the last moment — often never, for filtered-out rows. It is a signature
                column-store technique (Abadi et al., SIGMOD 2008 — the definitive read on why bolting columns onto a row engine underdelivers), and
                lesson 2.3.4's selection vectors are its execution-time face.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Feel projection: you are already running a column store">
        <p>DuckDB — behind every SQL runner in this course — is a columnar engine in your browser tab. The hidden setup builds a 300,000-row, 12-column table. Aggregate <em>one</em> column and note the runtime badge:</p>
        <CodeRunner
          language="sql"
          setup={WIDE_SETUP}
          code={`-- one column out of twelve
SELECT avg(amount) FROM wide;`}
        />
        <p>Now force the engine to read <em>every</em> column (same table, same rows):</p>
        <CodeRunner
          language="sql"
          setup={WIDE_SETUP}
          code={`-- all twelve columns
SELECT avg(amount), avg(id), count(city), avg(m01), avg(m02), avg(m03),
       avg(m04), avg(m05), avg(m06), avg(m07), avg(m08), avg(m09)
FROM wide;`}
        />
        <Callout kind="tip" title="Run each twice, compare the badges">
          The first Run downloads the engine, so trust the <em>second</em> run's milliseconds. The all-column query does roughly 12x the column
          reading — the gap is projection, live. Edit the queries: try 3 columns, try 6; cost scales with columns touched, not rows returned.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="The bill arrives on writes">
        <Tiered
          layman={
            <>
              <p>
                The shelved-by-item warehouse has a receiving-dock problem: when one new order arrives — screws, invoice, label — the worker must
                visit a <em>different shelf for every item</em>. The boxed-by-order warehouse tapes the box shut and drops it at the aisle's end.
              </p>
              <p>
                So it changes habits: let deliveries pile up at the dock all morning, then shelve the pile in one sweep — one visit per shelf for
                hundreds of orders. Analytical databases hate one-at-a-time additions and love big batched deliveries; last lesson's trolley runs
                on a schedule with a full load for the same reason.
              </p>
            </>
          }
          student={
            <>
              <p>
                Inserting one row into a row store appends one tuple to one page (plus index updates): cheap, done millions of times a day.
                Inserting one row into a pure columnar layout writes one value into <em>each column's</em> separate region — 100 columns, 100
                physical locations. Per-row cost explodes, and next lesson makes it worse: columns sit compressed in blocks that would need
                decompressing and rewriting.
              </p>
              <p>
                Hence the universal pattern: <strong>batch and append</strong>. Buffer incoming rows, convert a batch to columnar in one pass,
                append it as an immutable chunk; updates and deletes are lazy — mark rows dead, rewrite during compaction. This is why warehouses
                want bulk loads, why Parquet files are immutable, and why pipelines move batches, not single rows.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Generalize and you get one of storage's great recurring designs: absorb writes in a write-optimized structure, serve reads from a
                read-optimized one, migrate in the background. C-Store (2005) had a writeable store and tuple mover; warehouses call it a delta
                store; LSM-trees (memtable, sorted immutable runs, compaction) are the same idea powering RocksDB and Cassandra. In Phase 8
                (project P8a) you build a toy LSM engine.
              </p>
              <p>
                The read-side corollary of immutable chunks: a query pins a snapshot of chunk versions and scans without locks while writers stack
                new chunks alongside — MVCC re-derived at file granularity. The costs concentrate in compaction: write amplification, and scheduling
                merges so neither reads nor ingest starve — vocabulary that returns in Phases 4 and 8.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Row store, column store, or a row store wearing a costume">
        <Tradeoffs
          options={[
            {
              name: 'Row store (Postgres, MySQL)',
              strengths: [
                'Single-page row access: point reads and writes in microseconds-to-ms',
                'Cheap single-row inserts/updates/deletes with full transactional guarantees',
              ],
              weaknesses: [
                'Wide scans read every column whether needed or not — the 100x tax',
                'Per-row storage overhead and weaker compression',
              ],
              chooseWhen: 'the workload is OLTP: current state, point access, many concurrent writers.',
            },
            {
              name: 'Column store (DuckDB, ClickHouse, warehouse engines)',
              strengths: [
                'Scans read only referenced columns; compression multiplies the win (next lesson)',
                'Vectorization-friendly layout — the executor half of the story (lesson 2.3.4)',
              ],
              weaknesses: [
                'Single-row writes and lookups are structurally awkward — batch/append or suffer',
                'Row reconstruction (SELECT *) touches every column',
              ],
              chooseWhen: 'the workload is OLAP: aggregates and scans over history, bulk-loaded.',
            },
            {
              name: 'Row store + covering indexes "pretending" to be columnar',
              strengths: [
                'No new system: a covering index on (city, amount) serves that aggregate index-only',
                'Genuinely effective for a handful of known, stable query patterns',
              ],
              weaknesses: [
                'One index per query shape — ad-hoc analytics immediately escapes the disguise',
                'Every index taxes every write; still a tuple-at-a-time executor underneath',
              ],
              chooseWhen: 'a few fixed analytical queries must run inside an existing OLTP system and a warehouse is not (yet) justified.',
            },
          ]}
          note={
            <>
              The third option is module 2.2's tools stretched to their limit — a useful trick and a poor warehouse. Knowing where it stops working
              (ad-hoc queries, write amplification, no vectorized scans) is what understanding storage layouts means.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: measure the layout tax at 2 million rows">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Create the module's <code>warehouse-lab</code> project (it carries through 2.3.3 and 2.3.4), build a 2M-row, 20-column DuckDB table,
              measure narrow-vs-wide aggregation, then run the same contest in Postgres and compare the <em>ratios</em>. DuckDB should show a large
              gap; Postgres should not — that asymmetry is the whole lesson in two numbers.
            </p>
          }
          steps={[
            {
              title: 'Create the warehouse-lab project',
              commands: [{ ps: 'cd ~\nuv init warehouse-lab\ncd warehouse-lab\nuv add duckdb pyarrow' }],
              checkpoint: <><code>uv run python -c "import duckdb; print(duckdb.__version__)"</code> prints a version.</>,
            },
            {
              title: 'Build a 2M-row, 20-column table',
              body: (
                <>
                  <p>Create <code>build_table.py</code>. It writes a persistent file, <code>warehouse.duckdb</code>, reused by the next two lessons:</p>
                  <CodeBlock
                    label="python — build_table.py"
                    code={`import duckdb

con = duckdb.connect("warehouse.duckdb")
# 16 generated measure columns m00..m15, plus id/city/amount/ts = 20 columns
measures = ", ".join(
    "(i * " + str(k + 3) + ") % 997 AS m" + str(k).zfill(2) for k in range(16)
)
con.execute(
    "CREATE OR REPLACE TABLE orders AS SELECT i + 1 AS id, "
    "'city_' || (i % 50) AS city, (i % 1000) / 7.0 AS amount, "
    "TIMESTAMP '2026-01-01' + INTERVAL (i % 365) DAY AS ts, "
    + measures + " FROM range(2000000) t(i)"
)
n = con.execute("SELECT count(*) FROM orders").fetchone()[0]
ncols = len(con.execute("SELECT * FROM orders LIMIT 1").description)
print(n, "rows,", ncols, "columns")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python build_table.py' }],
              checkpoint: <><code>2000000 rows, 20 columns</code> prints and <code>warehouse.duckdb</code> exists in the project folder.</>,
            },
            {
              title: 'Time narrow vs wide aggregation in DuckDB',
              body: (
                <>
                  <p>Create <code>time_queries.py</code>:</p>
                  <CodeBlock
                    label="python — time_queries.py"
                    code={`import time
import duckdb

con = duckdb.connect("warehouse.duckdb")

def timed(label, sql):
    con.execute(sql).fetchall()  # warm-up run
    t0 = time.perf_counter()
    con.execute(sql).fetchall()
    ms = (time.perf_counter() - t0) * 1000
    print(label, round(ms, 1), "ms")
    return ms

wide_cols = ", ".join("avg(m" + str(k).zfill(2) + ")" for k in range(16))
narrow = timed("one column :", "SELECT avg(amount) FROM orders")
wide = timed("all 20 cols:",
             "SELECT avg(amount), avg(id), count(city), count(ts), "
             + wide_cols + " FROM orders")
print("ratio:", round(wide / narrow, 1), "x")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python time_queries.py' }],
              checkpoint: <>The wide aggregation is several times slower — typically 5-15x. Record both numbers and the ratio in your notes.</>,
            },
            {
              title: 'Same contest in Postgres',
              body: (
                <p>
                  Build a comparable table in <code>pg-lab</code> (the insert takes a minute), then time the same aggregates with psql's{' '}
                  <code>\timing</code>. Each query runs twice; keep the second (warm-cache) timing:
                </p>
              ),
              commands: [
                {
                  ps: `docker exec pg-lab psql -U postgres -c "DROP TABLE IF EXISTS orders_wide; CREATE TABLE orders_wide AS SELECT g AS id, 'city_' || (g % 50) AS city, (g % 1000) / 7.0 AS amount, now() AS ts, (g*3)%997 AS m00, (g*4)%997 AS m01, (g*5)%997 AS m02, (g*6)%997 AS m03, (g*7)%997 AS m04, (g*8)%997 AS m05, (g*9)%997 AS m06, (g*10)%997 AS m07, (g*11)%997 AS m08, (g*12)%997 AS m09, (g*13)%997 AS m10, (g*14)%997 AS m11, (g*15)%997 AS m12, (g*16)%997 AS m13, (g*17)%997 AS m14, (g*18)%997 AS m15 FROM generate_series(1, 2000000) g;"`,
                  label: 'seed the wide table',
                },
                {
                  ps: `docker exec pg-lab psql -U postgres -c "\\timing" -c "SELECT avg(amount) FROM orders_wide;" -c "SELECT avg(amount) FROM orders_wide;" -c "SELECT avg(amount), avg(id), count(city), count(ts), avg(m00), avg(m01), avg(m02), avg(m03), avg(m04), avg(m05), avg(m06), avg(m07), avg(m08), avg(m09), avg(m10), avg(m11), avg(m12), avg(m13), avg(m14), avg(m15) FROM orders_wide;" -c "SELECT avg(amount), avg(id), count(city), count(ts), avg(m00), avg(m01), avg(m02), avg(m03), avg(m04), avg(m05), avg(m06), avg(m07), avg(m08), avg(m09), avg(m10), avg(m11), avg(m12), avg(m13), avg(m14), avg(m15) FROM orders_wide;"`,
                  label: 'time narrow, then wide (each twice)',
                },
              ],
              checkpoint: (
                <>Postgres's wide/narrow ratio is far smaller than DuckDB's — usually under 3x, because the row store reads every page either way. Note both ratios side by side.</>
              ),
            },
            {
              title: 'Explain your own numbers',
              body: (
                <>
                  <p>Write one sentence: why is the narrow query a big win in DuckDB but a small win in Postgres, though the SQL is identical?</p>
                  <RevealSolution label="Check your sentence">
                    <p>
                      DuckDB stores columns separately, so the narrow query reads ~1/20th of the data. Postgres stores rows together, so both
                      queries read every page; the narrow query saves only per-row CPU. Layout determines what you must read; the query only
                      determines what you get to keep.
                    </p>
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>Your notes hold four timings, two ratios, and the sentence. Keep <code>warehouse.duckdb</code> — lessons 2.3.3 and 2.3.4 build on it.</>
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
              q: 'A table has 50 equally wide columns. In a pure column store, roughly what fraction of the table does SELECT max(price) FROM t read, versus a row store?',
              options: [
                'Both read the whole table',
                'About 1/50th in the column store; the whole table in the row store',
                'About 1/50th in both',
                'One page in both — the max is in metadata',
              ],
              answer: 1,
              explain:
                'Projection: the column store reads only the price column; the row store passes every page because each page interleaves all 50 columns.',
            },
            {
              q: 'Why do columnar systems push you toward batched, append-style writes instead of single-row inserts?',
              options: [
                'SQL standards forbid single-row inserts on columnar tables',
                'One logical row scatters into every column’s separate (often compressed) region, so per-row writes are expensive; batching amortizes the scatter into one pass per column',
                'Analysts must approve each row',
                'Batching is only a network optimization',
              ],
              answer: 1,
              explain:
                'A 100-column row touches 100 storage regions. Buffer many rows, convert once, append an immutable chunk — the delta-store/LSM pattern you will build in Phase 8.',
            },
            {
              q: 'Your team adds a covering index on (city, amount) to Postgres and the sales dashboard gets fast. A month later analysts complain their new ad-hoc queries are slow. What happened?',
              options: [
                'The index corrupted and needs rebuilding',
                'Covering indexes only accelerate the exact column patterns they cover; ad-hoc queries fell back to full row scans — the costume slipped',
                'Postgres disabled the index under load',
                'The analysts’ SQL is malformed',
              ],
              answer: 1,
              explain:
                'A covering index is a hand-built column-slice for one query shape. Analytics is ad-hoc by nature, so each new shape needs its own index — and every index taxes every write. This is the boundary where a real columnar store earns its keep.',
            },
            {
              q: 'In your lab, DuckDB showed a large narrow-vs-wide ratio and Postgres a small one. The correct reading is:',
              options: [
                'Postgres is better because its queries are more consistent',
                'DuckDB reads only referenced columns, so cost scales with columns touched; Postgres reads all pages regardless, so cost is flat (and flatly high) in column count',
                'DuckDB caches better than Postgres',
                'The Python driver added overhead to DuckDB',
              ],
              answer: 1,
              explain:
                '"Consistently slow" is not a virtue. The flat Postgres profile is the signature of a layout that cannot skip unreferenced columns; the steep DuckDB profile is projection working as designed.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain row vs columnar storage and when each wins.',
            a: (
              <p>
                Storage is read in pages, so layout decides what a query is forced to read. Row layout puts one record's fields together — ideal for
                OLTP point reads and writes. Columnar puts one column's values together — ideal for analytical scans, which read only referenced
                columns, compress better, and vectorize better. The price: columnar single-row writes and lookups are awkward, hence batch/append
                patterns. Strong answers do the I/O arithmetic aloud and note that page-granularity reads are why layout matters at all.
              </p>
            ),
          },
          {
            q: 'Why not just add indexes to the OLTP database instead of standing up a columnar warehouse?',
            a: (
              <p>
                Covering indexes emulate columnar access for known query shapes — a legitimate, cheap answer for a few stable dashboards. It
                collapses under ad-hoc analytics (every new shape needs an index), write load (every index taxes every insert), and at the executor
                (still row-at-a-time). Decision point: fixed queries — indexes; open exploration over history — columnar engine.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>I/O happens in pages: the unit of cost is pages touched, not values used. Layout decides what shares a page.</>,
          <>Row layout: a record's fields together — one page per point lookup. Columnar: a column's values together — scans read only referenced columns, so aggregating 1 of 100 columns reads ~1% of a column store and 100% of a row store.</>,
          <>Columnar pays on writes: one row scatters across every column, so real systems batch, append immutable chunks, and compact (Phase 8's LSM).</>,
          <>Covering indexes are a row store impersonating a column store for one query shape — useful, and a dead end for ad-hoc analytics.</>,
        ]}
      />
    </>
  )
}
