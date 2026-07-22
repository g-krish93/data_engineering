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
import { RevealSolution } from '../../../components/RevealSolution'

const ID = '1.4.5'

// weather: 15 rows — 5 cities x 3 days. cities: 5 rows, one country each.
// Chennai + Cairo run hot; overall AVG(temp_c) is exactly 25.0 (a clean threshold).
const W = `CREATE OR REPLACE TABLE weather AS SELECT * FROM (VALUES
  ('Chennai', DATE '2026-06-01', 34.0), ('Chennai', DATE '2026-06-02', 36.0), ('Chennai', DATE '2026-06-03', 33.0),
  ('Berlin',  DATE '2026-06-01', 19.0), ('Berlin',  DATE '2026-06-02', 24.0), ('Berlin',  DATE '2026-06-03', 21.0),
  ('Seattle', DATE '2026-06-01', 17.0), ('Seattle', DATE '2026-06-02', 15.0), ('Seattle', DATE '2026-06-03', 22.0),
  ('Oslo',    DATE '2026-06-01', 12.0), ('Oslo',    DATE '2026-06-02', 14.0), ('Oslo',    DATE '2026-06-03', 11.0),
  ('Cairo',   DATE '2026-06-01', 38.0), ('Cairo',   DATE '2026-06-02', 40.0), ('Cairo',   DATE '2026-06-03', 39.0)
) AS t(city, day, temp_c);
CREATE OR REPLACE TABLE cities AS SELECT * FROM (VALUES
  ('Chennai', 'India'), ('Berlin', 'Germany'), ('Seattle', 'USA'), ('Oslo', 'Norway'), ('Cairo', 'Egypt')
) AS t(city, country);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Some questions need another answer first">
        <p>
          &quot;Which days were hotter than average?&quot; hides a second question inside it: <em>what is the average?</em> You
          cannot filter on a number you have not computed yet. A <GlossaryTerm k="subquery">subquery</GlossaryTerm> — a query
          nested inside another — answers the inner question first, then feeds its result to the outer one:
        </p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city, day, temp_c
FROM weather
WHERE temp_c > (SELECT AVG(temp_c) FROM weather)
ORDER BY temp_c DESC;`}
        />
        <Tiered
          layman={
            <>
              <p>
                To answer &quot;who is taller than the class average?&quot; you first work out the average height, then walk the
                room comparing each person to that one number. Two steps, and the first must finish before the second starts.
                SQL lets you write both in one breath: the part in parentheses is the first step.
              </p>
              <p>
                The rest of this lesson is really two ideas. One: how to nest a question inside a question (subqueries). Two: how
                to sort each row into a labelled bucket — hot, warm, cool — as it goes past (that is CASE). Both turn up in almost
                every report you will ever write.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>(SELECT AVG(temp_c) FROM weather)</code> runs once, returns a single value (here 25.0), and the outer{' '}
                <code>WHERE</code> compares every row against it. That single-value shape is a <em>scalar</em> subquery — usable
                anywhere a literal number could go. Six rows come back: all of Chennai and all of Cairo.
              </p>
              <p>
                Subqueries also appear in the <code>FROM</code> clause (a query used as a table) and after <code>IN</code> /{' '}
                <code>EXISTS</code> (a query used as a set or a test). One structural rule underlies all of them: SQL evaluates
                the inside before the outside can use it.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A subquery is a nested <em>SELECT expression</em>, and its position dictates its required shape: scalar context
                (a comparison RHS, a projected column) demands exactly one row and one column — the engine raises a runtime error
                on a second row; set context (<code>IN</code>, <code>= ANY</code>) accepts one column, many rows; table context
                (<code>FROM</code>) accepts any relation.
              </p>
              <p>
                Whether the nesting costs anything is an optimizer question, not a syntax one. Uncorrelated scalar subqueries are
                computed once and cached; correlated ones are logically re-run per outer row but are usually rewritten into joins
                (decorrelation, three sections down). The relational algebra has no &quot;subquery&quot; operator at all — the
                planner flattens them into the same joins, aggregates, and semi-joins everything else compiles to.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Scalar and IN subqueries: computed once, then reused">
        <Tiered
          layman={
            <>
              <p>
                Two everyday shapes. A <em>scalar</em> subquery boils down to one number — &quot;the average&quot;, &quot;the
                highest&quot;, &quot;yesterday's total&quot; — and you compare against it. An <em>IN</em> subquery produces a list
                of allowed values — &quot;the cities in hot countries&quot; — and you keep only rows whose value is on the list.
              </p>
              <p>
                Both do their work once, up front. Compute the number (or the list), then sweep the outer table against it. No
                row asks its own private version of the question — that is the next section's twist.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>WHERE city IN (SELECT city FROM cities WHERE country IN ('India','Egypt'))</code> builds the set
                {' '}<code>&#123;Chennai, Cairo&#125;</code> once, then filters. This is exactly a join-in-disguise: keep weather
                rows whose city appears in the derived set. It reads well when you want a filter and nothing from the other table
                in the output.
              </p>
              <p>
                Because the inner query does not mention the outer row, it is <em>uncorrelated</em> — evaluated a single time. Swap
                <code> IN</code> for <code>NOT IN</code> to invert the set, but hold that thought: <code>NOT IN</code> has a famous
                NULL trap you will trigger on purpose later this lesson.
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>x IN (subquery)</code> is a <GlossaryTerm k="semi-join">semi-join</GlossaryTerm>: it returns each outer row
                at most once, regardless of how many inner rows match — unlike an inner join, which multiplies. That distinction is
                why <code>IN</code>/<code>EXISTS</code> are the correct tools for &quot;does a match exist?&quot; and a plain join is
                the wrong one (it can inflate row counts, per last lesson's duplicate-key hazard).
              </p>
              <p>
                Optimizers freely convert between <code>IN</code>, <code>EXISTS</code>, and semi-joins based on cardinality
                estimates; the three are semantically equivalent for match-existence (their NULL behaviour diverges, below). Write
                the one that reads clearest and let the planner choose the physical strategy.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={W}
          code={`-- the inner query yields {Chennai, Cairo}; the outer keeps only those cities
SELECT city, day, temp_c
FROM weather
WHERE city IN (SELECT city FROM cities WHERE country IN ('India', 'Egypt'))
ORDER BY city, day;`}
        />
      </Section>

      <Section kicker="core concepts" title="Correlated subqueries: a private question per row">
        <Tiered
          layman={
            <>
              <p>
                Now the sharper version: &quot;which days beat <em>that city's own</em> average?&quot; Chennai's rows are judged
                against Chennai's average, Oslo's against Oslo's. There is no single number any more — each row carries its own
                yardstick, computed from its own group.
              </p>
              <p>
                Picture a teacher grading on a curve <em>per class</em> instead of one school-wide line. To grade Ana, you first
                average Ana's class, then compare her to it; move to the next class and the average changes. That per-row recompute
                is a <em>correlated</em> subquery — powerful, and the one to watch on big tables.
              </p>
            </>
          }
          student={
            <>
              <p>
                The inner query references the outer row (<code>WHERE w2.city = w.city</code>), so it is{' '}
                <GlossaryTerm k="correlated-subquery">correlated</GlossaryTerm> — conceptually re-evaluated for every outer row.
                Five rows return: each city's single hottest day (its 06-02, except Seattle's 06-03). No <code>GROUP BY</code>
                appears in the outer query, yet you have filtered against per-group aggregates — the trick correlated subqueries
                make easy.
              </p>
              <p>
                The tell is the outer alias inside the inner query. Uncorrelated (last section) ignores the outer row and runs
                once; correlated depends on it. On small data both are instant; on millions of rows the naive correlated form is a
                nested loop, and you rewrite it as a join to a grouped derived table (next section) — same answer, one pass.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Correlated evaluation is semantically a nested loop: for each outer tuple, bind the free variable and evaluate the
                inner query. Executed literally that is O(n) inner runs. Real optimizers <em>decorrelate</em>: the correlated
                aggregate here rewrites to <code>weather JOIN (SELECT city, AVG(temp_c) avg FROM weather GROUP BY city) USING
                (city) WHERE temp_c &gt; avg</code> — one grouping pass plus a hash join, O(n). DuckDB's decorrelation is
                aggressive; an <code>EXPLAIN</code> shows the loop gone.
              </p>
              <p>
                Correlated subqueries also express things flat joins cannot without care — per-row top-N, existence with early
                exit (<code>EXISTS</code> stops at the first match), and anti-joins (<code>NOT EXISTS</code>). They are not a
                performance anti-pattern per se; an <em>un-decorrelatable</em> one on a large table is. Know which your engine can
                flatten, and verify with the plan rather than folklore.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={W}
          code={`-- inner query re-runs per outer row: each city compared to ITS OWN average
SELECT w.city, w.day, w.temp_c
FROM weather w
WHERE w.temp_c > (SELECT AVG(w2.temp_c) FROM weather w2 WHERE w2.city = w.city)
ORDER BY w.city, w.day;`}
        />
        <Callout kind="tip" title="Spot correlated vs uncorrelated in one glance">
          Does the inner query mention the outer table's alias? Yes = correlated (per-row, watch cost on big tables). No =
          uncorrelated (runs once, cheap). This single check tells you how a subquery behaves before you read another word of it.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Derived tables and EXISTS: three ways to one answer">
        <p>
          A subquery in the <code>FROM</code> clause is a <GlossaryTerm k="derived-table">derived table</GlossaryTerm> — a query
          used as if it were a real table, alias required. Compute per-city averages once, then filter the result like any table:
        </p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city, avg_temp
FROM (SELECT city, ROUND(AVG(temp_c), 2) AS avg_temp
      FROM weather GROUP BY city) AS per_city
WHERE avg_temp > 25
ORDER BY avg_temp DESC;`}
        />
        <p>
          The same question — &quot;which cities average above 25?&quot; — can be phrased three ways. Run each; all return{' '}
          <strong>Cairo</strong> and <strong>Chennai</strong>. The exercise is the point: subquery, derived table, and join are
          often interchangeable, and readability decides.
        </p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`-- 1) IN over a grouped subquery
SELECT city FROM cities
WHERE city IN (SELECT city FROM weather GROUP BY city HAVING AVG(temp_c) > 25)
ORDER BY city;`}
        />
        <RevealSolution label="Reveal the other two phrasings">
          <CodeBlock
            label="sql"
            code={`-- 2) derived table joined to cities
SELECT c.city
FROM cities c
JOIN (SELECT city, AVG(temp_c) AS a FROM weather GROUP BY city) w ON w.city = c.city
WHERE w.a > 25
ORDER BY c.city;

-- 3) plain join, then GROUP BY + HAVING
SELECT c.city
FROM cities c JOIN weather w ON w.city = c.city
GROUP BY c.city
HAVING AVG(w.temp_c) > 25
ORDER BY c.city;`}
          />
          <p>
            Identical results, different shapes. Phrasing 3 (join + HAVING) is usually the most readable for &quot;group then
            filter the groups&quot;; phrasing 2 (derived table) wins when you need the computed value in the output too. There is
            no universally &quot;correct&quot; form — the optimizer collapses all three to similar plans on data this size.
          </p>
        </RevealSolution>
        <p>
          The existence question — &quot;which weather cities have metadata at all?&quot; — is cleanest with{' '}
          <code>EXISTS</code>, which returns true the instant the inner query finds one row and never multiplies the outer:
        </p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`-- EXISTS stops at the first match; a correlated presence test (a semi-join)
