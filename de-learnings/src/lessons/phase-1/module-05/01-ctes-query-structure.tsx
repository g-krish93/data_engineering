import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { RevealSolution } from '../../../components/RevealSolution'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeBlock } from '../../../components/CodeBlock'
import { CodeRunner } from '../../../components/CodeRunner'

const ID = '1.5.1'

const TRIPS_SETUP = `CREATE OR REPLACE TABLE trips AS
SELECT * FROM (VALUES
  (1,  'Austin',  DATE '2024-03-01', 12, 3.1),
  (2,  'Austin',  DATE '2024-03-01', 30, 8.4),
  (3,  'Austin',  DATE '2024-03-02', 18, 4.2),
  (4,  'Austin',  DATE '2024-03-03',  4, 0.4),
  (5,  'Boston',  DATE '2024-03-01', 22, 5.0),
  (6,  'Boston',  DATE '2024-03-02', 41, 9.8),
  (7,  'Boston',  DATE '2024-03-02', 33, 7.7),
  (8,  'Boston',  DATE '2024-03-03',  3, 0.2),
  (9,  'Chicago', DATE '2024-03-01', 15, 3.9),
  (10, 'Chicago', DATE '2024-03-02', 17, 4.6),
  (11, 'Chicago', DATE '2024-03-03', 26, 6.8),
  (12, 'Chicago', DATE '2024-03-03', 12, 2.5)
) t(trip_id, city, trip_date, minutes, km);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The query you can't read back">
        <Tiered
          layman={
            <>
              <p>
                Imagine a recipe written as one run-on sentence: “dice the onions you peeled after washing the ones from the bag that
                wasn’t moldy and fry them in the butter you melted while the salted water boiled…”. Every instruction is there, but you
                must hold the whole sentence in your head at once. Real recipes use named prep bowls: <em>bowl A — diced onion; bowl B —
                melted butter; step 3 — combine A and B</em>.
              </p>
              <p>
                SQL has the same disease. Beginners nest queries inside queries, and the result reads like the run-on recipe. A{' '}
                <strong>CTE</strong> (Common Table Expression, the <code>WITH</code> keyword) is the named prep bowl: each intermediate
                step gets a name, and the final answer is built from named steps. Same ingredients, readable order.
              </p>
            </>
          }
          student={
            <>
              <p>
                A CTE names a subquery at the top of a statement so the rest can use it like a table:{' '}
                <code>WITH real_trips AS (SELECT …) SELECT … FROM real_trips</code>. CTEs chain — each may reference the ones defined
                before it — so a complex query becomes a top-down pipeline: filter, then aggregate, then compare, instead of an
                inside-out parenthesis puzzle.
              </p>
              <p>
                This matters because analytics SQL grows: the one-off query becomes the scheduled report becomes the thing a teammate
                edits at 5 pm Friday. Nested derived tables make readers start at the innermost parentheses and work outward; CTEs read
                like prose. Same result set, radically different maintenance cost.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A non-recursive CTE adds nothing to relational expressiveness — it is syntax for naming a subexpression of the query’s
                algebraic tree. What changes is the authoring model: you declare intermediate relations explicitly, in dependency order,
                which is how optimizers and humans both want to think. <code>WITH RECURSIVE</code> is the exception: it extends SELECT to
                genuine fixpoint computation (transitive closure, reachability) — demoed below.
              </p>
              <p>
                Whether an engine <em>inlines</em> a CTE (substitutes it into the plan and co-optimizes) or <em>materializes</em> it
                (computes it once into a buffer) is engine-specific and changes performance, never results. The readability argument is
                engine-independent; the performance argument never is.
              </p>
            </>
          }
        />
        <p>
          Here is the query this lesson kills. Fair question — “which cities average longer trips than the overall average, counting only
          real trips (at least 1 km)?” — but you read it inside-out, and the <code>km &gt;= 1.0</code> rule appears twice:
        </p>
        <CodeRunner
          language="sql"
          setup={TRIPS_SETUP}
          code={`SELECT city, avg_min
