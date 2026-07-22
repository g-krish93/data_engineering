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

const ID = '1.5.4'

const STATIONS_SETUP = `CREATE OR REPLACE TABLE station_a AS
SELECT * FROM (VALUES
  ('Austin',  DATE '2024-03-01', 22.1),
  ('Austin',  DATE '2024-03-02', 23.4),
  ('Boston',  DATE '2024-03-01',  3.2),
  ('Boston',  DATE '2024-03-02',  4.1),
  ('Chicago', DATE '2024-03-01',  5.5),
  ('Chicago', DATE '2024-03-02',  6.7),
  ('Denver',  DATE '2024-03-01',  1.0),
  ('Denver',  DATE '2024-03-02',  2.2)
) t(city, obs_date, temp_c);
CREATE OR REPLACE TABLE station_b AS
SELECT * FROM (VALUES
  ('Austin',  DATE '2024-03-01', 22.1),
  ('Boston',  DATE '2024-03-01',  3.2),
  ('Chicago', DATE '2024-03-01',  5.5),
  ('Austin',  DATE '2024-03-03', 25.0),
  ('Boston',  DATE '2024-03-03',  2.8),
  ('Chicago', DATE '2024-03-03',  4.9),
  ('Fargo',   DATE '2024-03-01', -4.0),
  ('Fargo',   DATE '2024-03-03', -2.5)
) t(city, obs_date, temp_c);`

const PRECIP_SETUP = `CREATE OR REPLACE TABLE monthly_precip AS
SELECT * FROM (VALUES
  ('Austin',  'Jan', 40.1), ('Austin',  'Feb', 35.2),
  ('Austin',  'Mar', 18.2), ('Austin',  'Apr', 55.0),
  ('Boston',  'Jan', 88.3), ('Boston',  'Feb', 70.1),
  ('Boston',  'Mar', 23.5), ('Boston',  'Apr', 61.2),
  ('Chicago', 'Jan', 52.7), ('Chicago', 'Feb', 44.9),
  ('Chicago', 'Mar', 18.7), ('Chicago', 'Apr', 77.4)
) t(city, month_name, precip_mm);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Two feeds, one table: UNION ALL vs UNION">
        <Tiered
          layman={
            <>
              <p>
                You have two spreadsheets of weather readings — one from station network A, one from network B. The obvious move is to
                stack one under the other: fast, nothing lost, done. That is <code>UNION ALL</code>. The other move is
                interleave-and-dedupe: merge them and cross out every repeated line. That is <code>UNION</code> — and someone has to
                compare every line against every other line to find the repeats, which is real work.
              </p>
              <p>
                The dedupe cuts both ways: two stations legitimately reporting the same reading — plain UNION quietly eats one copy.
                Stacking is cheap and honest; deduping is expensive and opinionated. Pick deliberately.
              </p>
            </>
          }
          student={
            <>
              <p>
                Both operators glue result sets with matching column counts and compatible types, by position. <code>UNION ALL</code>{' '}
                appends, no comparisons. <code>UNION</code> appends <em>then deduplicates whole rows</em> via a sort or hash over the
                combined set — pure cost if duplicates cannot exist, silent loss if they were real observations. <code>INTERSECT</code>{' '}
                keeps rows present in both; <code>EXCEPT</code> keeps rows in the first but not the second (order matters).
              </p>
              <p>
                The production pattern for combining periods or sources is UNION ALL plus a literal <em>source column</em>, so lineage
                survives the merge and duplicates stay debuggable. You will use it in the lab to combine two months.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The relational model is sets; SQL is bags. UNION restores set semantics by whole-row dedup (hash aggregation or
                sort-unique), while UNION ALL is bag union — pure stream concatenation. INTERSECT and EXCEPT are whole-row semi/anti
                operations. A subtlety: set operations treat NULLs as equal for matching — two (NULL, 5) rows are duplicates here, even
                though <code>NULL = NULL</code> is not true in a WHERE clause.
              </p>
              <p>
                So the choice is really “do I need set semantics, and at what cost?” In pipelines the answer is usually no: dedup should
                be explicit and keyed (ROW_NUMBER from 1.5.2), not a whole-row side effect of an operator.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={STATIONS_SETUP}
          code={`SELECT 'UNION ALL' AS method, COUNT(*) AS n
