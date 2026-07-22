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
import { BenchBars } from '../../../viz/BenchBars'

const ID = '1.4.3'

// 20-row weather table; two precip readings are NULL (sensor outage) — aggregates must cope.
const W = `CREATE OR REPLACE TABLE weather AS SELECT * FROM (VALUES
  ('Chennai', DATE '2026-06-01', 36, 28, 0.0), ('Chennai', DATE '2026-06-02', 37, 29, 0.0), ('Chennai', DATE '2026-06-03', 38, 29, 4.2), ('Chennai', DATE '2026-06-04', 39, 30, NULL), ('Chennai', DATE '2026-06-05', 35, 28, 12.5),
  ('Berlin', DATE '2026-06-01', 22, 13, 1.2), ('Berlin', DATE '2026-06-02', 24, 14, 0.0), ('Berlin', DATE '2026-06-03', 19, 12, 8.4), ('Berlin', DATE '2026-06-04', 21, 11, 0.6), ('Berlin', DATE '2026-06-05', 25, 15, 0.0),
  ('Seattle', DATE '2026-06-01', 18, 11, 2.5), ('Seattle', DATE '2026-06-02', 17, 10, 6.1), ('Seattle', DATE '2026-06-03', 21, 12, NULL), ('Seattle', DATE '2026-06-04', 19, 11, 0.3), ('Seattle', DATE '2026-06-05', 16, 9, 9.8),
  ('Reykjavik', DATE '2026-06-01', 12, 6, 3.1), ('Reykjavik', DATE '2026-06-02', 11, 5, 5.6), ('Reykjavik', DATE '2026-06-03', 14, 7, 0.0), ('Reykjavik', DATE '2026-06-04', 10, 4, 7.4), ('Reykjavik', DATE '2026-06-05', 13, 6, 1.0)
) AS t(city, day, temp_max, temp_min, precip_mm);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="From rows to answers">
        <p>
          Nobody asks for 120 weather rows. They ask &quot;how hot was it?&quot;, &quot;how much rain total?&quot; — one
          number summarizing many rows. Aggregate functions collapse a column of values into a single value:</p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT COUNT(*)                AS days,
       ROUND(AVG(temp_max), 2) AS avg_high,
       MAX(temp_max)           AS hottest,
       MIN(temp_min)           AS coldest,
       SUM(precip_mm)          AS total_rain_mm
FROM weather;`}
        />
        <Tiered
          layman={
            <>
              <p>
                Picture a shoebox of receipts at tax time. Nobody reads receipts; they want totals. You sort receipts into
                piles — groceries, fuel, rent — and total each pile. Aggregation is exactly that: COUNT is &quot;how many
                receipts&quot;, SUM &quot;how much altogether&quot;, AVG, MIN, MAX what they sound like.
              </p>
              <p>
                The query above made one big pile of the whole table and produced one summary row. The piles come next —{' '}
                <em>GROUP BY</em>: one summary row per city, per day, per anything you name.
              </p>
            </>
          }
          student={
            <>
              <p>
                An aggregate function (<code>COUNT</code>, <code>SUM</code>, <code>AVG</code>, <code>MIN</code>,{' '}
                <code>MAX</code>) consumes many rows and emits one value. With no GROUP BY, the whole table is one group — one
                row back. Aggregates accept expressions: <code>AVG(temp_max - temp_min)</code> is the mean daily swing.
              </p>
              <p>
                This is the workhorse of analytics and pipelines alike: quality checks (row counts, null counts), summary
                tables, dashboards. Every &quot;daily summary&quot; job in existence — including the one you ship in project P1
                — is a GROUP BY wearing a scheduler.
              </p>
            </>
          }
          phd={
            <>
              <p>
                An aggregate is a fold over a multiset. What makes aggregates fast at scale is <em>decomposability</em>: SUM,
                COUNT, MIN, MAX form commutative monoids, so partials over chunks merge into the exact final answer. AVG is not
                a monoid on its own — engines carry (sum, count) pairs and divide at the end. That decomposition is precisely
                what lets Phase 4's distributed engines merge partials across machines.
              </p>
              <p>
                Physically, ungrouped aggregation is one streaming pass with a handful of accumulators — O(n) time, O(1)
                memory. Grouped aggregation needs state per group: hash tables, two sections down.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="COUNT(*) vs COUNT(column): NULLs change answers">
        <Tiered
          layman={
            <>
              <p>
                Two rain readings are missing — sensor down, cell blank. So &quot;how many days are in the table?&quot; and
                &quot;how many rain <em>readings</em> do I have?&quot; are different questions with different answers (20, 18).
              </p>
              <p>
                Averages quietly follow the same rule: average rainfall is computed over the 18 readings that exist, not 20
                days. Usually that is what you want — but always know which question you asked.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>COUNT(*)</code> counts <em>rows</em>. <code>COUNT(col)</code> counts <em>non-NULL values</em>.{' '}
                <code>COUNT(DISTINCT col)</code> counts unique non-NULLs. Every other aggregate skips NULLs entirely, so{' '}
                <code>AVG(precip_mm)</code> is a sum over 18 values divided by 18, not 20.
              </p>
              <p>
                The classic bug: hand-computing <code>SUM(x) / COUNT(*)</code> and getting a lower number than{' '}
                <code>AVG(x)</code>. Neither is wrong — per-day vs per-reading are different questions — but dashboards have
                shipped the wrong one. <code>COUNT(*) - COUNT(col)</code> is your instant missing-data detector.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The SQL standard defines aggregates over the multiset of non-NULL inputs (COUNT(*) excepted). Deliberate
                design: treating NULL as &quot;unknown&quot; would poison any SUM containing one. Skipping preserves usefulness
                at the cost of a silently shifting denominator — a bias hazard when nulls are not missing-at-random (dead
                sensors correlate with storms).
              </p>
              <p>
                Note the asymmetry with WHERE: predicates <em>drop</em> UNKNOWN rows; aggregates <em>skip</em> NULL values but
                keep rows. Same three-valued logic, different consumption points. Full treatment next lesson.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT COUNT(*)                            AS rows,
       COUNT(precip_mm)                    AS readings,
       COUNT(DISTINCT city)                AS cities,
       ROUND(AVG(precip_mm), 3)            AS avg_per_reading,
       ROUND(SUM(precip_mm) / COUNT(*), 3) AS avg_per_day
FROM weather;`}
        />
        <p>20 rows, 18 readings — two different &quot;averages&quot; (3.483 vs 3.135), both defensible. Know which one you shipped.</p>
      </Section>

      <Section kicker="core concepts" title="GROUP BY: one summary row per pile">
        <Tiered
          layman={
            <>
              <p>
                GROUP BY names the piles. &quot;By city&quot; makes four piles and totals each; &quot;by city and by whether it
                rained&quot; splits each city's pile in two. Every row lands in exactly one pile; you get one summary row per
                pile.
              </p>
              <p>
                One rule keeps you honest: everything you show must be the pile's label or a total computed over the pile.
                You cannot show &quot;the day&quot; of a whole pile — which day would it be? The database refuses to guess.</p>
            </>
          }
          student={
            <>
              <p>
                <code>GROUP BY city</code> partitions rows; aggregates run per group. The iron rule: every SELECT column must
                be in the GROUP BY or inside an aggregate — otherwise an error (the engine will not pick an arbitrary row).
                Multiple keys partition by the combination; grouping by <em>expressions</em> is allowed.
              </p>
              <p>
                Watch the multi-key runner: grouping by <code>precip_mm &gt; 0</code> yields groups for true, false — <em>and
                NULL</em>, the two unknown readings forming their own pile. GROUP BY treats NULLs as one group (unlike{' '}
                <code>=</code>, which never matches NULL — next lesson dissects that).
              </p>
            </>
          }
          phd={
            <>
              <p>
                Physically this is <em>hash aggregation</em>: a hash table keyed by grouping columns, each entry holding
                accumulator state; stream, probe, update — O(n) with O(groups) memory. The alternative, <em>sort
                aggregation</em>, sorts by key and emits on key change: worse asymptotically, but cache- and spill-friendly,
                with sorted output free. Optimizers pick per query; oversized hash tables partition and spill.
              </p>
              <p>
                The iron rule has algebraic teeth: SELECT columns must be functionally determined by the grouping key. SQL
                cannot verify arbitrary functional dependencies, so it demands syntactic membership — annoying at times, always
                sound.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city,
       COUNT(*)                AS days,
       ROUND(AVG(temp_max), 1) AS avg_high,
       SUM(precip_mm)          AS total_mm
FROM weather
GROUP BY city
ORDER BY avg_high DESC;`}
        />
        <p>Now two keys — one an expression. Note the NULL group; then try removing <code>precip_mm &gt; 0</code> from the GROUP BY and read the error:</p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city, precip_mm > 0 AS rained, COUNT(*) AS days
FROM weather
GROUP BY city, precip_mm > 0
ORDER BY city, rained;`}
        />
      </Section>

      <Section kicker="core concepts" title="HAVING vs WHERE, and conditional aggregation">
        <p>This query is broken on purpose: it wants cities with over 15 mm of total rain. Run it, read the error, fix it:</p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city, SUM(precip_mm) AS total_mm
FROM weather
WHERE SUM(precip_mm) > 15
GROUP BY city;`}
        />
        <RevealSolution label="Reveal the fix">
          <CodeBlock
            label="sql"
            code={`SELECT city, SUM(precip_mm) AS total_mm
FROM weather
GROUP BY city
HAVING SUM(precip_mm) > 15;`}
          />
          <p>
            Three rows: Chennai (16.7), Seattle (18.7), Reykjavik (17.1) — Berlin's 10.2 is out. WHERE filters <em>rows before
            grouping</em>; HAVING filters <em>groups after aggregation</em>.
          </p>
        </RevealSolution>
        <Callout kind="info" title="The logical order of a query">
          FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY/LIMIT. You write SELECT first, but it runs near last — exactly why
          WHERE cannot see aggregates and why SELECT aliases work in ORDER BY but not in WHERE.
        </Callout>
        <p>Conditional aggregation summarizes a subset in one pass. <code>FILTER</code> is the readable modern form; CASE-inside-SUM the classic that works everywhere:</p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city,
       COUNT(*) FILTER (WHERE precip_mm > 0)                AS rainy_days,
       SUM(CASE WHEN precip_mm > 0 THEN 1 ELSE 0 END)       AS rainy_days_case,
       ROUND(AVG(temp_max) FILTER (WHERE precip_mm = 0), 1) AS avg_high_dry