FROM (
  SELECT city, AVG(minutes) AS avg_min
  FROM (SELECT * FROM trips WHERE km >= 1.0) real_trips
  GROUP BY city
) city_stats
WHERE avg_min > (SELECT AVG(minutes) FROM trips WHERE km >= 1.0)
ORDER BY avg_min DESC;`}
          label="The nested version — it runs, but where would you add a date filter?"
        />
      </Section>

      <Section kicker="core concepts" title="WITH: name the steps, chain the steps">
        <Tiered
          layman={
            <>
              <p>
                The rewrite below has three named bowls. <em>real_trips</em>: trips that actually went somewhere. <em>city_stats</em>:
                average minutes per city, from the first bowl. <em>overall</em>: the overall average, also from the first bowl. The final
                step compares bowl two against bowl three — and the “at least 1 km” rule now lives in exactly one place.
              </p>
              <p>
                You can also stop after any bowl and taste it: make the final line <code>SELECT * FROM real_trips</code> and you see that
                intermediate result. Does naming bowls slow the kitchen? No — the database rewrites your query into its own plan first,
                and the names usually dissolve. They exist for humans.
              </p>
            </>
          }
          student={
            <>
              <p>
                Mechanics: one <code>WITH</code>, then comma-separated <code>name AS (subquery)</code> blocks, then the final SELECT.
                Habits that scale: name CTEs as <strong>nouns describing the row set</strong> (<code>real_trips</code>, never{' '}
                <code>step1</code>), keep <strong>one concern per CTE</strong>, and debug by swapping the final SELECT for{' '}
                <code>SELECT * FROM any_cte</code> — you inspect any layer without dismantling the query.
              </p>
              <p>
                Execution: DuckDB <em>inlines</em> CTEs — they are substituted into the plan and co-optimized, so a CTE is not a
                performance fence. PostgreSQL materialized every CTE until v12; now it inlines single-reference CTEs unless you force{' '}
                <code>AS MATERIALIZED</code>. Moral: write for readability, and when performance questions arise, read{' '}
                <code>EXPLAIN</code> instead of rearranging prose.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Single definition is DRY applied to predicates and kills a real bug class: divergent copies of a business rule. Inlining
                is the view-merging problem — substitution exposes rewrites (predicate pushdown, join reordering) but risks
                re-evaluating shared subexpressions; materialization is common-subexpression elimination at the cost of an optimization
                fence. The right choice depends on cardinality estimates, which is why engines disagree.
              </p>
              <p>
                Recursion is where expressiveness genuinely grows. <code>WITH RECURSIVE</code> computes a least fixpoint: seed with the
                base case, apply the recursive member to the newest rows, stop when nothing new appears. An org-chart walk — try adding a
                text path column, or re-point Noah’s manager to deepen the tree:
              </p>
              <CodeRunner
                language="sql"
                setup={`CREATE OR REPLACE TABLE staff AS
