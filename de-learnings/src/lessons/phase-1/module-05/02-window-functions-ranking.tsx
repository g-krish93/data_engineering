import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { RevealSolution } from '../../../components/RevealSolution'
import { CodeBlock } from '../../../components/CodeBlock'
import { CodeRunner } from '../../../components/CodeRunner'

const ID = '1.5.2'

const WEATHER_SETUP = `CREATE OR REPLACE TABLE daily_weather AS
SELECT * FROM (VALUES
  ('Austin',  DATE '2024-03-01', 22.1),
  ('Austin',  DATE '2024-03-02', 23.4),
  ('Austin',  DATE '2024-03-03', 25.0),
  ('Austin',  DATE '2024-03-04', 24.2),
  ('Austin',  DATE '2024-03-05', 26.8),
  ('Austin',  DATE '2024-03-06', 28.3),
  ('Boston',  DATE '2024-03-01', 3.2),
  ('Boston',  DATE '2024-03-02', 4.1),
  ('Boston',  DATE '2024-03-03', 2.8),
  ('Boston',  DATE '2024-03-04', 5.6),
  ('Boston',  DATE '2024-03-05', 7.0),
  ('Boston',  DATE '2024-03-06', 6.4),
  ('Chicago', DATE '2024-03-01', 5.5),
  ('Chicago', DATE '2024-03-02', 6.7),
  ('Chicago', DATE '2024-03-03', 4.9),
  ('Chicago', DATE '2024-03-04', 8.0),
  ('Chicago', DATE '2024-03-05', 9.3),
  ('Chicago', DATE '2024-03-06', 11.2)
) t(city, obs_date, temp_c);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Questions GROUP BY cannot answer">
        <Tiered
          layman={
            <>
              <p>
                Picture race results. A medal table (that is GROUP BY) tells you each heat’s best time — but it throws the runners away.
                Ask “which runner ran that best time, and what was their date and lane?” and the medal table shrugs: those details were
                crushed during summarizing. Ask “how much faster was each runner than the person who finished just ahead?” — same shrug.
              </p>
              <p>
                A <strong>window function</strong> keeps every runner in the results, but lets each row look around: each row learns its
                place in its heat, its heat’s best time, who finished just ahead. Everyone keeps their row; every row gains context.
              </p>
            </>
          }
          student={
            <>
              <p>
                Two everyday analytics questions break GROUP BY. <em>Hottest day per city</em>: grouping by city collapses days, so “which
                date was it?” is gone — you would need a join back. <em>Day-over-day change</em>: each row needs its neighbor, and plain
                SQL rows cannot see each other. Both are one-liners with windows.
              </p>
              <p>
                A window function computes a value <em>per row</em> over a set of related rows (the window): ranks, offsets like
                yesterday’s value, or aggregates without collapsing. GROUP BY answers “what is the summary?”; windows answer “how does
                this row relate to its group?” — while keeping the row.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Aggregation is a quotient: it maps each group of rows to one output tuple, destroying row identity. Window functions
                (SQL:2003) instead compute, for each row, a function of an <em>ordered relation associated with that row</em> — the
                partition — and adjoin the result as a new attribute. Cardinality is preserved; the operation is a per-row functional over
                (row, partition, frame) rather than a fold over groups.
              </p>
              <p>
                That single design choice — annotate rows instead of collapsing them — is why windows replace whole classes of self-joins
                and correlated subqueries. The engine evaluates them in one pass per partition after sorting, which we unpack in the next
                section.
              </p>
            </>
          }
        />
        <p>Proof by running: every row survives, and each learns its city’s maximum — something GROUP BY could only give you by losing the days:</p>
        <CodeRunner
          language="sql"
          setup={WEATHER_SETUP}
          code={`SELECT city, obs_date, temp_c,
       MAX(temp_c) OVER (PARTITION BY city) AS city_max,
       temp_c = MAX(temp_c) OVER (PARTITION BY city) AS is_hottest
