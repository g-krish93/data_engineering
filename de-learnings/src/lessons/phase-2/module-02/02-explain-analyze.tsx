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

const ID = '2.2.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="EXPLAIN: how you stop guessing why a query is slow">
        <Tiered
          layman={
            <>
              <p>
                Your GPS shows a <em>route preview</em>: highway, 42 minutes — a prediction from map data; nothing
                has been driven. After the trip you have the <em>trip log</em>: the highway was jammed, the detour
                took 25 minutes, total 67. Prediction beside reality shows exactly where the plan went wrong.
              </p>
              <p>
                Databases keep both documents. <code>EXPLAIN</code> is the preview: “how I intend to run your query,
                and my cost estimate”. <code>EXPLAIN ANALYZE</code> actually drives the route and prints the log:
                what ran, how long each step took, how many rows really appeared. Slow-query debugging is reading the
                two and spotting where they disagree.
              </p>
            </>
          }
          student={
            <>
              <p>
                One crucial difference. <code>EXPLAIN query</code> asks the <strong>planner</strong> for its chosen
                plan plus cost <em>estimates</em> — nothing executes, always safe. <code>EXPLAIN ANALYZE</code>{' '}
                <strong>actually runs the query</strong>, then annotates each node with measured time, actual rows,
                and loop counts. “Actually runs” has teeth: EXPLAIN ANALYZE on a DELETE deletes. Habit from day one:{' '}
                <code>BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;</code> — module 2.1’s transactions, earning their keep.
              </p>
              <p>
                Why a “plan” exists: SQL is declarative — you state <em>what</em>, the planner picks <em>how</em>{' '}
                (scan vs index descent, hash vs loop join, sort vs ride an index’s order) using cost estimates built
                from table statistics. When a query is slow, the cause lives in that choice, and EXPLAIN is the only
                window into it — guessing without reading the plan is how people ship indexes that do nothing.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The estimates are checkable arithmetic: <code>seq_page_cost = 1.0</code>,{' '}
                <code>random_page_cost = 4.0</code>, <code>cpu_tuple_cost = 0.01</code>, plus operator costs. A seq
                scan of P pages and N rows costs about P + 0.01·N; an index scan pays random-page prices per fetched
                heap page — why it only wins at high selectivity. The 4:1 ratio is a spinning-disk relic; on SSDs
                practitioners drop <code>random_page_cost</code> toward 1.1 and the planner’s index appetite grows.
                Costs are unitless and comparative, not milliseconds.
              </p>
              <p>
                Row estimates come from per-column statistics gathered by <code>ANALYZE</code>: an MCV list (most
                common values with frequencies), an equi-depth histogram, and <code>n_distinct</code> — inspect them
                in <code>pg_stats</code>. How those statistics turn into estimates, and how the arithmetic fails on
                correlated columns, is this lesson’s third section.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The plan tree, read bottom-up — and its resident nodes">
        <CodeRunner
          language="sql"
          label="EXPLAIN a filter + aggregate (DuckDB)"
          setup={`CREATE OR REPLACE TABLE events AS
SELECT (range * 7) % 500 AS user_id,
       CASE WHEN range % 4 = 2 THEN 'purchase' ELSE 'view' END AS kind
FROM range(2000);`}
          code={`EXPLAIN
SELECT kind, count(*) AS n
FROM events
WHERE user_id = 42
GROUP BY kind;

-- Read bottom-up: SEQ_SCAN on events at the bottom (the user_id
-- filter is pushed into it), HASH_GROUP_BY above. Edit me: change
-- EXPLAIN to EXPLAIN ANALYZE to execute and get real timings.`}
        />
        <Callout kind="info" title="Two dialects, one skill">
          DuckDB prints operators like <code>SEQ_SCAN</code> in an ASCII tree (the result cell may fold the box art —
          scan for operator names); Postgres prints an indented outline with cost numbers. Same tree, same bottom-up
          reading. DuckDB is an <GlossaryTerm k="olap">OLAP</GlossaryTerm> engine whose planner won’t mimic
          Postgres’s choices — treat it as your always-available plan playground; the lab is the Postgres version.
        </Callout>
        <Tiered
          layman={
            <>
              <p>
                A plan is an assembly line read from the loading dock up: a scan pulls raw rows off disk, each
                station transforms what the one below hands it, the product exits at the top. Every station’s
                clipboard shows items <em>expected</em> vs (with ANALYZE) items that <em>actually</em> came — a
                station expecting 10 boxes that receives 100,000 explains the long shift.
              </p>
              <p>
                The workers have fixed habits. <em>Seq Scan</em> reads the entire shelf. <em>Index Scan</em> checks
                the catalog card, then walks to each shelf spot it names; <em>Index Only Scan</em> answers straight
                from the card. <em>Bitmap scan</em> lists needed positions first, sorts them, walks the aisles once.{' '}
                <em>Sort</em> hands over nothing until everything is arranged. <em>Nested Loop</em> rummages one pile
                per row of the other; <em>Hash Join</em> builds a tray from the small pile and streams the big one
                past it.
              </p>
            </>
          }
          student={
            <>
              <p>
                Each Postgres node line carries <code>cost=startup..total rows=estimate width=bytes</code>; ANALYZE
                adds <code>actual time=... rows=N loops=L</code>. Startup is the price before the first row (a Sort
                pays nearly all up front, a Seq Scan almost none); multiply per-row time by <code>loops</code> — a
                0.1 ms node at 50,000 loops is your five seconds. The bestiary to recognize on sight:
              </p>
              <ul>
                <li>
                  <strong>Seq Scan</strong> — whole heap; right for small tables and loose predicates. A smell only
                  when few rows survive an available index.
                </li>
                <li><strong>Index Scan</strong> — descent per key, then a random heap fetch per row; wins at high selectivity.</li>
                <li><strong>Index Only Scan</strong> — all needed columns in the index; heap skipped, mostly (PhD wrinkle).</li>
                <li>
                  <strong>Bitmap Index + Bitmap Heap Scan</strong> — gather matching positions into a bitmap, sweep
                  the heap in physical order; the middle gear.
                </li>
                <li>
                  <strong>Sort</strong> — materializes and orders input (spills past <code>work_mem</code>); often
                  the node an index deletes (2.2.3).
                </li>
                <li>
                  <strong>Hash Join / Nested Loop / Gather</strong> — recognize which ran and whether the row
                  estimates feeding it look sane; join internals arrive in Phase 4. Gather = parallel workers ran
                  the subtree.
                </li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                Execution is the classic <strong>Volcano iterator model</strong>: operators implement
                open/next/close; each <code>next()</code> pulls one tuple from children on demand — a lazy pull
                pipeline of pipelining operators (Filter, Nested Loop) and materializing ones (Sort, Hash), exactly
                what the startup-cost column encodes. Volcano’s per-tuple virtual-call overhead is why vectorized
                push-based engines (DuckDB’s ~2048-value batches, MonetDB/X100 heritage) demolish row-at-a-time
                engines on scans — you build a toy one in Phase 8, P8b.
              </p>
              <p>
                Two node subtleties. The bitmap pair is a cost-crossover invention: k random heap fetches and P
                sequential pages are both bad at mid selectivity, so Postgres gathers TIDs, sorts them into physical
                order, and visits each needed page once — random I/O converted to ordered I/O (past{' '}
                <code>work_mem</code> it goes page-granular and rechecks predicates). And Index Only Scans still
                consult the <em>visibility map</em>: pages not all-visible force heap fetches, reported as{' '}
                <code>Heap Fetches: N</code> — read that line before celebrating; VACUUM resets it.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          label="EXPLAIN a join (DuckDB)"
          setup={`CREATE OR REPLACE TABLE events AS
SELECT (range * 7) % 500 AS user_id,
       CASE WHEN range % 4 = 2 THEN 'purchase' ELSE 'view' END AS kind
FROM range(2000);
CREATE OR REPLACE TABLE app_users AS
SELECT range AS user_id, 'u_' || range AS name FROM range(500);`}
          code={`EXPLAIN
SELECT u.name, count(*) AS purchases
FROM events e
JOIN app_users u ON u.user_id = e.user_id
WHERE e.kind = 'purchase'
GROUP BY u.name;

-- Spot: two SEQ_SCAN leaves, a HASH_JOIN combining them,
-- HASH_GROUP_BY on top. The kind filter rides inside the scan.`}
        />
      </Section>

      <Section kicker="core concepts" title="Estimates vs reality — and when the planner ignores your index">
        <Tiered
          layman={
            <>
              <p>
                The GPS said 12 minutes; the drive took 55. The roads didn’t lie — the <em>map data</em> was stale.
                Plans fail the same way: the planner predicted “about 10 rows” and chose a delicate per-row strategy;
                800,000 matched and the delicate strategy ran 80,000 times. Perfectly rational — for a world that
                didn’t exist.
              </p>
              <p>
                And sometimes ignoring your shiny index is not an error: if a query wants half the phone book,
                flipping to the index for every entry is slower than reading front to back. The skill is telling the
                smart refusal from the misinformed one.
              </p>
            </>
          }
          student={
            <>
              <p>
                The number-one smell: <code>rows=10</code> estimated, <code>rows=812000</code> actual — everything
                above that node was decided on the wrong number. First response is always{' '}
                <code>ANALYZE tablename</code>: autovacuum usually keeps stats fresh, but a bulk load can leave them
                describing a table that no longer exists. Three legitimate reasons “my index isn’t used”:
              </p>
              <ul>
                <li>
                  <strong>Low selectivity</strong> — the predicate matches a big fraction; per-row random heap hops
                  lose to one sequential pass. The planner is right; the lab proves it.
                </li>
                <li>
                  <strong>A function wraps the column</strong> — <code>WHERE upper(email) = ...</code> cannot descend
                  an index on <code>email</code>; the tree sorts raw values. Fix: rewrite the predicate, or build an
                  expression index on <code>upper(email)</code>. Same trap: type mismatches forcing casts.
                </li>
                <li>
                  <strong>Stale statistics</strong> — the planner believes the table is tiny or the value rare.{' '}
                  <code>ANALYZE</code>, re-EXPLAIN.
                </li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                Estimation mechanics: equality against an MCV member uses its measured frequency — accurate.
                Equality against a non-MCV value gets (1 − MCV mass) / (n_distinct − MCV count), a uniformity guess.
                Ranges interpolate histogram buckets (<code>default_statistics_target</code>, default 100, sets
                resolution); join sizes use containment assumptions over distinct counts. Every one is a model, and
                every model has a 2 a.m. failure story.
              </p>
              <p>
                The deepest failure is independence across correlated columns — city/zip multiplied to
                one-in-a-million when the truth is 1/1000 — cascading into nested-loop choices that run six orders of
                magnitude long. <code>CREATE STATISTICS</code> (functional dependencies, multivariate n-distinct and
                MCVs) patches declared combinations. Also load-bearing:{' '}
                <code>pg_stat_user_tables.last_analyze</code> — check it before trusting any estimate on a
                recently-loaded table.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Trust the optimizer, hint it, or rewrite around it?">
        <Tradeoffs
          options={[
            {
              name: 'Trust the planner, fix its inputs (Postgres orthodoxy)',
              strengths: [
                'Plans adapt as data grows and skews — no fossilized decisions in code',
                'The fix loop — refresh stats, add the right index, unwrap functions, reshape the query — removes causes, and the knowledge ports to every engine',
              ],
              weaknesses: [
                'Estimation failures (correlation, exotic predicates) can defeat it',
                'Slower loop: diagnose, hypothesize, verify with EXPLAIN each time; regressions after upgrades arrive unannounced',
              ],
              chooseWhen: 'almost always — the lab is literally this loop, and Postgres enforces it by shipping no hint syntax.',
            },
            {
              name: 'Hint the planner (Oracle / SQL Server / MySQL; pg_hint_plan extension)',
              strengths: ['Surgical, immediate control when you provably know better', 'Can pin a known-good plan during an incident'],
              weaknesses: [
                'Hints fossilize: optimal today, absurd at 10x the data, never deleted',
                'Physical decisions scattered through app SQL; non-standard extension territory in Postgres',
              ],
              chooseWhen: 'an emergency demands a pinned plan now, with a ticket to remove it later.',
            },
          ]}
          note={
            <>
              Postgres has refused hints for decades: they paper over planner bugs and rot silently. Session knobs
              like <code>enable_seqscan = off</code> exist for <em>diagnosis</em> — forcing the road not taken to
              compare costs — never for production.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: five plans on a million rows">
        <Lab
          lessonId={ID}
          intro={
            <p>
              EXPLAIN ANALYZE five queries against <code>bench_users</code> (lesson 2.2.1) and log one specimen of
              each scan type — write down the scan node name per query. Connect: <code>docker start pg-lab</code>,
              then <code>docker exec -it pg-lab psql -U postgres</code>.
            </p>
          }
          steps={[
            {
              title: 'Verify the specimen, then Query 1 — the sequential scan',
              commands: [
                {
                  ps: `SELECT count(*) FROM bench_users;
EXPLAIN ANALYZE
SELECT count(*) FROM bench_users WHERE score = 500;`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  Count is 1,000,000 (missing? re-run 2.2.1 lab steps 2 and 4). The plan shows{' '}
                  <code>Seq Scan on bench_users</code> — likely <code>Parallel Seq Scan</code> under{' '}
                  <code>Gather</code> — with <code>Rows Removed by Filter</code> near 999,000: no index on{' '}
                  <code>score</code>, no choice. Estimated rows on the scan ≈ actual (~1000).
                </>
              ),
            },
            {
              title: 'Queries 2 and 3 — the index scan, then the index-only scan',
              body: (
                <p>
                  Query 3 selects <em>only</em> the indexed column, making the heap unnecessary — provided the
                  visibility map is fresh, which the VACUUM guarantees.
                </p>
              ),
              commands: [
                {
                  ps: `EXPLAIN ANALYZE SELECT * FROM bench_users WHERE id = 654321;
VACUUM bench_users;
EXPLAIN ANALYZE SELECT id FROM bench_users WHERE id BETWEEN 100000 AND 101000;`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  Query 2: <code>Index Scan using bench_users_id_idx</code>, <code>rows=1</code>, sub-millisecond —
                  the cost gap to Query 1 is 2.2.1’s 1000x, priced in advance. Query 3:{' '}
                  <code>Index Only Scan</code> with <code>Heap Fetches: 0</code> — the zero is the win, not the node
                  name; a big count means the vacuum didn’t take.
                </>
              ),
            },
            {
              title: 'Query 4 — the planner rightly refuses an index',
              commands: [
                {
                  ps: `CREATE INDEX bench_users_status_idx ON bench_users (status);
ANALYZE bench_users;
EXPLAIN ANALYZE SELECT count(*) FROM bench_users WHERE status = 'active';
EXPLAIN ANALYZE SELECT * FROM bench_users WHERE status = 'inactive';
SELECT attname, most_common_vals, most_common_freqs
FROM pg_stats WHERE tablename = 'bench_users' AND attname = 'status';`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  The 95% slice (<code>'active'</code>) seq-scans <em>despite the index</em>; the 5% slice shows{' '}
                  <code>Bitmap Heap Scan</code> fed by <code>Bitmap Index Scan</code>; pg_stats shows the 0.95 /
                  0.05 frequencies behind both choices.
                </>
              ),
            },
            {
              title: 'Query 5 — the function that breaks the index, and the fix',
              body: (
                <p>
                  The tree sorts raw values, so a predicate on <code>upper(username)</code> cannot descend an index
                  on <code>username</code>. An <strong>expression index</strong> over the function’s output restores
                  the descent.
                </p>
              ),
              commands: [
                {
                  ps: `EXPLAIN ANALYZE
SELECT * FROM bench_users WHERE upper(username) = 'USER_654321';
CREATE INDEX bench_users_upper_username_idx ON bench_users (upper(username));
ANALYZE bench_users;
EXPLAIN ANALYZE
SELECT * FROM bench_users WHERE upper(username) = 'USER_654321';`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  Before: Seq Scan over a million rows for one. After:{' '}
                  <code>Index Scan using bench_users_upper_username_idx</code>, sub-millisecond — same query text,
                  ~1000x apart. Your log now holds all five specimens.
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
              q: 'What is the operational difference between EXPLAIN and EXPLAIN ANALYZE?',
              options: [
                'EXPLAIN ANALYZE adds cost estimates; EXPLAIN does not',
                'EXPLAIN ANALYZE actually executes the query and reports measured times and rows',
                'EXPLAIN works only on SELECT statements',
                'They differ only in output format',
              ],
              answer: 1,
              explain:
                'Both print the plan; ANALYZE runs it for real — on a DELETE it deletes. Wrap writes in BEGIN ... ROLLBACK.',
            },
            {
              q: 'Where do you start reading a Postgres plan?',
              options: [
                'Top line — it executes first',
                'The line with the highest cost',
                'The deepest indented nodes — leaves execute first and feed rows upward',
                'The Sort node, if any',
              ],
              answer: 2,
              explain: 'Scans at the leaves produce rows that flow up through the tree; the top line runs last.',
            },
            {
              q: 'A scan node shows rows=12 estimated but rows=900000 actual. Best first move?',
              options: [
                'Add an index on the filtered column',
                'Increase work_mem',
                'Run ANALYZE on the table and re-check the plan',
                'Rewrite the query as a subquery',
              ],
              answer: 2,
              explain:
                'A 75,000x misestimate means stale or missing statistics — every decision above inherited the error. Refresh stats first, judge after.',
            },
            {
              q: "An index exists on status, yet WHERE status = 'active' (95% of rows) seq-scans. Why?",
              options: [
                'The index is corrupted and needs REINDEX',
                'Fetching 95% of rows via index means massive random I/O — one sequential pass is cheaper',
                'Postgres cannot use indexes on text columns',
                'The table is too large for index scans',
              ],
              answer: 1,
              explain:
                'Index scans pay a random heap fetch per matching row; at high match fractions one sequential pass wins. The refusal is the optimizer being right.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'A production query got slow overnight. Walk me through your diagnosis.',
            a: (
              <p>
                Capture the real plan: EXPLAIN ANALYZE, transaction-wrapped if it writes. Read bottom-up, compare
                estimated vs actual rows per node, find the first big divergence. Stale stats after a load — ANALYZE
                and re-check. Wrong scan choice — check selectivity and predicate index-compatibility (no wrapped
                columns or cast mismatches). Strong candidates note “overnight” means something changed: data volume,
                statistics, or a plan flip at a cost boundary.
              </p>
            ),
          },
          {
            q: 'When is a sequential scan the RIGHT plan?',
            a: (
              <p>
                Low-selectivity predicates (random index hops lose to one sequential pass), small tables (one or two
                pages), and full-table aggregates. The reflex “Seq Scan = missing index” marks a junior; reading row
                counts before judging marks a senior.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>
            EXPLAIN shows the intended plan with estimates; EXPLAIN ANALYZE executes and shows reality — wrap
            destructive statements in BEGIN ... ROLLBACK.
          </>,
          <>
            Plans are trees read bottom-up. Node recognition is the skill: Seq Scan, Index Scan, Index Only Scan
            (watch Heap Fetches), the Bitmap pair, Sort, Hash Join, Nested Loop, Gather.
          </>,
          <>
            Estimated-vs-actual rows is the number-one diagnostic; big gaps mean bad statistics — ANALYZE first,
            judge second.
          </>,
          <>
            An ignored index is usually correct (low selectivity) or your fault (function-wrapped column — fix with
            an expression index). Postgres ships no hints by design: fix stats, indexes, and query shape instead.
          </>,
        ]}
      />
    </>
  )
}
