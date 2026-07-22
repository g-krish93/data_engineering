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
import { BenchBars } from '../../../viz/BenchBars'

const ID = '2.4.4'

const SHAPES_SETUP = `CREATE OR REPLACE TABLE dim_date (date_key INTEGER, full_date DATE, month_name VARCHAR, is_weekend BOOLEAN);
INSERT INTO dim_date VALUES
  (20250115, DATE '2025-01-15', 'January', FALSE), (20250118, DATE '2025-01-18', 'January', TRUE),
  (20250212, DATE '2025-02-12', 'February', FALSE), (20250215, DATE '2025-02-15', 'February', TRUE);
CREATE OR REPLACE TABLE dim_location (location_key INTEGER, zone VARCHAR, borough VARCHAR);
INSERT INTO dim_location VALUES
  (1, 'JFK Airport', 'Queens'), (2, 'Midtown', 'Manhattan'), (3, 'Williamsburg', 'Brooklyn'), (4, 'Astoria', 'Queens');
CREATE OR REPLACE TABLE dim_vendor (vendor_key INTEGER, vendor_name VARCHAR);
INSERT INTO dim_vendor VALUES (1, 'Curb Cab Co'), (2, 'Metro Rides');
CREATE OR REPLACE TABLE fact_trips (
  trip_id INTEGER, pickup_date_key INTEGER, pickup_location_key INTEGER,
  vendor_key INTEGER, fare_amount DOUBLE);
INSERT INTO fact_trips VALUES
  (1, 20250115, 1, 1, 52.00), (2, 20250115, 2, 2, 18.50), (3, 20250118, 2, 1, 11.00),
  (4, 20250118, 3, 2, 22.00), (5, 20250118, 1, 1, 45.00), (6, 20250212, 4, 2, 38.00),
  (7, 20250212, 2, 1, 49.75), (8, 20250215, 3, 1, 9.25),  (9, 20250215, 2, 2, 27.00),
  (10, 20250215, 1, 1, 55.00);
CREATE OR REPLACE TABLE obt_trips AS
SELECT f.trip_id, d.full_date, d.month_name, d.is_weekend,
       l.zone, l.borough, v.vendor_name, f.fare_amount
FROM fact_trips f
JOIN dim_date d     ON f.pickup_date_key     = d.date_key
JOIN dim_location l ON f.pickup_location_key = l.location_key
JOIN dim_vendor v   ON f.vendor_key          = v.vendor_key;`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Three shapes for the same facts">
        <Tiered
          layman={
            <>
              <p>
                Three ways to organize the same spreadsheet. One: a main sheet plus small lookup tabs —
                the trips sheet holds codes, and you check the "zones" tab to see that zone 4 is Astoria,
                Queens. Two: lookup tabs for the lookup tabs — zones points to a boroughs tab, which
                points to a states tab. Three: one giant sheet where every row spells everything out —
                "Astoria, Queens, New York, Saturday, weekend, Metro Rides" — repeated on every one of a
                million rows.
              </p>
              <p>
                The giant sheet looks wasteful, and on paper it is. But warehouses stopped storing data
                like paper: when a column stores each distinct value once and just points at it, "Queens
                repeated a million times" costs almost nothing. That storage trick reopened a settled
                argument — which is this lesson.
              </p>
            </>
          }
          student={
            <>
              <p>
                Same model, three physical shapes. <strong>Star</strong>: denormalized dimensions, one
                join per dimension — your default from 2.4.1. <strong>Snowflake</strong>: dimensions
                normalized into chains (dim_location holding borough_id, then dim_borough, then
                dim_state), saving a little storage and costing a join per level.{' '}
                <strong>One Big Table (OBT)</strong>: the star pre-joined into a single wide table — every
                dimension attribute flattened next to its measures, zero joins at query time.
              </p>
              <p>
                The interesting question is not "which is right" but "what does each break, and when does
                that matter." The answer changed in the last decade because{' '}
                <GlossaryTerm k="columnar-storage">columnar storage</GlossaryTerm> changed the costs.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The classic argument against OBT was redundancy: on a row store, repeating a 20-byte
                borough name across 100M rows costs 2 GB and pollutes every page you scan. Under columnar
                dictionary encoding (2.3.3), that column becomes one small dictionary plus 100M short
                codes — often under 100 MB — and if it never appears in a query, it is never even read.
                The redundancy penalty collapsed from "multiplicative" to "modest," which is why
                BigQuery-era practice made wide tables respectable again.
              </p>
              <p>
                The snowflake argument aged in reverse. Its storage savings were always small (dimensions
                are tiny next to facts); its query-time cost — chained joins the optimizer must order —
                remains. Modern optimizers do rescue some cases via join elimination: a snowflake join to
                dim_state that the query never references can be provably dropped when keys are declared.
                But "the optimizer can sometimes undo the harm" is a weak reason to cause it.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Where each shape breaks">
        <Tiered
          layman={
            <>
              <p>
                Each shape has a failure story. The chain-of-tabs version dies by a thousand lookups: to
                say "Queens" you hop through three tabs, every single time. The giant sheet dies when a
                fact about the world changes: if Metro Rides renames itself, you are editing a million
                rows, not one label. The main-sheet-plus-tabs version is the compromise that mostly
                doesn't die — that is its whole virtue.
              </p>
              <p>
                So the practical rule: keep the compromise as your bookkeeping, and print the giant sheet
                as a handout when someone wants everything on one page.
              </p>
            </>
          }
          student={
            <>
              <ul>
                <li>
                  <strong>Snowflake breaks at query time:</strong> every attribute reference walks a join
                  chain; queries and BI semantic models get uglier; savings are a rounding error since
                  dimensions are tiny anyway. It earns its place mainly when a huge dimension (tens of
                  millions of customers) has wide, repetitive sub-attributes, or when a tool demands
                  normalized inputs.
                </li>
                <li>
                  <strong>OBT breaks at change time:</strong> a dimension update — one SCD2 rename —
                  becomes a rewrite across every affected fact row. It also has no conformed-dimension
                  story: each OBT is its own island, and two OBTs answering the same question drift apart.
                </li>
                <li>
                  <strong>Star is the balanced default:</strong> one join per dimension, SCD2 touches two
                  dimension rows, conformance across facts works. Its cost: consumers must know how to
                  join, and extremely wide dashboards pay a few joins per query.
                </li>
              </ul>
              <p>
                The storage picture, on an illustrative 100M-trip model in a columnar{' '}
                <GlossaryTerm k="data-warehouse">warehouse</GlossaryTerm> (illustrative numbers, not a
                benchmark — the point is the ratios):
              </p>
            </>
          }
          phd={
            <>
              <p>
                Quantify the OBT redundancy honestly: flattened dimension attributes are low-cardinality,
                so they dictionary-encode to near-fact-key cost; the storage delta versus a star is
                typically tens of percent, not multiples. What does not collapse is the <em>write
                amplification</em>: immutable columnar files mean an SCD2 change rewrites whole row
                groups — in practice a large fraction of the table (your lab measures a smaller-scale
                version). OBT also freezes point-in-time semantics at build time: whichever dimension
                version you joined in is what the table says forever, unless rebuilt.
              </p>
              <p>
                OBT's genuinely new power move is nesting: columnar formats support structs and repeated
                fields, so "one row per trip with an array of fare line items" keeps parent-child data in
                one table without grain violation — the fact table absorbs its children as arrays.
                BigQuery normalized this style, and Parquet's nested encodings (2.5, next module) are the
                storage machinery beneath it. That is OBT not as denormalized star, but as a richer
                relational shape.
              </p>
            </>
          }
        />
        <BenchBars
          title="Storage: same 100M-trip model, three shapes (illustrative)"
          betterIs="lower"
          items={[
            { label: 'Snowflake schema', value: 5.9, unit: 'GB', note: 'Dims normalized: saves ~0.2 GB of 6.1 - dimensions were never the cost' },
            { label: 'Star schema', value: 6.1, unit: 'GB', note: 'Fact table dominates; dims are a rounding error' },
            { label: 'One Big Table', value: 7.8, unit: 'GB', note: 'Dictionary encoding tames the repeats: +28%, not +400% like a row store' },
          ]}
          caption={
            <>
              Illustrative sizes for the same data. The lesson: snowflaking saves almost nothing, and
              columnar encoding shrinks OBT's penalty from catastrophic to noticeable. Storage is no
              longer the deciding axis — change-handling and governance are.
            </>
          }
        />
        <CodeBlock
          label="sql"
          code={`-- The snowflake version of dim_location, for contrast (display only):
-- dim_location(location_key, zone, borough_id)
--   -> dim_borough(borough_id, borough_name, state_id)
--        -> dim_state(state_id, state_name)
-- "Revenue by borough" now walks: fact -> dim_location -> dim_borough. Two hops
-- for one attribute the star would hold inline.`}
        />
      </Section>

      <Section kicker="see it" title="Same question, two shapes">
        <p>
          The setup seeds the familiar mini star and builds <code>obt_trips</code> from it with one
          star-join CTAS. Ask both shapes the same question — compare the SQL you had to write, then
          confirm the numbers match to the cent:
        </p>
        <CodeRunner
          language="sql"
          setup={SHAPES_SETUP}
          code={`-- The star answers with three joins.
SELECT d.month_name, l.borough, SUM(f.fare_amount) AS revenue
FROM fact_trips f
JOIN dim_date d     ON f.pickup_date_key     = d.date_key
JOIN dim_location l ON f.pickup_location_key = l.location_key
JOIN dim_vendor v   ON f.vendor_key          = v.vendor_key
WHERE v.vendor_name = 'Curb Cab Co'
GROUP BY ALL
ORDER BY month_name, revenue DESC;`}
        />
        <CodeRunner
          language="sql"
          setup={SHAPES_SETUP}
          code={`-- The OBT answers with zero joins. Same rows, same numbers.
SELECT month_name, borough, SUM(fare_amount) AS revenue
FROM obt_trips
WHERE vendor_name = 'Curb Cab Co'
GROUP BY ALL
ORDER BY month_name, revenue DESC;`}
        />
        <Callout kind="info" title="Semantic layers, in one paragraph">
          The OBT query's simplicity is really a user-experience argument: analysts and BI tools prefer
          one table with plain column names. A semantic layer (or metrics store) delivers that experience
          without materializing the OBT: metric and join definitions live in one governed place (dbt's
          semantic layer, Looker's models), queries are generated against the star underneath, and
          "revenue" means one thing everywhere. Where a physical OBT is still wanted — dashboard speed,
          ML feature tables — it is generated from the star, on a schedule, as a product. Phase 3 revisits
          this when dbt enters.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Star vs snowflake vs OBT — the decision">
        <Tradeoffs
          options={[
            {
              name: 'Star schema',
              strengths: [
                'SCD2 and any dimension change touch dimension rows only',
                'Conformed dimensions work — many facts, one dim_date, cross-process queries',
                'One join per dimension: simple enough for optimizers and humans alike',
              ],
              weaknesses: [
                'Consumers must understand joins and point-in-time semantics',
                'Very wide dashboard queries pay several joins each run',
                'Requires a modeled load pipeline (key assignment, conformance work)',
              ],
              chooseWhen: 'building the governed core of a warehouse - the marts layer. This is the default.',
            },
            {
              name: 'Snowflake schema',
              strengths: [
                'Lowest dimension redundancy; sub-entity updates touch one row',
                'Enforces hierarchy integrity (zone always maps to exactly one borough)',
                'Suits genuinely huge dimensions with wide repeated sub-attributes',
              ],
              weaknesses: [
                'Join chains at query time; every attribute is hops away',
                'Storage savings are trivial next to the fact table',
                'Harder for BI tools and analysts to navigate',
              ],
              chooseWhen: 'a dimension is so large and internally repetitive that normalizing it measurably helps - rare; or a tool requires it.',
            },
            {
              name: 'One Big Table',
              strengths: [
                'Zero-join queries: fastest and simplest possible consumption',
                'Perfect handoff shape for dashboards, notebooks, and ML features',
                'Columnar encoding makes the redundancy cost modest; nesting adds expressive power',
              ],
              weaknesses: [
                'A single SCD2 change means rewriting every affected row - a full-table write in immutable formats',
                'No conformance: every OBT is an island that drifts from its siblings',
                'Freezes dimension versions as of build time; history questions need a rebuild',
              ],
              chooseWhen: 'publishing a consumption product derived from the star - never as the system of record.',
            },
          ]}
          note={
            <>
              House position for this curriculum and for P2: <strong>star for the marts; OBT as a mart
              output, not a source of truth.</strong> Model in stars, keep SCD2 in dimensions where it is
              cheap, then materialize wide tables downstream for consumers who want them. Snowflake only
              with a demonstrated, measured reason.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: build the OBT, race it, then hurt it">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will generate a two-million-row star in your warehouse lab, derive an OBT from it, race
              the two shapes on identical questions, and then — the kicker — apply one SCD2 change to
              each and watch which one bleeds. Numbers on your machine will differ; ratios are what
              matter.
            </p>
          }
          steps={[
            {
              title: 'Generate the big star',
              body: (
                <>
                  <p>In the DuckDB shell, synthesize six months of data (a few seconds):</p>
                  <CodeBlock
                    label="sql"
                    code={`CREATE OR REPLACE TABLE dim_date AS
SELECT CAST(strftime(d, '%Y%m%d') AS INTEGER) AS date_key, d::DATE AS full_date,
       strftime(d, '%B') AS month_name, isodow(d) >= 6 AS is_weekend
FROM range(DATE '2025-01-01', DATE '2025-07-01', INTERVAL 1 DAY) t(d);
CREATE OR REPLACE TABLE dim_location (location_key INTEGER, zone VARCHAR, borough VARCHAR);
INSERT INTO dim_location VALUES
  (1, 'JFK Airport', 'Queens'), (2, 'Midtown', 'Manhattan'), (3, 'Williamsburg', 'Brooklyn'),
  (4, 'Astoria', 'Queens'), (5, 'Harlem', 'Manhattan'), (6, 'Park Slope', 'Brooklyn');
CREATE OR REPLACE TABLE dim_vendor (
  vendor_key INTEGER, vendor_id VARCHAR, vendor_name VARCHAR,
  valid_from DATE, valid_to DATE, is_current BOOLEAN);
INSERT INTO dim_vendor VALUES
  (1, 'V1', 'Curb Cab Co', DATE '2025-01-01', DATE '9999-12-31', TRUE),
  (2, 'V2', 'Metro Rides', DATE '2025-01-01', DATE '9999-12-31', TRUE);
CREATE OR REPLACE TABLE fact_trips AS
SELECT i AS trip_id,
       CAST(strftime(DATE '2025-01-01' + INTERVAL (i % 181) DAY, '%Y%m%d') AS INTEGER) AS pickup_date_key,
       1 + (i % 6) AS pickup_location_key,
       1 + ((i // 7) % 6) AS dropoff_location_key,
       CASE WHEN i % 4 = 0 THEN 'V2' ELSE 'V1' END AS vendor_id,
       ROUND(5 + (i % 40) * 1.37, 2) AS fare_amount,
       ROUND((i % 7) * 0.85, 2) AS tip_amount
FROM range(2000000) t(i);`}
                  />
                </>
              ),
              commands: [{ ps: 'duckdb C:\\de-lab\\warehouse\\obt_lab.duckdb' }],
              checkpoint: (
                <>
                  <code>SELECT COUNT(*) FROM fact_trips;</code> returns 2000000; dim_date has 181 rows.
                </>
              ),
            },
            {
              title: 'Derive the OBT with one CTAS',
              body: (
                <CodeBlock
                  label="sql"
                  code={`CREATE OR REPLACE TABLE obt_trips AS
SELECT f.trip_id, dd.full_date, dd.month_name, dd.is_weekend,
       pl.zone AS pickup_zone, pl.borough AS pickup_borough,
       dl.zone AS dropoff_zone, dl.borough AS dropoff_borough,
       v.vendor_name, f.fare_amount, f.tip_amount
FROM fact_trips f
JOIN dim_date dd     ON f.pickup_date_key      = dd.date_key
JOIN dim_location pl ON f.pickup_location_key  = pl.location_key
JOIN dim_location dl ON f.dropoff_location_key = dl.location_key
JOIN dim_vendor v    ON v.vendor_id = f.vendor_id
                    AND dd.full_date BETWEEN v.valid_from AND v.valid_to;`}
                />
              ),
              checkpoint: (
                <>
                  <code>SELECT COUNT(*) FROM obt_trips;</code> returns 2000000 — the star-join CTAS
                  preserved the grain (if it didn't, a join fanned out; find it before continuing).
                </>
              ),
            },
            {
              title: 'Race three questions both ways',
              body: (
                <>
                  <p>
                    Turn on timing with <code>.timer on</code>. Ask each question twice — star form
                    (joins) and OBT form (no joins) — and record all six timings: (1) monthly revenue by
                    pickup borough; (2) weekend vs weekday average fare by vendor name; (3) top five
                    pickup-to-dropoff zone pairs by trip count. Star form of (1), for reference:
                  </p>
                  <CodeBlock
                    label="sql"
                    code={`SELECT dd.month_name, pl.borough, ROUND(SUM(f.fare_amount), 2) AS revenue
FROM fact_trips f
JOIN dim_date dd     ON f.pickup_date_key     = dd.date_key
JOIN dim_location pl ON f.pickup_location_key = pl.location_key
GROUP BY ALL ORDER BY month_name, revenue DESC;`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  Six timings written down, and identical result sets shape-for-shape. Expect both forms
                  in the tens of milliseconds with OBT modestly ahead or tied — DuckDB's columnar hash
                  joins are exactly what stars were designed for. The read path is NOT where these shapes
                  diverge at this scale.
                </>
              ),
            },
            {
              title: 'The kicker: one SCD2 change, two costs',
              body: (
                <>
                  <p>
                    Vendor V1 renames to "Curb Mobility", effective 2025-04-01. Apply it to the star
                    (lesson 2.4.3 mechanics — expire and insert on dim_vendor), then to the OBT (rewrite
                    the flattened column), timing both:
                  </p>
                  <CodeBlock
                    label="sql"
                    code={`-- Star: two dimension rows touched, 2M fact rows untouched.
UPDATE dim_vendor SET valid_to = DATE '2025-03-31', is_current = FALSE
WHERE vendor_id = 'V1' AND is_current;
INSERT INTO dim_vendor VALUES
  (3, 'V1', 'Curb Mobility', DATE '2025-04-01', DATE '9999-12-31', TRUE);
-- OBT: every affected fact row must be rewritten.
UPDATE obt_trips SET vendor_name = 'Curb Mobility'
WHERE vendor_name = 'Curb Cab Co' AND full_date >= DATE '2025-04-01';
SELECT COUNT(*) AS rewritten FROM obt_trips WHERE vendor_name = 'Curb Mobility';`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  The star change touched 2 rows in dim_vendor; the OBT UPDATE rewrote about 754,000 rows
                  (the count query shows it) and took visibly longer. On an immutable lake format this
                  UPDATE would be a rewrite of most of the table — DuckDB is being kind to you.
                </>
              ),
            },
            {
              title: 'Write the sentence, close the module',
              body: (
                <p>
                  In <code>C:\de-lab\warehouse\grain.txt</code>, add one written sentence: what did the
                  SCD2 change cost in each shape, and what does that imply about where OBTs belong? Then
                  read your file top to bottom — grain sentence, and now this. That file is your module
                  2.4 in two lines.
                </p>
              ),
              checkpoint: (
                <>
                  The sentence exists and says, in your words: dimension changes are cheap in a star and
                  a rewrite in an OBT, so OBTs are built FROM the star, downstream. You now hold every
                  tool P2 needs — grain, star DDL, additivity, surrogate keys, SCD2, and shape choice. Go
                  build the taxi warehouse.
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
              q: 'What distinguishes a snowflake schema from a star?',
              options: [
                'Snowflakes have multiple fact tables',
                'Snowflakes normalize dimensions into chains of sub-tables; stars keep dimensions flat',
                'Snowflakes are columnar; stars are row-oriented',
                'Snowflakes do not use surrogate keys',
              ],
              answer: 1,
              explain:
                'Star vs snowflake is purely about dimension normalization: dim_location holding borough inline (star) vs pointing at dim_borough pointing at dim_state (snowflake). Fact tables and storage format are orthogonal.',
            },
            {
              q: 'Why did columnar storage revive the One Big Table approach?',
              options: [
                'Columnar engines cannot execute joins',
                'Dictionary encoding stores each repeated dimension value once, collapsing OBT\'s redundancy penalty',
                'OBTs compress facts better than star fact tables',
                'Cloud warehouses charge only for row count',
              ],
              answer: 1,
              explain:
                'On a row store, flattened attributes multiply storage and pollute every scan. Columnar dictionary encoding (2.3.3) turns a million "Queens" repeats into one dictionary entry plus short codes — and unqueried columns are never read. The redundancy objection mostly evaporated; the change-handling objection did not.',
            },
            {
              q: 'The clearest structural cost of an OBT?',
              options: [
                'Queries against it require complex SQL',
                'It cannot store numeric measures',
                'A dimension change (one SCD2 rename) becomes a rewrite across all affected fact rows',
                'It cannot be partitioned',
              ],
              answer: 2,
              explain:
                'Query simplicity is OBT\'s strength — its weakness is the write path: flattened attributes mean dimension history is physically welded to every fact row. In the star the same change touched two dimension rows; your lab measured the difference.',
            },
            {
              q: 'Why is snowflaking usually not worth it?',
              options: [
                'It loses data relative to a star',
                'The storage it saves is trivial (dims are tiny vs facts) while every query pays extra join hops',
                'Optimizers cannot execute chained joins',
                'It prevents SCD2 from working',
              ],
              answer: 1,
              explain:
                'Dimensions are a rounding error next to the fact table, so normalizing them saves almost nothing — while every attribute reference walks the chain. Join elimination can sometimes drop unused hops, but "sometimes rescued by the optimizer" is not a design goal.',
            },
            {
              q: 'The curriculum\'s house position on these shapes?',
              options: [
                'OBT everywhere; stars are legacy',
                'Snowflake for storage efficiency, star for small marts',
                'Star as the modeled source of truth; OBT materialized downstream as a consumption product',
                'Choose per query at runtime',
              ],
              answer: 2,
              explain:
                'Model and govern in stars (cheap SCD2, conformed dimensions), then generate wide tables for dashboards and ML from them. The OBT is an output. Rebuilding it after dimension changes is fine precisely because it is not the system of record.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Star or One Big Table for our analytics — what would you recommend?',
            a: (
              <p>
                Interrogate the layer first: for the governed core, star — dimension changes stay cheap,
                conformed dimensions keep metrics consistent. For consumption endpoints (a dashboard, a
                feature table), a wide table generated from the star is excellent. The trap answer is
                choosing one for everything; the strong answer is "star as source of truth, OBT as
                derived product," with the SCD2 rewrite cost as your concrete justification.
              </p>
            ),
          },
          {
            q: 'Does denormalization still waste storage in modern warehouses?',
            a: (
              <p>
                Far less than intuition says: columnar dictionary and run-length encoding store repeated
                low-cardinality values close to once, so a flattened borough column costs codes, not
                strings — expect tens of percent overhead, not multiples. The costs that survive are
                write amplification on dimension changes and the governance drift of many parallel wide
                tables. Citing encoding specifically signals you know why, not just what.
              </p>
            ),
          },
          {
            q: 'When would nested or repeated fields beat a separate fact table?',
            a: (
              <p>
                When children are only ever queried with their parent — fare line items with their trip.
                A struct array keeps them in one row, preserving the parent grain and avoiding a join;
                Parquet's nested encodings make it cheap. Keep a separate child fact table when children
                are analyzed independently across parents. That trade-off returns in module 2.5 with
                Parquet's dremel-style shredding.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>
            Star, snowflake, and OBT are physical shapes for one logical model — judge them by what each
            breaks: snowflake breaks queries (join chains), OBT breaks changes (rewrites), star is the
            balanced default.
          </>,
          <>
            Columnar dictionary encoding neutralized most of OBT's storage penalty — which is why the
            wide-table style became respectable again in BigQuery-era warehouses.
          </>,
          <>
            The SCD2 test is the sharpest discriminator: two dimension rows in a star vs roughly 754,000
            rewritten rows in your lab's OBT.
          </>,
          <>
            Semantic layers give consumers OBT-like simplicity over a star without materializing
            anything; physical OBTs are scheduled products built from the star.
          </>,
          <>
            House position: star for marts, OBT as a mart output — never the source of truth; snowflake
            only with a measured reason.
          </>,
          <>
            Module 2.4 complete: grain, facts and dimensions, SCD2, and shape choice. That is the entire
            toolkit P2 requires — go model the taxi warehouse.
          </>,
        ]}
      />
    </>
  )
}