FROM (SELECT * FROM station_a UNION ALL SELECT * FROM station_b)
UNION ALL
SELECT 'UNION', COUNT(*)
FROM (SELECT * FROM station_a UNION SELECT * FROM station_b);`}
          label="16 vs 13 — UNION removed the three whole-row duplicates (and did a pile of comparison work to find them)."
        />
        <p>The source-column pattern, plus the interrogation operators:</p>
        <CodeRunner
          language="sql"
          setup={STATIONS_SETUP}
          code={`SELECT 'station_a' AS source, * FROM station_a
UNION ALL
SELECT 'station_b', * FROM station_b
ORDER BY city, obs_date, source;`}
          label="Every row keeps its origin. Duplicates are now visible facts, not silent casualties."
        />
        <CodeRunner
          language="sql"
          setup={STATIONS_SETUP}
          code={`SELECT city, obs_date, temp_c FROM station_a
INTERSECT
SELECT city, obs_date, temp_c FROM station_b;`}
          label="The 3 readings both networks agree on. Change INTERSECT to EXCEPT: rows only A has. Swap the tables: only B."
        />
      </Section>

      <Section kicker="core concepts" title="Pivot: long shape to wide shape (and back)">
        <Tiered
          layman={
            <>
              <p>
                The <em>long</em> shape is a filing format: one row per fact — “Austin, January, 40.1 mm”. Easy to add to, easy to
                filter, terrible to read. The <em>wide</em> shape is a reading format: cities down the side, months across the top —
                exactly the grid a human wants. Pivoting converts filing shape to reading shape; unpivoting converts back.
              </p>
              <p>
                Keep the filing cabinet long and produce the grid on demand. A grid that becomes your storage format grows a new column
                every month, forever — and old queries break every time it does.
              </p>
            </>
          }
          student={
            <>
              <p>
                The portable pivot is <strong>conditional aggregation</strong>: one output column per category,{' '}
                <code>SUM(CASE WHEN month_name = 'Jan' THEN precip_mm END)</code>, grouped by the row key. Unmatched rows yield NULL,
                which aggregates ignore — that is the whole trick, and it runs on any engine. Costs: you must know the categories when
                writing the query, and ten months means ten hand-written columns.
              </p>
              <p>
                DuckDB’s <code>PIVOT</code> generates those columns for you (an <code>IN</code> list fixes names and order);{' '}
                <code>UNPIVOT</code> reverses wide to long. Convenient and non-portable — Postgres needs crosstab, SQL Server differs.
                Learn CASE as the lingua franca; use PIVOT where you live.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Long vs wide is storage vs presentation. Long is the tidy-data normal form — each variable a column, each observation a
                row — closed under new categories (a new month is a new <em>row</em>). Wide encodes data values into the schema itself,
                which is why SQL, needing output columns at plan time, makes dynamic pivoting awkward: DuckDB’s bare PIVOT scans for
                distinct values before planning (two-phase), and an IN list is how you keep the contract static.
              </p>
              <p>
                This is also the presentation layer of <GlossaryTerm k="olap">OLAP</GlossaryTerm>: a pivot is a slice of the cube with
                one dimension rotated into columns. BI tools do it interactively over a long fact table — which is exactly why your
                warehouse tables should stay long.
              </p>
            </>
          }
        />
        <p>The portable way — conditional aggregation:</p>
        <CodeRunner
          language="sql"
          setup={PRECIP_SETUP}
          code={`SELECT city,
       SUM(CASE WHEN month_name = 'Jan' THEN precip_mm END) AS jan_mm,
       SUM(CASE WHEN month_name = 'Feb' THEN precip_mm END) AS feb_mm,
       SUM(CASE WHEN month_name = 'Mar' THEN precip_mm END) AS mar_mm,
       SUM(CASE WHEN month_name = 'Apr' THEN precip_mm END) AS apr_mm
