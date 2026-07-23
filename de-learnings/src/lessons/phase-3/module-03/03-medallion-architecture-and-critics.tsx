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
import { MedallionFlow } from '../../../viz/MedallionFlow'

const ID = '3.3.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="You have a bucket full of raw files. Now what?">
        <p>
          The last two lessons gave you a place to land raw data — objects in a bucket. But a pile of raw files is not a
          data product; nobody builds a dashboard directly on messy, half-typed, duplicated source dumps. You need a way
          to go from raw to trustworthy without losing the raw, and without every analyst re-inventing the cleaning. The{' '}
          <GlossaryTerm k="medallion-architecture">medallion architecture</GlossaryTerm> — bronze, silver, gold — is the
          most common convention for organizing that journey in a lake. It is also, fairly, accused of being three fancy
          names for something you already know. This lesson teaches the pattern and takes its critics seriously.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Think of refining sugar. Raw cane arrives muddy and full of stalks — you keep it exactly as delivered,
                because if anything goes wrong later you can always start again from the original crop. Then you wash and
                filter it into clean white sugar. Then you portion it into the branded bags people actually buy. Three
                stages: keep-as-is, clean, package.
              </p>
              <p>
                The trick is that each stage is made <em>from the one before it</em>, and you never throw the earlier
                stages away. If you discover a mistake in the cleaning, you do not panic — you still have the raw cane and
                can re-run the whole thing. Medallion architecture is this refinery for data: raw (bronze), cleaned
                (silver), packaged (gold), each rebuilt from the last, raw always kept.
              </p>
            </>
          }
          student={
            <>
              <p>Three layers, each a table (or set of files) rebuilt from the layer beneath it:</p>
              <ul>
                <li>
                  <strong><GlossaryTerm k="bronze-layer">Bronze</GlossaryTerm> — raw, as-ingested.</strong> An exact copy
                  of the source, append-only, untouched. Its job is to be a replayable source of truth: if a downstream
                  bug corrupts everything, you rebuild from bronze without re-fetching from the source system.
                </li>
                <li>
                  <strong><GlossaryTerm k="silver-layer">Silver</GlossaryTerm> — cleaned and conformed.</strong> Types
                  fixed, duplicates removed, keys joined, bad rows quarantined, one row per real entity. This is the
                  trustworthy, queryable version of the data.
                </li>
                <li>
                  <strong><GlossaryTerm k="gold-layer">Gold</GlossaryTerm> — business marts and aggregates.</strong> The
                  shapes people actually query: daily revenue, per-customer summaries, the star schemas from lesson 2.4,
                  built for dashboards and reports.
                </li>
              </ul>
              <p>
                The benefits are replayability (rebuild any layer from the one below), clear contracts (each layer has a
                known shape consumers can depend on), and isolation of concerns (ingestion bugs live in bronze, business
                logic lives in gold). It is essentially <GlossaryTerm k="elt">ELT</GlossaryTerm> — load raw first, then
                transform in stages — expressed as three named zones on the lake.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Medallion is a staging convention, not a modeling methodology: it says <em>where</em> data sits at each
                refinement level and <em>that</em> each level is a pure function of the level below, so the whole thing is
                a recomputable DAG rooted at immutable raw. That recomputability is the real property — it turns the lake
                into an idempotent, replayable pipeline where a transform bug is a code fix plus a rebuild, not a data-loss
                incident, because bronze is append-only and never mutated (which sits perfectly on immutable object
                storage from 3.3.1).
              </p>
              <p>
                What it deliberately does <em>not</em> specify is the modeling technique inside each layer. Silver could be
                3NF, gold could be Kimball star schemas or wide OBTs; the medallion names are orthogonal to that choice.
                This is exactly why critics call it under-specified — it is a useful shared vocabulary and a discipline
                about lineage and replayability, layered on top of modeling decisions it does not make for you. Hold that
                thought; the critics&apos; section is where it gets interesting.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The three layers, and why each is rebuilt from the last">
        <p>
          Click each zone — raw on the left, refined and aggregated to the right. Notice the cubes get fewer and tidier
          as quality rises: bronze keeps everything, silver dedupes and conforms, gold aggregates to the handful of
          numbers a business actually asks for.
        </p>
        <MedallionFlow
          caption={
            <>
              <b>Click a zone.</b> <b style={{ color: '#b45309' }}>Bronze</b> raw and append-only,{' '}
              <b style={{ color: '#94a3b8' }}>silver</b> cleaned and deduped, <b style={{ color: '#fbbf24' }}>gold</b>{' '}
              business aggregates. Each layer is a pure function of the one before, so you can always replay from raw.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                Why insist each stage is built only from the stage before, and never edited directly? Because it gives you
                an undo button. If the clean sugar comes out wrong, you do not try to un-clean it — you go back to the raw
                cane and re-run. Every stage can be thrown away and remade from the one below, all the way down to the raw
                you always keep.
              </p>
              <p>
                That is also why raw is never touched. It is your original crop. The moment you start &quot;fixing&quot;
                things in the raw pile, you have lost the ability to start over — and starting over is the whole point.
              </p>
            </>
          }
          student={
            <>
              <p>
                The one-directional rule — bronze feeds silver feeds gold, never the reverse, and each layer is a
                deterministic transform of its input — is what makes the lake replayable. Concretely:
              </p>
              <ul>
                <li>
                  A cleaning bug is discovered in silver? Fix the transform, drop and rebuild silver (and gold) from
                  bronze. No re-ingestion, no calling the source system, no data lost.
                </li>
                <li>
                  A new business metric is needed? Add a gold table; bronze and silver are untouched. New requirements
                  land in the layer that owns them.
                </li>
                <li>
                  Ingestion double-delivered a batch? Bronze faithfully holds the duplicates (it records what arrived);
                  silver&apos;s dedup step removes them. Each layer has one job.
                </li>
              </ul>
              <p>
                Below, watch all three transforms run in DuckDB. Bronze is the raw seed (everything text, a duplicate
                row, a blank amount). The query builds silver (typed, deduped, cleaned) as a CTE and then gold (the
                aggregate) on top — the whole refinery in one readable statement:
              </p>
            </>
          }
          phd={
            <>
              <p>
                Formally each layer L(n) = f(L(n-1)) for a deterministic f, with L(0) = bronze being append-only and
                externally sourced. The invariant that makes operations safe is idempotent rebuild: dropping and
                recomputing L(n) from a fixed L(n-1) yields identical output, so a rebuild is side-effect-free. This is
                the lake analogue of a materialized-view chain, and it is why bronze must be immutable — if raw mutates,
                the DAG is no longer a function of a fixed input and replay stops being deterministic.
              </p>
              <p>
                The subtle engineering cost is <GlossaryTerm k="write-amplification">write amplification</GlossaryTerm>:
                the same logical fact is now stored three times (raw, cleaned, aggregated), and each layer&apos;s rebuild
                re-reads and re-writes its input. That is a deliberate trade — storage is cheap on object storage, so you
                spend storage and compute to buy replayability, lineage, and isolation. Whether that trade is worth it is
                exactly what the critics contest, and the honest answer is &quot;it depends on scale and blast radius,&quot;
                which the next section unpacks.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          label="bronze -> silver -> gold in one DuckDB pipeline"
          setup={`-- BRONZE: raw, as-ingested. Everything is text (straight from CSV), there is an
-- exact duplicate (a double-delivered batch), and one row has a blank amount.
CREATE OR REPLACE TABLE bronze_orders AS
SELECT * FROM (VALUES
  ('1001','2026-07-01',' London ','19.90','ok'),
  ('1001','2026-07-01',' London ','19.90','ok'),
  ('1002','2026-07-01','paris','8.50','ok'),
  ('1003','2026-07-02','BERLIN','','ok'),
  ('1004','2026-07-02','rome','12.00','ok'),
  ('1005','2026-07-02',' paris ','5.25','ok'),
  ('1006','2026-07-02','london','7.75','cancelled'),
  ('1007','2026-07-03','Rome','14.40','ok'),
  ('1008','2026-07-03','berlin','9.00','ok')
) AS t(order_id, order_date, city, amount, status);`}
          code={`-- SILVER: clean + type + dedupe. Cast text to real types, normalise city,
-- drop blanks and non-ok rows, keep one row per order_id.
WITH silver AS (
  SELECT DISTINCT ON (order_id)
    CAST(order_id AS INTEGER)          AS order_id,
    CAST(order_date AS DATE)           AS order_date,
    lower(trim(city))                  AS city,
    CAST(amount AS DECIMAL(10,2))      AS amount
  FROM bronze_orders
  WHERE status = 'ok' AND amount <> ''
  ORDER BY order_id
)
-- GOLD: the business aggregate people actually query.
SELECT city, count(*) AS orders, round(sum(amount), 2) AS revenue
FROM silver
GROUP BY city
ORDER BY revenue DESC;`}
        />
        <p>
          The rows shrink at each hop — that is the pattern made numeric. Bronze holds every arrived record; silver holds
          one clean row per real order; gold holds one row per business group:
        </p>
        <CodeRunner
          language="sql"
          label="row counts shrink bronze -> silver -> gold"
          setup={`CREATE OR REPLACE TABLE bronze_orders AS
SELECT * FROM (VALUES
  ('1001','2026-07-01',' London ','19.90','ok'),
  ('1001','2026-07-01',' London ','19.90','ok'),
  ('1002','2026-07-01','paris','8.50','ok'),
  ('1003','2026-07-02','BERLIN','','ok'),
  ('1004','2026-07-02','rome','12.00','ok'),
  ('1005','2026-07-02',' paris ','5.25','ok'),
  ('1006','2026-07-02','london','7.75','cancelled'),
  ('1007','2026-07-03','Rome','14.40','ok'),
  ('1008','2026-07-03','berlin','9.00','ok')
) AS t(order_id, order_date, city, amount, status);`}
          code={`SELECT 'bronze (raw arrivals)' AS layer, count(*) AS rows FROM bronze_orders
UNION ALL
SELECT 'silver (clean, deduped)', count(*) FROM (
  SELECT DISTINCT ON (order_id) order_id
  FROM bronze_orders
  WHERE status = 'ok' AND amount <> ''
  ORDER BY order_id
) s
UNION ALL
SELECT 'gold (per-city rollup)', count(DISTINCT lower(trim(city)))
FROM bronze_orders
WHERE status = 'ok' AND amount <> '';`}
        />
      </Section>

      <Section kicker="core concepts" title="The critics: is this just ELT with three names?">
        <Tiered
          layman={
            <>
              <p>
                Not everyone loves the refinery. The honest complaints: you are now storing the same sugar three times
                over, which costs space. For a small corner shop, building a three-stage refinery to process one sack of
                cane a week is absurd ceremony — you would just wash it in the sink. And some people point out that
                &quot;clean the sugar properly&quot; is not a new invention; good cooks have always done it, we just did
                not give it a shiny name.
              </p>
              <p>
                All three complaints are fair. The refinery earns its keep when you process a lot, when mistakes are
                expensive, and when many people rely on the output. For a trickle of data on one machine, it is
                over-engineering. The skill is knowing which situation you are in.
              </p>
            </>
          }
          student={
            <>
              <p>Take the criticisms seriously — each is legitimate in the right context:</p>
              <ul>
                <li>
                  <strong>Too many copies / storage cost.</strong> The same fact lives in bronze, silver, and gold;
                  storage and rebuild compute roughly multiply. On cheap object storage this is usually fine, but it is a
                  real cost, not zero.
                </li>
                <li>
                  <strong>Ceremony / over-engineering for small data.</strong> If your data fits in Postgres and a nightly
                  job cleans it in one step, three lake layers with orchestration around them is overhead that buys you
                  little. Not every dataset needs a refinery.
                </li>
                <li>
                  <strong>&quot;Silver is just good Kimball modeling with a new name.&quot;</strong> Largely true — cleaning,
                  conforming, and deduplicating into well-modeled tables is the dimensional-modeling work from lesson 2.4.
                  Medallion renames the zones; it does not teach you how to model inside them.
                </li>
                <li>
                  <strong>Layer proliferation.</strong> In practice teams sprout bronze/silver/gold <em>plus</em>
                  &quot;bronze-plus,&quot; &quot;silver-clean,&quot; per-team gold copies — the tidy three-layer story
                  becomes a sprawl nobody can trace.
                </li>
              </ul>
              <p>
                The fairest framing: medallion is a useful <em>shared vocabulary</em> and a discipline about lineage and
                replayability. It is not a modeling methodology and does not replace one. It earns its keep on data that is
                large, messy, multi-source, or high-stakes; it is over-engineering on data that is small, clean, and
                single-purpose.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The sharpest version of the &quot;three names for ELT&quot; critique is correct at the syntactic level and
                misses the operational point. Yes, bronze/silver/gold is load-then-transform-in-stages, which is ELT; the
                value the names add is a <em>contract and lineage convention</em> — a shared boundary where consumers know
                what guarantees hold (bronze: fidelity to source, no guarantees on cleanliness; silver: typed, deduped,
                conformed; gold: business-defined, SLA-backed). Naming the boundaries is what lets independent teams depend
                on each other&apos;s outputs without reading each other&apos;s transforms. That is organizational, not
                technical, and it is why the pattern spread despite adding no new algorithm.
              </p>
              <p>
                Where it genuinely competes with alternatives is modeling philosophy. Kimball-only advocates argue you
                should model dimensionally from the start and skip the ceremony; Data Vault advocates argue silver should
                be a hub/link/satellite model built for auditability and source-agnostic integration, not ad-hoc cleaning.
                Medallion is agnostic to all of this, which is simultaneously its strength (fits any modeling choice) and
                the critics&apos; core complaint (it under-specifies the hard part). The mature position: use medallion for
                lineage/replayability vocabulary, and make a real, separate modeling decision inside silver and gold —
                do not let the three colored names substitute for thinking about the schema.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="The over-engineering smell">
          If your data fits comfortably in Postgres, arrives clean from one source, and one team consumes it, three lake
          layers with orchestration is probably ceremony. Medallion pays off with scale, mess, many sources, or high
          blast-radius mistakes. &quot;We use medallion because everyone does&quot; is not a reason; &quot;we need
          replayable, contract-bounded layers because five teams depend on this and a bad transform is a costly
          incident&quot; is.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Three-hop medallion vs one transform vs Kimball-only">
        <p>
          How many stages should sit between raw and the dashboard? Medallion says three; it is not the only defensible
          answer. The axis is replayability and clear contracts versus simplicity and fewer copies.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Three-hop medallion (bronze / silver / gold)',
              strengths: [
                'Replayable: rebuild any layer from the immutable raw below it after a bug or logic change',
                'Clear contracts and isolation: ingestion issues in bronze, cleaning in silver, business logic in gold',
                'Shared vocabulary many teams already know; fits any modeling choice inside the layers',
              ],
              weaknesses: [
                'Stores the same fact ~3x and rebuilds re-read/re-write each layer — real storage and compute cost',
                'Ceremony and orchestration overhead; tends to proliferate into extra sub-layers',
                'Under-specifies modeling — the hard part still has to be decided separately',
              ],
              chooseWhen: 'large, messy, multi-source, or high-stakes data where replayability and contracts across teams pay for the copies.',
            },
            {
              name: 'Single transformation step (raw -> curated)',
              strengths: [
                'Minimal copies, minimal orchestration — cheapest and simplest to reason about',
                'Fast to build; nothing to trace through three zones',
              ],
              weaknesses: [
                'No clean replay point if the one transform has a bug — you may have to re-ingest',
                'Ingestion, cleaning, and business logic tangle in one place; hard to isolate concerns',
              ],
              chooseWhen: 'small, clean, single-source data consumed by one team — where a refinery is overkill.',
            },
            {
              name: 'Kimball-only (model dimensionally from the start)',
              strengths: [
                'Skips the ceremony: go straight to well-modeled facts and dimensions (lesson 2.4)',
                'Battle-tested modeling discipline; the output is exactly what BI tools want',
              ],
              weaknesses: [
                'No explicit raw/replay layer unless you add one — losing medallion’s rebuild-from-bronze safety',
                'Harder when sources are many and messy and need a staging/conforming zone first',
              ],
              chooseWhen: 'a warehouse with a few well-understood sources where dimensional modeling is the whole job.',
            },
          ]}
          note={
            <>
              These are not mutually exclusive: the common real-world shape is medallion for the lineage/replay skeleton
              with Kimball dimensional modeling done <em>inside</em> silver and gold. Medallion answers &quot;where does
              data sit and how do I replay it&quot;; Kimball answers &quot;how do I shape it&quot; — pick medallion for the
              first question only when its replayability and contracts are worth the extra copies.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: build a real bronze -> silver -> gold on the lake">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will materialize all three layers as Parquet in a local lake folder tree (the same prefix layout as a
              bucket), watching row counts shrink at each hop and proving replayability by rebuilding silver and gold from
              bronze alone. Uses <code>uv</code> + DuckDB. Work in <code>C:\de-lab\medallion-lab</code>.
            </p>
          }
          steps={[
            {
              title: 'Set up and create a raw source CSV',
              body: (
                <>
                  <p>Create the project, add DuckDB, and drop a deliberately messy source file. Save as <code>orders_raw.csv</code>:</p>
                  <CodeBlock
                    label="orders_raw.csv"
                    code={`order_id,order_date,city,amount,status
1001,2026-07-01, London ,19.90,ok
1001,2026-07-01, London ,19.90,ok
1002,2026-07-01,paris,8.50,ok
1003,2026-07-02,BERLIN,,ok
1004,2026-07-02,rome,12.00,ok
1005,2026-07-02, paris ,5.25,ok
1006,2026-07-02,london,7.75,cancelled
1007,2026-07-03,Rome,14.40,ok
1008,2026-07-03,berlin,9.00,ok`}
                  />
                </>
              ),
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\medallion-lab; cd C:\\de-lab\\medallion-lab\nuv init --bare\nuv add duckdb',
                  bash: 'mkdir -p ~/de-lab/medallion-lab && cd ~/de-lab/medallion-lab\nuv init --bare\nuv add duckdb',
                },
              ],
              checkpoint: (
                <>
                  <code>orders_raw.csv</code> exists (9 data rows, including a duplicate and a blank amount), and{' '}
                  <code>uv add duckdb</code> reports duckdb installed.
                </>
              ),
            },
            {
              title: 'Bronze: land the raw file untouched',
              body: (
                <>
                  <p>
                    Bronze copies the source in as-is — every column as text, nothing cleaned, duplicates kept. Save as{' '}
                    <code>build_bronze.py</code>:
                  </p>
                  <CodeBlock
                    label="build_bronze.py"
                    code={`import duckdb

con = duckdb.connect("lake.duckdb")
con.sql("""
    CREATE OR REPLACE TABLE bronze AS
    SELECT * FROM read_csv('orders_raw.csv', header = true, all_varchar = true)
""")
con.sql("COPY bronze TO 'lake/bronze' (FORMAT PARQUET, OVERWRITE_OR_IGNORE)")
print("bronze rows:", con.sql("SELECT count(*) FROM bronze").fetchone()[0])`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python build_bronze.py' }],
              checkpoint: (
                <>
                  Prints <code>bronze rows: 9</code> — raw kept everything, including the duplicate and the cancelled/blank
                  rows. A <code>lake/bronze</code> folder now holds the raw Parquet.
                </>
              ),
            },
            {
              title: 'Silver: clean, type, dedupe — built from bronze',
              body: (
                <>
                  <p>Silver reads bronze and produces one clean, typed row per order. Save as <code>build_silver.py</code>:</p>
                  <CodeBlock
                    label="build_silver.py"
                    code={`import duckdb

con = duckdb.connect("lake.duckdb")
con.sql("""
    CREATE OR REPLACE TABLE silver AS
    SELECT DISTINCT ON (order_id)
      CAST(order_id AS INTEGER)     AS order_id,
      CAST(order_date AS DATE)      AS order_date,
      lower(trim(city))             AS city,
      CAST(amount AS DECIMAL(10,2)) AS amount
    FROM read_parquet('lake/bronze/**/*.parquet')
    WHERE status = 'ok' AND amount <> ''
    ORDER BY order_id
""")
con.sql("COPY silver TO 'lake/silver' (FORMAT PARQUET, OVERWRITE_OR_IGNORE)")
print("silver rows:", con.sql("SELECT count(*) FROM silver").fetchone()[0])`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python build_silver.py' }],
              checkpoint: (
                <>
                  Prints <code>silver rows: 6</code> — down from 9: the exact duplicate collapsed, the blank-amount row and
                  the cancelled row dropped. Cities are now lowercased and trimmed (<code>london</code>, not{' '}
                  <code> London </code>), amounts are real decimals.
                </>
              ),
            },
            {
              title: 'Gold: the business aggregate — built from silver',
              body: (
                <>
                  <p>Gold rolls silver up to the numbers a dashboard shows. Save as <code>build_gold.py</code>:</p>
                  <CodeBlock
                    label="build_gold.py"
                    code={`import duckdb

con = duckdb.connect("lake.duckdb")
con.sql("""
    CREATE OR REPLACE TABLE gold AS
    SELECT city, count(*) AS orders, round(sum(amount), 2) AS revenue
    FROM read_parquet('lake/silver/**/*.parquet')
    GROUP BY city
    ORDER BY revenue DESC
""")
con.sql("COPY gold TO 'lake/gold' (FORMAT PARQUET, OVERWRITE_OR_IGNORE)")
con.sql("SELECT * FROM gold").show()
print("gold rows:", con.sql("SELECT count(*) FROM gold").fetchone()[0])`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python build_gold.py' }],
              checkpoint: (
                <>
                  A small table prints (one row per city, with orders and revenue) and <code>gold rows: 4</code>. Your lake
                  now has three prefixes — <code>lake/bronze</code>, <code>lake/silver</code>, <code>lake/gold</code> —
                  each a refinement of the last. Confirm with <code>Get-ChildItem -Recurse .\lake</code>.
                </>
              ),
            },
            {
              title: 'Prove replayability: rebuild from bronze alone',
              body: (
                <>
                  <p>
                    The payoff of the pattern. Imagine you found a bug in silver&apos;s cleaning logic. You do{' '}
                    <em>not</em> re-read the source CSV — you just re-run silver and gold from bronze. Delete silver and
                    gold, then rebuild them:
                  </p>
                  <RevealSolution label="Why this is the whole point of bronze">
                    <p>
                      Bronze is your immutable, replayable source of truth. Because silver and gold are pure functions of
                      the layer below, blowing them away loses nothing — you recompute. In a real incident this is the
                      difference between &quot;fix the transform and rebuild in minutes&quot; and &quot;re-ingest
                      terabytes from a source system that may no longer have the old data.&quot;
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                {
                  ps: 'Remove-Item -Recurse -Force .\\lake\\silver, .\\lake\\gold\nuv run python build_silver.py\nuv run python build_gold.py',
                  bash: 'rm -rf lake/silver lake/gold\nuv run python build_silver.py\nuv run python build_gold.py',
                },
              ],
              checkpoint: (
                <>
                  After deleting silver and gold and re-running the two build scripts, you get the identical{' '}
                  <code>silver rows: 6</code> and <code>gold rows: 4</code> — rebuilt entirely from bronze, no source
                  re-read. That deterministic rebuild from immutable raw is replayability, demonstrated.
                </>
              ),
            },
            {
              title: 'Reflect: was three layers worth it here?',
              body: (
                <p>
                  Notes entry: the row counts at each layer (9 to 6 to 4), one sentence on what each layer&apos;s job was,
                  and — honestly — whether this tiny dataset needed three layers or whether a single cleaning step would
                  have done. That judgement (medallion pays off with scale/mess/many-consumers, not on nine clean-ish
                  rows) is the real takeaway.
                </p>
              ),
              checkpoint: (
                <>
                  Your notes can answer both &quot;what does each medallion layer do and why rebuild from bronze&quot; and
                  &quot;when is three-hop medallion over-engineering.&quot;
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
              q: 'What is the defining job of the bronze layer?',
              options: [
                'To hold cleaned, deduplicated, business-ready data',
                'A raw, as-ingested, append-only copy of the source — a replayable source of truth that is never edited',
                'The final aggregates that dashboards query',
                'A cache of the most recent query results',
              ],
              answer: 1,
              explain:
                'Bronze faithfully records what arrived, untouched and append-only, so any downstream layer can be rebuilt from it after a bug or logic change without re-fetching from the source. Cleaning is silver; aggregates are gold.',
            },
            {
              q: 'You find a bug in your silver cleaning logic that has corrupted silver and gold. In a medallion lake, what do you do?',
              options: [
                'Re-ingest everything from the source systems from scratch',
                'Manually patch the corrupted rows in silver and gold',
                'Fix the transform, then drop and rebuild silver (and gold) from the immutable bronze layer — no re-ingestion',
                'Restore silver and gold from last night’s backup and hope',
              ],
              answer: 2,
              explain:
                'That is the point of an immutable, append-only bronze: silver and gold are pure functions of the layer below, so you recompute them from bronze. Fix-and-rebuild, not re-ingest — the replayability property medallion buys you.',
            },
            {
              q: 'A critic says "silver is just good Kimball modeling with a new name." What is the fair response?',
              options: [
                'The critic is wrong — silver has nothing to do with dimensional modeling',
                'Largely true: medallion names the zones and lineage/replay discipline but does not specify how to model inside them — the cleaning/conforming work is still the dimensional-modeling job from lesson 2.4',
                'Medallion replaces Kimball modeling entirely',
                'Silver forbids star schemas',
              ],
              answer: 1,
              explain:
                'Medallion is a staging and lineage convention, orthogonal to modeling technique. It gives shared vocabulary and replayability but under-specifies the hard part; you still make a real modeling decision (Kimball, Data Vault, etc.) inside silver and gold.',
            },
            {
              q: 'What is the main cost the medallion pattern trades storage/compute for?',
              options: [
                'Lower query latency',
                'The same fact stored ~3x (write amplification) and rebuilds that re-read/re-write each layer — paid to gain replayability, clear contracts, and isolation of concerns',
                'Stronger encryption of the data',
                'Fewer files on the lake',
              ],
              answer: 1,
              explain:
                'Bronze, silver, and gold each store the data, and rebuilds re-process it, so storage and compute roughly multiply. On cheap object storage that is usually an acceptable trade for replayability and contracts — but it is a real cost, which is why medallion is overkill for small clean data.',
            },
            {
              q: 'When is three-hop medallion most likely to be over-engineering?',
              options: [
                'When data is large, messy, multi-source, and consumed by many teams',
                'When a transform bug would be a costly, high-blast-radius incident',
                'When the data fits in Postgres, arrives clean from a single source, and one team consumes it',
                'When you need to replay from raw after logic changes',
              ],
              answer: 2,
              explain:
                'Medallion earns its keep with scale, mess, many sources, and high stakes. Small, clean, single-source, single-consumer data does not need a three-layer refinery with orchestration — a single cleaning step is simpler and cheaper.',
            },
            {
              q: 'How does the append-only, immutable nature of the bronze layer relate to object storage (from 3.3.1)?',
              options: [
                'They are unrelated — bronze could be edited in place if you wanted',
                'They fit perfectly: object storage objects are immutable wholes with no in-place edit, and bronze is append-only and never mutated, so bronze is naturally implemented as new immutable files on the lake',
                'Object storage forces you to overwrite bronze on every load',
                'Bronze requires a filesystem because it needs in-place appends',
              ],
              answer: 1,
              explain:
                'Object storage gives immutable, whole-object writes and no cheap edit — exactly the shape append-only bronze wants. You add new files rather than editing old ones, which is why medallion sits so naturally on a lake.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Walk me through the medallion architecture and what each layer guarantees.',
            a: (
              <p>
                Three layers, each a deterministic transform of the one below. Bronze is raw, as-ingested, append-only —
                an exact, immutable copy of the source that acts as a replayable source of truth. Silver is cleaned and
                conformed: types fixed, duplicates removed, keys joined, bad rows quarantined, one row per real entity —
                the trustworthy queryable version. Gold is business marts and aggregates shaped for the questions people
                actually ask (daily revenue, star schemas). The guarantees rise as you go up, and because each layer is a
                pure function of the layer below rooted at immutable bronze, you can rebuild any layer from raw after a
                bug or a logic change without re-ingesting.
              </p>
            ),
          },
          {
            q: 'A senior engineer says medallion is "just ELT with three fancy names." How do you respond?',
            a: (
              <p>
                I would agree it is ELT structurally — load raw, then transform in stages — and that it under-specifies
                modeling; silver is largely the dimensional-modeling work by another name. What the names actually add is
                a contract and lineage convention: named boundaries where consumers know the guarantees (bronze: fidelity
                to source; silver: typed/deduped/conformed; gold: business-defined, SLA-backed), which lets independent
                teams depend on each other's outputs. So it is an organizational and replayability discipline, not a new
                algorithm. It earns its keep on large, messy, multi-source, high-stakes data and is over-engineering on
                small, clean, single-consumer data — and I would still make a real modeling decision inside the layers
                rather than let the colored names substitute for it.
              </p>
            ),
          },
          {
            q: 'How does medallion compare to Data Vault and Kimball, and can they coexist?',
            a: (
              <p>
                They answer different questions. Medallion is a staging/lineage convention (where data sits, how to
                replay it) and is agnostic to modeling. Kimball is a modeling methodology — facts and conformed
                dimensions optimized for BI. Data Vault is a modeling methodology for auditable, source-agnostic
                integration (hubs, links, satellites) that favors insert-only history. They coexist: a common real shape
                is medallion as the skeleton with Kimball star schemas built inside silver/gold, or Data Vault in silver
                when auditability and many sources dominate. Medallion does not replace a modeling choice; it wraps
                lineage and replayability around whichever one you make.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Medallion organizes a lake into bronze (raw, as-ingested, append-only, replayable), silver (cleaned, typed, deduped, conformed), and gold (business marts and aggregates).</>,
          <>Each layer is a deterministic transform of the one below, rooted at immutable bronze — so you can rebuild any layer from raw after a bug or logic change without re-ingesting. That replayability is the core benefit.</>,
          <>The costs are real: the same fact is stored ~3x (write amplification) and rebuilds re-process each layer — you spend cheap storage and compute to buy replayability, contracts, and isolation of concerns.</>,
          <>The critics are fair: it is ELT with named zones, it under-specifies modeling (silver is largely Kimball work renamed), it adds ceremony, and layers tend to proliferate.</>,
          <>Medallion earns its keep on large, messy, multi-source, high-stakes data with many consumers; it is over-engineering on small, clean, single-source, single-team data where one transform would do.</>,
          <>Medallion is a lineage/replay vocabulary, not a modeling methodology — it coexists with Kimball or Data Vault, which you still choose (and apply) inside silver and gold.</>,
        ]}
      />
    </>
  )
}