FROM weather
GROUP BY city
ORDER BY city;`}
        />
      </Section>

      <Section kicker="trade-offs" title="Aggregate in the database, or in application code?">
        <p>You could fetch 120 rows into Python and loop with a dict of accumulators — you built exactly that in module 1.2. Now you own both tools:</p>
        <BenchBars
          title="Rows shipped to the client for a per-city summary"
          items={[
            { label: 'Fetch all, aggregate in Python', value: 120, unit: 'rows' },
            { label: 'GROUP BY in DuckDB', value: 4, unit: 'rows', note: 'one per city' },
          ]}
          betterIs="lower"
          caption="At 120 rows nobody cares. At 120 million, shipping raw rows is the difference between a dashboard and an outage."
        />
        <Tradeoffs
          options={[
            {
              name: 'Aggregate in the database',
              strengths: [
                'Ships only summary rows; scans data where it lives',
                'Declarative, optimizable, parallelizable — and one auditable place for a metric definition',
              ],
              weaknesses: [
                'Exotic aggregations (custom stats, model-driven) may not exist in SQL',
                'Debugging intermediate state is harder than printing in a loop',
              ],
              chooseWhen: 'the default — especially for anything feeding reports or downstream tables.',
            },
            {
              name: 'Aggregate in application code',
              strengths: [
                'Any logic Python can express, with full debugging visibility',
                'Fine when data is already in memory for other reasons',
              ],
              weaknesses: [
                'Pays transfer and memory for every raw row first',
                'Hand-rolled accumulators reinvent (buggier) GROUP BY',
              ],
              chooseWhen: 'small in-memory data, or aggregation logic SQL genuinely cannot express.',
            },
          ]}
          note={
            <>Last lesson's pushdown principle, now for computation: <em>move the aggregation to the data</em>. Warehouses exist largely because this stays true at terabyte scale.</>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: the daily-summary queries you will ship in P1">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Against <code>weather.duckdb</code> in <code>C:\de-lab\sql-lab</code>, via your <code>q.py</code> runner from
              lesson 1.4.2. These queries mirror the summary step of your first <GlossaryTerm k="etl">ETL</GlossaryTerm> (P1
              milestone M5) — write each before revealing.
            </p>
          }
          steps={[
            {
              title: 'Per-city summary: days, average high, total rain',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT city, COUNT(*) AS days, ROUND(AVG(temp_max), 1) AS avg_high, SUM(precip_mm) AS total_mm
FROM weather GROUP BY city ORDER BY city;`} />
                </RevealSolution>
              ),
              checkpoint: (
                <>
                  4 rows, each days = 30: Berlin <strong>23.8 / 48.0</strong>, Chennai <strong>35.8 / 42.0</strong>, Reykjavik{' '}
                  <strong>12.8 / 60.0</strong>, Seattle <strong>20.8 / 65.0</strong> (avg_high / total_mm).
                </>
              ),
            },
            {
              title: 'Rainy-day counts with FILTER',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT city, COUNT(*) FILTER (WHERE precip_mm > 0) AS rainy_days
FROM weather GROUP BY city ORDER BY city;`} />
                </RevealSolution>
              ),
              checkpoint: <>Berlin <strong>7</strong>, Chennai <strong>3</strong>, Reykjavik <strong>15</strong>, Seattle <strong>10</strong>.</>,
            },
            {
              title: 'Which cities got more than 50 mm of rain in June?',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT city, SUM(precip_mm) AS total_mm
FROM weather GROUP BY city
HAVING SUM(precip_mm) > 50 ORDER BY total_mm DESC;`} />
                </RevealSolution>
              ),
              checkpoint: (
                <>
                  Exactly two: <strong>Seattle (65.0)</strong> and <strong>Reykjavik (60.0)</strong>. If you wrote WHERE instead
                  of HAVING, you met the same error as the browser gotcha.
                </>
              ),
            },
            {
              title: 'Daily summary across cities — the P1 M5 query',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT day, ROUND(AVG(temp_max), 1) AS avg_high, SUM(precip_mm) AS total_mm
FROM weather GROUP BY day ORDER BY day;`} />
                </RevealSolution>
              ),
              checkpoint: (
                <>
                  <strong>30 rows</strong> (one per June day). Spot-check 2026-06-03: avg_high <strong>22.5</strong>, total_mm{' '}
                  <strong>6.5</strong>. This grain — one row per day — is exactly what P1's daily-summary table ships.
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
              q: 'A table has 20 rows; precip_mm is NULL in 2. What do COUNT(*) and COUNT(precip_mm) return?',
              options: ['20 and 20', '18 and 18', '20 and 18', '18 and 20'],
              answer: 2,
              explain: 'COUNT(*) counts rows; COUNT(col) counts non-NULL values. The gap between them is your fastest missing-data detector.',
            },
            {
              q: 'Why does WHERE SUM(precip_mm) > 15 fail while HAVING SUM(precip_mm) > 15 works?',
              options: [
                'WHERE cannot compare numbers to aggregates for type reasons',
                'WHERE runs before grouping, when no aggregate values exist yet; HAVING runs after',
                'HAVING is just a synonym for WHERE after a GROUP BY',
                'SUM can only appear in the SELECT list',
              ],
              answer: 1,
              explain: 'Logical order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY. WHERE filters input rows; HAVING filters finished groups. Use both: WHERE to cut input, HAVING to cut output.',
            },
            {
              q: 'AVG(x) differs from SUM(x) / COUNT(*) when x has NULLs because...',
              options: [
                'AVG rounds to integer precision',
                'AVG skips NULLs, dividing by the non-NULL count, while COUNT(*) counts all rows',
                'SUM includes NULLs as zeros',
                'they never differ',
              ],
              answer: 1,
              explain: 'Aggregates skip NULLs, so AVG divides by 18 in our table while COUNT(*) says 20. Per-reading vs per-day averages answer different questions — dashboards have shipped the wrong one.',
            },
            {
              q: 'Distributed engines (Phase 4) compute AVG by shipping (sum, count) pairs from each machine rather than local averages because...',
              options: [
                'averages of averages weight partitions incorrectly unless all are equal-sized',
                'floating point cannot represent averages',
                'NULLs cannot cross machine boundaries',
                'AVG is not defined in distributed SQL',
              ],
              answer: 0,
              explain: 'AVG is not decomposable, but (sum, count) is: partials merge by addition, one division at the end gives the exact answer. Averaging per-machine averages over-weights small partitions.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain WHERE vs HAVING to a junior analyst.',
            a: (
              <p>
                WHERE filters rows before grouping — it cannot see aggregates because none exist yet. HAVING filters groups
                after aggregation — the only place a condition on SUM or COUNT can live. Efficient queries use both: WHERE
                shrinks what gets scanned; HAVING prunes the summary. Bonus credit for reciting the logical clause order.
              </p>
            ),
          },
          {
            q: 'How do NULLs behave in aggregates, and when does it bite?',
            a: (
              <p>
                COUNT(*) counts rows; every other aggregate skips NULLs, so AVG divides by the non-NULL count. It bites when
                the denominator silently shrinks — an AVG over a column that went 40 percent NULL last Tuesday looks plausible
                while describing a different population. Monitor COUNT(*) minus COUNT(col) as a quality metric and decide
                explicitly whether NULL means skip, zero, or investigate.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Aggregates collapse many rows to one value; without GROUP BY the whole table is one group.</>,
          <>COUNT(*) counts rows; COUNT(col) counts non-NULLs; other aggregates skip NULLs — AVG's denominator is the non-NULL count.</>,
          <>GROUP BY partitions rows; every SELECT column must be a grouping key or aggregated. NULL grouping values form their own group.</>,
          <>WHERE filters rows before grouping, HAVING filters groups after — use both in one query.</>,
          <>FILTER (or CASE inside SUM) computes conditional aggregates in a single pass.</>,
          <>Aggregate where the data lives: shipping summaries beats shipping rows — the pushdown theme, again.</>,
        ]}
      />
    </>
  )
}