SELECT DISTINCT w.city
FROM weather w
WHERE EXISTS (SELECT 1 FROM cities c WHERE c.city = w.city)
ORDER BY w.city;`}
        />
      </Section>

      <Section kicker="core concepts" title="CASE, NULLIF, and the NOT IN trap">
        <Tiered
          layman={
            <>
              <p>
                <em>CASE</em> is SQL's if/else: as each row passes, it checks conditions top to bottom and stamps on a label — hot,
                warm, cool. The first matching branch wins; anything unmatched falls to <code>ELSE</code>. It turns raw numbers
                into the categories a human actually reads in a report.
              </p>
              <p>
                A close cousin, <em>NULLIF(a, b)</em>, quietly hands back &quot;unknown&quot; when <code>a</code> equals{' '}
                <code>b</code> — its one famous job is turning a zero denominator into a harmless blank so a division does not blow
                up. Small tool, saves a very common crash.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>CASE WHEN temp_c &gt;= 35 THEN 'hot' WHEN temp_c &gt;= 20 THEN 'warm' ELSE 'cool' END</code> evaluates
                branches in order and returns the first true one, so order matters — put the tightest threshold first. CASE is an
                expression, usable in <code>SELECT</code>, <code>WHERE</code>, <code>ORDER BY</code>, and — the high-value move —
                inside an aggregate: <code>SUM(CASE WHEN temp_c &gt;= 35 THEN 1 ELSE 0 END)</code> counts hot days per group in one
                pass (&quot;conditional aggregation&quot;, the backbone of pivot tables).
              </p>
              <p>
                <code>NULLIF(x, 0)</code> returns NULL when <code>x</code> is 0, so <code>a / NULLIF(b, 0)</code> yields NULL
                instead of a divide-by-zero error — the standard guard. Run both below; the second shows a NULL where the
                denominator was zeroed out.
              </p>
            </>
          }
          phd={
            <>
              <p>
                CASE is the only portable conditional in standard SQL and is strictly evaluated left-to-right with short-circuit
                semantics — later branches are not evaluated once one matches, which matters when a branch would error (divide,
                cast). Searched CASE (<code>WHEN condition</code>) subsumes simple CASE (<code>CASE x WHEN value</code>); prefer the
                searched form to sidestep the fact that simple CASE compares with <code>=</code>, which never matches NULL.
              </p>
              <p>
                <code>NULLIF(a, b)</code> is defined as <code>CASE WHEN a = b THEN NULL ELSE a END</code> — pure sugar. Its
                partner <code>COALESCE</code> collapses NULLs to a default; together they let you move a value into and out of the
                NULL space deliberately, which is how you make three-valued logic serve you instead of ambush you — as{' '}
                <code>NOT IN</code> is about to demonstrate.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={W}
          code={`-- CASE for labels, and CASE inside SUM for conditional counting
