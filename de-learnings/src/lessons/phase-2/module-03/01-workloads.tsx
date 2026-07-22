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
import { RevealSolution } from '../../../components/RevealSolution'
import { RowVsColumn3D } from '../../../viz/RowVsColumn3D'
import { DataJourney } from '../../../viz/DataJourney'

const ID = '2.3.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="'Which database should we use?' is the wrong first question">
        <Tiered
          layman={
            <>
              <p>
                A supermarket has two very different money jobs. The <strong>checkout register</strong> handles one customer at a time: scan, total,
                pay, print receipt — two seconds, thousands of times a day, and it must never lose or double-charge a sale. The{' '}
                <strong>accountant's year-end review</strong> is the opposite: once a quarter, someone sits down with <em>every receipt from the
                whole year</em> and asks "which products made money? which store is slipping?" It takes hours, and nobody minds.
              </p>
              <p>
                Now force one person to do both jobs at the same desk at the same time: the accountant spreads a year of receipts across the counter
                — and the checkout queue backs up out the door. That is what happens inside a database serving both jobs. The fix in shops and in
                software is the same: two desks, and a trolley that regularly moves copies of receipts from register to accountant. Building and
                running that trolley is, quite literally, the job you are training for.
              </p>
            </>
          }
          student={
            <>
              <p>
                "Postgres or DuckDB? Row store or column store?" is unanswerable as asked. The answerable question is: <strong>what is the
                workload?</strong> Databases are not fast or slow in the abstract — they are fast or slow <em>for a shape of work</em>. Two shapes
                dominate:
              </p>
              <ul>
                <li>
                  <strong><GlossaryTerm k="oltp">OLTP</GlossaryTerm></strong> (online transaction processing): many small reads and writes touching
                  a handful of rows each — "fetch order 10052", "mark it shipped". Millisecond latency, hundreds or thousands of concurrent
                  sessions, and the data of record is the <em>current state</em> of the business.
                </li>
                <li>
                  <strong><GlossaryTerm k="olap">OLAP</GlossaryTerm></strong> (online analytical processing): few, large, read-mostly queries that
                  scan and aggregate <em>history</em> — "average order value by city by month, last three years". Seconds are fine, a handful of
                  concurrent analysts is typical, and writes arrive in bulk loads, not one row at a time.
                </li>
              </ul>
              <p>
                Everything in this module — row vs columnar layout, compression, vectorized execution — is a consequence of engineering for one
                profile or the other. Characterize the workload first and the database choice mostly makes itself.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Workload characterization is a small vector of measurable dimensions, worth stating explicitly: <strong>selectivity</strong>{' '}
                (fraction of rows touched — OLTP point queries select 10⁻⁶ of the table, OLAP scans most of it), <strong>read/write ratio</strong>{' '}
                and write granularity (single-row upserts vs bulk appends), <strong>latency SLO</strong> (p99 in milliseconds vs seconds),{' '}
                <strong>concurrency</strong> (thousands of sessions vs tens), and <strong>freshness</strong> (must reads see the last committed
                write, or is an hour-old copy fine?). Any engine is a point in that design space; no point is optimal everywhere.
              </p>
              <p>
                Mixing profiles on one engine hurts for physical reasons: a table scan evicts the hot working set from the buffer pool, turning
                cached point lookups into disk misses; long analytical snapshots hold back MVCC garbage collection (vacuum bloat) and widen lock
                windows; caches and branch predictors tuned by one pattern get trashed by the other. HTAP systems — TiDB (row replicas plus TiFlash
                columnar replicas), SingleStore, Snowflake Unistore — respond by maintaining <em>both layouts</em> behind one SQL surface: less "one
                system" than "two systems with a built-in pipeline", the replication and cost questions moved inside the box. Separation plus an
                explicit pipeline keeps winning in practice because the pipeline is <em>inspectable</em> — when numbers look wrong, you can see the
                trolley.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Feel the difference before you can explain it">
        <p>The same 8-row, 4-column table, laid out on a disk strip two ways, with the two archetypal queries as buttons. Push buttons; watch the counter.</p>
        <RowVsColumn3D />
        <Callout kind="tip" title="Try all four combinations before reading on">
          Row store + point lookup. Row store + AVG. Column store + point lookup. Column store + AVG. Watch the <strong>pages counter</strong> in
          the caption and which blocks glow <strong>red</strong> (read from disk but never used). Each layout has one query it is great at and one
          it is embarrassing at — and they are opposites. Don't explain it yet; lesson 2.3.2 does. Just make sure you have <em>seen</em> it.
        </Callout>
        <Tiered
          layman={
            <>
              <p>
                What you just saw: when the shelf stores <em>whole receipts together</em> (row store), grabbing one receipt is one trip — but
                totalling a single column means hauling every receipt to the desk. When the shelf stores <em>all the amounts together</em> (column
                store), totalling is one trip — but rebuilding one full receipt means visiting four shelves.
              </p>
              <p>Neither plan is "better"; each is perfect for one errand and wasteful for the other. So companies keep both arrangements.</p>
            </>
          }
          student={
            <>
              <p>
                Map the buttons to real systems. The point lookup — <code>SELECT * WHERE id = 105</code> — is the OLTP archetype: Postgres answers
                thousands per second because a B-tree index (module 2.2) plus row layout puts the whole matching row on one page. The aggregate —{' '}
                <code>SELECT AVG(amount)</code> — is the OLAP archetype: DuckDB answers it fast because{' '}
                <GlossaryTerm k="columnar-storage">columnar storage</GlossaryTerm> puts every <code>amount</code> shoulder to shoulder, so the scan
                reads only that column.
              </p>
              <p>
                Two more workload traits matter. <strong>Working set vs full history:</strong> OLTP mostly touches recent hot rows (today's orders),
                which is why a modest buffer cache makes it fly; OLAP by definition wants the cold archive too. <strong>Write shape:</strong> OLTP
                writes single rows continuously and must confirm each one; OLAP prefers appending big sorted batches — a distinction that explains a
                lot in lessons 2.3.2 and 2.3.3.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The viz shows the block-level story; the systems story adds layers. <strong>Concurrency control:</strong> OLTP engines invest in
                fine-grained locking and MVCC so thousands of small transactions interleave; OLAP engines get away with snapshot reads over
                immutable files because writers are few and batched. <strong>Recovery:</strong> write-ahead logging with per-transaction fsync is
                priced for small writes; bulk loads amortize or bypass it.
              </p>
              <p>
                This is also why "just add read replicas for analytics" disappoints past a point: a replica keeps the same row layout and
                tuple-at-a-time executor — you bought isolation from the primary, not an analytical engine. A fine first step, but the 100x wins in
                this module come from changing the layout and the executor, not the host.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Two systems and a pipeline: why this job exists">
        <DataJourney caption="The Phase 0 picture, now with names. The source stations are OLTP systems (registers). Analytical storage is the OLAP side (the accountant's office). The gate in the middle — extract, clean, load, on a schedule, without losing or duplicating anything — is the pipeline you are learning to build." />
        <Tiered
          layman={
            <>
              <p>
                Once you accept "two desks", a new job appears: someone must run the trolley — copy the register's receipts to the accountant's
                office, regularly, completely, exactly once. Too rarely and the accountant works on stale numbers; lose a receipt and the year-end
                report is quietly wrong; deliver duplicates and it is wrong the other way.
              </p>
              <p>
                That trolley run — scheduled, checked, boring in the best way — is the day job of a data engineer. The registers and the accountants
                both existed before you; the reliable connection between them is what you add.
              </p>
            </>
          }
          student={
            <>
              <p>
                The analytics data has to come from somewhere, and it comes from the OLTP systems. The path between them is the{' '}
                <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm>: extract from the operational database (without hammering it), transform,
                load into the <GlossaryTerm k="data-warehouse">warehouse</GlossaryTerm> — the <GlossaryTerm k="etl">ETL</GlossaryTerm> /{' '}
                <GlossaryTerm k="elt">ELT</GlossaryTerm> pattern from Phase 0, now with a concrete reason to exist. Almost every topic left in this
                curriculum is a sub-problem of that sentence: incremental extraction, <GlossaryTerm k="idempotency">idempotent</GlossaryTerm> loads,
                scheduling, schema change, monitoring.
              </p>
              <p>
                The costs of separation are real: a second system to operate and pay for, a pipeline to build and monitor, and{' '}
                <strong>freshness lag</strong> — the warehouse trails the registers by minutes to a day. Teams accept all three because the
                alternative (analysts scanning production) degrades the system that takes customer money. When someone proposes "just query prod",
                the professional answer is not "never" — it is "here is what that costs, and here is when it breaks".
              </p>
            </>
          }
          phd={
            <>
              <p>
                Formally the warehouse is a <em>derived, denormalized, time-versioned materialized view</em> of one or more OLTP stores, maintained
                asynchronously. That framing predicts the hard problems: view maintenance (full reload vs incremental — Phase 5's CDC), consistency
                between derived and base data (bounded staleness is the contract), and schema evolution (the view's schema outlives any one source
                schema). It also explains why the warehouse keeps history while sources overwrite in place: the view is append-mostly, so retaining
                prior states is nearly free, and analysis is precisely the study of those states.
              </p>
              <p>
                HTAP deserves an honest verdict: the promise — no pipeline, no lag, one bill — recurs every five years because the pain is genuine,
                and the systems work within their envelopes. But all reintroduce the same questions (replication lag, layout choice, workload
                isolation) as internal configuration instead of external architecture. The pattern to date: HTAP wins where workloads are moderate
                and coupled; dedicated systems plus pipelines win at scale, where teams want to tune, bill, and debug each side independently.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="One engine, two engines, or the folded-in pipeline">
        <p>This is the trade-off the whole phase orbits. No strawmen — every option below runs in production somewhere, sensibly.</p>
        <Tradeoffs
          options={[
            {
              name: 'One database for everything (e.g. just Postgres)',
              strengths: [
                'One system to operate, secure, back up, and pay for',
                'Analytics always reads fresh, transactionally consistent data',
              ],
              weaknesses: [
                'Analytical scans evict the hot working set and stall the checkout path',
                'Row layout makes wide-history aggregations 10-100x slower than columnar',
                'History accumulates in the operational schema, bloating and slowing OLTP',
              ],
              chooseWhen: 'data is small (fits in RAM), analysts are few, and the business is young — a perfectly honorable starting point.',
            },
            {
              name: 'OLTP system + warehouse + pipeline',
              strengths: [
                'Each engine plays its home game: ms transactions, fast scans over full history',
                'Workloads are isolated — a monster query cannot take down checkout',
              ],
              weaknesses: [
                'Freshness lag: the warehouse trails production by minutes to a day',
                'The pipeline is real engineering — it can silently lose, duplicate, or delay data',
                'Two systems plus a pipeline cost more in money and attention',
              ],
              chooseWhen: 'analytics matter enough to hurt when they are slow or wrong — i.e., most companies past their first few analysts.',
            },
            {
              name: 'HTAP platform (TiDB, SingleStore, Unistore)',
              strengths: [
                'One SQL surface, no user-visible pipeline, near-fresh analytics',
                'Engine maintains row and columnar replicas for you',
              ],
              weaknesses: [
                'The pipeline still exists — inside the box, harder to inspect and tune',
                'Smaller ecosystems; workload isolation and cost attribution become configuration, not architecture',
              ],
              chooseWhen: 'freshness is a hard product requirement and your scale fits the vendor’s envelope.',
            },
          ]}
          note={
            <>
              The honest summary of this entire curriculum: option 2 wins so often that a profession grew around building its middle piece. "Modern
              data stack" is option 2 with brand names attached.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: make both engines play both games">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will run an OLTP-shaped workload (500 single-row lookups) and an OLAP-shaped workload (one full-table aggregation) against{' '}
              <strong>both</strong> your Postgres container and DuckDB, on the same 1M-row dataset, and record the 2x2 timing matrix. The point is
              not the exact numbers — it is seeing each engine win its home game on your own machine.
            </p>
          }
          steps={[
            {
              title: 'Confirm pg-lab is up',
              body: (
                <p>
                  Start your Postgres container from module 2.1. If you removed it, recreate it with{' '}
                  <code>docker run -d --name pg-lab -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16</code>.
                </p>
              ),
              commands: [{ ps: 'docker start pg-lab\ndocker exec pg-lab psql -U postgres -c "SELECT version();"' }],
              checkpoint: <>A PostgreSQL version string prints. The server is reachable.</>,
            },
            {
              title: 'Seed 1M rows in Postgres',
              body: <p>One command creates and fills the benchmark table, with a primary key (so point lookups get a B-tree, as in production):</p>,
              commands: [
                {
                  ps: `docker exec pg-lab psql -U postgres -c "DROP TABLE IF EXISTS orders_bench; CREATE TABLE orders_bench (id int PRIMARY KEY, city text, amount double precision, ts timestamp); INSERT INTO orders_bench SELECT g, 'city_' || (g % 50), (g % 1000) / 7.0, now() - (g % 365) * interval '1 day' FROM generate_series(1, 1000000) g;"`,
                },
              ],
              checkpoint: <><code>INSERT 0 1000000</code> prints. One million rows, 50 cities, one year of timestamps.</>,
            },
            {
              title: 'Create a scratch project with both clients',
              commands: [{ ps: 'cd ~\nuv init workload-lab\ncd workload-lab\nuv add duckdb "psycopg[binary]"' }],
              checkpoint: <>uv reports <code>duckdb</code> and <code>psycopg</code> added and a <code>.venv</code> exists in <code>workload-lab</code>.</>,
            },
            {
              title: 'Write and run the benchmark script',
              body: (
                <>
                  <p>Create <code>bench.py</code> in the project folder (VS Code: <code>code .</code>). Read it before running — it is the lesson in executable form.</p>
                  <CodeBlock
                    label="python — bench.py"
                    code={`import random
import time
import duckdb
import psycopg

PG_DSN = "postgresql://postgres:postgres@localhost:5432/postgres"
N = 1_000_000
ids = [random.randint(1, N) for _ in range(500)]

def timed(fn):
    t0 = time.perf_counter()
    fn()
    return (time.perf_counter() - t0) * 1000  # ms

# --- Postgres: the OLTP engine ---
pg = psycopg.connect(PG_DSN)
pg.autocommit = True
cur = pg.cursor()

def pg_points():
    for i in ids:
        cur.execute("SELECT * FROM orders_bench WHERE id = %s", (i,))
        cur.fetchone()

def pg_agg():
    cur.execute("SELECT city, avg(amount), count(*) FROM orders_bench GROUP BY city")
    cur.fetchall()

# --- DuckDB: the OLAP engine (same data, generated identically) ---
duck = duckdb.connect()
duck.execute("""
    CREATE TABLE orders_bench AS
    SELECT i + 1 AS id, 'city_' || (i % 50) AS city, (i % 1000) / 7.0 AS amount,
           TIMESTAMP '2026-01-01' - INTERVAL (i % 365) DAY AS ts
    FROM range(1000000) t(i)
""")

def duck_points():
    for i in ids:
        duck.execute("SELECT * FROM orders_bench WHERE id = ?", [i]).fetchone()

def duck_agg():
    duck.execute("SELECT city, avg(amount), count(*) FROM orders_bench GROUP BY city").fetchall()

pg_pt, pg_ag = timed(pg_points), timed(pg_agg)
dk_pt, dk_ag = timed(duck_points), timed(duck_agg)
print("engine        500 point lookups    full aggregate")
print(f"Postgres      {pg_pt:12.0f} ms    {pg_ag:11.0f} ms")
print(f"DuckDB        {dk_pt:12.0f} ms    {dk_ag:11.0f} ms")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python bench.py' }],
              checkpoint: <>A 2x2 matrix prints: Postgres has the smaller point-lookup number, DuckDB the (much) smaller aggregate number.</>,
            },
            {
              title: 'Record and interpret the matrix',
              body: (
                <>
                  <p>Copy your four numbers into a 2x2 table. Before revealing: why is the aggregate gap usually far more dramatic than the point-lookup gap here?</p>
                  <RevealSolution label="Reveal the interpretation">
                    <p>
                      The aggregate plays to a structural difference: DuckDB scans one tightly packed column with a vectorized executor while
                      Postgres walks every page of every row. The point-lookup side <em>understates</em> Postgres's advantage: DuckDB's min-max
                      metadata skips most of the table even without an index, and this script runs one lookup at a time with no concurrent writers —
                      real OLTP means thousands of concurrent sessions with millisecond deadlines, the regime Postgres's buffer pool, B-trees, and
                      MVCC are built for. Each engine won its home game even with the away team allowed to look good.
                    </p>
                  </RevealSolution>
                </>
              ),
              checkpoint: <>Your notes contain the 2x2 matrix with each engine winning its home column, plus one sentence on why the gaps differ.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'A query runs every few seconds, reads one customer row by primary key, and must return in under 10 ms while thousands of others do the same. Which workload profile is this?',
              options: [
                'OLAP — it involves reading data',
                'OLTP — high concurrency, point access, millisecond latency, current state',
                'HTAP — it mixes reads and writes',
                'Batch — it repeats on a schedule',
              ],
              answer: 1,
              explain:
                'Point access + strict latency + high concurrency + current state is the OLTP fingerprint. Repetition on a schedule does not make something batch, and reading alone does not make it OLAP.',
            },
            {
              q: 'Why does running big analytical scans directly on the production OLTP database degrade the application, even if the analyst is patient?',
              options: [
                'SQL syntax differs between analytics and transactions',
                'Scans evict the hot working set from cache and contend for I/O and MVCC resources the transactional path depends on',
                'Analytical queries lock the whole database by default',
                'It cannot — reads never affect other reads',
              ],
              answer: 1,
              explain:
                'The scan pollutes the buffer cache (point lookups become disk misses), saturates I/O, and long snapshots delay cleanup like vacuum. No full-database lock is needed for the damage.',
            },
            {
              q: 'Your warehouse refreshes from production nightly. A stakeholder demands real-time dashboards. What is the honest engineering framing?',
              options: [
                'Impossible — warehouses are always a day behind',
                'Point the dashboard at the production database; reads are free',
                'Freshness is a dial with costs: more frequent loads or streaming raise pipeline complexity and cost, and querying prod directly shifts the cost onto the application',
                'Switch databases to one that is fast at everything',
              ],
              answer: 2,
              explain:
                'Freshness lag is a chosen trade-off, not a law. You can pay to reduce it (incremental loads, CDC in Phase 5) — the professional move is pricing the options, not promising magic.',
            },
            {
              q: 'What is the accurate one-line take on HTAP systems?',
              options: [
                'They prove separate warehouses are obsolete',
                'They are marketing with no real implementations',
                'They maintain both row and columnar layouts internally — moving the pipeline inside the box rather than eliminating the underlying trade-off',
                'They store data in a third layout that is optimal for both workloads',
              ],
              answer: 2,
              explain:
                'TiDB/TiFlash, SingleStore, and Unistore all keep dual layouts in sync internally. The physics remains; what changes is who operates the machinery that straddles it.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain OLTP vs OLAP and why companies typically run both.',
            a: (
              <p>
                OLTP is many small, concurrent, latency-critical reads and writes against current state — the application's database. OLAP is few
                large scans and aggregations over history. One engine struggles at both because scans destroy the caches and concurrency behavior
                transactions depend on, and row layout makes scans expensive anyway. So companies run an OLTP system and a warehouse, connected by
                pipelines. Strong answers name the costs of the split (freshness lag, pipeline complexity) instead of presenting it as free.
              </p>
            ),
          },
          {
            q: 'When would you tell a team NOT to build a separate warehouse?',
            a: (
              <p>
                When the whole dataset fits comfortably in the OLTP database's memory, analysts are few, and queries are light — a read replica or
                even direct queries with a resource limit may be all the separation needed. Premature warehousing buys complexity before it buys
                speed. The trigger to revisit: analytical load measurably degrading transactions, or history/modeling needs the operational schema
                can't serve.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Never answer "which database?" before characterizing the workload: selectivity, read/write ratio, latency, concurrency, freshness.</>,
          <>OLTP = many tiny transactions on current state at millisecond latency; OLAP = few big scans over history where seconds are fine.</>,
          <>One engine serving both thrashes: scans evict the OLTP working set and row layout taxes every aggregate.</>,
          <>
            The standard answer is two systems plus a pipeline — and that pipeline is the data engineering job. Its costs (lag, complexity, money)
            are real and worth naming out loud.
          </>,
          <>
            HTAP relocates the trade-off inside one product rather than repealing it — and your 2x2 matrix is the evidence for the split: Postgres
            won point lookups, DuckDB won the aggregate, on identical data.
          </>,
        ]}
      />
    </>
  )
}