FROM daily_weather
ORDER BY city, obs_date;`}
          label="18 rows in, 18 rows out — plus context. Try rewriting with GROUP BY and watch the dates vanish."
        />
      </Section>

      <Section kicker="core concepts" title="OVER, PARTITION BY, and the ranking family">
        <Tiered
          layman={
            <>
              <p>
                Read <code>OVER (PARTITION BY city ORDER BY temp_c DESC)</code> as: “stay in your seat, but look around your own heat
                (city), lined up warmest-first.” PARTITION BY draws the heat boundaries; ORDER BY inside the parentheses sets the lineup.
                Then the ranking family answers “what place am I in?”
              </p>
              <p>
                Ties are where the three rankers differ. Two days tie for second place: <em>RANK</em> gives both silver and skips to 4
                (Olympic style); <em>DENSE_RANK</em> gives both silver and continues at 3; <em>ROW_NUMBER</em> refuses to tie — it hands
                out 2 and 3 by coin flip. That coin flip is a real bug source.
              </p>
            </>
          }
          student={
            <>
              <p>
                Anatomy: <code>fn(...) OVER (PARTITION BY … ORDER BY …)</code>. Omit PARTITION BY and the window is the whole result set;
                omit ORDER BY and there is no notion of position. ROW_NUMBER assigns 1..n uniquely — <strong>on ties the assignment is
                arbitrary and can change between runs</strong>, so always add a tiebreaker column to the window’s ORDER BY when you
                filter on it. RANK leaves gaps after ties; DENSE_RANK does not.
              </p>
              <p>
                LAG(col) and LEAD(col) fetch the previous/next row’s value in window order — the first row’s LAG is NULL (a third
                argument sets a default). Day-over-day delta is <code>temp_c - LAG(temp_c) OVER (PARTITION BY city ORDER BY
                obs_date)</code>: no self-join, no loop.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Evaluation model: hash-partition rows by the PARTITION BY key, sort each partition by the window’s ORDER BY, then stream
                once per partition maintaining state (a counter for ROW_NUMBER, peek buffers for LAG/LEAD). Cost is the sort — O(n log n)
                per partition — which is why many windows sharing one partitioning/ordering are cheap to add: DuckDB reuses the sorted
                partition across them.
              </p>
              <p>
                Determinism: ROW_NUMBER over a non-total order is underspecified — the engine may return either tied row first depending
                on parallel scan order. RANK and DENSE_RANK are deterministic because equal keys receive equal outputs. If a pipeline
                dedupes with ROW_NUMBER, the tiebreaker column is a correctness requirement, not a style choice.
              </p>
            </>
          }
        />
        <p>The mandatory tie demo — same ordering, three different verdicts:</p>
        <CodeRunner
          language="sql"
          setup={`CREATE OR REPLACE TABLE june_highs AS
SELECT * FROM (VALUES
  (DATE '2024-06-01', 30.1),
  (DATE '2024-06-02', 29.5),
  (DATE '2024-06-03', 29.5),
  (DATE '2024-06-04', 28.3),
  (DATE '2024-06-05', 28.3),
  (DATE '2024-06-06', 27.6)
) t(obs_date, temp_c);`}
          code={`SELECT obs_date, temp_c,
       ROW_NUMBER() OVER (ORDER BY temp_c DESC) AS row_num,
       RANK()       OVER (ORDER BY temp_c DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY temp_c DESC) AS dense_rnk
FROM june_highs
ORDER BY temp_c DESC, obs_date;`}
          label="Watch rows 2-3 and 4-5: 1,2,3,4,5,6 vs 1,2,2,4,4,6 vs 1,2,2,3,3,4."
        />
        <p>And LAG for day-over-day change — the first row has no yesterday, so its delta is NULL:</p>
        <CodeRunner
          language="sql"
          setup={WEATHER_SETUP}
          code={`SELECT obs_date, temp_c,
       LAG(temp_c) OVER (ORDER BY obs_date) AS prev_temp,
       ROUND(temp_c - LAG(temp_c) OVER (ORDER BY obs_date), 1) AS delta_c