SELECT city,
       COUNT(*) AS days,
       SUM(CASE WHEN temp_c >= 35 THEN 1 ELSE 0 END) AS hot_days,
       SUM(CASE WHEN temp_c <  20 THEN 1 ELSE 0 END) AS cool_days
FROM weather
GROUP BY city
ORDER BY hot_days DESC, city;`}
        />
        <CodeRunner
          language="sql"
          code={`-- NULLIF guards division: a zero denominator becomes NULL, not an error
SELECT 10 / NULLIF(0, 0) AS divide_by_zero_guarded,
       10 / NULLIF(5, 0) AS normal_division;`}
        />
        <Callout kind="warn" title="The NOT IN NULL trap — run it, do not just read it">
          If the subquery behind <code>NOT IN</code> returns even one NULL, the whole condition can never be TRUE and you get{' '}
          <em>zero rows</em> — silently. The query below should return the four non-Chennai cities; the stray NULL in the list
          poisons it to nothing.
        </Callout>
        <CodeRunner
          language="sql"
          setup={W}
          code={`-- EXPECTED: Berlin, Cairo, Oslo, Seattle. ACTUAL: zero rows — the NULL poisons NOT IN.
SELECT DISTINCT city
FROM weather
WHERE city NOT IN (SELECT city FROM (VALUES ('Chennai'), (NULL)) AS t(city))
ORDER BY city;`}
        />
        <RevealSolution label="Why zero rows, and the fix">
          <p>
            <code>city NOT IN (a, b, NULL)</code> means <code>city &lt;&gt; a AND city &lt;&gt; b AND city &lt;&gt; NULL</code>.
            That last term is UNKNOWN for every row (nothing equals NULL), and <code>TRUE AND UNKNOWN</code> is UNKNOWN — which{' '}
            <code>WHERE</code> discards. So no row can ever pass. This is the same three-valued logic from last lesson, now
            eating an entire result set.
          </p>
          <CodeBlock
            label="sql — two fixes"
            code={`-- Fix A: strip NULLs from the subquery