FROM monthly_precip
GROUP BY city
ORDER BY city;`}
          label="Works on every SQL engine. Delete the Mar line — the column simply disappears from the report."
        />
        <p>The DuckDB way — same grid, one line of intent, and the reverse trip:</p>
        <CodeRunner
          language="sql"
          setup={PRECIP_SETUP}
          code={`PIVOT monthly_precip
ON month_name IN ('Jan', 'Feb', 'Mar', 'Apr')
USING sum(precip_mm);`}
          label="Drop the IN list and re-run: columns still appear, but alphabetized (Apr, Feb, Jan, Mar) — data-driven schema."
        />
        <CodeRunner
          language="sql"
          setup={`CREATE OR REPLACE TABLE wide_precip AS
SELECT * FROM (VALUES
  ('Austin',  40.1, 35.2, 18.2, 55.0),
  ('Boston',  88.3, 70.1, 23.5, 61.2),
  ('Chicago', 52.7, 44.9, 18.7, 77.4)
) t(city, jan_mm, feb_mm, mar_mm, apr_mm);`}
          code={`UNPIVOT wide_precip
ON jan_mm, feb_mm, mar_mm, apr_mm
INTO NAME month VALUE precip_mm;`}
          label="Wide back to long: 12 tidy rows. This is the direction you run when a source hands you a spreadsheet-shaped table."
        />
        <Callout kind="tip" title="Store long, present wide">
          A long table absorbs new months as rows, zero schema changes; every pivot here is a disposable presentation of it. When a
          “report table” becomes storage, every new period is a schema migration. Phase 2 data modeling leans on this hard.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Where should the pivot happen?">
        <Tradeoffs
          options={[
            {
              name: 'SQL (CASE or PIVOT)',
              strengths: ['Versionable text — reviewable, testable, schedulable', 'Runs where the data lives; feeds any downstream tool'],
              weaknesses: ['Categories fixed at write time (or non-portable dynamic syntax)', 'Wide outputs with many categories get verbose'],
              chooseWhen: 'the report shape is stable and consumed by machines or scheduled jobs.',
            },
            {
              name: 'BI tool (pivot in the dashboard)',
              strengths: ['Interactive: users re-pivot without engineering', 'Presentation concerns stay in the presentation layer'],
              weaknesses: ['Logic lives in tool config — hard to version and reuse', 'Each viewer re-aggregates; costs scale with audience'],
              chooseWhen: 'humans explore — serve them a clean long table and let the tool rotate it.',
            },
            {
              name: 'pandas (pivot_table)',
              strengths: ['Dynamic columns are trivial; no schema declared upfront', 'Chains straight into plots and Python post-processing'],
              weaknesses: ['Data leaves the engine first; memory-bound', 'A notebook step is invisible to SQL-only consumers'],
              chooseWhen: 'ad-hoc analysis, or column sets that genuinely change per run.',
            },
          ]}
          note={
            <>
              All three consume the same long table. That is the architecture point: keep one long source of truth, and let each
              presentation layer pivot for its own audience.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: combine two months, then report on them">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will combine two monthly tables with UNION ALL plus a source tag, watch UNION eat a duplicate, and produce a per-city
              monthly report both ways. Uses <code>run_sql.py</code> from lesson 1.5.1.
            </p>
          }
          steps={[
            {
              title: 'Combine the months with a source tag',
              body: (
                <>
                  <p>
                    Create <code>queries\combine.sql</code> with the two seeds below, then stack them into a <code>combined</code> table
                    with a <code>month</code> tag column ('2024-03' / '2024-04') and SELECT it back, ordered by city and date.
                  </p>
                  <CodeBlock
                    code={`CREATE OR REPLACE TABLE march_weather AS