FROM daily_weather
WHERE city = 'Austin'
ORDER BY obs_date;`}
          label="Change LAG to LEAD to peek at tomorrow instead."
        />
      </Section>

      <Section kicker="core concepts" title="Top-N per group, and why WHERE can't see your rank">
        <Tiered
          layman={
            <>
              <p>
                “Keep only each city’s hottest day” sounds like a job for WHERE. But WHERE is the bouncer at the door — it decides who
                enters <em>before</em> the ranking ceremony happens inside. You cannot ask the bouncer to admit “only gold medalists”
                when medals are awarded after everyone is in the room.
              </p>
              <p>
                So you either hold the ceremony in a back room first and filter outside it (a subquery), or hire a second bouncer who
                works <em>after</em> the ceremony. DuckDB has that second bouncer: <code>QUALIFY</code>.
              </p>
            </>
          }
          student={
            <>
              <p>
                Logical order of a SELECT: FROM, then WHERE, then GROUP BY/HAVING, <em>then</em> window functions, then SELECT’s output
                list, then ORDER BY/LIMIT. Windows evaluate after WHERE — so WHERE cannot reference a window result, and any filter you do
                write changes what the window sees. The portable fix wraps the window in a subquery (or CTE) and filters outside;{' '}
                <code>QUALIFY</code> (DuckDB, Snowflake, BigQuery) filters on window results directly, post-window.
              </p>
              <p>
                Run the proof below, then add <code>WHERE obs_date &lt;= DATE '2024-03-05'</code> and re-run: every city’s “hottest day”
                changes, because the ranking was computed only over rows that survived WHERE. Filters feed windows; never the reverse.
              </p>
            </>
          }
          phd={
            <>
              <p>
                This is the logical query processing order made observable: window evaluation is a plan operator sitting above the
                filter, so its partition contents are the filter’s output. QUALIFY adds no expressiveness — it desugars to exactly the
                subquery-then-filter plan — but it removes one nesting level, which is precisely the CTE argument from lesson 1.5.1
                applied to a clause.
              </p>
              <p>
                Note the equivalence classes: top-1-per-group via ROW_NUMBER + filter is the relational “argmax per group”, the same
                query that needs a correlated subquery (<code>WHERE temp_c = (SELECT MAX…)</code>) or a self-anti-join in engines without
                windows. The window formulation is both clearer and one sort instead of two scans — and unlike the MAX subquery, it
                returns exactly one row per city even on ties, if you add a tiebreaker.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={WEATHER_SETUP}
          code={`SELECT city, obs_date, temp_c,
       ROW_NUMBER() OVER (PARTITION BY city ORDER BY temp_c DESC, obs_date) AS rn
FROM daily_weather
QUALIFY rn = 1;`}
          label="Top-1 per group. Now add WHERE obs_date <= DATE '2024-03-05' above QUALIFY and watch the winners change."
        />
        <CodeBlock
          code={`SELECT city, obs_date, temp_c
