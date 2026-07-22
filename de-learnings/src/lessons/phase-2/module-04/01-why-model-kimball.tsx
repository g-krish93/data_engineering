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
import { StarSchema3D } from '../../../viz/StarSchema3D'

const ID = '2.4.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Two questions, two shapes">
        <Tiered
          layman={
            <>
              <p>
                Two ways to track spending. A shoebox of receipts: every slip is complete and correct, but
                each has its own layout, and "groceries per month this year?" means emptying the box every
                time.
              </p>
              <p>
                Or: a ledger with one consistent line format — date, amount, category — plus small
                reference booklets (a customer list, a calendar). Any question becomes: scan the lines,
                consult a booklet. Dimensional modeling turns the shoebox into that ledger. The receipts
                were never wrong; they were the wrong <em>shape</em> for questions.
              </p>
            </>
          }
          student={
            <>
              <p>
                An <GlossaryTerm k="oltp">OLTP</GlossaryTerm> schema answers "what is true right now" and
                is normalized so each fact lives in one place — perfect for fast, safe writes. Analytics
                asks "what happened, sliced every way": revenue by month by borough by payment type. The
                normalized shape fights that question — every slice reassembles entities across tables.
              </p>
              <p>
                A <GlossaryTerm k="data-warehouse">warehouse</GlossaryTerm> restructures data for{' '}
                <GlossaryTerm k="olap">OLAP</GlossaryTerm>: a shape where any descriptive attribute is one
                join away. That shape — the star schema — is what this module builds and what your P2
                project ships.
              </p>
            </>
          }
          phd={
            <>
              <p>
                3NF stores each functional dependency once, eliminating update anomalies — the write path
                optimized. The read path pays: every analytical query reconstructs denormalized views join
                by join. Dimensional modeling is deliberate denormalization: accept redundancy inside
                dimensions to buy join-shallowness — every query becomes a one-level star join.
              </p>
              <p>
                Historically, Kimball vs Inmon: Inmon's Corporate Information Factory built a normalized
                enterprise warehouse first and derived marts; Kimball went dimensional immediately,
                integrated via a "bus" of shared dimensions. Modern ELT landed on a hybrid — raw staging,
                then Kimball-style marts. Columnar engines (2.3) later reopened the question: if repeated
                values compress to nothing, why not one big table? Lesson 2.4.4 takes that seriously.
              </p>
            </>
          }
        />
        <p>Feel the problem: one modest question against the normalized OLTP extract seeded below.</p>
        <CodeRunner
          language="sql"
          setup={`CREATE OR REPLACE TABLE vendors (vendor_id INTEGER, vendor_code VARCHAR, vendor_name VARCHAR);
INSERT INTO vendors VALUES (1, 'CMT', 'Curb Cab Co'), (2, 'VTS', 'Metro Rides');
CREATE OR REPLACE TABLE boroughs (borough_id INTEGER, borough_name VARCHAR);
INSERT INTO boroughs VALUES (1, 'Manhattan'), (2, 'Queens'), (3, 'Brooklyn');
CREATE OR REPLACE TABLE zones (zone_id INTEGER, zone_name VARCHAR, borough_id INTEGER);
INSERT INTO zones VALUES (10, 'Midtown', 1), (11, 'JFK Airport', 2), (12, 'Williamsburg', 3), (13, 'Astoria', 2);
CREATE OR REPLACE TABLE payment_types (payment_type_id INTEGER, method VARCHAR);
INSERT INTO payment_types VALUES (1, 'card'), (2, 'cash');
CREATE OR REPLACE TABLE rides (ride_id INTEGER, vendor_id INTEGER, pickup_ts TIMESTAMP, dropoff_ts TIMESTAMP, pickup_zone_id INTEGER, dropoff_zone_id INTEGER, payment_type_id INTEGER, fare_cents INTEGER, tip_cents INTEGER, status VARCHAR);
INSERT INTO rides VALUES (501, 1, TIMESTAMP '2025-05-30 08:12:00', TIMESTAMP '2025-05-30 08:41:00', 11, 10, 1, 5250, 900, 'completed'), (502, 2, TIMESTAMP '2025-05-30 09:05:00', TIMESTAMP '2025-05-30 09:22:00', 10, 12, 2, 1850, 0, 'completed'), (503, 1, TIMESTAMP '2025-06-01 11:40:00', TIMESTAMP '2025-06-01 12:02:00', 12, 10, 1, 2200, 450, 'completed'), (504, 2, TIMESTAMP '2025-06-01 13:15:00', NULL, 10, 13, 1, 0, 0, 'canceled'), (505, 1, TIMESTAMP '2025-06-02 17:30:00', TIMESTAMP '2025-06-02 18:19:00', 10, 11, 1, 4975, 1000, 'completed'), (506, 2, TIMESTAMP '2025-06-02 19:00:00', TIMESTAMP '2025-06-02 19:26:00', 13, 11, 2, 3800, 600, 'completed');`}
          code={`-- "Revenue by month, pickup borough, and payment method."
-- One modest question. Count the joins the OLTP shape demands.
SELECT strftime(r.pickup_ts, '%Y-%m') AS month,
       pb.borough_name               AS pickup_borough,
       pt.method,
       SUM(r.fare_cents + r.tip_cents) / 100.0 AS revenue
FROM rides r
JOIN zones pz         ON r.pickup_zone_id  = pz.zone_id
JOIN boroughs pb      ON pz.borough_id     = pb.borough_id
JOIN payment_types pt ON r.payment_type_id = pt.payment_type_id
JOIN vendors v        ON r.vendor_id       = v.vendor_id
WHERE r.status = 'completed'
GROUP BY ALL
ORDER BY month, revenue DESC;`}
        />
        <Callout kind="warn" title="The subtler pain: ambiguous grain">
          Forgot <code>status = 'completed'</code>? Your revenue disagrees with the next analyst's. Join in
          a child table and every ride double-counts. Modeling makes "what does one row mean" a designed,
          documented fact instead of a per-query guess.
        </Callout>
      </Section>

      <Section kicker="the big idea" title="Kimball's move: model the business process">
        <StarSchema3D caption={
          <>
            <b>Click every dimension</b> and read its fields and join key. The center is the fact table:
            skinny rows of foreign keys plus measures. This exact schema is the one you build in P2.
          </>
        } />
        <Tiered
          layman={
            <>
              <p>
                Kimball's insight: don't model the company's <em>things</em> (customers, vehicles) — model
                its <em>activities</em>. A taxi company's core activity is "a trip happened": one ledger
                line per trip with its numbers, and the descriptions — what date, what zone, which vendor —
                in reference booklets beside the ledger.
              </p>
              <p>On a whiteboard the ledger sits in the middle, booklets around it like points of a star — hence <em>star schema</em>. Every question: scan ledger lines, consult a booklet or two. Booklets never consult each other.</p>
            </>
          }
          student={
            <>
              <p>
                Facts are <strong>measurements of an event</strong>: numeric, mostly additive, enormous row
                counts, narrow rows. Dimensions are <strong>the context of measurement</strong>:
                descriptive attributes, few rows, wide rows. The fact table holds foreign keys plus
                measures; dimensions hold everything you would GROUP BY or filter on. The painful query
                above becomes fact_trips joined to dim_date and dim_location — each exactly one hop.
              </p>
              <p>One process, one fact table — trips, then payouts, then complaints — sharing dimensions (the conformance section below).</p>
            </>
          }
          phd={
            <>
              <p>
                The star is an engineered query shape: dimensions become in-memory hash tables and the
                fact table streams through them in one pass — a star join. Filters land on dimension
                attributes first, shrinking each hash table before the fact scan; columnar engines skip
                fact columns the query never touches. The normalized shape instead forces the optimizer to
                order a join chain where any misestimate cascades.
              </p>
              <p>
                Note what the star does not optimize: writes. Loading requires key lookups and conformance
                — real <GlossaryTerm k="etl">ETL</GlossaryTerm> effort shifted from query time to load
                time, paid once instead of per-query. That asymmetry is the economic argument for modeling.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The grain: one row equals one what">
        <Tiered
          layman={
            <>
              <p>
                Before writing anything in the ledger, decide what one line stands for — and never bend the
                rule. One line per receipt? Per item? Per shopping trip? Any answer works; mixing them
                cannot — if some lines are whole trips and others single items, every total quietly lies.
              </p>
              <p>That decision is the <em>grain</em>: one sentence, written before any columns — "one row is one ______."</p>
            </>
          }
          student={
            <>
              <p>
                The grain is the most important sentence in any model: <strong>"one row in fact_trips is
                one completed taxi trip."</strong> Declare it first, in business terms. Everything follows:
                a measure is admitted only if true at that grain (fare per trip: yes; driver's monthly
                bonus: no), a dimension only if single-valued per row (pickup zone: yes; list of
                passengers: no).
              </p>
              <p>
                Most modeling bugs are grain bugs — sudden double counting after a join means a
                finer-grained table got joined in. When a measurement doesn't fit, don't bend the table;
                declare a second fact table at the grain where it fits.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Declaring the grain fixes the key of the fact relation: row identity is the event instance,
                and every measure must be functionally dependent on it. "Ambiguous grain" is a violated
                dependency — a column determined by something finer or coarser than the declared key —
                which is why aggregates over it stop being meaningful.
              </p>
              <p>
                The grain is also the costliest thing to change: changing it invalidates every downstream
                aggregate and reprocesses history from source. Hence: choose the <em>atomic</em> grain,
                the finest the source supports — you can always aggregate up, never disaggregate.
              </p>
            </>
          }
        />
        <Callout kind="tip" title="Write the sentence down">
          P2's repo will contain the literal sentence "one row in fact_trips is one completed taxi trip."
          Reviewers read the grain statement first and judge every column against it. No grain sentence,
          no review.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Conformed dimensions and the bus">
        <p>
          Many processes means many fact tables. The multiplier: they can share dimensions. If fact_trips
          and fact_complaints join to <em>the same</em> dim_date and dim_vendor — same keys, same
          attributes, same spellings — then "complaints per thousand trips by vendor by quarter" is a
          routine query across two stars. Kimball calls such shared tables <strong>conformed
          dimensions</strong>, and the grid of processes-versus-dimensions the <strong>bus
          matrix</strong>: each new fact table plugs into the same bus of dimensions. The accidental
          alternative — every team its own calendar, its own vendor spellings — turns cross-process
          questions into reconciliation projects. Conformance is boring, political, and the
          highest-leverage modeling work there is; P2 gives you the miniature (dim_date and dim_location
          designed once, reused everywhere).
        </p>
      </Section>

      <Section kicker="trade-offs" title="Model first, or load raw and model later?">
        <Tradeoffs
          options={[
            {
              name: 'Model-first (classic Kimball)',
              strengths: [
                'Grain and conformance designed before data lands — consistency by construction',
                'Bad source data confronted at load time, not discovered in dashboards',
              ],
              weaknesses: [
                'Slow to first insight — modeling meetings before anything is queryable',
                'Tempts teams to discard raw detail they later wish they had kept',
              ],
              chooseWhen: 'requirements are stable and inconsistent metrics are expensive (finance, regulatory).',
            },
            {
              name: 'Load raw, model later (ELT reality)',
              strengths: [
                'Raw data lands immediately and completely — nothing lost, replayable',
                'Modeling iterates cheaply in SQL on stored raw tables',
              ],
              weaknesses: [
                'The "later" is where discipline goes to die — swamps of ad-hoc queries',
                'Every analyst re-derives cleaning logic until a modeled layer is imposed',
              ],
              chooseWhen: 'sources evolve fast and you want history preserved before you fully understand it.',
            },
          ]}
          note={
            <>
              The modern answer is both, in sequence: <GlossaryTerm k="elt">ELT</GlossaryTerm> lands raw
              data in staging, then dbt-style SQL builds Kimball marts on top — raw for completeness,
              stars for consumption. Phase 3 hands you dbt to industrialize this; P2 does it by hand so
              you understand what dbt automates.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: write the grain, on paper first">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You get a raw OLTP extract. Deliverables are words, not DDL: the grain sentence and
              candidate dimension/measure lists. This exercise, on NYC taxi data, is P2's first task.
            </p>
          }
          steps={[
            {
              title: 'Read the raw extract',
              body: (
                <>
                  <p>The extract as CSV (pre-loaded as raw_rides in the runner below):</p>
                  <CodeBlock
                    label="csv"
                    code={`ride_id,vendor_code,driver_id,pickup_ts,dropoff_ts,pickup_zone,dropoff_zone,trip_miles,fare_cents,tip_cents,payment_code,status
9001,CMT,D-100,2025-06-06 08:10,2025-06-06 08:38,JFK Airport,Midtown,17.20,5200,800,CRD,completed
9002,VTS,D-205,2025-06-06 09:02,2025-06-06 09:19,Midtown,Williamsburg,4.10,1850,300,CSH,completed
9004,VTS,D-311,2025-06-07 13:00,,Midtown,Astoria,,0,0,CRD,canceled
9005,CMT,D-205,2025-06-07 17:25,2025-06-07 18:11,Midtown,JFK Airport,16.90,4900,1000,CRD,completed
9006,VTS,D-311,2025-06-08 19:04,2025-06-08 19:30,Williamsburg,Astoria,6.30,2750,0,CSH,completed
9007,CMT,D-100,2025-06-09 07:48,2025-06-09 07:59,Williamsburg,Williamsburg,1.40,950,150,CRD,completed`}
                  />
                  <CodeRunner
                    language="sql"
                    setup={`CREATE OR REPLACE TABLE raw_rides (ride_id INTEGER, vendor_code VARCHAR, driver_id VARCHAR, pickup_ts TIMESTAMP, dropoff_ts TIMESTAMP, pickup_zone VARCHAR, dropoff_zone VARCHAR, trip_miles DOUBLE, fare_cents INTEGER, tip_cents INTEGER, payment_code VARCHAR, status VARCHAR);
INSERT INTO raw_rides VALUES (9001, 'CMT', 'D-100', TIMESTAMP '2025-06-06 08:10:00', TIMESTAMP '2025-06-06 08:38:00', 'JFK Airport', 'Midtown', 17.20, 5200, 800, 'CRD', 'completed'), (9002, 'VTS', 'D-205', TIMESTAMP '2025-06-06 09:02:00', TIMESTAMP '2025-06-06 09:19:00', 'Midtown', 'Williamsburg', 4.10, 1850, 300, 'CSH', 'completed'), (9004, 'VTS', 'D-311', TIMESTAMP '2025-06-07 13:00:00', NULL, 'Midtown', 'Astoria', NULL, 0, 0, 'CRD', 'canceled'), (9005, 'CMT', 'D-205', TIMESTAMP '2025-06-07 17:25:00', TIMESTAMP '2025-06-07 18:11:00', 'Midtown', 'JFK Airport', 16.90, 4900, 1000, 'CRD', 'completed'), (9006, 'VTS', 'D-311', TIMESTAMP '2025-06-08 19:04:00', TIMESTAMP '2025-06-08 19:30:00', 'Williamsburg', 'Astoria', 6.30, 2750, 0, 'CSH', 'completed'), (9007, 'CMT', 'D-100', TIMESTAMP '2025-06-09 07:48:00', TIMESTAMP '2025-06-09 07:59:00', 'Williamsburg', 'Williamsburg', 1.40, 950, 150, 'CRD', 'completed');`}
                    code={`-- Explore before you model. Start with these probes, then write your own:
SELECT status, COUNT(*) AS rides FROM raw_rides GROUP BY status;
-- Try: SELECT DISTINCT vendor_code, payment_code FROM raw_rides;
-- Try: SELECT pickup_zone, COUNT(*) FROM raw_rides GROUP BY pickup_zone;`}
                  />
                </>
              ),
              checkpoint: <>You ran at least three probes and spotted the troublemaker: ride 9004 is canceled, with NULL dropoff and zero fare.</>,
            },
            {
              title: 'Write the grain, then the two lists',
              body: (
                <p>
                  On paper: complete "One row in fact_trips is one ______" — precise enough that ride 9004
                  is unambiguously in or out. Then two columns: context that describes a trip (dimensions)
                  and numbers measured by a trip (measures). Every CSV column lands in one, the other, or
                  "neither, because…".
                </p>
              ),
              checkpoint: <>A written grain sentence that settles the canceled ride, and every extract column accounted for in your lists.</>,
            },
            {
              title: 'Compare against the reveal',
              body: (
                <RevealSolution label="Reveal the grain and lists">
                  <p>
                    <strong>Grain:</strong> "One row in fact_trips is one <em>completed</em> taxi trip."
                    Canceled rides are out — no dropoff, no fare, so trip measures are undefined. They are
                    not garbage: they are a different process (fact_cancellations) if the business wants
                    them.
                  </p>
                  <p>
                    <strong>Dimensions:</strong> date (pickup and dropoff), location (pickup and dropoff
                    zones), vendor, driver, payment method. <strong>Measures:</strong> fare, tip,
                    trip_miles, computed duration. <strong>Neither:</strong> ride_id — it identifies, so
                    it rides in the fact table as a degenerate dimension (2.4.2); status dissolved into
                    the grain itself.
                  </p>
                </RevealSolution>
              ),
              checkpoint: <>Your grain sentence matches the reveal in meaning — especially the canceled ride. If yours included it, reread the grain section.</>,
            },
            {
              title: 'File the grain statement where P2 will find it',
              commands: [
                { ps: 'mkdir C:\\de-lab\\warehouse' },
                { ps: 'Set-Content C:\\de-lab\\warehouse\\grain.txt "fact_trips grain: one row = one completed taxi trip"' },
              ],
              checkpoint: <><code>Get-Content C:\de-lab\warehouse\grain.txt</code> prints your sentence. This folder is your warehouse lab for the rest of the module.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Why do analytics queries hurt on a normalized OLTP schema?',
              options: [
                'Normalized schemas cannot store enough history',
                'Every descriptive attribute must be reassembled through chains of joins, per query',
                'OLTP databases cannot execute GROUP BY',
                'Normalization loses data that analytics needs',
              ],
              answer: 1,
              explain:
                'Nothing is lost and GROUP BY works — the cost is structural: 3NF scatters context to optimize writes, so every slice pays join-reassembly.',
            },
            {
              q: 'What is the grain of a fact table?',
              options: [
                'The number of rows it contains',
                'The finest partition key used for storage',
                'The declared meaning of exactly one row, stated before columns are chosen',
                'The ratio of measures to foreign keys',
              ],
              answer: 2,
              explain:
                'The grain is a sentence, not a statistic: "one row is one completed trip." Measures and dimensions are then admitted or rejected against it. Most double-counting bugs are grain violations.',
            },
            {
              q: 'Two fact tables use "the same" dim_date, but one copy has fiscal quarters and the other calendar quarters. What broke?',
              options: [
                'The grain of both fact tables',
                'Conformance — cross-process analysis now silently disagrees',
                'Nothing, as long as both have a date_key column',
                'Referential integrity',
              ],
              answer: 1,
              explain:
                'A conformed dimension means same keys AND same attributes with same meanings. Two diverged calendars produce two versions of "Q1 revenue" that both look correct — the most expensive kind of wrong.',
            },
            {
              q: 'Why do modern teams load raw data first and model afterward?',
              options: [
                'Because Kimball modeling is obsolete',
                'Raw history stays preserved and replayable while modeling iterates cheaply in-warehouse',
                'Because star schemas do not work on cloud warehouses',
                'To avoid writing SQL transforms',
              ],
              answer: 1,
              explain:
                'ELT changes the sequencing, not the destination: raw staging preserves everything, then Kimball marts are built in SQL on top — dbt (Phase 3) manages that layering.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Walk me through designing a star schema for taxi trips.',
            a: (
              <p>
                Start with the process and the grain, not tables: "the process is completed trips; the
                grain is one row per completed trip." Then measures true at that grain, then dimensions
                single-valued at it. Interviewers listen for the grain sentence coming first — candidates
                who start listing columns usually double-count something within ten minutes.
              </p>
            ),
          },
          {
            q: 'Kimball vs Inmon — does the debate still matter?',
            a: (
              <p>
                The forces matter more than the labels: Inmon prioritized one integrated normalized source
                of truth; Kimball prioritized fast dimensional delivery via conformed dimensions. Modern
                ELT stacks are a synthesis — staging layers play Inmon's role, dbt-built marts are pure
                Kimball. "We do both, in layers," with that mapping, is a senior answer.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>OLTP answers "what is true now"; analytics asks "what happened, sliced every way" — different questions, different shapes.</>,
          <>Kimball models business processes: one fact table per process, dimensions as shared context, arranged in a star.</>,
          <>The grain — "one row is one ______" — is the most important sentence in any model. Write it first; judge every column against it.</>,
          <>Facts are numeric event measurements (long, narrow); dimensions are descriptive context (short, wide).</>,
          <>Conformed dimensions are the bus that lets fact tables answer joint questions; losing conformance forks the company's metrics.</>,
          <>Modern practice layers both: land raw (ELT), then build Kimball marts — P2 by hand, Phase 3 with dbt.</>,
        ]}
      />
    </>
  )
}