SELECT * FROM (VALUES
  (1, 'Priya', NULL),
  (2, 'Marco', 1),
  (3, 'Sofia', 1),
  (4, 'Liam',  2),
  (5, 'Ava',   2),
  (6, 'Noah',  3)
) t(emp_id, name, manager_id);`}
                code={`WITH RECURSIVE chain AS (
  SELECT emp_id, name, 0 AS depth
  FROM staff WHERE manager_id IS NULL
  UNION ALL
  SELECT s.emp_id, s.name, c.depth + 1
  FROM staff AS s
  JOIN chain AS c ON s.manager_id = c.emp_id
)
SELECT * FROM chain ORDER BY depth, emp_id;`}
                label="Recursive CTE: walk the org chart to any depth."
              />
            </>
          }
        />
        <p>The full refactor — three named steps, then a final comparison that reads top-down:</p>
        <CodeRunner
          language="sql"
          setup={TRIPS_SETUP}
          code={`WITH real_trips AS (
  SELECT * FROM trips WHERE km >= 1.0
),
city_stats AS (
  SELECT city, AVG(minutes) AS avg_min
  FROM real_trips
  GROUP BY city
),
overall AS (
  SELECT AVG(minutes) AS overall_avg FROM real_trips
)
SELECT c.city, c.avg_min
FROM city_stats AS c
CROSS JOIN overall AS o
WHERE c.avg_min > o.overall_avg
ORDER BY c.avg_min DESC;`}
          label="Same one-row answer. Try replacing the final SELECT with: SELECT * FROM city_stats"
        />
        <Callout kind="tip" title="Foreshadow: you just thought like dbt">
          In Phase 3 you meet dbt, the standard tool for the T in <GlossaryTerm k="elt">ELT</GlossaryTerm>: essentially this CTE chain
          with each CTE promoted to its own file (a “model”) materialized in the{' '}
          <GlossaryTerm k="data-warehouse">warehouse</GlossaryTerm>, plus dependency ordering and tests per layer. Start the habit now.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="CTE, temp table, or view?">
        <p>
          A CTE is one of three ways to name a row set. The real decision is <em>scope and lifetime</em>: how long should the name live,
          and who else gets to use it?
        </p>
        <Tradeoffs
          options={[
            {
              name: 'CTE (WITH)',
              strengths: ['Zero setup; lives and dies with one statement', 'Reads top-down; any layer inspectable while authoring'],
              weaknesses: [
                'Invisible to other statements and users; recomputed every run',
                'Inline-vs-materialize semantics vary by engine',
              ],
              chooseWhen: 'the structure belongs to one query — the default for analytics SQL.',
            },
            {
              name: 'Temporary table',
              strengths: ['Computed once, reused across many statements in a session', 'Breaks a huge job into inspectable checkpoints'],
              weaknesses: [
                'Imperative: you manage creation order and cleanup',
                'Goes stale when sources change; optimizer sees fragments, not the whole',
              ],
              chooseWhen: 'an expensive intermediate is reused by several downstream statements.',
            },
            {
              name: 'View',
              strengths: ['A named query stored in the database — shared team vocabulary', 'Always fresh: re-runs its definition on every reference'],
              weaknesses: [
                'Hides cost — an innocent-looking view can be a monster query',
                'Views stacked on views become unmaintainable lasagna',
              ],
              chooseWhen: 'many people and queries need the same definition long-term.',
            },
          ]}
          note={
            <>
              The nested derived table keeps one honest use: a trivial one-liner like{' '}
              <code>FROM (SELECT DISTINCT city FROM trips) AS cities</code>. Beyond one level of nesting, reach for WITH.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: refactor your queries into layers">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Add a tiny SQL file-runner to your <code>sql-lab</code> project from module 1.4, then refactor a nested query into a CTE
              chain and prove the refactor changed nothing. All commands are PowerShell in Windows Terminal.
            </p>
          }
          steps={[
            {
              title: 'Add a file runner to sql-lab',
              body: (
                <>
                  <p>
                    Create <code>run_sql.py</code> — it executes a .sql file and prints the last result. It connects in-memory, so every
                    .sql file must seed its own tables with <code>CREATE OR REPLACE</code> — the same{' '}
                    <GlossaryTerm k="idempotency">idempotency</GlossaryTerm> habit the browser runners use.
                  </p>
                  <CodeBlock
                    code={`import sys
import duckdb