FROM (
  SELECT city, obs_date, temp_c,
         ROW_NUMBER() OVER (PARTITION BY city ORDER BY temp_c DESC, obs_date) AS rn
  FROM daily_weather
) ranked
WHERE rn = 1;`}
          label="sql — the portable version: identical result on engines without QUALIFY"
        />
        <Callout kind="warn" title="The tiebreaker is not optional">
          The trailing <code>obs_date</code> in the window’s ORDER BY makes the pick deterministic on ties. Without it, “hottest day per
          city” can return a different day on the next run — ROW_NUMBER dedup has shipped real production bugs this way.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Windows vs self-joins vs app code">
        <Tradeoffs
          options={[
            {
              name: 'Window function',
              strengths: ['One pass over sorted data; no query duplication', 'Declarative: intent (rank, delta) is visible in the SQL'],
              weaknesses: ['Sort cost on huge partitions', 'Syntax unfamiliar to SQL beginners; frame rules have gotchas'],
              chooseWhen: 'the question is per-row context — ranks, neighbors, running values. This is the default.',
            },
            {
              name: 'Self-join / correlated subquery',
              strengths: ['Works on ancient engines and simple ORMs', 'Sometimes optimal for top-1 with the right index'],
              weaknesses: ['O(n squared) danger; logic duplicated across the join', 'Ties produce duplicate rows unless carefully handled'],
              chooseWhen: 'the engine lacks window support, or a covering index makes the join trivially cheap.',
            },
            {
              name: 'App-side loop (pandas / Python)',
              strengths: ['Arbitrary logic — not limited to SQL semantics', 'Easy to unit test in isolation'],
              weaknesses: ['Ships all rows over the wire before computing', 'Reimplements (worse) what the engine does in-place'],
              chooseWhen: 'logic genuinely exceeds SQL, and the filtered data is already small.',
            },
          ]}
          note={
            <>
              Rule of thumb from production: compute where the data lives. Pulling a million rows into Python to compute a rank the
              database could have attached in one sorted pass is the classic junior-engineer tax.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: hottest day and daily deltas in sql-lab">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will answer both headline questions of this lesson against a known seed, in your <code>sql-lab</code> project, using
              the <code>run_sql.py</code> runner from lesson 1.5.1. Checkpoints are exact — if your numbers differ, your query differs.
            </p>
          }
          steps={[
            {
              title: 'Create the seed + top-1-per-group query',
              body: (
                <>
                  <p>
                    Create <code>queries\ranking.sql</code>. Paste the 18-row <code>daily_weather</code> seed below, then write a query
                    returning each city’s hottest day (city, obs_date, temp_c) using ROW_NUMBER + QUALIFY with a date tiebreaker.
                  </p>
                  <CodeBlock code={WEATHER_SETUP} label="queries\ranking.sql — seed (paste at the top)" />
                  <RevealSolution label="Reveal the query">
                    <CodeBlock
                      code={`SELECT city, obs_date, temp_c,
       ROW_NUMBER() OVER (PARTITION BY city ORDER BY temp_c DESC, obs_date) AS rn
FROM daily_weather
QUALIFY rn = 1;`}
                      label="append below the seed"
                    />
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'cd ~\\sql-lab\ncode queries\\ranking.sql\nuv run python run_sql.py queries\\ranking.sql' }],
              checkpoint: (
                <>
                  Exactly 3 rows: Austin 2024-03-06 28.3, Boston 2024-03-05 7.0, Chicago 2024-03-06 11.2.
                </>
              ),
            },
            {
              title: 'Add the day-over-day delta query',
              body: (
                <>
                  <p>
                    Create <code>queries\deltas.sql</code> (same seed) computing per-city day-over-day temperature change: city,
                    obs_date, temp_c, delta_c — partitioned by city, ordered by date.
                  </p>
                  <RevealSolution label="Reveal the query">
                    <CodeBlock
                      code={`SELECT city, obs_date, temp_c,
       ROUND(temp_c - LAG(temp_c) OVER (PARTITION BY city ORDER BY obs_date), 1) AS delta_c