WHERE city NOT IN (SELECT city FROM candidates WHERE city IS NOT NULL)

-- Fix B (preferred): use NOT EXISTS, which is NULL-safe here
WHERE NOT EXISTS (SELECT 1 FROM candidates c WHERE c.city = weather.city)`}
          />
          <p>
            Habit worth burning in: reach for <code>NOT EXISTS</code> over <code>NOT IN</code> whenever the inner column might be
            nullable. It says the same thing and does not detonate on a single NULL.
          </p>
        </RevealSolution>
      </Section>

      <Section kicker="trade-offs" title="Subquery, join, or CTE?">
        <p>
          You have now seen the same question written three ways, plus a teaser of a fourth. These are not four right answers to
          memorize — they are a readability decision you make per query:
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Subquery (scalar / IN / EXISTS / correlated)',
              strengths: [
                'Inlines a small "answer another question first" step where you need it',
                'EXISTS / NOT EXISTS express existence and anti-joins cleanly and NULL-safely',
                'No extra names to introduce for a one-off value',
              ],
              weaknesses: [
                'Deep nesting reads inside-out and is hard to follow past two levels',
                'Correlated forms can be slow if the engine cannot decorrelate them',
              ],
              chooseWhen: 'a filter needs a computed value or an existence test, and the logic is shallow.',
            },
            {
              name: 'Join + GROUP BY / HAVING',
              strengths: [
                'Familiar, flat shape; the optimizer loves it',
                'Best when you also want columns from the other table in the output',
              ],
              weaknesses: [
                'Duplicate keys can multiply rows and inflate aggregates (last lesson)',
                'A pure existence check via join risks the double-counting a semi-join avoids',
              ],
              chooseWhen: 'you need data from both tables, or you are grouping and filtering the groups.',
            },
            {
              name: 'CTE (WITH …)',
              strengths: [
                'Names each step and reads top-to-bottom like a pipeline',
                'Reuse one computed result in several places without repeating it',
              ],
              weaknesses: [
                'Overkill for a single tiny scalar subquery',
                'Materialization behaviour varies by engine (a Phase 2 concern)',
              ],
              chooseWhen: 'a query has several stages, or a subquery would otherwise be repeated or nested deeply.',
            },
          ]}
          note={
            <>
              The through-line: shallow, one-off → subquery; need both tables' columns → join; multi-stage or repeated →{' '}
              <GlossaryTerm k="cte">CTE</GlossaryTerm>, which is the very first thing in module 1.5 — the &quot;nested monster
              refactor&quot; that turns yesterday's deepest subquery into a readable pipeline.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: rank days against averages, then bucket them">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Back in <code>C:\de-lab\sql-lab</code> against the 120-row <code>weather.duckdb</code> from lesson 1.4.1 (four
              cities — Chennai, Berlin, Seattle, Reykjavik — thirty days each). You will contrast an uncorrelated threshold with a
              correlated per-city one, then label every day with CASE. Predict each count before you run it.
            </p>
          }
          steps={[
            {
              title: 'Scalar subquery: days above the overall average',
              body: (
                <>
                  <p>
                    Count the days whose <code>temp_max</code> beats the single overall average. Open a REPL with{' '}
                    <code>uv run python</code> and use <code>con = duckdb.connect('weather.duckdb')</code>, or run the SQL via the{' '}
                    <code>duckdb</code> CLI.
                  </p>
                  <RevealSolution label="Reveal solution">
                    <CodeBlock
                      label="sql"
                      code={`SELECT COUNT(*) AS above_overall