con = duckdb.connect()
result = con.sql(open(sys.argv[1]).read())
if result is not None:
    result.show(max_rows=50)`}
                    label="run_sql.py"
                  />
                </>
              ),
              commands: [{ ps: 'cd ~\\sql-lab\nuv add duckdb\nNew-Item -ItemType Directory -Force queries\ncode run_sql.py' }],
              checkpoint: (
                <>
                  <code>uv run python -c "import duckdb; print(duckdb.__version__)"</code> prints a version, and a <code>queries</code>{' '}
                  folder exists next to <code>run_sql.py</code>.
                </>
              ),
            },
            {
              title: 'Save and run the nested monster',
              body: (
                <>
                  <p>
                    Create <code>queries\ctes_before.sql</code>: paste the seed below, then the nested query from this lesson’s first
                    runner under it. Seed first, query second — the file is self-contained.
                  </p>
                  <CodeBlock code={TRIPS_SETUP} label="queries\ctes_before.sql — seed (paste at the top)" />
                </>
              ),
              commands: [{ ps: 'code queries\\ctes_before.sql\nuv run python run_sql.py queries\\ctes_before.sql' }],
              checkpoint: (
                <>
                  Exactly one row prints: <code>Boston</code> with <code>avg_min = 32.0</code>.
                </>
              ),
            },
            {
              title: 'Refactor into a CTE chain — yourself first',
              body: (
                <>
                  <p>
                    Copy the file and rewrite the query as three chained CTEs — <code>real_trips</code>, <code>city_stats</code>,{' '}
                    <code>overall</code> — with a short final SELECT. Attempt it before revealing.
                  </p>
                  <RevealSolution label="Reveal the refactored query">
                    <p>
                      The solution is exactly the chain from the “WITH: name the steps” section above: <code>real_trips</code> filters on{' '}
                      <code>km &gt;= 1.0</code>, <code>city_stats</code> groups it by city, <code>overall</code> averages it, and the
                      final SELECT cross-joins <code>city_stats</code> with <code>overall</code> and keeps cities above the average.
                      Copy it verbatim under the seed if you are stuck.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                {
                  ps: 'Copy-Item queries\\ctes_before.sql queries\\ctes_after.sql\ncode queries\\ctes_after.sql\nuv run python run_sql.py queries\\ctes_after.sql',
                },
              ],
              checkpoint: (
                <>
                  Output is <strong>identical</strong> to step 2: one row, Boston, 32.0. Then temporarily make the final line{' '}
                  <code>SELECT * FROM city_stats ORDER BY city;</code> and re-run: Austin 20.0, Boston 32.0, Chicago 17.5. Restore it.
                </>
              ),
            },
            {
              title: 'Refactor one of your own module 1.4 queries',
              body: (
                <p>
                  Pick the gnarliest query you wrote in module 1.4 — anything with a subquery or a two-step aggregation — save it as{' '}
                  <code>queries\my_refactor.sql</code>, and layer it into named CTEs: one concern per CTE, noun names, every rule defined
                  once.
                </p>
              ),
              commands: [{ ps: 'uv run python run_sql.py queries\\my_refactor.sql' }],
              checkpoint: (
                <>
                  The refactored query prints the same row count and values as the original — run both versions and compare output
                  line-for-line.
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
              q: 'The primary reason to prefer a CTE chain over deeply nested derived tables is:',
              options: [
                'CTEs always execute faster than subqueries',
                'CTEs read top-down and give each step a single, named definition',
                'Nested subqueries are deprecated in modern SQL',
                'CTEs are automatically cached between runs',
              ],
              answer: 1,
              explain:
                'In most engines (DuckDB included) a CTE is inlined and performs identically to the nested form. The win is human: reading order, named steps, and business rules defined exactly once.',
            },
            {
              q: 'In DuckDB, what usually happens to a non-recursive CTE at execution time?',
              options: [
                'It is written to a temp file on disk',
                'It is fully materialized in memory before the main query starts',
                'It is inlined into the overall plan and optimized with everything else',
                'It runs in a separate parallel connection',
              ],
              answer: 2,
              explain:
                'DuckDB inlines CTEs, so filters can be pushed into them and joins reordered across the boundary. PostgreSQL before v12 materialized instead — same SQL, different performance profile.',
            },
            {
              q: 'When is a temporary table the better tool than a CTE?',
              options: [
                'Whenever the query has more than two steps',
                'When an expensive intermediate result is reused by several separate statements',
                'When you want the optimizer to see the whole query at once',
                'Never — CTEs replace temp tables entirely',
              ],
              answer: 1,
              explain:
                'A CTE lives inside one statement and is recomputed per statement. If several later statements need the same expensive intermediate, computing it once into a temp table pays — at the cost of managing its lifecycle yourself.',
            },
            {
              q: 'What can WITH RECURSIVE express that ordinary SELECTs cannot?',
              options: [
                'Aggregation over groups',
                'Traversals of unknown depth, like walking an org chart to the bottom',
                'Joins across more than two tables',
                'Filtering on an aggregate result',
              ],
              answer: 1,
              explain:
                'Non-recursive SQL composes a fixed number of operations. Recursion computes a fixpoint — repeat until no new rows appear — which hierarchy and graph walks of unknown depth require.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'When would you use a CTE versus a subquery versus a temp table?',
            a: (
              <p>
                CTE for readability within one statement — it names steps and usually inlines, so it costs nothing. A one-level derived
                table is fine when trivial. Temp table when an expensive intermediate is reused across statements, accepting lifecycle
                management. Strong answers add the caveat: inline vs materialize varies by engine (PostgreSQL pre-12 vs 12+; DuckDB
                inlines), so performance claims require reading the plan.
              </p>
            ),
          },
          {
            q: 'Do CTEs improve performance?',
            a: (
              <p>
                Usually neutral: the optimizer inlines them into the same plan as the nested form. They can hurt where materialization
                is forced (an optimization fence) and help where it avoids recomputing a shared subexpression. Honest answer: “a
                readability tool; performance depends on the engine’s inlining — I would check EXPLAIN.”
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <><code>WITH name AS (…)</code> names an intermediate row set; chained CTEs turn inside-out nesting into a top-down pipeline.</>,
          <>Name CTEs as nouns, one concern per CTE, every rule defined once — and debug by SELECT-ing any CTE as the final step.</>,
          <>CTEs are usually inlined (DuckDB inlines): a readability tool, not a performance tool — verify with EXPLAIN.</>,
          <>Scope picks the naming tool: CTE for one statement, temp table for one session, view for the whole team — and each CTE is proto-dbt, a named testable layer.</>,
        ]}
      />
    </>
  )
}