FROM daily_weather
ORDER BY city, obs_date;`}
                      label="append below the seed"
                    />
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'code queries\\deltas.sql\nuv run python run_sql.py queries\\deltas.sql' }],
              checkpoint: (
                <>
                  18 rows. Each city’s 2024-03-01 row shows delta_c NULL; Austin 2024-03-02 shows 1.3; Boston 2024-03-03 shows -1.3;
                  Chicago 2024-03-06 shows 1.9.
                </>
              ),
            },
            {
              title: 'Stretch: top-3 days per city',
              body: (
                <p>
                  Copy <code>ranking.sql</code> to <code>queries\top3.sql</code> and change it to return each city’s three hottest days
                  with their rank, using DENSE_RANK. Think about why the row count could exceed 9 if temperatures tied.
                </p>
              ),
              commands: [{ ps: 'Copy-Item queries\\ranking.sql queries\\top3.sql\ncode queries\\top3.sql\nuv run python run_sql.py queries\\top3.sql' }],
              checkpoint: (
                <>
                  9 rows (this seed has no ties): Austin 28.3 / 26.8 / 25.0, Boston 7.0 / 6.4 / 5.6, Chicago 11.2 / 9.3 / 8.0, ranks 1-3
                  within each city.
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
              q: 'Temperatures ordered DESC are 30.1, 29.5, 29.5, 28.3. What does RANK() assign?',
              options: ['1, 2, 2, 3', '1, 2, 2, 4', '1, 2, 3, 4', '1, 3, 3, 4'],
              answer: 1,
              explain:
                'RANK gives tied rows the same rank, then skips: the row after two 2s gets 4. DENSE_RANK would give 1,2,2,3; ROW_NUMBER 1,2,3,4 with the tied order arbitrary.',
            },
            {
              q: 'Why can’t you write WHERE ROW_NUMBER() OVER (…) = 1 directly?',
              options: [
                'ROW_NUMBER is not allowed with PARTITION BY',
                'WHERE evaluates before window functions, so the rank does not exist yet',
                'ROW_NUMBER returns text, and WHERE needs a number',
                'You can — it is valid SQL everywhere',
              ],
              answer: 1,
              explain:
                'Windows evaluate after WHERE (and GROUP BY). Filter on a window via a subquery/CTE wrapper, or QUALIFY where supported — and remember your WHERE changes what the window sees.',
            },
            {
              q: 'A dedup query keeps rows where ROW_NUMBER() = 1, ordered only by a non-unique timestamp. The risk?',
              options: [
                'It errors on ties',
                'It keeps all tied rows',
                'On ties the surviving row is arbitrary and can change between runs',
                'None — ROW_NUMBER is always deterministic',
              ],
              answer: 2,
              explain:
                'ROW_NUMBER breaks ties arbitrarily. Two runs can keep different rows, breaking idempotency downstream. Add a unique tiebreaker (an id) to the window ORDER BY.',
            },
            {
              q: 'What does LAG(temp_c) OVER (PARTITION BY city ORDER BY obs_date) return for each city’s first date?',
              options: ['0', 'The city’s average', 'NULL (no previous row in the partition)', 'The last row’s value, wrapping around'],
              answer: 2,
              explain:
                'Offsets never cross partition boundaries: the first row per city has no predecessor, so LAG yields NULL — or a default if you pass one as the third argument.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain the difference between ROW_NUMBER, RANK, and DENSE_RANK.',
            a: (
              <p>
                All number rows within a partition by an ordering. ROW_NUMBER is always unique — ties broken arbitrarily unless the order
                is total. RANK gives ties equal numbers and skips (1,2,2,4); DENSE_RANK gives ties equal numbers without gaps (1,2,2,3).
                Strong answers volunteer the production angle: ROW_NUMBER-based dedup needs a deterministic tiebreaker or reruns keep
                different rows.
              </p>
            ),
          },
          {
            q: 'How would you get the top 3 records per group?',
            a: (
              <p>
                Rank within the partition — <code>ROW_NUMBER() OVER (PARTITION BY grp ORDER BY metric DESC, id)</code> — then filter rank
                3 or lower in an outer query or QUALIFY. Mention the design choice: ROW_NUMBER for exactly 3, RANK/DENSE_RANK to admit
                ties, and that WHERE cannot filter the window directly because windows evaluate after WHERE.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Windows keep every row and add context: rank in partition, neighbor values, group aggregates — no collapsing, no self-join.</>,
          <>PARTITION BY draws the groups; ORDER BY inside OVER defines position; on ties RANK skips, DENSE_RANK doesn’t, ROW_NUMBER guesses.</>,
          <>Always add a tiebreaker to a window ORDER BY you filter on — ROW_NUMBER on ties is nondeterministic.</>,
          <>LAG and LEAD read neighboring rows within the partition; the partition edge yields NULL.</>,
          <>Windows evaluate after WHERE: filter their results via subquery/CTE or QUALIFY — and WHERE changes what the window sees.</>,
        ]}
      />
    </>
  )
}
