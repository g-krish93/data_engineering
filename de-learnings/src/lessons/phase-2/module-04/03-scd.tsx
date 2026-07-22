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

const ID = '2.4.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Dimensions change, and history is at stake">
        <Tiered
          layman={
            <>
              <p>
                Think of a well-run personnel file. When someone changes departments, the clerk does not
                take an eraser to their old records — that would make last year's org chart a lie. A new
                page goes in the file, date-stamped: "from July 1, Engineering." The old page stays,
                stamped "until June 30." The file can now answer both "where do they work?" and "where did
                they work in March?" — because nothing was erased, only dated.
              </p>
              <p>
                Warehouse dimensions need the same discipline. A driver moves to Harlem; a vendor renames
                itself. Erase-and-replace, and every old report quietly changes its answer. This lesson is
                about never erasing.
              </p>
            </>
          }
          student={
            <>
              <p>
                Dimensions drift slowly — hence <em>slowly changing dimensions</em> (SCD). The naive load
                strategy is UPDATE-in-place: driver D-100's city becomes Harlem, overwriting Queens. The
                lie appears the next time anyone asks a historical question: "March revenue by driver
                city" now attributes her March trips to Harlem — a city she wasn't driving in. No error is
                thrown; the dashboard changed its answer about a <em>finished</em> month, and nobody was
                told.
              </p>
              <p>
                The question that decides everything: <strong>when did we know what?</strong> If the
                warehouse can answer it, historical reports are stable truth; if not, they are whatever
                the dimensions happen to say today. SCD type 2 — a new row per version, with validity
                dates — is how warehouses answer it, and it is a hard requirement of P2.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Temporal databases distinguish <em>valid time</em> (when a fact was true in the world)
                from <em>transaction time</em> (when the database learned it). A Type 1 dimension stores
                neither — only current state, a lossy projection of the entity's history. SCD2 recovers
                valid time. Bitemporal tables track both axes — "what did we believe on March 5 about
                where she lived on March 1" — needed for audit and for correcting late data without
                destroying the record of the earlier belief. SCD2 is the pragmatic single-axis subset that
                covers most analytical needs.
              </p>
              <p>
                Notice what SCD2 turns the dimension into: an append-only log of entity states — event
                sourcing's core idea in a Kimball suit. The rhyme becomes literal in Phase 5, where CDC
                streams deliver exactly these state transitions.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The SCD menu: types 0, 1, 2, 3, 6">
        <Tiered
          layman={
            <>
              <p>Five filing policies for a changed detail, cheapest first:</p>
              <ul>
                <li><strong>Type 0</strong> — never change it. A birth certificate.</li>
                <li><strong>Type 1</strong> — erase and rewrite. An address book kept in pencil.</li>
                <li><strong>Type 2</strong> — add a new dated page, keep the old. The personnel file.</li>
                <li><strong>Type 3</strong> — one "previous value" line on the form. Room for exactly one step of history.</li>
                <li><strong>Type 6</strong> — dated pages plus a sticky note on every old page saying what the value is today.</li>
              </ul>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Type 0 (retain original):</strong> attributes that must never move — date of birth, original signup channel.</li>
                <li><strong>Type 1 (overwrite):</strong> corrections and analytically meaningless changes — typos, phone numbers. Attribute history knowingly discarded.</li>
                <li><strong>Type 2 (add row):</strong> the workhorse. Each version is a row with valid_from, valid_to, is_current — same natural key, fresh surrogate key.</li>
                <li><strong>Type 3 (add column):</strong> previous_value beside current_value, for one-off reorg comparisons. One step deep, then full.</li>
                <li><strong>Type 6 (hybrid):</strong> Type 2 rows that also carry a Type-1-maintained "current value" column, so restating history under today's labels is a plain column reference.</li>
              </ul>
              <p>
                The decision is <em>per attribute</em>, not per table: one dim_driver can be Type 1 on
                phone_number and Type 2 on city. "Which attributes are Type 2" is a business conversation
                about which histories matter.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Each type preserves a different query class. Type 2's bookkeeping columns encode a step
                function: each row one step, valid over a closed interval. "Value at time t" is an
                interval-containment lookup — which is why per entity the intervals must tile the
                timeline: a gap drops fact rows from point-in-time joins (vanishing revenue), an overlap
                matches two versions and double-counts.
              </p>
              <p>
                Per-attribute mixing has a subtle consequence: "did this row change?" must be computed
                over the Type-2-tracked columns <em>only</em> — a Type 1 typo fix must not spawn a
                version. That is exactly why change detection hashes a chosen column list, as you are
                about to do.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="mechanics" title="SCD2 end-to-end: detect, expire, insert">
        <Tiered
          layman={
            <>
              <p>
                The clerk's routine when the quarterly staff list arrives: compare each person's listed
                details against the newest page in their file. Identical? File nothing. Different? Stamp
                the current page "valid until yesterday," add a fresh page stamped "valid from today."
                Never touch the unchanged; never, ever erase.
              </p>
              <p>Three motions — compare, stamp, add — in that order, every time. That is the whole algorithm.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Detect:</strong> join staging to current dim rows on the natural key; a row changed if the hash of its tracked columns differs. One hash beats N NULL-safe column comparisons.</li>
                <li><strong>Expire:</strong> UPDATE the changed entities' current rows — valid_to = day before the change, is_current = FALSE. The only UPDATE in the scheme, and it touches bookkeeping, not data.</li>
                <li><strong>Insert:</strong> new rows with fresh surrogate keys, valid_from = change date, valid_to = 9999-12-31 (the far-future sentinel keeps BETWEEN predicates simple), is_current = TRUE.</li>
              </ul>
              <p>Run the whole story — Priya moves from Queens to Harlem; Marcus is unchanged:</p>
            </>
          }
          phd={
            <>
              <p>
                On hashing: md5 over a delimited concatenation is 128 bits — accidental collision is
                negligible against any row count (birthday bound near 2 to the 64th). The real bugs are
                mundane: concatenating without a delimiter ('ab','c' equals 'a','bc') and NULL handling
                (concat_ws skips NULLs, so NULL and empty string collide — coalesce to a sentinel if that
                distinction matters). Many teams store the hash as a column (hash_diff) so detection never
                rescans wide columns — the pattern dbt snapshots and Data Vault industrialize; dbt's check
                strategy is this lesson as three lines of YAML (Phase 3).
              </p>
              <p>
                Note the write pattern: expire is the sole in-place mutation; everything else appends.
                SCD2 is an append-only log with a materialized "current" flag — which is why it ports
                cleanly to lakehouse formats and why CDC pipelines (Phase 5) emit exactly these
                expire/insert pairs.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={`CREATE OR REPLACE TABLE dim_driver (driver_key INTEGER, driver_id VARCHAR, driver_name VARCHAR, city VARCHAR, valid_from DATE, valid_to DATE, is_current BOOLEAN);
INSERT INTO dim_driver VALUES (1, 'D-100', 'Priya', 'Queens', DATE '2025-01-01', DATE '9999-12-31', TRUE), (2, 'D-200', 'Marcus', 'Brooklyn', DATE '2025-01-01', DATE '9999-12-31', TRUE);
CREATE OR REPLACE TABLE staging_drivers (driver_id VARCHAR, driver_name VARCHAR, city VARCHAR);
INSERT INTO staging_drivers VALUES ('D-100', 'Priya', 'Harlem'), ('D-200', 'Marcus', 'Brooklyn');`}
          code={`-- Step 1: DETECT - which incoming rows differ on tracked columns?
CREATE OR REPLACE TEMP TABLE changed AS
SELECT s.*
FROM staging_drivers s
JOIN dim_driver d ON d.driver_id = s.driver_id AND d.is_current
WHERE md5(concat_ws('|', s.driver_name, s.city))
   <> md5(concat_ws('|', d.driver_name, d.city));

-- Step 2: EXPIRE - close the old version's interval.
UPDATE dim_driver
SET valid_to = DATE '2025-06-30', is_current = FALSE
WHERE is_current AND driver_id IN (SELECT driver_id FROM changed);

-- Step 3: INSERT - new version, fresh surrogate key, open interval.
INSERT INTO dim_driver
SELECT (SELECT MAX(driver_key) FROM dim_driver) + ROW_NUMBER() OVER (),
       driver_id, driver_name, city,
       DATE '2025-07-01', DATE '9999-12-31', TRUE
FROM changed;

SELECT driver_key, driver_id, city,
       valid_from::VARCHAR AS valid_from,
       valid_to::VARCHAR   AS valid_to, is_current
FROM dim_driver ORDER BY driver_id, valid_from;`}
        />
        <Callout kind="info" title="Read the result like a clerk">
          Priya has two rows: Queens (Jan 1 to Jun 30, expired) and Harlem (Jul 1 onward, current). Marcus
          has one — the hash matched, so the load never touched him. Production wraps expire+insert in one
          transaction and gets <GlossaryTerm k="idempotency">idempotency</GlossaryTerm> from the hash
          comparison itself: an unchanged batch produces zero changed rows, so re-running is a no-op.
        </Callout>
      </Section>

      <Section kicker="the payoff" title="Point-in-time joins: where SCD2 earns its keep">
        <p>
          Versioned rows are bookkeeping; the payoff is the join. To attribute each trip to the driver
          attributes <em>in effect when the trip happened</em>, join the fact to the version whose
          validity interval contains the trip date. The tempting shortcut — natural key plus is_current —
          is the update-in-place lie sneaking back in through the JOIN clause. Run both:
        </p>
        <CodeRunner
          language="sql"
          setup={`CREATE OR REPLACE TABLE dim_driver (driver_key INTEGER, driver_id VARCHAR, driver_name VARCHAR, city VARCHAR, valid_from DATE, valid_to DATE, is_current BOOLEAN);
INSERT INTO dim_driver VALUES (1, 'D-100', 'Priya', 'Queens', DATE '2025-01-01', DATE '2025-06-30', FALSE), (2, 'D-200', 'Marcus', 'Brooklyn', DATE '2025-01-01', DATE '9999-12-31', TRUE), (3, 'D-100', 'Priya', 'Harlem', DATE '2025-07-01', DATE '9999-12-31', TRUE);
CREATE OR REPLACE TABLE fact_trips (trip_id INTEGER, driver_id VARCHAR, trip_date DATE, fare_amount DOUBLE);
INSERT INTO fact_trips VALUES (1, 'D-100', DATE '2025-03-02', 10.00), (2, 'D-100', DATE '2025-03-18', 12.00), (3, 'D-200', DATE '2025-03-25', 18.00), (4, 'D-100', DATE '2025-08-09', 30.00), (5, 'D-200', DATE '2025-08-21', 22.00);`}
          code={`-- Question: fare revenue by driver city. Two joins, two different answers.
SELECT 'naive: is_current join' AS method, d.city, SUM(f.fare_amount) AS fare
FROM fact_trips f
JOIN dim_driver d ON d.driver_id = f.driver_id AND d.is_current
GROUP BY ALL
UNION ALL
SELECT 'point-in-time join', d.city, SUM(f.fare_amount)
FROM fact_trips f
JOIN dim_driver d ON d.driver_id = f.driver_id
                 AND f.trip_date BETWEEN d.valid_from AND d.valid_to
GROUP BY ALL
ORDER BY method, city;`}
        />
        <p>
          The naive join reports Harlem: 52 — Priya's March trips (22 of it) teleported to a city she
          moved to in July. The point-in-time join splits correctly: Queens 22, Harlem 30. Same facts,
          same dimension — the bookkeeping only pays off if the join respects it.
        </p>
        <Callout kind="tip" title="P2 does the lookup at load time">
          Production warehouses usually run this interval lookup once, in the{' '}
          <GlossaryTerm k="etl">ETL</GlossaryTerm>: each incoming fact row is assigned the surrogate key
          of the version valid at its event date, and every downstream query becomes a plain key join —
          point-in-time by construction. P2's load script does exactly that; the BETWEEN join remains your
          tool for exploration and for auditing the load.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Is SCD2 always the answer?">
        <Tradeoffs
          options={[
            {
              name: 'SCD2 on meaningful attributes',
              strengths: [
                'Historical queries are exact and stable — reports never retroactively change',
                'Storage-cheap: new rows only when something changes',
              ],
              weaknesses: [
                'Pipeline complexity: detection, expiry, key assignment — yours to maintain',
                'Every consumer must join correctly or silently get wrong numbers',
              ],
              chooseWhen: 'attributes carry analytical history reports genuinely slice by — the default for a serious warehouse.',
            },
            {
              name: 'Type 1 + periodic full snapshots',
              strengths: [
                'Trivial pipeline: overwrite dims, copy the whole table nightly',
                'Any past state recoverable by reading that day\'s snapshot',
              ],
              weaknesses: [
                'History trapped in N table copies — point-in-time joins across snapshots are miserable',
                'Granularity capped at snapshot frequency; storage grows regardless of change rate',
              ],
              chooseWhen: 'you need cheap insurance on dims nobody queries historically — yet.',
            },
            {
              name: 'Event-log reconstruction (kimball-less)',
              strengths: [
                'The raw change log is the most complete history possible',
                'Any SCD policy derivable later by replaying events',
              ],
              weaknesses: [
                'Every historical query re-derives state via windowed replays — expensive, easy to fumble',
                'No shared conformed layer; BI tools and analysts cannot cope',
              ],
              chooseWhen: 'as the raw layer beneath a modeled warehouse — rarely as what analysts touch.',
            },
          ]}
          note={
            <>
              House position: keep raw change history in staging, apply SCD2 to the handful of attributes
              the business queries historically, Type 1 the rest. dbt snapshots (Phase 3) generate this
              lesson's SQL from configuration — automation changes the mechanics, not the design decision.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: SCD2 by hand, three changes, exact answers">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Maintain dim_vendor through three change events in your warehouse lab, then prove
              correctness with three point-in-time queries whose answers are known exactly. This is P2's
              SCD2 requirement in miniature.
            </p>
          }
          steps={[
            {
              title: 'Seed the world as of January 1',
              body: (
                <>
                  <p>In the DuckDB shell, create the versioned dimension and a year of trips:</p>
                  <CodeBlock
                    label="sql"
                    code={`CREATE OR REPLACE TABLE dim_vendor (
  vendor_key INTEGER, vendor_id VARCHAR, vendor_name VARCHAR, category VARCHAR,
  valid_from DATE, valid_to DATE, is_current BOOLEAN);
INSERT INTO dim_vendor VALUES
  (1, 'V1', 'Curb Cab Co', 'street_hail',  DATE '2025-01-01', DATE '9999-12-31', TRUE),
  (2, 'V2', 'Metro Rides', 'app_dispatch', DATE '2025-01-01', DATE '9999-12-31', TRUE);
CREATE OR REPLACE TABLE fact_trips (
  trip_id INTEGER, vendor_id VARCHAR, trip_date DATE, fare_amount DECIMAL(8,2));
INSERT INTO fact_trips VALUES
  (1, 'V1', DATE '2025-02-10', 20.00), (2, 'V1', DATE '2025-03-05', 15.00),
  (3, 'V2', DATE '2025-03-20', 30.00), (4, 'V1', DATE '2025-05-11', 25.00),
  (5, 'V2', DATE '2025-07-04', 40.00), (6, 'V1', DATE '2025-08-19', 35.00),
  (7, 'V2', DATE '2025-09-30', 45.00), (8, 'V1', DATE '2025-10-12', 50.00);`}
                  />
                </>
              ),
              commands: [{ ps: 'duckdb C:\\de-lab\\warehouse\\taxi.duckdb' }],
              checkpoint: <><code>SELECT COUNT(*) FROM dim_vendor;</code> returns 2; <code>SELECT COUNT(*) FROM fact_trips;</code> returns 8.</>,
            },
            {
              title: 'Apply event 1 (the worked example)',
              body: (
                <>
                  <p>Effective April 1: V1 renames to "Curb Mobility". Expire, then insert — this pair is your template:</p>
                  <CodeBlock
                    label="sql"
                    code={`UPDATE dim_vendor SET valid_to = DATE '2025-03-31', is_current = FALSE
WHERE vendor_id = 'V1' AND is_current;
INSERT INTO dim_vendor VALUES
  (3, 'V1', 'Curb Mobility', 'street_hail', DATE '2025-04-01', DATE '9999-12-31', TRUE);`}
                  />
                </>
              ),
              checkpoint: <>dim_vendor has 3 rows, and exactly one V1 row has is_current = TRUE.</>,
            },
            {
              title: 'Apply events 2 and 3 yourself',
              body: (
                <>
                  <p>
                    Event 2, effective July 1: V2's category changes to "hybrid". Event 3, effective
                    October 1: V1 renames again, to "Curb Mobility LLC". Write both expire/insert pairs
                    (surrogate keys 4 and 5; valid_to is the day before each effective date).
                  </p>
                  <RevealSolution label="Reveal events 2 and 3">
                    <CodeBlock
                      label="sql"
                      code={`UPDATE dim_vendor SET valid_to = DATE '2025-06-30', is_current = FALSE
WHERE vendor_id = 'V2' AND is_current;
INSERT INTO dim_vendor VALUES
  (4, 'V2', 'Metro Rides', 'hybrid', DATE '2025-07-01', DATE '9999-12-31', TRUE);
UPDATE dim_vendor SET valid_to = DATE '2025-09-30', is_current = FALSE
WHERE vendor_id = 'V1' AND is_current;
INSERT INTO dim_vendor VALUES
  (5, 'V1', 'Curb Mobility LLC', 'street_hail', DATE '2025-10-01', DATE '9999-12-31', TRUE);`}
                    />
                  </RevealSolution>
                </>
              ),
              checkpoint: <>dim_vendor has 5 rows: three V1 versions, two V2 versions. Per vendor_id the intervals tile the timeline — no gaps, no overlaps — and exactly one row each is current.</>,
            },
            {
              title: 'The three historical queries',
              body: (
                <>
                  <p>
                    Answer each with a point-in-time join (BETWEEN valid_from AND valid_to).{' '}
                    <strong>Q1</strong>: trips and total fare by vendor_name, attributed to the name in
                    effect at trip time. <strong>Q2</strong>: the same by category. <strong>Q3</strong>:
                    the dimension exactly as it stood on May 1 (vendor_id, vendor_name, category).
                  </p>
                  <RevealSolution label="Reveal query SQL">
                    <CodeBlock
                      label="sql"
                      code={`-- Q1
SELECT d.vendor_name, COUNT(*) AS trips, SUM(f.fare_amount) AS fare
FROM fact_trips f
JOIN dim_vendor d ON d.vendor_id = f.vendor_id
                 AND f.trip_date BETWEEN d.valid_from AND d.valid_to
GROUP BY d.vendor_name ORDER BY d.vendor_name;
-- Q2: same join, GROUP BY d.category
-- Q3
SELECT vendor_id, vendor_name, category FROM dim_vendor
WHERE DATE '2025-05-01' BETWEEN valid_from AND valid_to ORDER BY vendor_id;`}
                    />
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  Exact expected results — Q1: Curb Cab Co 2 trips 35.00, Curb Mobility 2 trips 60.00,
                  Curb Mobility LLC 1 trip 50.00, Metro Rides 3 trips 115.00. Q2: app_dispatch 1 trip
                  30.00, hybrid 2 trips 85.00, street_hail 5 trips 145.00. Q3: V1 as Curb Mobility
                  (street_hail), V2 as Metro Rides (app_dispatch). Any deviation means an interval is
                  wrong — find the gap or overlap before moving on.
                </>
              ),
            },
            {
              title: 'Break it on purpose',
              body: (
                <p>
                  Rerun Q1 with the naive join (<code>AND d.is_current</code> instead of the BETWEEN).
                  Watch all of V1's 145.00 collapse onto "Curb Mobility LLC" — a name that did not exist
                  before October. That wrong number is what most quickly-built warehouses serve daily.
                </p>
              ),
              checkpoint: <>Naive Q1 shows Curb Mobility LLC with 5 trips / 145.00 and the earlier names gone. You can now say precisely why it is wrong.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'What exactly goes wrong with Type 1 (overwrite) on an attribute reports group by?',
              options: [
                'The UPDATE is slow on large dimensions',
                'Historical reports silently change their answers, re-attributing old facts to new attribute values',
                'It creates duplicate rows in the dimension',
                'Foreign keys in the fact table break',
              ],
              answer: 1,
              explain:
                'Nothing breaks mechanically — that is the trap. Old facts still join fine, but to rewritten context: March trips grouped by a city adopted in July. The numbers move with no error surfaced.',
            },
            {
              q: 'In SCD2, which three columns implement versioning?',
              options: [
                'created_at, updated_at, deleted_at',
                'valid_from, valid_to, is_current',
                'version_number, is_deleted, load_date',
                'hash_key, natural_key, surrogate_key',
              ],
              answer: 1,
              explain:
                'valid_from/valid_to bound each version\'s reign (9999-12-31 as the open-ended sentinel); is_current is a convenience flag. Per entity, the intervals must tile time with no gaps or overlaps.',
            },
            {
              q: 'Why hash the tracked columns instead of comparing them one by one?',
              options: [
                'Hashes are impossible to get wrong',
                'One expression with uniform NULL handling replaces N NULL-safe comparisons — and only tracked columns participate',
                'md5 makes the comparison cryptographically secure',
                'Hashing avoids reading the columns at all',
              ],
              answer: 1,
              explain:
                'An engineering convenience, not magic: fewer NULL-comparison bugs, and the column list documents which attributes are Type 2. Mind the delimiter and NULL-vs-empty-string pitfalls; security is irrelevant here.',
            },
            {
              q: 'A trip on 2025-03-15 must be attributed to the vendor name in effect that day. Which join is correct?',
              options: [
                'ON d.vendor_id = f.vendor_id AND d.is_current',
                'Only the BETWEEN valid_from AND valid_to join',
                'Only a plain surrogate-key join, when the load assigned version keys',
                'Either the BETWEEN join or a load-time-assigned version-key join',
              ],
              answer: 3,
              explain:
                'Two correct routes to the same semantics: interval-match at query time, or assign the correct version\'s key at load time and join plainly forever. The is_current join is the only wrong option — it restates history as the present.',
            },
            {
              q: 'Dims maintained by nightly full snapshot copies: a driver changed boroughs twice in one day. What history remains?',
              options: [
                'Both changes, with timestamps',
                'Only the state at snapshot time — intraday changes collapsed into one',
                'Neither change is recorded at all',
                'Overlapping SCD2 intervals',
              ],
              answer: 1,
              explain:
                'Snapshot granularity caps history granularity: one copy per night records one state per night. SCD2 driven by a change feed records every transition — the core weakness of the snapshot shortcut.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain SCD types 1 and 2 and when you would choose each.',
            a: (
              <p>
                Type 1 overwrites — right for corrections and attributes with no analytical history. Type
                2 adds a dated version row — right when reports slice history by the attribute. Strong
                answers add that the choice is per-attribute within one dimension, and that Type 2
                requires surrogate keys because entity and row identity diverge.
              </p>
            ),
          },
          {
            q: 'How would you verify an SCD2 dimension is internally consistent?',
            a: (
              <p>
                Three assertions per natural key: exactly one is_current row; intervals tile time (each
                valid_from is the day after the predecessor's valid_to — no gaps, no overlaps); and a
                fact-to-dim point-in-time join returns exactly one match per fact row (join count equals
                fact count). Naming concrete checks, not "I would test it," is what lands.
              </p>
            ),
          },
          {
            q: 'When is SCD2 the wrong tool?',
            a: (
              <p>
                When nobody queries the attribute's history (Type 1 is cheaper); when changes are so
                frequent that "slowly" no longer applies — a rapidly changing attribute explodes the
                dimension and belongs in a fact or mini-dimension; and when the business needs "what did
                we believe on date X" audit semantics, which requires bitemporal modeling, not just
                valid-time SCD2.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Update-in-place rewrites history: old facts re-attributed to new context, no error raised. "When did we know what" is the question your model must answer.</>,
          <>SCD types are per-attribute policies: 0 never, 1 overwrite, 2 version rows, 3 previous-value column, 6 hybrid. Type 2 is the workhorse.</>,
          <>SCD2 mechanics: detect via a hash of tracked columns, expire the current row's interval, insert the new version with a fresh surrogate key and open-ended valid_to.</>,
          <>The payoff is the point-in-time join — interval match at query time, or version-key assignment at load time. An is_current join on historical facts is always wrong.</>,
          <>Intervals must tile time per entity: gaps make facts vanish, overlaps double-count. Verify with counts, as the lab did.</>,
          <>SCD2 is an append-only log of entity states — the idea CDC (Phase 5) streams and dbt snapshots (Phase 3) automate. You built it by hand, so the tools will make sense.</>,
        ]}
      />
    </>
  )
}
