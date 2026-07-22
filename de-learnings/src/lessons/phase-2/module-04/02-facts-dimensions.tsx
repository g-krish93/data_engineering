import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { RevealSolution } from '../../../components/RevealSolution'
import { CodeBlock } from '../../../components/CodeBlock'
import { CodeRunner } from '../../../components/CodeRunner'

const ID = '2.4.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Every number and name needs an assigned seat">
        <Tiered
          layman={
            <>
              <p>
                In a laboratory, measurements go in the lab notebook — one line per reading, numbers only.
                Descriptions of the instruments go on the shelf labels: "Microscope B, 40x lens,
                calibrated March." You never copy the calibration date into every notebook line, and you
                never scribble readings on a shelf label.
              </p>
              <p>
                Last lesson gave warehouses notebooks (fact tables) and shelf labels (dimensions). This
                lesson is the seating chart: which notebook for which measurement, which numbers are safe
                to add up, and how the labels get their ID numbers.
              </p>
            </>
          }
          student={
            <>
              <p>
                Three decisions recur in every design: <strong>what kind of fact table</strong>
                (transaction, periodic snapshot, accumulating snapshot), <strong>how each measure
                aggregates</strong> (additive, semi-additive, non-additive), and <strong>how keys are
                minted</strong> (surrogate vs natural). Plus a small bestiary of dimension patterns —
                degenerate, junk, role-playing — that covers most of what you meet in practice.
              </p>
              <p>
                None of it is trivia: pick the wrong fact type and loads become update storms; SUM a
                semi-additive measure and the dashboard reports fiction; join on natural keys and SCD2
                (next lesson) becomes impossible. P2 reviewers and interviewers probe exactly these
                choices.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A tidy formalism: a fact table is a relation whose candidate key is (a subset of) its
                foreign keys, possibly plus a degenerate identifier, with measures functionally dependent
                on that key. The three fact types differ in temporal semantics — point events, state
                sampled at a fixed tick, and evolving process instances — mirroring point processes,
                discretized signals, and state machines.
              </p>
              <p>
                The third is the interesting storage case: accumulating snapshots are update-heavy by
                design, which row stores tolerate but columnar and immutable formats punish with rewrite
                amplification — one reason lakehouse table formats (Phase 5) exist at all.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Three kinds of fact tables">
        <Tiered
          layman={
            <>
              <p>Three notebooks for three kinds of record-keeping:</p>
              <ul>
                <li><strong>Diary</strong> — one line per thing that happened, written once, never edited.</li>
                <li><strong>Daily weigh-in log</strong> — one line per subject per day, recording where things stand. Nothing "happened"; you sampled a state.</li>
                <li><strong>Package-tracking card</strong> — one card per package, slots filled in as it progresses: ordered, shipped, delivered. Amended for weeks.</li>
              </ul>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Transaction fact</strong> — one row per event, immutable, append-only. fact_trips is one. The atomic-grain default.</li>
                <li><strong>Periodic snapshot</strong> — one row per entity per period: account balance per day, inventory per week. Exists because reconstructing "state at every tick" from events at query time is expensive. Its measures are typically semi-additive.</li>
                <li><strong>Accumulating snapshot</strong> — one row per process instance with a column per milestone (order placed, paid, shipped, delivered) plus lag measures; rows are UPDATEd as the lifecycle advances. The only routinely-updated fact table.</li>
              </ul>
              <p>
                Choosing is mechanical once framed: events, sampled states, or lifecycles. A taxi trip is
                an event; a driver's wallet balance a sampled state; driver onboarding a lifecycle.
              </p>
            </>
          }
          phd={
            <>
              <p>
                All three are materialization strategies over the same underlying event log: a snapshot is a running fold, an accumulating row a GROUP BY over an instance's events. Deriving either at query time costs a history scan per query, so you materialize the fold at load time. The framing predicts failure modes: late-arriving events force snapshot restatement, and accumulating-snapshot updates conflict with immutable columnar storage — each milestone rewrites a row the format would rather never touch.
              </p>
              <p>
                It rhymes forward: Phase 5's CDC streams are the event log made explicit, and "which
                materializations do we maintain incrementally" is the central question of streaming
                warehouses.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Additivity: which sums are lies">
        <Tiered
          layman={
            <>
              <p>
                Money spent adds up: 20 dollars Monday plus 30 Tuesday is 50 for the week. Your bank
                balance does not: 100 in the account Monday and 100 Tuesday is not "200 for the week" — it
                is the same 100, observed twice. And your test <em>percentage</em> can't be averaged with
                someone else's without knowing how many questions each test had.
              </p>
              <p>Same-looking numbers, three combining rules. Warehouses label every number with its rule, because a dashboard will eventually try to add all of them.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Additive</strong> — summable across every dimension: fare, tip, trip count. Design toward these.</li>
                <li><strong>Semi-additive</strong> — summable across some dimensions but not time: balances, inventory, headcount. Across accounts on one day: fine. Across days: fiction. The fix is "last value per period" — the 1.5 window-function toolkit.</li>
                <li><strong>Non-additive</strong> — ratios, percentages, unit prices. Store the components (fare and tip, not tip percentage) and derive the ratio from summed components at query time. Averaging stored averages is the classic dashboard bug.</li>
              </ul>
              <p>Run the canonical mistake and its fix:</p>
            </>
          }
          phd={
            <>
              <p>
                Additivity is an algebraic property: a measure is safely re-aggregable when partial results combine associatively — the aggregate is a monoid homomorphism over row subsets. SUM and COUNT qualify; AVG decomposes into two that do (SUM, COUNT); MEDIAN and DISTINCT-COUNT decompose only approximately (t-digest, HyperLogLog). Not pedantry: distributed engines (Phase 4) compute partial aggregates per shard and merge, so "what can a combiner do" is precisely "what is additive or decomposably so."
              </p>
              <p>
                Semi-additive measures fail the property along one dimension only — balances form a sequence whose period aggregate is "last" (or a time-weighted mean), not "sum." That is why snapshot facts and window functions travel together.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={`CREATE OR REPLACE TABLE account_balances (account_id VARCHAR, as_of DATE, balance DOUBLE);
INSERT INTO account_balances VALUES ('A', DATE '2025-01-10', 100.00), ('A', DATE '2025-01-31', 120.00), ('A', DATE '2025-02-28', 90.00), ('B', DATE '2025-01-10', 50.00), ('B', DATE '2025-01-31', 80.00), ('B', DATE '2025-02-28', 200.00);`}
          code={`-- Question: how much money was in all accounts at the end of January?
SELECT 'WRONG: SUM every January row' AS approach, SUM(balance) AS answer
FROM account_balances
WHERE as_of BETWEEN DATE '2025-01-01' AND DATE '2025-01-31'
UNION ALL
SELECT 'RIGHT: last balance per account, then SUM', SUM(balance)
FROM (
  SELECT account_id, balance
  FROM account_balances
  WHERE as_of BETWEEN DATE '2025-01-01' AND DATE '2025-01-31'
  QUALIFY ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY as_of DESC) = 1
);`}
        />
        <Callout kind="warn" title="350 vs 200">
          The wrong query counts observations, not money — each account twice. The right one takes each
          account's <em>latest</em> January row (QUALIFY + ROW_NUMBER — 1.5's window functions earning
          rent) and sums across accounts only. Every BI tool will happily produce the 350 if the model
          doesn't stop it.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Keys, and the dimension bestiary">
        <p>
          <strong>Surrogate vs natural keys.</strong> Source-system IDs (vendor "CMT", driver "D-100") are <em>natural keys</em>. Warehouses mint their own meaningless integers — <em>surrogate keys</em> — and join on those. Three reasons: natural keys are owned by <GlossaryTerm k="oltp">OLTP</GlossaryTerm> systems that recycle, reformat, and collide them across sources; next lesson's SCD2 needs several rows per natural key, so the surrogate is the version's identity while the natural key is the entity's; and narrow integer keys keep the huge fact table skinny, its joins cheap, and its dictionary-encoded columns (2.3.3) tightly compressed.
        </p>
        <p>
          <strong>The bestiary.</strong> A <em>degenerate dimension</em> is an identifier with no attributes — trip_id, order number. It stays a fact-table column; a dim_trip with one row per fact would be a join to nowhere. A <em>junk dimension</em> bundles leftover low-cardinality flags (rate class, store-and-forward) into one mini-dim of observed combinations, instead of five two-row dims. A <em>role-playing dimension</em> is one physical table joined under several roles: dim_date as pickup and dropoff date, dim_location as pickup and dropoff zone — one table, two foreign keys, aliased at query time:
        </p>
        <CodeRunner
          language="sql"
          setup={`CREATE OR REPLACE TABLE dim_date (date_key INTEGER, full_date DATE, day_name VARCHAR, is_weekend BOOLEAN);
INSERT INTO dim_date VALUES (20250606, DATE '2025-06-06', 'Friday', FALSE), (20250607, DATE '2025-06-07', 'Saturday', TRUE), (20250608, DATE '2025-06-08', 'Sunday', TRUE), (20250609, DATE '2025-06-09', 'Monday', FALSE);
CREATE OR REPLACE TABLE dim_location (location_key INTEGER, zone VARCHAR, borough VARCHAR);
INSERT INTO dim_location VALUES (1, 'JFK Airport', 'Queens'), (2, 'Midtown', 'Manhattan'), (3, 'Williamsburg', 'Brooklyn'), (4, 'Astoria', 'Queens');
CREATE OR REPLACE TABLE fact_trips (trip_id VARCHAR, pickup_date_key INTEGER, pickup_location_key INTEGER, dropoff_location_key INTEGER, fare_amount DOUBLE, tip_amount DOUBLE);
INSERT INTO fact_trips VALUES ('T-9001', 20250606, 1, 2, 52.00, 8.00), ('T-9002', 20250606, 2, 3, 18.50, 3.00), ('T-9003', 20250607, 2, 2, 11.00, 2.00), ('T-9004', 20250607, 1, 4, 45.00, 0.00), ('T-9005', 20250607, 3, 2, 22.00, 4.50), ('T-9006', 20250608, 4, 1, 38.00, 6.00), ('T-9007', 20250608, 2, 1, 49.75, 10.00), ('T-9008', 20250609, 3, 3, 9.25, 1.50), ('T-9009', 20250609, 2, 4, 27.00, 5.00), ('T-9010', 20250609, 1, 2, 55.00, 11.00);`}
          code={`-- dim_location plays two roles: pickup and dropoff. Same table, two joins.
SELECT pu.borough AS pickup_borough,
       dr.borough AS dropoff_borough,
       d.is_weekend,
       COUNT(*)                          AS trips,
       SUM(f.fare_amount + f.tip_amount) AS revenue
FROM fact_trips f
JOIN dim_date d      ON f.pickup_date_key      = d.date_key
JOIN dim_location pu ON f.pickup_location_key  = pu.location_key
JOIN dim_location dr ON f.dropoff_location_key = dr.location_key
GROUP BY ALL
ORDER BY revenue DESC;`}
        />
        <Callout kind="tip" title="The one blessed exception">
          date_key is 20250607, not an opaque integer. Kimball blesses exactly one "smart" surrogate: the
          date key as yyyymmdd — still a narrow, orderable integer, but human-readable in results, for the
          one dimension whose natural key can never change.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Surrogate keys vs natural keys">
        <Tradeoffs
          options={[
            {
              name: 'Surrogate keys (warehouse-minted integers)',
              strengths: [
                'Enables SCD2 — several versions per entity, each with its own key',
                'Insulates against source key recycling, reformatting, and merger collisions',
                'Narrow integer FKs: skinnier facts, cheaper joins, better compression',
              ],
              weaknesses: [
                'Load pipeline must maintain key lookups — real ETL complexity you own',
                'Debugging takes an extra hop: fact to dim to natural key',
              ],
              chooseWhen: 'dimensions can change or data arrives from multiple sources — i.e., almost always in a real warehouse.',
            },
            {
              name: 'Natural keys (use source IDs directly)',
              strengths: [
                'Zero key-management pipeline — loads are plain inserts',
                'Fact rows are self-explanatory; reconciliation against sources is direct',
              ],
              weaknesses: [
                'One row per entity, ever: SCD2 history is structurally impossible',
                'Source key reuse or format changes corrupt history silently',
                'Wide string/composite keys bloat the fact table and every join',
              ],
              chooseWhen: 'quick marts over a single stable source where history tracking is explicitly out of scope.',
            },
          ]}
          note={
            <>
              The classic debate, honestly scored: surrogates cost you at load time and pay you at query
              time and in history. P2 uses surrogates everywhere — partly rigor, mostly because lesson
              2.4.3 is impossible without them.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: from paper design to DDL">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Extend your 2.4.1 paper design, then implement it in your warehouse lab. You need the DuckDB
              CLI (from module 2.1; else <code>winget install DuckDB.cli</code>) and{' '}
              <code>C:\de-lab\warehouse</code> from last lesson.
            </p>
          }
          steps={[
            {
              title: 'Classify every measure (paper)',
              body: (
                <>
                  <p>
                    For fare_amount, tip_amount, trip_miles, trip duration, and a proposed "tip
                    percentage" column: label each additive, semi-additive, or non-additive, and decide
                    whether it belongs in fact_trips at all.
                  </p>
                  <RevealSolution label="Reveal classifications">
                    <p>
                      Fare, tip, miles, duration: additive. Tip percentage: non-additive — do{' '}
                      <em>not</em> store it; store fare and tip, compute SUM(tip)/SUM(fare) at query time.
                      Note what's absent: trips have no semi-additive measures. A driver wallet balance
                      would be one — and its presence would signal a periodic snapshot table, not
                      fact_trips.
                    </p>
                  </RevealSolution>
                </>
              ),
              checkpoint: <>Five written labels, and tip percentage rejected as a stored column.</>,
            },
            {
              title: 'Pick the fact type (paper)',
              body: <p>One sentence: which fact type is fact_trips, and why? One more: name a taxi-business table for each of the other two types.</p>,
              checkpoint: <>Transaction fact (immutable completed events). Reasonable others: driver_balance_daily (periodic snapshot), driver_onboarding (accumulating snapshot).</>,
            },
            {
              title: 'Create the star DDL',
              body: (
                <>
                  <p>Open your warehouse and create the tables:</p>
                  <CodeBlock
                    label="sql"
                    code={`CREATE OR REPLACE TABLE dim_date (
  date_key INTEGER PRIMARY KEY,      -- smart key: 20250607
  full_date DATE, month_name VARCHAR, day_name VARCHAR, is_weekend BOOLEAN);
CREATE OR REPLACE TABLE dim_location (
  location_key INTEGER PRIMARY KEY, zone VARCHAR, borough VARCHAR);
CREATE OR REPLACE TABLE dim_vendor (
  vendor_key INTEGER PRIMARY KEY, vendor_code VARCHAR, vendor_name VARCHAR);
CREATE OR REPLACE TABLE dim_payment (
  payment_key INTEGER PRIMARY KEY, payment_code VARCHAR, method VARCHAR);
CREATE OR REPLACE TABLE fact_trips (
  trip_id VARCHAR,                   -- degenerate dimension
  pickup_date_key INTEGER, dropoff_date_key INTEGER,    -- role-playing
  pickup_location_key INTEGER, dropoff_location_key INTEGER,
  vendor_key INTEGER, payment_key INTEGER,
  trip_miles DECIMAL(6,2), fare_amount DECIMAL(8,2), tip_amount DECIMAL(8,2));`}
                  />
                </>
              ),
              commands: [{ ps: 'duckdb C:\\de-lab\\warehouse\\taxi.duckdb' }],
              checkpoint: <>In the DuckDB shell, <code>SHOW TABLES;</code> lists all five tables.</>,
            },
            {
              title: 'Seed it from the 2.4.1 extract',
              body: (
                <>
                  <p>
                    Populate dimensions first (mint the surrogate keys), then load the completed rides as
                    fact rows, translating each natural key to its surrogate. Do at least three fact rows
                    by hand — feeling the key-lookup tedium is the point (it is what ETL tooling
                    automates). Starters:
                  </p>
                  <CodeBlock
                    label="sql"
                    code={`INSERT INTO dim_vendor VALUES (1, 'CMT', 'Curb Cab Co'), (2, 'VTS', 'Metro Rides');
INSERT INTO dim_payment VALUES (1, 'CRD', 'card'), (2, 'CSH', 'cash');
INSERT INTO dim_location VALUES (1, 'JFK Airport', 'Queens'), (2, 'Midtown', 'Manhattan'),
  (3, 'Williamsburg', 'Brooklyn'), (4, 'Astoria', 'Queens');
-- dim_date: one row per date in the extract (Jun 6 through Jun 9)
-- fact_trips: the five completed rides (9004 is canceled - out of grain)`}
                  />
                </>
              ),
              checkpoint: <><code>SELECT COUNT(*) FROM fact_trips;</code> returns 5 — the canceled ride is absent because the grain excluded it, not because you forgot it.</>,
            },
            {
              title: 'One query per dimension',
              body: <p>Prove every join path: revenue by month (dim_date), by pickup borough (dim_location, pickup role), by vendor name (dim_vendor), and trip count by payment method (dim_payment). Write all four yourself.</p>,
              checkpoint: <>All four queries return grouped rows with no NULL group keys — a NULL key means a fact row whose surrogate lookup you fumbled.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'A table has one row per order that gets UPDATEd as the order moves placed to shipped to delivered. Which fact type?',
              options: [
                'Transaction fact',
                'Periodic snapshot',
                'Accumulating snapshot',
                'It is a dimension, not a fact',
              ],
              answer: 2,
              explain:
                'One row per process instance, milestone columns filled over time, update-heavy: the accumulating snapshot signature. A transaction fact would append one immutable row per state-change event instead.',
            },
            {
              q: 'Why is an account balance semi-additive?',
              options: [
                'It can be negative',
                'It sums correctly across accounts but not across time',
                'It cannot be aggregated at all',
                'It changes too frequently to store',
              ],
              answer: 1,
              explain:
                'Balances are sampled states, not flows: summing across accounts at one instant is meaningful; summing one account across days counts the same money repeatedly. Per-period LAST via a window function is the correct time aggregation.',
            },
            {
              q: 'Why store fare and tip rather than a tip_percentage column?',
              options: [
                'Percentages take more storage',
                'Ratios are non-additive: aggregate components and derive the ratio, or aggregates lie',
                'SQL cannot compute percentages',
                'Because tip data is unreliable',
              ],
              answer: 1,
              explain:
                'AVG(tip_percentage) weights a 3-dollar ride equally with a 300-dollar one. SUM(tip)/SUM(fare) over any slice is always correct — store components, derive ratios at query time.',
            },
            {
              q: 'The single most important reason warehouses mint surrogate keys?',
              options: [
                'Integer joins are marginally faster',
                'Natural keys contain personal data',
                'A dimension entity must be able to have multiple versioned rows (SCD2), each with its own key',
                'BI tools require integer keys',
              ],
              answer: 2,
              explain:
                'Speed and compression are bonuses; the structural reason is versioning. SCD2 stores several rows per natural key, so row identity must be distinct from entity identity. No surrogates, no history.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What is a semi-additive measure? Example and querying implication.',
            a: (
              <p>
                A measure summable across some dimensions but not time — balances, inventory, headcount.
                Implication: time aggregation must be positional (last value per period, or time-weighted
                average), typically a window function, and the BI layer must prevent naive SUMs across
                dates. Naming balances plus the window-function fix is the expected complete answer.
              </p>
            ),
          },
          {
            q: 'Make the case against surrogate keys — then rebut it.',
            a: (
              <p>
                Against: a key-management pipeline to maintain, an extra debugging hop, meaningless to
                source-system owners. Rebuttal: without them you cannot version dimensions, you inherit
                every source's key-recycling accidents, and the fact table carries wide string keys
                forever. The pipeline cost is paid once in tooling; history tracking cannot be
                retrofitted. Arguing both sides credibly is the senior move.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Three fact types: transaction (immutable events), periodic snapshot (sampled state), accumulating snapshot (one updating row per process instance).</>,
          <>Label every measure: additive, semi-additive (never SUM balances across time), or non-additive (store components, derive ratios).</>,
          <>QUALIFY + ROW_NUMBER "last value per period" is how semi-additive measures are queried correctly — window functions from 1.5.</>,
          <>Surrogate keys separate row identity from entity identity: the precondition for SCD2, plus insulation from source-key chaos.</>,
          <>Bestiary: degenerate dimensions ride in the fact table, junk dims bundle stray flags, role-playing dims join one table under several names.</>,
          <>Your warehouse lab now holds the P2 star's skeleton: five tables, surrogate keys, and fact rows that respect the grain.</>,
        ]}
      />
    </>
  )
}
