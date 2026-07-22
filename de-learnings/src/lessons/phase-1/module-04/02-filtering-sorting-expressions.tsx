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

const ID = '1.4.2'

// Same 20-row table as 1.4.1, but two precip readings are NULL (sensor outage).
const W = `CREATE OR REPLACE TABLE weather AS SELECT * FROM (VALUES
  ('Chennai', DATE '2026-06-01', 36, 28, 0.0), ('Chennai', DATE '2026-06-02', 37, 29, 0.0), ('Chennai', DATE '2026-06-03', 38, 29, 4.2), ('Chennai', DATE '2026-06-04', 39, 30, NULL), ('Chennai', DATE '2026-06-05', 35, 28, 12.5),
  ('Berlin', DATE '2026-06-01', 22, 13, 1.2), ('Berlin', DATE '2026-06-02', 24, 14, 0.0), ('Berlin', DATE '2026-06-03', 19, 12, 8.4), ('Berlin', DATE '2026-06-04', 21, 11, 0.6), ('Berlin', DATE '2026-06-05', 25, 15, 0.0),
  ('Seattle', DATE '2026-06-01', 18, 11, 2.5), ('Seattle', DATE '2026-06-02', 17, 10, 6.1), ('Seattle', DATE '2026-06-03', 21, 12, NULL), ('Seattle', DATE '2026-06-04', 19, 11, 0.3), ('Seattle', DATE '2026-06-05', 16, 9, 9.8),
  ('Reykjavik', DATE '2026-06-01', 12, 6, 3.1), ('Reykjavik', DATE '2026-06-02', 11, 5, 5.6), ('Reykjavik', DATE '2026-06-03', 14, 7, 0.0), ('Reykjavik', DATE '2026-06-04', 10, 4, 7.4), ('Reykjavik', DATE '2026-06-05', 13, 6, 1.0)
) AS t(city, day, temp_max, temp_min, precip_mm);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Most queries are questions with conditions">
        <p>
          &quot;Show me the weather&quot; is rarely the question. &quot;<em>Berlin's</em> weather&quot;, &quot;days over 38
          degrees&quot;, &quot;rainy days in week one&quot; — real questions have conditions. <code>WHERE</code> states them:
        </p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city, day, temp_max, precip_mm
FROM weather
WHERE city = 'Berlin'
ORDER BY day;`}
        />
        <Tiered
          layman={
            <>
              <p>
                WHERE is a bouncer at the door: every row walks up, the bouncer checks the condition, and only rows answering
                &quot;yes&quot; get into your result. Twenty rows arrived; only Berlin's five passed. The condition can be
                anything checkable per row: equals this city, hotter than that number, between these dates.
              </p>
              <p>
                Conditions combine: &quot;Berlin AND rainy&quot;, &quot;Berlin OR Seattle&quot;, &quot;NOT rainy&quot;. Getting
                combinations right is where beginners get burned — a whole section below covers the classic mistake.
              </p>
            </>
          }
          student={
            <>
              <p>
                WHERE evaluates a boolean expression per row, keeping rows where it is <em>true</em>. It runs conceptually{' '}
                <em>before</em> SELECT — so you filter on <code>temp_max</code>, not on an alias like <code>high_c</code> defined
                in the SELECT list. Text literals use single quotes (<code>'Berlin'</code>) and comparison is case-sensitive:{' '}
                <code>'berlin'</code> matches nothing here.
              </p>
              <p>
                The operator families to drill: comparisons (<code>=</code>, <code>&lt;&gt;</code>, <code>&lt;</code>,{' '}
                <code>&gt;=</code> ...), range (<code>BETWEEN</code>), membership (<code>IN</code>), patterns (<code>LIKE</code>/
                <code>ILIKE</code>). Each is a plain expression producing true or false — no magic, just vocabulary.
              </p>
            </>
          }
          phd={
            <>
              <p>
                WHERE is relational <em>selection</em>, and predicates have real evaluation cost: vectorized, but still linear in
                candidate rows. What saves you at scale is a <em>sargable</em> predicate — shaped so ordering, indexes, or
                min/max zone maps can skip data entirely. <code>day BETWEEN x AND y</code> can skip whole chunks;{' '}
                <code>LIKE '%burg'</code> cannot, because a leading wildcard defeats any ordering on the column. Same semantics,
                wildly different physics — lesson 2.2 measures this.
              </p>
              <p>
                Preview of the next lesson's minefield: SQL booleans are three-valued. Comparing against NULL yields UNKNOWN, and
                WHERE keeps only <em>true</em> rows. Two precip readings here are NULL — watch row counts around them today; full
                treatment in lesson 1.4.4.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The operator families">
        <p>
          Comparisons and ranges. <code>&lt;&gt;</code> means &quot;not equal&quot; (<code>!=</code> also works).{' '}
          <code>BETWEEN</code> is inclusive on both ends. Try narrowing the date range:
        </p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city, day, temp_max
FROM weather
WHERE city <> 'Chennai' AND temp_max < 15
  AND day BETWEEN DATE '2026-06-01' AND DATE '2026-06-05'
ORDER BY temp_max;`}
        />
        <p>
          Membership and patterns. <code>IN</code> replaces a chain of ORs. <code>LIKE</code> matches patterns — <code>%</code>{' '}
          is &quot;any characters&quot;, <code>_</code> &quot;exactly one&quot; — case-sensitively; <code>ILIKE</code> ignores
          case. Swap ILIKE for LIKE below and watch Berlin vanish (its <code>r</code> is lowercase):
        </p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT DISTINCT city
FROM weather
WHERE city ILIKE '%R%'
ORDER BY city;`}
        />
        <p>
          That query also introduced <code>DISTINCT</code>: without it you would get one row per matching weather day (ten), not
          one per city (two).
        </p>
      </Section>

      <Section kicker="core concepts" title="AND, OR, NOT — and the precedence trap">
        <p>
          This query is <em>wrong on purpose</em>. The analyst wanted &quot;days in Berlin or Seattle with more than 5 mm of
          rain&quot; — but it returns 7 rows, including bone-dry Berlin days. Run it, see the damage, then fix it so it returns
          exactly 3 rows:
        </p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city, day, precip_mm
