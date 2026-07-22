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
import { BenchBars } from '../../../viz/BenchBars'

const ID = '2.2.4'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Every index is a tax on every write, forever">
        <Tiered
          layman={
            <>
              <p>
                Imagine a library where every new book must be logged into <em>nine different card
                catalogs</em> before it may touch a shelf: by title, by author, by subject, by year, by
                publisher... The catalogs made the library wonderfully searchable — and made receiving a
                single book a twenty-minute ritual. On delivery day, when three thousand books arrive at
                once, the loading dock backs up not because shelving is slow but because the <em>catalogs</em>{' '}
                are.
              </p>
              <p>
                Nobody planned nine catalogs. Each one was added by someone speeding up their own search,
                and each looked free at the time — catalogs only charge on <em>arrival</em>, and the person
                adding one is never the person unloading trucks. Databases rot exactly this way: index by
                index, each reasonable, until writes crawl. This lesson is about seeing the bill, measuring
                it on your own machine, and learning to cancel subscriptions you are not using.
              </p>
            </>
          }
          student={
            <>
              <p>
                Mechanics of the tax: every <code>INSERT</code> writes the heap row <em>and</em> descends
                every index to add an entry — five indexes means six structures updated, synchronously, inside
                the transaction, each generating WAL. <code>DELETE</code> is gentler (index entries are
                cleaned later by vacuum), but <code>UPDATE</code> in Postgres’s MVCC (module 2.1) is a
                delete-plus-insert: unless a special case applies (HOT, below), a one-column update inserts
                new entries into <em>every index on the table</em>, including indexes on columns that did not
                change.
              </p>
              <p>
                Unlike a slow read — which shows up as one slow query you can EXPLAIN — the write tax is
                diffuse: every insert everywhere is a little slower, throughput sags, replication lag creeps.
                No single query looks guilty, so nobody suspects the indexes. The defense is measurement
                culture: know your write paths, count your indexes, and audit which ones actually get read.
                The lab makes you feel the slope with a stopwatch.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Count the I/O. A bulk insert into a bare heap is nearly ideal: rows append into pages
                sequentially, WAL streams sequentially — the access pattern storage loves. Add k secondary
                indexes and each row now also performs k B-tree descents ending in k leaf-page writes, and
                those leaves are scattered across k trees — random I/O in exactly the proportion the heap
                path avoided, plus WAL for every dirtied index page, plus occasional page splits cascading
                upward. Write amplification of roughly 1 + k structure-touches per row, with the k being the
                expensive, random kind.
              </p>
              <p>
                This asymmetry — B-trees pay random writes to keep reads logarithmic — is not a law of
                storage; it is one corner of the design space. The opposite corner is the LSM tree
                (log-structured merge): buffer writes in memory, flush sorted runs sequentially, pay at read
                time by consulting multiple runs (mitigated by Bloom filters), and amortize via background
                compaction. RocksDB, Cassandra, and most write-hungry systems live there. You will build a
                toy LSM engine in Phase 8 (P8a) and feel both corners from the inside; DDIA chapter 3 —
                already assigned this module — is the map of the whole space.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Measuring the tax: throughput vs index count">
        <BenchBars
          title="Bulk-inserting 500k rows vs secondary index count (illustrative)"
          betterIs="lower"
          items={[
            { label: '0 secondary indexes', value: 1.6, unit: 's', note: 'heap append + WAL, nearly sequential' },
            { label: '1 index', value: 3.1, unit: 's' },
            { label: '3 indexes', value: 6.8, unit: 's' },
            { label: '5 indexes', value: 11.5, unit: 's', note: 'six structures updated per row' },
          ]}
          caption="Illustrative shape, not a benchmark — the lab below produces your machine's real numbers. The slope is the lesson: cost climbs with every index, and there is no flat region."
        />
        <Tiered
          layman={
            <>
              <p>
                The bars slope up and never flatten — that is the whole chart. There is no “free” fifth
                index; each one adds its own filing work to every arriving row. And notice the first bar:
                plain shelving with no catalogs at all is <em>startlingly</em> fast. Warehouses will exploit
                exactly that fact at the end of this lesson.
              </p>
              <p>
                The practical folk wisdom that falls out: if you must file a mountain of boxes, take the
                catalogs offline first, shelve everything, then rebuild the catalogs in one organized pass at
                the end. Rebuilding from a complete pile is dramatically less work than updating card-by-card
                three thousand times.
              </p>
            </>
          }
          student={
            <>
              <p>
                That folk wisdom is a standard production pattern: for large bulk loads,{' '}
                <strong>drop (or postpone) secondary indexes, load, then CREATE INDEX afterward</strong>. A
                fresh index build scans and sorts once — vastly cheaper than half a million incremental
                random insertions — and it packs pages tighter. This is why 2.2.1’s lab created the table{' '}
                <em>then</em> the index, and it is bread-and-butter for the nightly-load{' '}
                <GlossaryTerm k="etl">ETL</GlossaryTerm> jobs you will build in later phases. (Deleting and
                rebuilding the primary key mid-flight is usually off the table — the pattern applies to
                secondary indexes.)
              </p>
              <p>
                What to watch in production: insert/update latency percentiles against index count per table,{' '}
                <code>pg_stat_user_tables.n_tup_ins/upd</code> for write volume, and index count as a
                reviewed, budgeted quantity — a schema-migration adding an index should name the queries it
                serves, the write path it taxes, and the evidence. “CREATE INDEX is not a performance
                strategy; it is a purchase.”
              </p>
            </>
          }
          phd={
            <>
              <p>
                Why batch builds win, quantitatively: building a B-tree over n rows by external sort is
                O(n log n) comparisons but — the number that matters — <em>sequential</em> I/O proportional
                to a few passes over the data, with page-at-a-time tree construction at ~90% fill.
                Incremental insertion is n random descents with scattered leaf dirtying, buffer-pool
                thrashing, and split-driven ~70% fill. Same logical result, several-fold cost difference,
                worse resulting tree. <code>maintenance_work_mem</code> sizes the build’s sort memory —
                raising it for the duration of a big CREATE INDEX is a standard move.
              </p>
              <p>
                Key <em>distribution</em> multiplies the tax. Monotonic keys (sequences, timestamps) append
                at the tree’s right edge: the active leaf stays hot in cache, splits are localized and pack
                well. Random keys — <strong>UUIDv4 is the canonical poison</strong> — spray inserts uniformly
                across all leaves: at scale the working set is the entire index, every insert risks a cache
                miss, and splits land everywhere at ~70% occupancy. The remedy keeps UUID-sized uniqueness
                but restores locality: time-ordered identifiers (UUIDv7, ULID) whose prefix is a timestamp.
                Same 128 bits, right-edge behavior — one of the highest-leverage schema decisions nobody
                makes consciously.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          label="write amplification, back of the envelope"
          code={`-- Structures touched per batch = rows * (1 heap + k indexes).
-- Edit the batch size or add index counts to match your system.
SELECT k AS secondary_indexes,
       500000 * (1 + k) AS structure_writes_per_batch,
       1 + k AS write_amplification
FROM (VALUES (0), (1), (3), (5), (9)) AS t(k);`}
        />
      </Section>

      <Section kicker="core concepts" title="The quiet failure modes: unused, unusable, and update-hostile">
        <Tiered
          layman={
            <>
              <p>
                Three ways a catalog goes bad quietly. First, the <em>abandoned</em> catalog: built for a
                search feature that was redesigned two years ago; nobody has opened its drawer since, but
                every arriving book still gets a card. Second, the <em>useless-by-design</em> catalog:
                “books, sorted by whether they are hardcover” — two giant sections, so any real search still
                means wading through half the library; the librarians never use it, yet it too demands a card
                per book. Third, the <em>twice-punished</em> catalog: one built on something that changes
                constantly, like “currently checked out?” — every checkout and return means re-filing cards
                in every catalog, not just that one.
              </p>
              <p>
                None of these announce themselves. The fix starts with a ledger: which catalogs were actually
                opened this month? The library keeps that ledger automatically; you just have to read it.
              </p>
            </>
          }
          student={
            <>
              <p>
                The ledger is <code>pg_stat_user_indexes</code>: its <code>idx_scan</code> column counts how
                many times each index was used by a scan since stats were last reset. An index with{' '}
                <code>idx_scan = 0</code> over a representative window (weeks, not minutes — think
                month-end jobs) while its table takes heavy writes is pure cost:{' '}
                <code>DROP INDEX</code> reclaims write throughput and storage instantly. Caveats before the
                axe: check replicas too (each has its own counters), and remember unique indexes enforce
                constraints — they earn their keep at zero scans.
              </p>
              <p>
                The low-selectivity index (on a two-value <code>status</code> column, say) is the same waste
                wearing a plausible face: 2.2.2 showed the planner refusing it for the 95% value, so it
                collects near-zero scans while charging every write. And the <strong>HOT</strong> subtlety
                (heap-only tuples): when an UPDATE changes only <em>non-indexed</em> columns and the new
                version fits on the same page, Postgres skips all index maintenance entirely — the new tuple
                is reached via the old one’s line pointer. Index a frequently-updated column and you hurt
                twice: that index needs maintenance on those updates, <em>and</em> every update it disqualifies
                from HOT now maintains <em>all</em> the table’s indexes. Indexing <code>last_seen_at</code>{' '}
                is how you double a hot table’s write cost with one line of DDL.
              </p>
            </>
          }
          phd={
            <>
              <p>
                HOT’s fine print: eligibility requires no indexed column modified (any index, including
                partial/expression ones referencing it) and free space on the same heap page — which is what
                a table <em>fill factor</em> below 100 buys on update-heavy tables (e.g.{' '}
                <code>ALTER TABLE ... SET (fillfactor = 80)</code>). Monitor the ratio{' '}
                <code>n_tup_hot_upd / n_tup_upd</code> in <code>pg_stat_user_tables</code>; a drop after a
                deploy that “just added one index” is this lesson in a graph.
              </p>
              <p>
                Maintenance debt compounds even for well-used indexes. Churn leaves dead entries; vacuum
                reclaims them lazily; pages end up half-empty and the tree balloons — <em>bloat</em>. Fresh
                rebuilds are dramatically smaller, hence{' '}
                <code>REINDEX CONCURRENTLY</code> (or pg_repack) as periodic hygiene on churn-heavy tables.
                Postgres 14+ b-tree bottom-up deletion and deduplication soften the slope considerably, but
                do not repeal it. Every index is a standing liability: storage rent, write tax, vacuum work,
                and an entry in someone’s mental model — audit them like recurring charges on a credit-card
                statement.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="Dropping indexes is a production change">
          <code>idx_scan = 0</code> on your laptop after five minutes proves nothing — production verdicts
          need weeks of counters, checked on primaries <em>and</em> replicas, with month-end and year-end
          jobs in the window. The safe ritual: record the index definition, drop it, watch latency dashboards,
          and keep the DDL ready to recreate. (Postgres has no “disable index” switch, though newer versions
          let you mark one invisible to the planner via <code>indisvalid</code> tricks — treat that as
          advanced machinery.)
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Why warehouses barely index at all">
        <Tiered
          layman={
            <>
              <p>
                Here is the surprise ending: the biggest analytical databases on earth — the ones scanning
                trillions of rows — mostly <em>gave up on card catalogs entirely</em>. Their trick is
                different: keep the books in giant labeled crates, and stencil on each crate the{' '}
                <em>range</em> of what is inside: “dates: March 3–9”, “amounts: 10–4,500”. Asked for March
                7th, you skip every crate whose label excludes it — without opening them. No per-book
                cataloging, ever; arriving books just get crated and the crate labeled once.
              </p>
              <p>
                Crate labels are coarser than catalog cards — you still leaf through the crates you open. But
                when questions routinely touch millions of books, opening-and-skimming beats
                card-by-card-lookup, and never maintaining catalogs makes arrivals nearly free. Different
                questions, different physics, different structure.
              </p>
            </>
          }
          student={
            <>
              <p>
                The crate labels are <strong>zone maps</strong> (a.k.a. min/max statistics): per block of{' '}
                <GlossaryTerm k="columnar-storage">columnar storage</GlossaryTerm> — DuckDB row groups,
                Snowflake micro-partitions, Parquet row groups — the engine records each column’s min and
                max (plus null counts, sometimes distinct estimates). A predicate like{' '}
                <code>WHERE created_at BETWEEN x AND y</code> prunes every block whose range cannot overlap —
                often 95%+ of the table skipped before any real I/O. Pruning quality depends on data{' '}
                <em>layout</em>: values clustered by load time or an explicit sort key give tight,
                non-overlapping ranges; shuffled data gives every block roughly the full range and pruning
                collapses. “Sortedness” is doing the index’s job, statistically.
              </p>
              <p>
                This is why a <GlossaryTerm k="data-warehouse">data warehouse</GlossaryTerm> like BigQuery
                or Snowflake has no <code>CREATE INDEX</code> button: bulk-append ingestion stays cheap
                (labels are computed once per immutable block — no per-row tree descents), and{' '}
                <GlossaryTerm k="olap">OLAP</GlossaryTerm> queries scan wide anyway. Module 2.3 puts you
                inside DuckDB’s version of this, and when Parquet files appear in Phase 4 you will read
                their per-row-group statistics with your own eyes — the same idea, serialized to a file
                format.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Zone maps trade precision for maintenance-freedom: they are a lossy, block-granular summary
                — false positives (blocks kept that contain no match) are filtered by the scan; false
                negatives are impossible since min/max bounds are conservative. Effectiveness is roughly a
                function of the clustering factor: for a sorted column, matching blocks are contiguous and
                pruning is near-perfect; for a random column, expected overlap per block approaches the full
                domain and the zone map degenerates to “scan everything”. Hence warehouse knobs like
                Snowflake clustering keys or DuckDB/Parquet writing sorted — re-sorting <em>is</em> their
                CREATE INDEX, paid at write-organization time, in bulk, sequentially.
              </p>
              <p>
                Seen from altitude, the three storage philosophies of this module line up on one axis of
                write-time organization: B-trees maintain perfect per-row order continuously (dear writes,
                sub-millisecond point reads); LSM trees maintain order lazily via compaction (cheap writes,
                good-enough reads); zone-mapped columnar maintains only block summaries (near-free bulk
                writes, scan-shaped reads). None dominates — each is optimal for its workload’s read/write
                mix, which is why Phase 8 has you build one of each.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="The budget: read speed vs write cost vs storage">
        <Tradeoffs
          options={[
            {
              name: 'Index-rich (interactive OLTP)',
              strengths: [
                'Point and range reads in fractions of a millisecond, at any table size',
                'Uniqueness and foreign-key checks ride the same structures',
              ],
              weaknesses: [
                'Each index taxes every insert and non-HOT update, and consumes comparable storage to data',
                'Index sprawl accretes silently; someone must audit the ledger',
              ],
              chooseWhen: 'user-facing apps where reads dominate and latency is the product.',
            },
            {
              name: 'Index-lean (ingest-heavy OLTP)',
              strengths: [
                'Maximum write throughput — the heap-append fast path stays fast',
                'PK plus one or two proven indexes covers most operational lookups',
              ],
              weaknesses: [
                'Ad-hoc queries degrade to scans; analysts will complain',
                'Requires discipline to keep saying no to “just one more index”',
              ],
              chooseWhen: 'event streams, logs, IoT firehoses — tables written always, read rarely.',
            },
            {
              name: 'No B-trees at all (columnar warehouse)',
              strengths: [
                'Bulk loads at disk speed; zone maps computed per block, never per row',
                'Scan-oriented reads over compressed columns beat index-hopping at analytical scale',
              ],
              weaknesses: [
                'Single-row lookups and updates range from slow to unsupported',
                'Pruning quality lives and dies on clustering/sort choices',
              ],
              chooseWhen: 'analytical workloads — which is why module 2.3 changes engines.',
            },
          ]}
          note={
            <>
              The budget framing to carry forward: reads, writes, and storage form a triangle, and an index
              moves cost around the triangle — it never removes cost. The workload, not the table, decides
              the right corner. <GlossaryTerm k="oltp">OLTP</GlossaryTerm> systems buy reads with writes;
              warehouses buy ingest with scans; and the same company usually needs both, connected by the
              pipelines you are here to build.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: put a stopwatch on the tax">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will bulk-insert 500,000 rows into an unindexed table, then the identical rows into the
              same table wearing five indexes, and compute the slowdown ratio — then read the usage ledger
              and drop dead weight. Record three numbers: time A (bare), time B (indexed), and B divided by
              A. Connect: <code>docker exec -it pg-lab psql -U postgres</code>.
            </p>
          }
          steps={[
            {
              title: 'Create the target table, bare',
              commands: [
                {
                  ps: `DROP TABLE IF EXISTS bench_writes;
CREATE TABLE bench_writes (
  id bigint,
  username text,
  score int,
  status text,
  created_at timestamp
);
\\timing on`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  <code>CREATE TABLE</code> confirmed and <code>Timing is on.</code> printed. No indexes
                  exist yet — this is the clean baseline.
                </>
              ),
            },
            {
              title: 'Time the baseline bulk insert (record as A)',
              commands: [
                {
                  ps: `INSERT INTO bench_writes
SELECT g, 'user_' || g, (g * 37) % 1000,
       CASE WHEN g % 20 = 0 THEN 'inactive' ELSE 'active' END,
       timestamp '2026-01-01' + make_interval(secs => g)
FROM generate_series(1, 500000) AS g;`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  <code>INSERT 0 500000</code>, with a <code>Time:</code> line — typically a few hundred
                  milliseconds to a couple of seconds. <strong>Write it down as A.</strong>
                </>
              ),
            },
            {
              title: 'Empty the table and dress it in five indexes',
              commands: [
                {
                  ps: `TRUNCATE bench_writes;
CREATE INDEX bw_id_idx ON bench_writes (id);
CREATE INDEX bw_username_idx ON bench_writes (username);
CREATE INDEX bw_score_idx ON bench_writes (score);
CREATE INDEX bw_status_idx ON bench_writes (status);
CREATE INDEX bw_created_at_idx ON bench_writes (created_at);
\\di bw_*`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  <code>\di bw_*</code> lists five indexes, all on an empty table — so the next insert pays
                  full maintenance on every row.
                </>
              ),
            },
            {
              title: 'Time the identical insert again (record as B), and compute the ratio',
              body: (
                <p>
                  Re-run the exact INSERT from step 2 (arrow-up in psql). Same rows, same heap — the only
                  difference is six structures per row instead of one.
                </p>
              ),
              commands: [
                {
                  ps: `INSERT INTO bench_writes
SELECT g, 'user_' || g, (g * 37) % 1000,
       CASE WHEN g % 20 = 0 THEN 'inactive' ELSE 'active' END,
       timestamp '2026-01-01' + make_interval(secs => g)
FROM generate_series(1, 500000) AS g;`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  <code>INSERT 0 500000</code> again, with a much larger <code>Time:</code>.{' '}
                  <strong>Record it as B, then compute B divided by A in your notebook.</strong> Expect
                  roughly 2x to 6x depending on hardware. That multiple is five indexes’ tax on one batch.
                </>
              ),
            },
            {
              title: 'Price the storage',
              commands: [
                {
                  ps: `SELECT pg_size_pretty(pg_relation_size('bench_writes')) AS heap_size,
       pg_size_pretty(pg_indexes_size('bench_writes')) AS index_size;`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  Index bytes are the same order as heap bytes — five indexes routinely rival the table
                  itself. Storage is the third corner of the budget triangle, in pg_size_pretty print.
                </>
              ),
            },
            {
              title: 'Read the usage ledger and drop the dead weight',
              body: (
                <p>
                  First, prove <code>bw_status_idx</code> is unusable-by-design: even queried directly on
                  its own column, the planner refuses it. Then exercise two indexes so their counters tick,
                  read the ledger, and drop a zero-scan index.
                </p>
              ),
              commands: [
                {
                  ps: `EXPLAIN ANALYZE SELECT count(*) FROM bench_writes WHERE status = 'active';
SELECT count(*) FROM bench_writes WHERE id = 250000;
SELECT count(*) FROM bench_writes WHERE username = 'user_250000';
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE relname = 'bench_writes'
ORDER BY idx_scan DESC;
DROP INDEX bw_status_idx;`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  The status query seq-scans (index refused at 95% selectivity). The ledger shows{' '}
                  <code>bw_id_idx</code> and <code>bw_username_idx</code> with <code>idx_scan</code> of 1 or
                  more and the rest at 0 (counters can lag a second — re-run the SELECT if needed). One
                  zero-scan index dropped: write tax reduced by one-sixth with a one-line statement, and you
                  know exactly why it was safe <em>here</em> — and what evidence the same call needs in
                  production.
                </>
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
              q: 'A table has 5 indexes. What does one INSERT actually write?',
              options: [
                'The heap row only — indexes update in the background',
                'The heap row plus an entry in each of the 5 indexes, synchronously, all WAL-logged',
                'The heap row plus entries only in indexes whose columns are non-null',
                'Nothing extra unless the transaction commits twice',
              ],
              answer: 1,
              explain:
                'Index maintenance is synchronous and transactional — the insert is not durable until heap AND all index changes are logged. Background maintenance is the LSM/compaction philosophy, which is a different engine design (Phase 8).',
            },
            {
              q: 'Why is UUIDv4 as an indexed primary key painful at scale, and what fixes it?',
              options: [
                'UUIDs are too long to index; fix by hashing them',
                'Random keys spray inserts across all leaves — cache misses and splits everywhere; fix with time-ordered ids (UUIDv7/ULID)',
                'UUIDs collide often; fix with sequences',
                'Postgres cannot index UUID columns; fix by storing text',
              ],
              answer: 1,
              explain:
                'The problem is the distribution, not the datatype: monotonic keys append at one hot right edge, random keys make the whole index the working set (~70% page occupancy, splits everywhere). Time-prefixed ids keep UUID-scale uniqueness with append-like locality.',
            },
            {
              q: 'How do you identify indexes that are safe candidates for dropping?',
              options: [
                'Any index over a year old',
                'idx_scan = 0 in pg_stat_user_indexes over a representative window, checked on replicas too, excluding constraint-enforcing indexes',
                'Any index larger than its table',
                'Indexes the last EXPLAIN you ran did not mention',
              ],
              answer: 1,
              explain:
                'The usage counters are the ledger — but the window must cover periodic jobs, replicas keep separate counters, and unique indexes earn their keep at zero scans by enforcing constraints. One EXPLAIN proves only that one query’s plan.',
            },
            {
              q: 'Your app updates users.last_seen_at on every request. A teammate adds an index on last_seen_at. What happens to write cost?',
              options: [
                'Only that index gets extra maintenance — minor',
                'Nothing, since UPDATE does not touch indexes',
                'It hurts twice: that index churns on every update, and updates lose HOT eligibility, so ALL the table’s indexes now need maintenance',
                'Write cost drops because lookups are faster',
              ],
              answer: 2,
              explain:
                'HOT lets updates that change no indexed column skip all index maintenance. Indexing a constantly-changing column both adds a churning index and disqualifies those updates from HOT — the double penalty that makes “index the hot column” one of DDL’s most expensive one-liners.',
            },
            {
              q: 'Why do columnar warehouses like Snowflake and BigQuery not offer CREATE INDEX?',
              options: [
                'Their vendors have not implemented it yet',
                'Analytical queries touch too many rows for per-row lookups to win; block-level min/max zone maps prune scans instead, and bulk ingest stays cheap without per-row tree maintenance',
                'B-trees cannot be built on compressed data',
                'They index every column automatically',
              ],
              answer: 1,
              explain:
                'It is a workload decision, not a missing feature: scans over compressed columns plus zone-map pruning fit OLAP physics, and skipping per-row index maintenance keeps loading at disk speed. Their “index” is data layout — clustering and sort keys.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Inserts on a hot table got 3x slower over six months. Walk me through your investigation.',
            a: (
              <p>
                Check what changed and what accumulated: index count on the table (migrations add, nobody
                drops), pg_stat_user_indexes for zero-scan indexes to eliminate, the HOT ratio
                (n_tup_hot_upd/n_tup_upd) if updates dominate, index bloat on churny indexes, and key
                distribution (did someone switch to UUIDv4?). A strong answer proposes measuring insert
                latency against a copy of the table with suspect indexes dropped — turning the debate into a
                number, exactly like this module’s lab.
              </p>
            ),
          },
          {
            q: 'When would you deliberately drop an index that queries do use?',
            a: (
              <p>
                When the arithmetic says so: an index used by a weekly report but taxing millions of daily
                writes can cost more than it returns — run the report as a scan (or in the warehouse) and
                free the write path. Also during bulk loads (drop, load, rebuild) and when a wider composite
                subsumes it as a prefix. The principle interviewers reward: indexes are a budget allocation,
                not an achievement.
              </p>
            ),
          },
          {
            q: 'Contrast how B-trees, LSM trees, and columnar zone maps pay for writes.',
            a: (
              <p>
                B-trees pay at write time, per row, with random I/O, to keep reads logarithmic. LSM trees
                defer: sequential memtable flushes now, background compaction later, slightly costlier reads
                (multiple runs, Bloom filters). Zone-mapped columnar barely pays per row at all — block-level
                min/max computed once on bulk append — and reads are scans that prune blocks. Three points on
                one read/write trade-off curve; the workload picks the point.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>
            Every index adds a synchronous, WAL-logged write to every INSERT and to every non-HOT UPDATE —
            write amplification of roughly 1 + k structures per row, with the index writes being the random
            kind.
          </>,
          <>
            Your lab ratio (B/A on 500k rows, 0 vs 5 indexes) is the tax made visible — and index storage
            routinely rivals the heap itself.
          </>,
          <>
            Audit the ledger: pg_stat_user_indexes.idx_scan over a representative window (replicas included)
            finds indexes that charge forever and serve never. Low-selectivity indexes are the classic
            zero-scan tenants.
          </>,
          <>
            HOT means updates touching no indexed column skip all index maintenance — so indexing a
            frequently-updated column hurts twice. Random keys (UUIDv4) poison B-tree locality; UUIDv7/ULID
            restore it.
          </>,
          <>For bulk loads: drop secondary indexes, load, rebuild — one sorted build beats n random descents.</>,
          <>
            Analytical engines skip B-trees on purpose: columnar blocks with min/max zone maps prune scans,
            and layout (sorting, clustering) does the index’s job — module 2.3 and Parquet’s row-group stats
            pick this thread up.
          </>,
        ]}
      />
    </>
  )
}