FROM weather
WHERE temp_max > (SELECT AVG(temp_max) FROM weather);`}
                    />
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  <code>above_overall</code> = <strong>50</strong>. The overall average is ~23.33; hot Chennai contributes all 30
                  of its days, Berlin 16, Seattle 4, Reykjavik 0. One global yardstick, unevenly met.
                </>
              ),
            },
            {
              title: 'Correlated subquery: days above each city’s OWN average',
              body: (
                <>
                  <p>Now give every city its own yardstick. Add the correlation on <code>city</code>:</p>
                  <RevealSolution label="Reveal solution">
                    <CodeBlock
                      label="sql"
                      code={`SELECT city, COUNT(*) AS above_own
FROM weather w
WHERE temp_max > (SELECT AVG(temp_max) FROM weather w2 WHERE w2.city = w.city)
GROUP BY city
ORDER BY city;`}
                    />
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  Every city returns <strong>16</strong> (total <strong>64</strong>). The seed's sawtooth shape is identical per
                  city, so each clears its own average on the same 16 of 30 days — the point being that the per-city question gives
                  a very different answer from the global one in step 1.
                </>
              ),
            },
            {
              title: 'CASE: label every day, then count the bands',
              body: (
                <>
                  <p>Bucket each day and tally the bands. Mind the branch order — tightest threshold first:</p>
                  <RevealSolution label="Reveal solution">
                    <CodeBlock
                      label="sql"
                      code={`SELECT CASE WHEN temp_max >= 30 THEN 'hot'
            WHEN temp_max >= 18 THEN 'warm'
            ELSE 'cool' END AS band,
       COUNT(*) AS days