FROM weather
WHERE city = 'Berlin' OR city = 'Seattle' AND precip_mm > 5
ORDER BY city, day;`}
        />
        <RevealSolution label="Reveal the fix">
          <p>
            <code>AND</code> binds tighter than <code>OR</code>, so the engine read{' '}
            <code>Berlin OR (Seattle AND precip_mm &gt; 5)</code> — all of Berlin sneaks in. Parenthesize the OR:
          </p>
          <CodeBlock
            label="sql"
            code={`SELECT city, day, precip_mm
FROM weather
WHERE (city = 'Berlin' OR city = 'Seattle') AND precip_mm > 5
ORDER BY city, day;`}
          />
          <p>Three rows: Berlin June 3, Seattle June 2 and 5. Tidier still: <code>city IN ('Berlin', 'Seattle') AND precip_mm &gt; 5</code>.</p>
        </RevealSolution>
        <Callout kind="warn" title="House rule: parenthesize every mixed AND/OR">
          Precedence bugs do not error — they return plausible wrong answers, the worst failure mode in data work. Whenever one
          WHERE mixes AND with OR, add parentheses even when technically redundant.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Sorting on multiple keys, CAST, and functions">
        <Tiered
          layman={
            <>
              <p>
                Sorting can use several tie-breakers, like a filing cabinet sorted by last name, then first name. &quot;Sort by
                city, and within each city put the wettest day first&quot; is two sort keys, each with its own direction. When a
                value is missing entirely, you decide whether the missing ones sit at the top or bottom of the list.
              </p>
              <p>
                Data also arrives wearing the wrong costume — numbers stored as text, dates as strings. Converting between types
                is casting. Polite casting fails loudly; a forgiving variant shrugs and records the failure as a missing value
                instead of crashing.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>ORDER BY city ASC, precip_mm DESC</code> sorts by city, breaking ties by rainfall. Each key takes its own
                direction, plus <code>NULLS FIRST</code>/<code>NULLS LAST</code>. DuckDB defaults to NULLS LAST, but engines
                disagree (Postgres treats NULL as largest), so portable code writes it explicitly — another &quot;undefined
                unless stated&quot; lesson.
              </p>
              <p>
                <code>CAST(x AS type)</code> converts (<code>x::type</code> is shorthand); <code>TRY_CAST</code> yields NULL
                instead of an error on garbage — a pipeline that quarantines a bad row instead of crashing on it. Everyday scalar
                functions: <code>round</code>, <code>upper</code>/<code>lower</code>, <code>length</code>, <code>||</code> for
                concatenation.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Multi-key sort is lexicographic ordering over tuples; cost is O(n log n) in the <em>filtered</em> row count — one
                more reason WHERE runs before ORDER BY (the optimizer guarantees the reordering is legal). NULL placement is not
                cosmetic: totals-at-the-bottom reports and window frames (module 1.5) both change meaning with it.
              </p>
              <p>
                Casting is where type theory meets dirty data. Implicit coercions differ across engines; explicit CAST documents
                intent and pins semantics. TRY_CAST is the load-time idiom: total functions over partial ones, failures
                materialized as NULLs you can count, audit, and route to quarantine tables — a pattern you build for real in
                project P1.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={W}
          code={`-- two sort keys (flip NULLS LAST to NULLS FIRST), plus casts and functions:
