import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { RevealSolution } from '../../../components/RevealSolution'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeBlock } from '../../../components/CodeBlock'
import { CodeRunner } from '../../../components/CodeRunner'

const ID = '1.5.3'

const WEATHER_SETUP = `CREATE OR REPLACE TABLE daily_weather AS
SELECT * FROM (VALUES
  ('Austin',  DATE '2024-03-01', 22.1,  0.0),
  ('Austin',  DATE '2024-03-02', 23.4,  0.0),
  ('Austin',  DATE '2024-03-03', 25.0,  2.5),
  ('Austin',  DATE '2024-03-04', 24.2,  0.0),
  ('Austin',  DATE '2024-03-05', 26.8,  0.0),
  ('Austin',  DATE '2024-03-06', 28.3, 12.7),
  ('Austin',  DATE '2024-03-07', 30.1,  0.0),
  ('Austin',  DATE '2024-03-08', 29.5,  3.0),
  ('Austin',  DATE '2024-03-09', 27.6,  0.0),
  ('Austin',  DATE '2024-03-10', 25.9,  0.0),
  ('Boston',  DATE '2024-03-01',  3.2,  5.1),
  ('Boston',  DATE '2024-03-02',  4.1,  0.0),
  ('Boston',  DATE '2024-03-03',  2.8,  8.4),
  ('Boston',  DATE '2024-03-04',  5.6,  0.0),
  ('Boston',  DATE '2024-03-05',  7.0,  2.2),
  ('Boston',  DATE '2024-03-06',  6.4,  0.0),
  ('Boston',  DATE '2024-03-07',  8.2,  0.0),
  ('Boston',  DATE '2024-03-08',  9.1,  6.3),
  ('Boston',  DATE '2024-03-09',  7.5,  1.5),
  ('Boston',  DATE '2024-03-10',  6.0,  0.0),
  ('Chicago', DATE '2024-03-01',  5.5,  0.0),
  ('Chicago', DATE '2024-03-02',  6.7,  3.8),
  ('Chicago', DATE '2024-03-03',  4.9,  0.0),
  ('Chicago', DATE '2024-03-04',  8.0,  0.0),
  ('Chicago', DATE '2024-03-05',  9.3,  7.6),
  ('Chicago', DATE '2024-03-06', 11.2,  0.0),
  ('Chicago', DATE '2024-03-07', 10.4,  4.4),
  ('Chicago', DATE '2024-03-08', 12.6,  0.0),
  ('Chicago', DATE '2024-03-09', 11.8,  0.0),
  ('Chicago', DATE '2024-03-10',  9.9,  2.9)
) t(city, obs_date, temp_c, precip_mm);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Running totals and the smoothing window">
        <Tiered
          layman={
            <>
              <p>
                Daily temperature charts are jittery — one cold snap and the line spikes. Forecasters fix this with a{' '}
                <em>smoothing window</em>: a little frame, seven days wide, that slides along the chart. At each day it averages only
                what is inside the frame, and those averages form a calm line through the noise. Slide, average, plot; slide, average,
                plot.
              </p>
              <p>
                A running total is the same trick with a different frame: instead of “the last 7 days,” the frame is “everything from the
                start up to today.” Rain so far this month, sales so far this quarter — same sliding machinery, different edges. This
                lesson teaches you to set those edges precisely.
              </p>
            </>
          }
          student={
            <>
              <p>
                Lesson 1.5.2 gave windows position (ORDER BY) and grouping (PARTITION BY). The <strong>frame</strong> is the third dial:
                which rows around the current row an aggregate sees. <code>ROWS BETWEEN 6 PRECEDING AND CURRENT ROW</code> is a 7-day
                moving average; <code>ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> is a running total. Rolling metrics are the
                bread and butter of every metrics dashboard in every <GlossaryTerm k="data-warehouse">warehouse</GlossaryTerm>.
              </p>
              <p>
                The catch: when you write ORDER BY and no frame, you still get one — a default — and the default is not “the whole
                partition.” Two of this lesson’s demos exist purely because that default surprises people.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A frame maps each row to an interval of its ordered partition; the aggregate folds over that interval. This model is
                load-bearing beyond SQL: stream processors (Phase 5) call the same shapes <em>tumbling</em> and <em>sliding</em> windows
                — identical frame semantics over unbounded data, with completeness negotiated by watermarks instead of ORDER BY.
              </p>
              <p>
                Evaluation cost is the interesting theory: naively each row re-aggregates its frame, O(n·k) per partition. Engines
                exploit <em>removable</em> aggregates — SUM/COUNT/AVG support incremental add-one-remove-one updates as the frame slides,
                O(n) total. MIN/MAX are not invertible, so engines use deque or segment-tree techniques instead. DuckDB implements
                segment-tree-based window aggregation.
              </p>
            </>
          }
        />
        <p>Running total first — cumulative rainfall per city. Austin reaches 15.2 mm by 03-06 and finishes at 18.2:</p>
        <CodeRunner
          language="sql"
          setup={WEATHER_SETUP}
          code={`SELECT city, obs_date, precip_mm,
       SUM(precip_mm) OVER (
         PARTITION BY city ORDER BY obs_date
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS precip_to_date
FROM daily_weather
ORDER BY city, obs_date;`}
          label="The frame grows one row per day and never forgets — that is a running total."
        />
      </Section>

      <Section kicker="core concepts" title="Building the moving average, one frame at a time">
        <Tiered
          layman={
            <>
              <p>
                Read <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code> as “me and my two neighbors just behind me.” On day five,
                the frame holds days three, four, five — average them and you have a 3-day smoothed value for day five. Slide to day six
                and the frame silently drops day three and picks up day six.
              </p>
              <p>
                Watch the start of the series: day one has no neighbors behind it, so its “3-day average” is an average of one value.
                The frame does not pad with zeros or peek into the past that doesn’t exist — it just shrinks. Whether a 1-day “7-day
                average” is honest is your call, and the lab makes you decide.
              </p>
            </>
          }
          student={
            <>
              <p>
                Frame grammar: <code>ROWS BETWEEN &lt;start&gt; AND &lt;end&gt;</code>, each bound one of <code>UNBOUNDED PRECEDING</code>,{' '}
                <code>N PRECEDING</code>, <code>CURRENT ROW</code>, <code>N FOLLOWING</code>, <code>UNBOUNDED FOLLOWING</code>. Frames
                clip at partition edges — early rows aggregate fewer values (a <em>partial window</em>). The honest-metrics pattern:
                COUNT(*) over the same frame, NULL the metric until the window fills.
              </p>
              <p>
                A 7-day moving average needs <code>6 PRECEDING</code>, not 7 — the current row is the seventh. Off-by-one frames are the
                most common rolling-metric bug; the second most common is forgetting PARTITION BY and smoothing one city with another
                city’s weather.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Frames compose with everything from 1.5.2: the engine partitions, sorts, then slides the frame per row, updating
                aggregate state incrementally where the aggregate admits it. Adding several window columns that share one PARTITION
                BY/ORDER BY costs little beyond the first — one sort amortizes across them — whereas mixing different orderings forces
                separate sorts. Structure dashboards accordingly.
              </p>
              <p>
                The shrinking-edge behavior is a completeness question in disguise: a 7-day average computed over 3 rows is a biased
                estimator of the metric you named. Batch SQL lets you detect it with a frame COUNT; streaming systems must instead decide
                when a window is <em>complete enough to emit</em> — that is exactly the watermark problem you will meet in Phase 5.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={WEATHER_SETUP}
          code={`SELECT obs_date, temp_c,
       ROUND(AVG(temp_c) OVER (
         ORDER BY obs_date
         ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
       ), 2) AS avg_3d
FROM daily_weather
WHERE city = 'Austin'
ORDER BY obs_date;`}
          label="3-day average: 03-03 shows 23.5. Change 2 PRECEDING to 6 PRECEDING: 03-07 shows 25.7, 03-10 shows 27.49."
        />
      </Section>

      <Section kicker="core concepts" title="RANGE vs ROWS, and the default-frame trap">
        <Tiered
          layman={
            <>
              <p>
                “Last 3 rows” and “last 3 days” sound identical — until a day is missing. If the sensor slept through March 3rd and 4th,
                the last 3 <em>rows</em> at March 5th reach back to March 1st, quietly averaging week-old readings into a “3-day” metric.
                The last 3 <em>days</em> at March 5th is just March 5th, because nothing else falls inside the date range.
              </p>
              <p>
                Separately, SQL hides a trap: if you sort a window but say nothing about its frame, you get “start through today,” not
                “everything.” Asking for the last value with that default returns… today’s value. Always spell the frame out when you use
                FIRST_VALUE or LAST_VALUE.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>ROWS</code> counts physical rows; <code>RANGE</code> measures distance in the ORDER BY value —{' '}
                <code>RANGE BETWEEN INTERVAL 2 DAYS PRECEDING AND CURRENT ROW</code> means “rows whose date is within 2 days,” immune to
                gaps. On gap-free daily data they agree, which is how the bug hides until a station goes down. RANGE also treats ties as
                peers: equal ORDER BY values share one frame.
              </p>
              <p>
                The default frame when ORDER BY is present is <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. So{' '}
                <code>LAST_VALUE(x) OVER (ORDER BY d)</code> returns the current row’s value — the frame ends at the current row.
                FIRST_VALUE happens to work (the frame’s start is the partition’s start), which makes the bug crueler: half your columns
                look right. Fix: <code>ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING</code>.
              </p>
            </>
          }
          phd={
            <>
              <p>
                RANGE needs more than an ordering: the ORDER BY key must support distance arithmetic (numeric or date/interval), and
                duplicate keys form peer groups that enter and leave the frame atomically. That is why the default frame’s “CURRENT ROW”
                means “current row and its peers” under RANGE — with duplicate dates, even naive LAST_VALUE can return a neighbor’s
                value.
              </p>
              <p>
                The standard chose that default so running totals “just work” with bare ORDER BY, trading an edge-of-frame footgun for
                convenience on the common case. Defend by writing frames explicitly whenever the answer depends on the frame’s far edge.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={`CREATE OR REPLACE TABLE gappy_readings AS
SELECT * FROM (VALUES
  (DATE '2024-03-01', 10.0),
  (DATE '2024-03-02', 12.0),
  (DATE '2024-03-05', 20.0),
  (DATE '2024-03-06', 22.0),
  (DATE '2024-03-07', 24.0)
) t(obs_date, temp_c);`}
          code={`SELECT obs_date, temp_c,
       AVG(temp_c) OVER (ORDER BY obs_date
         ROWS  BETWEEN 2 PRECEDING AND CURRENT ROW) AS rows_avg,
       AVG(temp_c) OVER (ORDER BY obs_date
         RANGE BETWEEN INTERVAL 2 DAYS PRECEDING AND CURRENT ROW) AS range_avg
FROM gappy_readings
ORDER BY obs_date;`}
          label="03-03 and 03-04 are missing. On 03-05: rows_avg = 14.0 (reaches back to 03-01), range_avg = 20.0 (only 03-05 qualifies)."
        />
        <p>And the LAST_VALUE trap, bug and fix side by side on Boston:</p>
        <CodeRunner
          language="sql"
          setup={WEATHER_SETUP}
          code={`SELECT obs_date, temp_c,
       LAST_VALUE(temp_c) OVER (ORDER BY obs_date) AS last_naive,
       LAST_VALUE(temp_c) OVER (
         ORDER BY obs_date
         ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
       ) AS last_fixed
FROM daily_weather
WHERE city = 'Boston'
ORDER BY obs_date;`}
          label="last_naive just echoes each row (default frame stops at the current row); last_fixed is 6.0 everywhere — the true final reading."
        />
      </Section>

      <Section kicker="trade-offs" title="Where should rolling metrics be computed?">
        <Tradeoffs
          options={[
            {
              name: 'SQL window (in the engine)',
              strengths: ['Computed where the data lives — no transfer', 'Declarative, versionable, one definition for every consumer'],
              weaknesses: ['Recomputed per query unless materialized', 'Frame/gap subtleties (this lesson) must be handled in SQL'],
              chooseWhen: 'serving analytics from a warehouse or DuckDB — the default for batch metrics.',
            },
            {
              name: 'pandas (in Python)',
              strengths: ['rolling() with rich options: min_periods, custom functions', 'Great for exploration and plots right next to the calc'],
              weaknesses: ['Data must fit in one machine’s memory after transfer', 'Logic lives outside the database — other tools can’t reuse it'],
              chooseWhen: 'exploratory analysis or metrics needing non-SQL logic on modest data.',
            },
            {
              name: 'Precompute at ingest (ETL)',
              strengths: ['Read path is a cheap lookup — great for dashboards at scale', 'Cost paid once per load, not per query'],
              weaknesses: ['Late or corrected data forces recomputation (idempotent reruns!)', 'Schema now stores derived values that can drift from raws'],
              chooseWhen: 'high-traffic dashboards where query-time compute is too slow or expensive.',
            },
          ]}
          note={
            <>
              Common evolution: prototype in pandas, promote to SQL (an <GlossaryTerm k="etl">ETL</GlossaryTerm>/ELT model) when others
              need it, precompute when dashboards make it hot. Same math, moving closer to the data as it matures.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: ship rolling.sql">
        <Lab
          lessonId={ID}
          intro={
            <p>
              This lab produces <code>queries\rolling.sql</code> — the exact file you will ship in the Phase 1 milestone M5: 7-day
              rolling temperature and cumulative precipitation, per city. Use <code>run_sql.py</code> from lesson 1.5.1.
            </p>
          }
          steps={[
            {
              title: 'Create rolling.sql with both metrics',
              body: (
                <>
                  <p>
                    Create <code>queries\rolling.sql</code>. Paste the 30-row <code>daily_weather</code> seed from this lesson (the
                    CREATE OR REPLACE block with temp_c and precip_mm — copy it from the block below), then one query returning: city,
                    obs_date, temp_c, <code>temp_7d_avg</code> (rounded to 2 decimals), <code>precip_to_date</code>.
                  </p>
                  <CodeBlock code={WEATHER_SETUP} label="queries\rolling.sql — seed (paste at the top)" />
                  <RevealSolution label="Reveal the query">
                    <CodeBlock
                      code={`SELECT city, obs_date, temp_c,
       ROUND(AVG(temp_c) OVER (
         PARTITION BY city ORDER BY obs_date
         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ), 2) AS temp_7d_avg,
       SUM(precip_mm) OVER (
         PARTITION BY city ORDER BY obs_date
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS precip_to_date
FROM daily_weather
ORDER BY city, obs_date;`}
                      label="append below the seed"
                    />
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'cd ~\\sql-lab\ncode queries\\rolling.sql\nuv run python run_sql.py queries\\rolling.sql' }],
              checkpoint: (
                <>
                  30 rows. Austin 2024-03-07 shows temp_7d_avg 25.7; Austin 2024-03-10 shows 27.49. Final precip_to_date per city:
                  Austin 18.2, Boston 23.5, Chicago 18.7. Also inspect the partial windows at the start: Austin 2024-03-03 shows 23.5
                  (an average of only three days) and 2024-03-01 equals its own temp, 22.1 — the frame shrank without warning you.
                </>
              ),
            },
            {
              title: 'Make the metric honest: NULL until the window fills',
              body: (
                <p>
                  Add a <code>COUNT(*)</code> over the same frame and wrap temp_7d_avg in a CASE that returns NULL unless the frame holds
                  7 rows. This is the production-grade version of the metric.
                </p>
              ),
              commands: [{ ps: 'uv run python run_sql.py queries\\rolling.sql' }],
              checkpoint: (
                <>
                  Each city’s first six rows now show NULL for temp_7d_avg; days 2024-03-07 through 2024-03-10 keep their values (12
                  non-NULL rows total).
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
              q: 'A 7-day moving average ending at the current row uses which frame?',
              options: [
                'ROWS BETWEEN 7 PRECEDING AND CURRENT ROW',
                'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW',
                'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW',
                'RANGE BETWEEN 7 PRECEDING AND 7 FOLLOWING',
              ],
              answer: 1,
              explain:
                'The current row is the seventh member, so you reach back 6. 7 PRECEDING makes an 8-row window — the classic off-by-one in rolling metrics.',
            },
            {
              q: 'Daily data has missing dates. How do ROWS and RANGE frames differ?',
              options: [
                'They always produce identical results',
                'ROWS counts physical rows and silently reaches past gaps; RANGE measures date distance and respects them',
                'RANGE is just a faster implementation of ROWS',
                'ROWS ignores NULLs; RANGE includes them',
              ],
              answer: 1,
              explain:
                'ROWS BETWEEN 2 PRECEDING can span a week if days are missing; RANGE BETWEEN INTERVAL 2 DAYS PRECEDING admits only rows within the date distance. On gap-free data they coincide — which is where the bug hides.',
            },
            {
              q: 'Why does LAST_VALUE(x) OVER (ORDER BY d) seem to “not work”?',
              options: [
                'LAST_VALUE requires PARTITION BY',
                'It returns NULL unless the column is indexed',
                'The default frame ends at the current row, so the “last” value is the current row’s',
                'LAST_VALUE is nondeterministic by design',
              ],
              answer: 2,
              explain:
                'With ORDER BY, the default frame is RANGE UNBOUNDED PRECEDING TO CURRENT ROW. Extend it explicitly — ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING — to see the partition’s true last value.',
            },
            {
              q: 'Your 7-day average shows values for the first 3 days of the series. What is happening?',
              options: [
                'The engine pads missing days with zeros',
                'The frame clips at the partition edge, so early rows average fewer than 7 values',
                'The data is corrupted',
                'DuckDB extrapolates from the trend',
              ],
              answer: 1,
              explain:
                'Frames shrink at edges — a partial window. If a 3-row “7-day average” is misleading for your use case, count the frame rows and NULL the metric until the window fills.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How would you compute a 7-day rolling average in SQL, and what edge cases would you watch?',
            a: (
              <p>
                AVG over a window with PARTITION BY the series key, ORDER BY date, ROWS BETWEEN 6 PRECEDING AND CURRENT ROW. Edge cases:
                partial windows at the series start (decide whether to NULL them), missing dates (ROWS reaches past gaps — use RANGE with
                an interval or densify the calendar), and duplicate dates (peers under RANGE). Naming those three is what separates
                “knows the syntax” from “has shipped it.”
              </p>
            ),
          },
          {
            q: 'What is the default window frame, and when has it bitten you?',
            a: (
              <p>
                With ORDER BY: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW. It makes running totals work with bare ORDER BY, but it
                means LAST_VALUE returns the current row’s value — FIRST_VALUE meanwhile looks fine, so the bug is asymmetric and easy to
                ship. The defensive habit: write the frame explicitly whenever the result depends on the frame’s far edge.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>The frame is the third window dial: which ordered neighbors an aggregate sees. Running total = UNBOUNDED PRECEDING; 7-day average = 6 PRECEDING.</>,
          <>Frames clip at partition edges — early rows give partial windows. Count the frame and NULL the metric if honesty demands it.</>,
          <>ROWS counts rows; RANGE measures ORDER BY distance. With date gaps they diverge — pick deliberately.</>,
          <>The default frame ends at the current row: LAST_VALUE needs an explicit ROWS BETWEEN … UNBOUNDED FOLLOWING.</>,
          <>Same frame idea scales up: pandas rolling(), precomputed metrics at ingest, and Phase 5 streaming windows are the same concept at different distances from the data.</>,
        ]}
      />
    </>
  )
}
