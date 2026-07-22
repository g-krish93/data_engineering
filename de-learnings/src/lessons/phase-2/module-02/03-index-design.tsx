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

const ID = '2.2.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Indexes are designed for workloads, not tables">
        <Tiered
          layman={
            <>
              <p>
                Picture a filing cabinet of patient folders sorted by <em>last name, then first name</em>.
                “Find Smith, John” — fly to the S drawer, then to Smith, then John sits right inside the
                Smith block. “Find every Smith” — same drawer, one contiguous run of folders. Now: “find
                every John, any last name”. The cabinet is useless. Johns are sprinkled through every drawer,
                and you are back to checking every folder — the sort order you chose decided, permanently,
                which questions are fast.
              </p>
              <p>
                That is the entire discipline of index design in one cabinet. An index is a sort order, a
                sort order privileges certain questions, and <em>you</em> pick the order. Good designers
                start from the questions the application actually asks, then choose the fewest sort orders
                that cover them — because every extra cabinet must be refiled on every change (next lesson’s
                bill).
              </p>
            </>
          }
          student={
            <>
              <p>
                A <strong>composite index</strong> indexes multiple columns as one sorted structure:{' '}
                <code>CREATE INDEX ON t (a, b)</code> sorts by <code>a</code>, ties broken by <code>b</code>{' '}
                — exactly lastname-then-firstname. The rule that governs everything you do with them is the{' '}
                <strong>leftmost-prefix rule</strong>: the index serves predicates that constrain a{' '}
                <em>prefix</em> of its column list. <code>(a, b)</code> accelerates <code>a = ?</code>, and{' '}
                <code>a = ? AND b = ?</code>, and <code>a = ? AND b BETWEEN ? AND ?</code> — but does
                nothing for <code>b = ?</code> alone. If one fact from this module shows up in your
                interviews, it is this one.
              </p>
              <p>
                This lesson stacks five tools on that foundation: column ordering (equality columns first,
                range column last), covering indexes (<code>INCLUDE</code>) that feed index-only scans,
                partial indexes for hot subsets, expression indexes (you met one in 2.2.2), and index order
                serving <code>ORDER BY</code> so Sort nodes vanish. The lab then hands you a six-query
                workload and a budget of three indexes.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The clean mental model: a composite index on (a, b, c) is the set of tuples ordered{' '}
                <em>lexicographically</em> — dictionary order over column vectors. Every leftmost-prefix
                predicate describes a <em>contiguous interval</em> in that order: a = 5 is one run; a = 5 AND
                b = 2 is a sub-run inside it; a = 5 AND b in a range is still one run. A predicate on b alone
                describes one small run <em>per distinct value of a</em> — scattered fragments, not an
                interval, which is why the B-tree cannot descend to it. Contiguity in the sort order is the
                whole game; everything else in this lesson is corollary.
              </p>
              <p>
                Two refinements worth knowing exist before you need them: some engines implement{' '}
                <em>skip scan</em> (jump between the per-a fragments when a has few distinct values — Oracle
                for years; Postgres grew a version of it in v18), useful but never a substitute for correct
                column order. And when no single composite fits, Postgres can AND together multiple
                single-column indexes at runtime via <code>BitmapAnd</code> — combining bitmaps from separate
                index scans before touching the heap. It is real, it works, and it is roughly 2–5x worse than
                the right composite because each index is scanned in full for its predicate.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The leftmost-prefix rule, made visible">
        <p>
          Watch contiguity directly. The table below is a phone book sorted by (last_name, first_name), and{' '}
          <code>slot</code> is each row’s position in that sort order. For each query: if{' '}
          <code>span = matches</code>, the hits form one contiguous block — the index serves it with one
          descent. If <code>span</code> dwarfs <code>matches</code>, the hits are scattered fragments.
        </p>
        <CodeRunner
          language="sql"
          label="contiguous block vs scattered fragments"
          setup={`CREATE OR REPLACE TABLE phonebook AS
SELECT last_name, first_name,
       row_number() OVER (ORDER BY last_name, first_name) AS slot
FROM (
  SELECT l.ln AS last_name, f.fn AS first_name
  FROM (VALUES ('Adams'),('Baker'),('Chen'),('Diaz'),('Evans'),
               ('Ford'),('Garcia'),('Hall'),('Ibrahim'),('Jones')) AS l(ln)
  CROSS JOIN (VALUES ('Ana'),('Ben'),('Carla'),('David'),('Elena'),('John')) AS f(fn)
);`}
          code={`SELECT 'last = Garcia (prefix)' AS query,
       count(*) AS matches,
       max(slot) - min(slot) + 1 AS span
FROM phonebook WHERE last_name = 'Garcia'
UNION ALL
SELECT 'last = Garcia AND first Ben..Elena (prefix + range)',
       count(*), max(slot) - min(slot) + 1
FROM phonebook
WHERE last_name = 'Garcia' AND first_name BETWEEN 'Ben' AND 'Elena'
UNION ALL
SELECT 'first = John (NOT a prefix)',
       count(*), max(slot) - min(slot) + 1
FROM phonebook WHERE first_name = 'John';

-- span = matches  ->  one contiguous block: the index serves it.
-- span >> matches ->  fragments all over the tree: it cannot.`}
        />
        <Callout kind="warn" title="DuckDB here is a whiteboard, not a Postgres simulator">
          The runner demonstrates the <em>logic</em> of sorted composite order — DuckDB itself is a scanning
          analytics engine and will happily ignore B-tree-style indexes where Postgres would use them. Every
          claim about what an index “serves” gets verified against real Postgres plans in the lab. Do not
          benchmark index behavior in the browser.
        </Callout>
        <Tiered
          layman={
            <>
              <p>
                The first two queries land in one solid block of the cabinet: all Garcias sit together, and
                within the Garcias, Ben-through-Elena sit together. The third query’s ten Johns are spread
                across a span of fifty-five slots — one John per last name, everywhere. No amount of
                cleverness makes the cabinet answer that one; you would need a <em>second</em> cabinet sorted
                by first name.
              </p>
              <p>
                The ordering rule falls out of the same picture. Put the columns you match <em>exactly</em>{' '}
                in front, and the column you match as a <em>range</em> last: exact matches keep narrowing to
                one block; a range in the middle would smear everything after it back into fragments.
              </p>
            </>
          }
          student={
            <>
              <p>
                Memorize the service list for an index on (a, b): serves <code>a =</code>; serves{' '}
                <code>a =, b =</code>; serves <code>a =, b range</code>; serves <code>a range</code> (on the
                a-prefix alone); does <em>not</em> serve <code>b =</code> alone; and once a range is applied
                to <code>a</code>, the <code>b</code> part degrades to a filter, because b’s order restarts
                inside every distinct a. Hence the design rule: <strong>equality columns first, the range
                column last</strong>. For{' '}
                <code>WHERE status = ? AND created_at BETWEEN ? AND ?</code> you want (status, created_at) —
                (created_at, status) leaves status as a row-by-row filter over the whole date range.
              </p>
              <p>
                Column order also decides what ORDER BY rides free: (status, score) emits rows already
                sorted by score <em>within</em> a fixed status, so{' '}
                <code>WHERE status = ? ORDER BY score LIMIT 10</code> streams the first ten entries of a
                block and stops — no Sort node, no reading the rest. When you cannot decide an order, ask
                “which column do I always pin exactly?” — that one goes first.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Why equality-first is optimal, in interval terms: each leading equality predicate composes
                selectivities multiplicatively while preserving a single contiguous interval. The first range
                predicate consumes the remaining order — everything to its right contributes nothing to
                navigation, only to in-index filtering (still cheaper than heap filtering, but no longer
                logarithmic). So the canonical order is: equality columns (most selective first among equals,
                though prefix-serviceability usually dominates that micro-choice), then the single most
                useful range/sort column, then any INCLUDE payload.
              </p>
              <p>
                On index intersection: <code>BitmapAnd</code> over single-column indexes computes the
                conjunction in TID space — each index scanned for its full single-predicate result, bitmaps
                intersected, heap visited once. Costs scale with the <em>looser</em> predicates’ match counts,
                not the conjunction’s, and output order is lost (a Sort may reappear). It is the planner’s
                patch for missing composites, and seeing BitmapAnd in a hot query’s plan is a standing
                invitation to build the composite it is simulating.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The specialists: covering, partial, expression, unique">
        <Tiered
          layman={
            <>
              <p>
                Four specialty cabinets. A <em>covering</em> cabinet staples a photocopy of the two facts you
                always need onto the catalog card itself, so you answer from the card and never walk to the
                shelf. A <em>partial</em> cabinet files only the folders you actually search — say, just the
                open cases, one drawer instead of forty. An <em>expression</em> cabinet files folders under a
                computed label (everyone’s name pre-uppercased) so a computed question finds them. A{' '}
                <em>unique</em> cabinet refuses to accept a second folder with the same label — it is not a
                speed tool but a rule-enforcement tool.
              </p>
              <p>
                Each specialist is smaller or faster than a general cabinet for its one job — and useless
                outside it. That is the pattern with all of these: sharper blade, narrower cut.
              </p>
            </>
          }
          student={
            <>
              <ul>
                <li>
                  <strong>Covering (INCLUDE).</strong>{' '}
                  <code>CREATE INDEX ON t (a) INCLUDE (b, c)</code> stores b and c in leaf entries as
                  payload — not part of the sort key, just along for the ride. A query touching only a, b, c
                  becomes an Index Only Scan: zero heap visits (visibility map permitting — 2.2.2). Key
                  columns navigate; INCLUDE columns feed.
                </li>
                <li>
                  <strong>Partial (WHERE).</strong>{' '}
                  <code>CREATE INDEX ON orders (created_at) WHERE status = 'pending'</code> indexes the hot
                  2% and ignores the archive. Tiny, cache-friendly, and writes to non-matching rows skip it
                  entirely. The query must repeat a predicate the planner can prove implies the index’s
                  WHERE.
                </li>
                <li>
                  <strong>Expression.</strong> <code>CREATE INDEX ON users (lower(email))</code> — the tree
                  sorts computed values, so <code>WHERE lower(email) = ?</code> descends it. The query
                  expression must match the indexed expression.
                </li>
                <li>
                  <strong>Unique.</strong> A UNIQUE constraint <em>is</em> a unique B-tree index — the index
                  is the enforcement mechanism (dupes are caught at insert time during the tree descent), and
                  every primary key is one. Part performance object, part{' '}
                  <GlossaryTerm k="schema">schema</GlossaryTerm> guarantee.
                </li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                INCLUDE exists because key-column bloat is real: adding payload columns to the <em>key</em>{' '}
                would fatten internal pages (which store separator keys), reducing fanout and deepening the
                tree; INCLUDE payload lives only in leaves, so routing stays fast. The index-only-scan payoff
                depends on the visibility map staying fresh — on update-heavy tables, monitor{' '}
                <code>Heap Fetches</code> before crediting the design. Partial-index matching is a theorem-prover
                problem: the planner must prove query-predicate implies index-predicate, and its prover is
                deliberately shallow (constant comparisons, boolean structure) — write the query’s WHERE to
                syntactically echo the index’s.
              </p>
              <p>
                Expression indexes store evaluated results, so the function must be IMMUTABLE — and they
                carry their own statistics, gathered on ANALYZE, which sometimes rescues estimation for
                skewed computed values. Ordering refinements: index columns accept ASC/DESC and NULLS
                FIRST/LAST; a forward index serves the exact-reverse ORDER BY via backward scan, but mixed
                directions (a ASC, b DESC) need the directions baked in. Uniqueness under MVCC is subtler
                than it looks — concurrent inserters of the same key serialize on the leaf page, one waiting
                to see whether the other commits; you get the guarantee without ever thinking about it,
                which is the point.
              </p>
            </>
          }
        />
        <p>
          One more visible payoff before the lab — an index whose order matches the query’s ORDER BY deletes
          the Sort node outright. DuckDB shows the node to delete:
        </p>
        <CodeRunner
          language="sql"
          label="the Sort node an index would delete (DuckDB)"
          setup={`CREATE OR REPLACE TABLE phonebook AS
SELECT last_name, first_name,
       row_number() OVER (ORDER BY last_name, first_name) AS slot
FROM (
  SELECT l.ln AS last_name, f.fn AS first_name
  FROM (VALUES ('Adams'),('Baker'),('Chen'),('Diaz'),('Evans'),
               ('Ford'),('Garcia'),('Hall'),('Ibrahim'),('Jones')) AS l(ln)
  CROSS JOIN (VALUES ('Ana'),('Ben'),('Carla'),('David'),('Elena'),('John')) AS f(fn)
);`}
          code={`EXPLAIN
SELECT first_name
FROM phonebook
WHERE last_name = 'Chen'
ORDER BY first_name;

-- Find ORDER_BY in the plan: a blocking sort of every surviving row.
-- In Postgres, an index on (last_name, first_name) already emits
-- Chen's rows sorted by first_name -- the Sort node simply vanishes,
-- and with LIMIT 10 the scan stops after ten entries.`}
        />
      </Section>

      <Section kicker="trade-offs" title="One wide composite, several narrow, or one index per query?">
        <Tradeoffs
          options={[
            {
              name: 'Few composites, deliberately designed',
              strengths: [
                'One (status, score) INCLUDE (id) can serve four or five distinct query shapes',
                'Fewest structures to maintain per write; least storage; simplest mental model',
              ],
              weaknesses: [
                'Requires actually knowing the workload — leftmost-prefix analysis takes thought',
                'A new query shape outside the prefixes may need a redesign, not a bolt-on',
              ],
              chooseWhen: 'you can enumerate the hot queries — the lab below trains exactly this.',
            },
            {
              name: 'Several narrow single-column indexes',
              strengths: [
                'Each obviously matches one predicate; no prefix reasoning required',
                'Planner can BitmapAnd them for ad-hoc predicate combinations',
              ],
              weaknesses: [
                'Intersection costs several scans plus bitmap work — typically 2–5x the right composite',
                'Never serves multi-column ORDER BY; write cost scales with index count',
              ],
              chooseWhen: 'exploratory workloads where predicate combinations are genuinely unpredictable.',
            },
            {
              name: 'An index per query (reflexive indexing)',
              strengths: [
                'Every read is individually optimal — briefly',
                'No workload analysis needed, which is why it happens',
              ],
              weaknesses: [
                'Write amplification stacks per index — the tax lesson 2.2.4 measures',
                'Redundant prefixes everywhere ((a), (a,b), (a,b,c) — the first two are dead weight)',
              ],
              chooseWhen: 'almost never — it is the default failure mode of teams that skip design.',
            },
          ]}
          note={
            <>
              The recurring redundancy to hunt: an index on (a) is a pure prefix of an index on (a, b) — the
              composite serves every query the narrow one serves. Drop the narrow one. On a busy{' '}
              <GlossaryTerm k="oltp">OLTP</GlossaryTerm> table, every surviving index must name the queries
              it exists for.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: six queries, three indexes">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Your application runs the six queries below against <code>bench_users</code> (from 2.2.1),
              constantly. Design the <strong>minimal</strong> index set — three or fewer — that leaves none
              of them on a plain Seq Scan, then prove it with EXPLAIN ANALYZE. Design on paper{' '}
              <em>before</em> touching the keyboard; the reveal comes after you commit. Connect as usual:{' '}
              <code>docker exec -it pg-lab psql -U postgres</code>.
            </p>
          }
          steps={[
            {
              title: 'Reset to a clean slate',
              body: (
                <p>
                  Drop lesson 2.2.2’s experiments so they cannot mask your design. Keep{' '}
                  <code>bench_users_id_idx</code> — pretend it is the primary key index every real table has.
                </p>
              ),
              commands: [
                {
                  ps: `DROP INDEX IF EXISTS bench_users_status_idx;
DROP INDEX IF EXISTS bench_users_upper_username_idx;
\\di bench_users*`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  <code>\di</code> lists exactly one index: <code>bench_users_id_idx</code>.
                </>
              ),
            },
            {
              title: 'Study the workload and commit to a design',
              body: (
                <>
                  <CodeBlock
                    label="the six queries"
                    code={`-- Q1: SELECT * FROM bench_users
--     WHERE status = 'inactive' AND score = 42;
-- Q2: SELECT * FROM bench_users
--     WHERE status = 'inactive' AND score BETWEEN 900 AND 950;
-- Q3: SELECT id, score FROM bench_users
--     WHERE status = 'inactive' ORDER BY score LIMIT 10;
-- Q4: SELECT id FROM bench_users
--     WHERE username = 'user_500000';
-- Q5: SELECT * FROM bench_users
--     WHERE created_at >= timestamp '2026-01-08'
--     ORDER BY created_at DESC LIMIT 20;
-- Q6: SELECT count(*) FROM bench_users
--     WHERE created_at BETWEEN timestamp '2026-01-05'
--                          AND timestamp '2026-01-06'
--       AND status = 'active';`}
                  />
                  <p>
                    For each query write down: equality columns, range columns, ORDER BY, and the columns it
                    outputs. Then group queries that could share one index via the leftmost-prefix rule.
                    Which column goes first, and why? Where would INCLUDE earn an index-only scan?
                  </p>
                </>
              ),
              checkpoint: (
                <>
                  You have written down at most three CREATE INDEX statements and, next to each, the list of
                  queries it serves. Not typed — written.
                </>
              ),
            },
            {
              title: 'Build your indexes and verify all six plans',
              body: (
                <p>
                  Create your indexes, <code>ANALYZE bench_users;</code>, then run each workload query under{' '}
                  <code>EXPLAIN ANALYZE</code>. Log the scan node per query. Index Scan, Index Only Scan, and
                  Bitmap scans all count as index-assisted; a plain Seq Scan on any query means the design
                  has a hole — reason about which prefix failed before peeking below.
                </p>
              ),
              commands: [
                {
                  ps: `-- your CREATE INDEX statements here
ANALYZE bench_users;
EXPLAIN ANALYZE SELECT * FROM bench_users WHERE status = 'inactive' AND score = 42;
EXPLAIN ANALYZE SELECT * FROM bench_users WHERE status = 'inactive' AND score BETWEEN 900 AND 950;
EXPLAIN ANALYZE SELECT id, score FROM bench_users WHERE status = 'inactive' ORDER BY score LIMIT 10;
EXPLAIN ANALYZE SELECT id FROM bench_users WHERE username = 'user_500000';
EXPLAIN ANALYZE SELECT * FROM bench_users WHERE created_at >= timestamp '2026-01-08' ORDER BY created_at DESC LIMIT 20;
EXPLAIN ANALYZE SELECT count(*) FROM bench_users WHERE created_at BETWEEN timestamp '2026-01-05' AND timestamp '2026-01-06' AND status = 'active';`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  All six plans show an index-assisted scan node, with three or fewer indexes beyond{' '}
                  <code>bench_users_id_idx</code>. Bonus checks: Q3 and Q5 show <strong>no Sort node</strong>{' '}
                  (the index order served the ORDER BY), and Q3 or Q4 achieved an Index Only Scan.
                </>
              ),
            },
            {
              title: 'Compare against the reference design',
              body: (
                <RevealSolution label="Reveal the three-index solution">
                  <CodeBlock
                    label="reference solution"
                    code={`CREATE INDEX bench_users_status_score_idx
  ON bench_users (status, score) INCLUDE (id);
CREATE INDEX bench_users_username_idx
  ON bench_users (username);
CREATE INDEX bench_users_created_at_idx
  ON bench_users (created_at);
ANALYZE bench_users;`}
                  />
                  <ul>
                    <li>
                      <strong>(status, score) INCLUDE (id) serves Q1, Q2, Q3.</strong> Equality column first,
                      range column second — Q1 pins both (one block), Q2 pins status and ranges score (still
                      one block). Q3 rides the order: within status = 'inactive', entries are already sorted
                      by score, so LIMIT 10 reads ten entries and stops — no Sort. INCLUDE (id) lets Q3
                      answer from the index alone. The reverse order (score, status) fails Q2 and Q3
                      outright.
                    </li>
                    <li>
                      <strong>(username) serves Q4.</strong> Nothing shares a prefix with a unique text
                      lookup. Since only <code>id</code> is output, INCLUDE (id) would buy an index-only
                      scan here too — a defensible fourth tweak, not a fourth index.
                    </li>
                    <li>
                      <strong>(created_at) serves Q5 and Q6.</strong> Q5 walks the index backward for DESC —
                      no Sort. Q6 ranges one day of entries and filters status per row; a (status,
                      created_at) composite would be marginally better for Q6 alone but is a worse citizen —
                      it strands Q5, forcing a fourth index. Budget thinking beats per-query thinking.
                    </li>
                  </ul>
                  <p>
                    Also acceptable: a partial index{' '}
                    <code>ON bench_users (score) WHERE status = 'inactive'</code> replacing the composite —
                    smaller, and exactly shaped to Q1–Q3 since all three pin status = 'inactive'. It is the
                    sharper blade if that literal value is truly the only one queried; the composite is the
                    safer general tool. Being able to argue both sides is the skill.
                  </p>
                </RevealSolution>
              ),
              checkpoint: (
                <>
                  Your design either matches the reference in effect, or you can articulate precisely which
                  query shapes yours trades away. Leave the reference three indexes in place — lesson 2.2.4
                  charges you for them.
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
              q: 'An index exists on (customer_id, order_date). Which query can it NOT accelerate?',
              options: [
                'WHERE customer_id = 7',
                "WHERE customer_id = 7 AND order_date > '2026-01-01'",
                "WHERE order_date > '2026-01-01'",
                'WHERE customer_id = 7 ORDER BY order_date',
              ],
              answer: 2,
              explain:
                'order_date alone is not a leftmost prefix: its values are sorted only WITHIN each customer_id, so matches are scattered fragments across the whole tree. The other three all pin the prefix — including the ORDER BY, which rides the second column’s order for free.',
            },
            {
              q: 'For WHERE region = ? AND created_at BETWEEN ? AND ?, which column order is right, and why?',
              options: [
                '(created_at, region) — dates are more selective',
                '(region, created_at) — equality first keeps the range contiguous within one region block',
                'Either — column order only matters for storage size',
                'Two separate single-column indexes are always better',
              ],
              answer: 1,
              explain:
                'Equality first, range last. With (region, created_at), the region pin lands in one block and the date range is contiguous inside it. Range-first smears each region across the whole date span, degrading the equality to a per-row filter.',
            },
            {
              q: 'What does INCLUDE (email) in a CREATE INDEX actually do?',
              options: [
                'Adds email as an additional sort key',
                'Stores email in leaf entries as payload, enabling index-only scans without affecting sort order',
                'Creates a second hidden index on email',
                'Enforces uniqueness on email',
              ],
              answer: 1,
              explain:
                'INCLUDE columns are carried, not sorted on: they fatten only the leaves, keep internal-page fanout intact, and let queries that need them skip the heap entirely. They cannot be used to navigate or to enforce uniqueness.',
            },
            {
              q: "When is a partial index (... WHERE status = 'pending') the right call?",
              options: [
                'Whenever the table has a status column',
                'When queries target a small hot subset and the query predicate repeats the index predicate',
                'When you need the index to cover every status value',
                'When the planner refuses composite indexes',
              ],
              answer: 1,
              explain:
                'Partial indexes shine when a stable predicate isolates a small, hot slice: the index stays tiny, and writes to the cold 98% skip it. The catch: the planner must prove the query implies the index WHERE — queries that omit the predicate get nothing.',
            },
            {
              q: 'You find indexes on (a) and on (a, b) on the same table. What should happen?',
              options: [
                'Keep both — the planner alternates for load balancing',
                'Drop (a, b) — narrower indexes are always faster',
                'Drop (a) — it is a pure prefix of (a, b), which serves every query (a) serves',
                'Merge them into (b, a)',
              ],
              answer: 2,
              explain:
                'Leftmost-prefix means (a, b) subsumes (a) for navigation; the narrow index adds write cost and storage for nothing. (The composite is marginally bigger per entry — almost never enough to matter against maintaining two trees.)',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'We have an index on (user_id, created_at). Will WHERE created_at > now() - interval "7 days" use it?',
            a: (
              <p>
                No — created_at is not a leftmost prefix; its order exists only within each user_id, so the
                predicate maps to scattered fragments, not an interval. Options: a separate (created_at)
                index, or in some engines a skip scan if user_id is low-cardinality (Postgres only recently,
                and only sometimes). This is the single most-asked index question in interviews; answer it
                with the word “prefix” in the first sentence.
              </p>
            ),
          },
          {
            q: 'How would you decide what indexes a new table needs?',
            a: (
              <p>
                Start from queries, not columns: enumerate the hot query shapes, extract each one’s equality
                / range / ORDER BY / output columns, then find the smallest set of composites whose prefixes
                cover them — equality columns first, range last, INCLUDE for output-only columns. Verify
                every shape with EXPLAIN, and name the tax: each index slows every write, so each must justify
                itself against the workload. Interviewers are listening for workload-first thinking and the
                write-cost caveat.
              </p>
            ),
          },
          {
            q: 'What is a covering index and when does it backfire?',
            a: (
              <p>
                An index carrying every column a query needs (key columns plus INCLUDE payload), so the
                query becomes an index-only scan with zero heap visits. Backfires when: the payload bloats
                leaves until the index rivals the table; the table takes heavy updates, so the visibility map
                decays and “index only” quietly degrades into heap fetches; or someone chases index-only
                scans for every query and inflates write amplification — the disease the next lesson
                measures.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>
            Composite index = one lexicographic sort order over several columns. It accelerates exactly the
            predicates that pin a leftmost prefix — (a, b) serves a=, a=b=, a= with b-range, never b alone.
          </>,
          <>Column order rule: equality columns first, the range or ORDER BY column last.</>,
          <>
            INCLUDE carries payload columns in the leaves for index-only scans without touching sort order or
            fanout.
          </>,
          <>
            Partial indexes shrink to a hot subset (and skip writes to the cold rest); expression indexes
            sort computed values so wrapped predicates can descend.
          </>,
          <>
            An index whose order matches ORDER BY deletes the Sort node — and with LIMIT, stops early.
            Unique indexes are how UNIQUE and PRIMARY KEY are actually enforced.
          </>,
          <>
            Design minimally from the workload: fewest indexes covering the most queries, drop pure-prefix
            duplicates, and remember every survivor taxes every write — the bill arrives in 2.2.4.
          </>,
        ]}
      />
    </>
  )
}