SELECT * FROM (VALUES
  ('Austin',  DATE '2024-03-01', 22.1),
  ('Austin',  DATE '2024-03-02', 23.4),
  ('Austin',  DATE '2024-03-03', 25.0),
  ('Boston',  DATE '2024-03-01',  3.2),
  ('Boston',  DATE '2024-03-02',  4.1),
  ('Boston',  DATE '2024-03-03',  2.9),
  ('Chicago', DATE '2024-03-01',  5.5),
  ('Chicago', DATE '2024-03-02',  6.7),
  ('Chicago', DATE '2024-03-03',  4.9)
) t(city, obs_date, temp_c);
CREATE OR REPLACE TABLE april_weather AS
SELECT * FROM (VALUES
  ('Austin',  DATE '2024-04-01', 26.0),
  ('Austin',  DATE '2024-04-02', 27.5),
  ('Austin',  DATE '2024-04-03', 29.0),
  ('Boston',  DATE '2024-04-01',  8.0),
  ('Boston',  DATE '2024-04-02',  9.5),
  ('Boston',  DATE '2024-04-03', 11.0),
  ('Chicago', DATE '2024-04-01', 12.0),
  ('Chicago', DATE '2024-04-02', 13.6),
  ('Chicago', DATE '2024-04-03', 14.0)
) t(city, obs_date, temp_c);`}
                    label="queries\combine.sql — seeds (paste at the top)"
                  />
                  <RevealSolution label="Reveal the combine step">
                    <CodeBlock
                      code={`CREATE OR REPLACE TABLE combined AS
SELECT '2024-03' AS month, * FROM march_weather
UNION ALL
SELECT '2024-04', * FROM april_weather;
SELECT * FROM combined ORDER BY city, obs_date;`}
                      label="append below the seeds"
                    />
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'cd ~\\sql-lab\ncode queries\\combine.sql\nuv run python run_sql.py queries\\combine.sql' }],
              checkpoint: <>18 rows, each carrying its month tag: 9 tagged 2024-03, 9 tagged 2024-04.</>,
            },
            {
              title: 'Watch UNION eat a real reading',
              body: (
                <p>
                  Duplicate one seed line inside <code>march_weather</code> (paste the Austin 2024-03-01 row twice — pretend two sensors
                  both reported it) and re-run: 19 rows. Now change the combine step’s UNION ALL to UNION and re-run again.
                </p>
              ),
              commands: [{ ps: 'uv run python run_sql.py queries\\combine.sql' }],
              checkpoint: (
                <>
                  With UNION ALL: 19 rows. With UNION: 18 — the second sensor’s reading silently vanished. Restore UNION ALL and remove
                  the duplicate line before moving on.
                </>
              ),
            },
            {
              title: 'The per-city monthly report, portable style',
              body: (
                <>
                  <p>
                    Create <code>queries\monthly_report.sql</code> (same seeds plus the <code>combined</code> table) producing one row
                    per city with columns <code>mar_avg_c</code> and <code>apr_avg_c</code>, each rounded to 1 decimal, via CASE +
                    GROUP BY.
                  </p>
                  <RevealSolution label="Reveal the report query">
                    <CodeBlock
                      code={`SELECT city,
       ROUND(AVG(CASE WHEN month = '2024-03' THEN temp_c END), 1) AS mar_avg_c,
       ROUND(AVG(CASE WHEN month = '2024-04' THEN temp_c END), 1) AS apr_avg_c