FROM weather
GROUP BY band
ORDER BY days DESC;`}
                    />
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  <strong>warm 60, hot 30, cool 30</strong>. Chennai's 30 days are all hot, Reykjavik's all cool, Berlin and
                  Seattle fill the warm band. Reorder the WHENs (cool first) and watch the labels go wrong — proof that order
                  decides.
                </>
              ),
            },
            {
              title: 'Conditional aggregation: hot days per city in one pass',
              body: (
                <>
                  <p>Combine CASE with SUM to count hot days per city without a second query:</p>
                  <RevealSolution label="Reveal solution">
                    <CodeBlock
                      label="sql"
                      code={`SELECT city,
       COUNT(*) AS days,
       SUM(CASE WHEN temp_max >= 30 THEN 1 ELSE 0 END) AS hot_days
FROM weather
GROUP BY city
ORDER BY hot_days DESC, city;`}
                    />
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  <strong>Chennai 30</strong> hot days; Berlin, Reykjavik, Seattle <strong>0</strong>. This{' '}
                  <code>SUM(CASE …)</code> pattern is how every pivot / crosstab report is built — remember it for module 1.5's
                  pivots and for project P1's summaries.
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
              q: 'What makes a subquery "correlated"?',
              options: [
                'It returns more than one row',
                'It references a column from the outer query',
                'It appears in the FROM clause',
                'It uses an aggregate function',
              ],
              answer: 1,
              explain: 'Correlated = the inner query mentions the outer row (e.g. WHERE w2.city = w.city), so it is logically re-evaluated per outer row. Uncorrelated subqueries ignore the outer row and run once.',
            },
            {
              q: 'A scalar subquery used as WHERE temp_c > (SELECT ...) must return...',
              options: [
                'exactly one row and one column',
                'one column, any number of rows',
                'any relation with an alias',
                'the same columns as the outer query',
              ],
              answer: 0,
              explain: 'Scalar context needs a single value; a second row raises a runtime error. IN accepts one column with many rows; FROM accepts any aliased relation.',
            },
            {
              q: 'WHERE city NOT IN (SELECT city FROM candidates) returned zero rows unexpectedly. The most likely cause is...',
              options: [
                'candidates is empty',
                'candidates contains a NULL city, making NOT IN never TRUE',
                'NOT IN is not valid SQL',
                'the outer table has duplicate cities',
              ],
              answer: 1,
              explain: 'A NULL in the NOT IN set introduces "x <> NULL" = UNKNOWN, and TRUE AND UNKNOWN = UNKNOWN, which WHERE discards for every row. Strip NULLs or use NOT EXISTS, which is NULL-safe.',
            },
            {
              q: 'In CASE WHEN t >= 20 THEN \'warm\' WHEN t >= 35 THEN \'hot\' ELSE \'cool\' END, a temperature of 38 is labelled...',
              options: ["'hot'", "'warm'", "'cool'", 'NULL'],
              answer: 1,
              explain: 'CASE returns the first branch that is true, top to bottom. 38 satisfies t >= 20 first, so it is labelled warm — the classic branch-order bug. Put the tightest threshold (>= 35) first.',
            },
            {
              q: 'You want "weather rows whose city has metadata", each city once, with no risk of row inflation. Best tool?',
              options: [
                'INNER JOIN on city',
                'EXISTS (a semi-join)',
                'FULL JOIN on city',
                'CROSS JOIN',
              ],
              answer: 1,
              explain: 'EXISTS returns each outer row at most once and stops at the first match — a semi-join. An inner join could multiply rows if the metadata side had duplicate keys.',
            },
            {
              q: 'Why write a / NULLIF(b, 0) instead of a / b?',
              options: [
                'It is faster',
                'It returns NULL instead of erroring when b is 0',
                'It rounds the result',
                'It ignores NULL values in a',
              ],
              answer: 1,
              explain: 'NULLIF(b, 0) yields NULL when b is 0, and division by NULL is NULL — a safe "no answer" rather than a divide-by-zero crash. It is sugar for CASE WHEN b = 0 THEN NULL ELSE b END.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'When would you use a correlated subquery, and what is the performance concern?',
            a: (
              <p>
                Use one when each outer row needs a value computed from its own group or a per-row existence test — &quot;days
                above that city's average&quot;, &quot;customers with at least one order&quot;. The concern is that it is
                logically a nested loop (re-evaluated per outer row), so on large tables it can be O(n) inner runs. Modern
                optimizers <em>decorrelate</em> most of them into joins against a grouped subquery, but not all; strong answers
                say &quot;I'd check the plan, and rewrite as a join to a derived table if it can't be flattened.&quot;
              </p>
            ),
          },
          {
            q: 'A NOT IN subquery is returning no rows even though you expect some. What happened?',
            a: (
              <p>
                The subquery almost certainly contains a NULL. <code>NOT IN</code> expands to a chain of{' '}
                <code>&lt;&gt;</code> tests ANDed together, and any comparison with NULL is UNKNOWN, so the whole predicate is
                never TRUE and every row is filtered out. Fix by excluding NULLs from the subquery or, better, using{' '}
                <code>NOT EXISTS</code>, which handles NULLs correctly. This is a favourite trap question because it is silent —
                no error, just wrong results.
              </p>
            ),
          },
          {
            q: 'How do you count how many rows meet a condition, per group, in a single query?',
            a: (
              <p>
                Conditional aggregation: <code>SUM(CASE WHEN condition THEN 1 ELSE 0 END)</code> inside a{' '}
                <code>GROUP BY</code> (or <code>COUNT(CASE WHEN condition THEN 1 END)</code>, since COUNT skips NULLs). It counts
                matches per group in one pass, and multiple such expressions side by side build a pivot table. It beats running a
                separate filtered query per category.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A subquery answers an inner question first: scalar (one value, compare against it), IN/EXISTS (a set or existence test), or a FROM-clause derived table (a query used as a table).</>,
          <>Correlated = the inner query references the outer row, so it is re-evaluated per row; uncorrelated runs once. The tell is an outer alias inside the inner query.</>,
          <>Optimizers decorrelate most correlated subqueries into joins; the danger is only an un-decorrelatable one on a big table — check the plan, rewrite to a derived-table join if needed.</>,
          <>NOT IN with a NULL in the subquery silently returns zero rows (three-valued logic). Prefer NOT EXISTS, which is NULL-safe.</>,
          <>CASE is SQL's if/else expression: first true branch wins, so order thresholds tightest-first. Inside SUM it does conditional aggregation — the pivot-table backbone.</>,
          <>NULLIF(x, 0) turns a value into NULL on a match — its classic use is guarding division by zero. Subquery vs join vs CTE is a readability choice; CTEs open module 1.5.</>,
        ]}
      />
    </>
  )
}