-- TRY_CAST forgives garbage; plain CAST would error
SELECT city || ' / ' || CAST(day AS VARCHAR) AS label,
       round(precip_mm / 25.4, 2) AS precip_inches,
       TRY_CAST('21C' AS INTEGER) AS parse_junk
FROM weather
ORDER BY city ASC, precip_mm DESC NULLS LAST;`}
        />
        <p>
          The three-valued-logic preview in the flesh: 20 rows, but the two conditions below account for only 18. Where did the
          NULL-precip rows go? (Lesson 1.4.4 answers properly.)
        </p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT (SELECT COUNT(*) FROM weather WHERE precip_mm > 5)       AS wet,
       (SELECT COUNT(*) FROM weather WHERE NOT (precip_mm > 5)) AS dry,
       (SELECT COUNT(*) FROM weather)                           AS total;`}
        />
      </Section>

      <Section kicker="trade-offs" title="Filter in SQL, or fetch everything and filter in Python?">
        <p>You could <code>SELECT *</code>, pull every row into Python, and filter there. Sometimes people do. The honest comparison:</p>
        <Tradeoffs
          options={[
            {
              name: 'Filter in the database (pushdown)',
              strengths: [
                'Only matching rows cross the wire — less transfer, less RAM',
                'The engine can skip data via ordering, zone maps, indexes',
                'The filter is visible in the query — auditable in one place',
              ],
              weaknesses: [
                'Complex conditions (regex against reference data, model scores) can outgrow SQL',
                'Debugging a 12-condition WHERE is less interactive than stepping through Python',
              ],
              chooseWhen: 'almost always — make this your default and deviate knowingly.',
            },
            {
              name: 'Fetch all, filter in Python',
              strengths: [
                'Arbitrary logic: any library, any custom function',
                'One fetch can serve many downstream filters while iterating',
              ],
              weaknesses: [
                'Ships every row to the client first — network, memory, and time paid up front',
                'At warehouse scale this is the difference between seconds and never',
              ],
              chooseWhen: 'the dataset is small, or the condition genuinely cannot be expressed in SQL.',
            },
          ]}
          note={
            <>
              The principle is <em>predicate pushdown</em>: move the filter as close to the data as possible. It reappears when
              DuckDB skips Parquet row groups, when Spark prunes partitions (Phase 4), and when a{' '}
              <GlossaryTerm k="data-warehouse">warehouse</GlossaryTerm> bill depends on bytes scanned.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: six questions, exact answers">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Against the 120-row <code>weather.duckdb</code> from lesson 1.4.1 (in <code>C:\de-lab\sql-lab</code>). Write each
              query yourself before revealing the solution — checkpoints are exact values, so you will know if yours is right.
            </p>
          }
          steps={[
            {
              title: 'Set up a reusable query runner',
              body: (
                <>
                  <p>Create <code>q.py</code> — edit the QUERY string for each question, then rerun:</p>
                  <CodeBlock
                    label="q.py"
                    code={`import duckdb

QUERY = """
SELECT COUNT(*) AS n FROM weather
"""
duckdb.connect("weather.duckdb").sql(QUERY).show()`}
                  />
                </>
              ),
              commands: [{ ps: 'cd C:\\de-lab\\sql-lab\nuv run python q.py' }],
              checkpoint: <>Prints <code>n</code> = <strong>120</strong>. Your editing loop for the six questions is ready.</>,
            },
            {
              title: 'Q1 — How many days did Chennai top 38 degrees?',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT COUNT(*) AS n FROM weather WHERE city = 'Chennai' AND temp_max > 38;`} />
                </RevealSolution>
              ),
              checkpoint: <><code>n</code> = <strong>4</strong>.</>,
            },
            {
              title: 'Q2 — The single hottest day in the dataset (city, day, temp)',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT city, day, temp_max FROM weather ORDER BY temp_max DESC, day LIMIT 1;`} />
                  <p>The tie-breaker on <code>day</code> makes the answer deterministic — 39 occurs four times.</p>
                </RevealSolution>
              ),
              checkpoint: <><strong>Chennai, 2026-06-07, 39</strong>.</>,
            },
            {
              title: 'Q3 — How many rainy days did Seattle have?',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT COUNT(*) AS n FROM weather WHERE city = 'Seattle' AND precip_mm > 0;`} />
                </RevealSolution>
              ),
              checkpoint: <><code>n</code> = <strong>10</strong>.</>,
            },
            {
              title: 'Q4 — The distinct rainfall amounts on rainy Berlin days, smallest first',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT DISTINCT precip_mm FROM weather WHERE city = 'Berlin' AND precip_mm > 0 ORDER BY precip_mm;`} />
                </RevealSolution>
              ),
              checkpoint: <>Exactly three values: <strong>6.0, 7.0, 8.0</strong>.</>,
            },
            {
              title: 'Q5 — Rows between June 10 and June 14 (inclusive) with a low under 10 degrees',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock
                    label="sql"
                    code={`SELECT city, day, temp_min FROM weather
WHERE day BETWEEN DATE '2026-06-10' AND DATE '2026-06-14' AND temp_min < 10
ORDER BY day;`}
                  />
                </RevealSolution>
              ),
              checkpoint: <><strong>4 rows, all Reykjavik</strong> (June 10–13).</>,
            },
            {
              title: 'Q6 — Which cities contain the letter r, case-insensitive? And uppercase R, case-sensitive?',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT DISTINCT city FROM weather WHERE city ILIKE '%r%' ORDER BY city;  -- then LIKE '%R%'`} />
                </RevealSolution>
              ),
              checkpoint: <>ILIKE: <strong>Berlin, Reykjavik</strong>. LIKE <code>'%R%'</code>: <strong>Reykjavik</strong> only.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: "WHERE city = 'Berlin' OR city = 'Seattle' AND precip_mm > 5 returns all Berlin rows because...",
              options: [
                'OR is evaluated left to right before AND',
                'AND binds tighter, so the condition is Berlin OR (Seattle AND rainy)',
                'string comparisons ignore later conditions',
                'precip_mm is NULL for Berlin',
              ],
              answer: 1,
              explain: 'AND has higher precedence than OR, like multiplication over addition. The fix: (Berlin OR Seattle) AND rainy. House rule: parenthesize every mixed AND/OR.',
            },
            {
              q: "Which filter can best exploit data ordering or min/max metadata to skip reading data?",
              options: [
                "name LIKE '%son'",
                "day BETWEEN DATE '2026-06-01' AND DATE '2026-06-07'",
                'upper(city) = upper(input) with unknown input',
                "NOT (city ILIKE '%a%')",
              ],
              answer: 1,
              explain: 'A bounded range on an orderable column is sargable: sorted data and min/max zone maps can prove whole chunks irrelevant. A leading % wildcard could match anything, so every row must be checked.',
            },
            {
              q: 'With two NULLs in precip_mm, COUNT of rows WHERE precip_mm > 5 plus COUNT WHERE NOT (precip_mm > 5) gave 18, not 20, because...',
              options: [
                'the two NULL rows were deleted by the first query',
                'NULL comparisons are UNKNOWN, and WHERE keeps only TRUE rows — so NULL rows pass neither filter',
                'COUNT ignores duplicate values',
                'NOT flips UNKNOWN to TRUE',
              ],
              answer: 1,
              explain: 'NULL > 5 is UNKNOWN, and NOT UNKNOWN is still UNKNOWN. Neither filter evaluates to TRUE for those rows, so both drop them. Full treatment in lesson 1.4.4.',
            },
            {
              q: 'Why default to filtering in the database rather than fetching everything into Python?',
              options: [
                'Python cannot express boolean conditions',
                'SQL filters are always bug-free',
                'only matching rows cross the wire, and the engine can skip data it can prove irrelevant',
                'databases forbid SELECT * queries',
              ],
              answer: 2,
              explain: 'Predicate pushdown: move the filter to the data. Less transfer, less client memory, and the engine can use ordering/statistics to avoid reads entirely. Fetch-then-filter pays full price up front.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What does it mean for a predicate to be sargable, and why care?',
            a: (
              <p>
                Sargable predicates are shaped so the engine can use ordering, indexes, or min/max statistics to skip data —
                bounded ranges and equality on bare columns qualify; leading-wildcard LIKE and functions wrapped around the
                column usually do not. At scale that is reading a slice versus scanning everything, so tuning often starts by
                rewriting predicates into sargable form.
              </p>
            ),
          },
          {
            q: 'A report should include rows from city A or city B with amount over a threshold. What bug do you check first?',
            a: (
              <p>
                Operator precedence: <code>A OR B AND amount &gt; t</code> silently becomes <code>A OR (B AND ...)</code>,
                letting every A row through unfiltered. It returns plausible numbers, so it survives review. The habit:
                parentheses around any mixed AND/OR, plus a row-count sanity check against expectations.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>WHERE keeps rows whose condition is TRUE; it runs before SELECT, so filter on columns, not aliases.</>,
          <>Operator families: comparisons, BETWEEN (inclusive), IN, LIKE/ILIKE. Case matters in = and LIKE.</>,
          <>AND binds tighter than OR — parenthesize every mixed condition; precedence bugs return wrong answers, not errors.</>,
          <>ORDER BY takes multiple keys, per-key direction, and explicit NULLS FIRST/LAST; DISTINCT deduplicates results.</>,
          <>CAST converts types loudly, TRY_CAST quietly to NULL — the difference between crashing and quarantining bad data.</>,
          <>Push filters to the database (predicate pushdown) — the module's recurring theme.</>,
        ]}
      />
    </>
  )
}