FROM combined
GROUP BY city
ORDER BY city;`}
                      label="append below the combined table"
                    />
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'code queries\\monthly_report.sql\nuv run python run_sql.py queries\\monthly_report.sql' }],
              checkpoint: <>3 rows: Austin 23.5 / 27.5, Boston 3.4 / 9.5, Chicago 5.7 / 13.2.</>,
            },
            {
              title: 'Stretch: same report with PIVOT',
              body: (
                <p>
                  Replace the final query with <code>PIVOT combined ON month USING ROUND(avg(temp_c), 1) GROUP BY city;</code> —
                  DuckDB’s shorthand for what you just wrote by hand.
                </p>
              ),
              commands: [{ ps: 'uv run python run_sql.py queries\\monthly_report.sql' }],
              checkpoint: <>Same 3 cities and the same six averages, with columns named 2024-03 and 2024-04.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Table A has 8 rows, table B has 8 rows, and 3 rows are identical in both. UNION ALL and UNION return:',
              options: ['16 and 16', '16 and 13', '13 and 16', '13 and 13'],
              answer: 1,
              explain:
                'UNION ALL appends everything (16). UNION dedupes whole rows across the combined set, collapsing each of the 3 shared rows to one copy (16 - 3 = 13).',
            },
            {
              q: 'Why is UNION ALL plus a source column the default pattern for combining feeds?',
              options: [
                'It is the only combination DuckDB supports',
                'It avoids the dedup cost and keeps lineage — duplicates stay visible and debuggable',
                'UNION cannot combine more than two tables',
                'Source columns make queries faster',
              ],
              answer: 1,
              explain:
                'UNION pays a sort/hash to dedupe and silently merges genuinely repeated observations. UNION ALL is free, and the source tag preserves where each row came from — dedup, if needed, becomes an explicit keyed step.',
            },
            {
              q: 'In the CASE-based pivot, why do unmatched rows not corrupt each month’s column?',
              options: [
                'The engine filters them out before the CASE runs',
                'CASE without ELSE yields NULL, and aggregates like SUM and AVG ignore NULLs',
                'GROUP BY removes them',
                'They do corrupt it — you must add WHERE per column',
              ],
              answer: 1,
              explain:
                'Each conditional aggregate sees every row of the group, but non-matching rows contribute NULL, which SUM/AVG skip. That NULL-ignoring behavior is the entire mechanism of pivot-by-CASE.',
            },
            {
              q: 'Your team wants to store the pivoted month-by-city grid as the permanent table. Main objection?',
              options: [
                'Wide tables cannot be indexed',
                'Every new month becomes a schema change, and queries written against old columns break',
                'PIVOT output cannot be saved as a table',
                'Wide tables are always slower to read',
              ],
              answer: 1,
              explain:
                'Wide encodes data values into the schema. Long storage absorbs new months as rows — pivot at presentation time instead. (Saving PIVOT output works fine mechanically; that is not the issue.)',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'UNION vs UNION ALL — which do you reach for and why?',
            a: (
              <p>
                UNION ALL by default: it is a free append, while UNION forces a whole-row dedup (sort or hash) and can silently merge
                legitimate duplicate observations. I add a source column for lineage, and if dedup is genuinely required I do it
                explicitly with ROW_NUMBER over a business key — deterministic and auditable, unlike operator-level dedup.
              </p>
            ),
          },
          {
            q: 'How would you pivot rows to columns in plain SQL?',
            a: (
              <p>
                Conditional aggregation: GROUP BY the row key and write one aggregate per output column —{' '}
                <code>SUM(CASE WHEN month = 'Jan' THEN amount END)</code>. Unmatched rows yield NULL, which aggregates ignore. Mention
                the limitation (categories fixed at write time), the engine-specific conveniences (DuckDB PIVOT, SQL Server PIVOT,
                Postgres crosstab), and that storage should stay long with pivots done at presentation time.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>UNION ALL appends; UNION appends then dedupes whole rows at sort/hash cost — and can silently eat real observations.</>,
          <>Combine periods and sources with UNION ALL plus a literal source column; dedup explicitly and keyed, never by operator side effect.</>,
          <>INTERSECT finds rows in both sets, EXCEPT finds rows in the first only — and set operations treat NULLs as equal, unlike WHERE.</>,
          <>Pivot portably with CASE + GROUP BY (NULL-ignoring aggregates do the work); PIVOT/UNPIVOT are DuckDB conveniences.</>,
          <>Store long, present wide: long absorbs new categories as rows; wide turns every new category into a schema migration.</>,
        ]}
      />
    </>
  )
}
