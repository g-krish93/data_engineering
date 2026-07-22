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

const ID = '3.6.5'

// Two staging models feeding an intermediate model that joins + aggregates.
const LAYERS = `CREATE OR REPLACE TABLE stg_orders AS SELECT * FROM (VALUES
  (1, 'c1', DATE '2026-01-05', 'completed'),
  (2, 'c2', DATE '2026-01-06', 'completed'),
  (3, 'c1', DATE '2026-01-07', 'cancelled')
) AS t(order_id, customer_id, order_date, status);
CREATE OR REPLACE TABLE stg_payments AS SELECT * FROM (VALUES
  (10, 1, 120.00), (11, 1, 30.00), (12, 2, 80.00), (13, 3, 50.00)
) AS t(payment_id, order_id, amount);`

const DBT_LAYERS = [
  { name: 'Staging', color: '#22d3ee', desc: '1:1 with sources: rename, recast, light cleaning. The only layer that touches raw source shape. Prefix stg_.', example: 'stg_orders, stg_payments (materialized as views)' },
  { name: 'Intermediate', color: '#a78bfa', desc: 'Reusable joins and business logic that several marts share. Not exposed to end users. Prefix int_.', example: 'int_orders_payments (often ephemeral)' },
  { name: 'Marts', color: '#34d399', desc: 'Business-facing facts and dimensions, one per business process/entity. Prefix fct_ / dim_.', example: 'fct_orders, dim_customers (materialized as tables)' },
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Fifty models in one folder is a maze; a few conventions make it a map">
        <p>
          Your project has a handful of models now. Real projects have dozens to hundreds. Drop them all in one flat{' '}
          <code>models/</code> folder with names like <code>orders.sql</code> and <code>customer_stuff_final_v2.sql</code>, and
          nobody — including you in three months — can tell what depends on what, which model is safe to change, or where source
          coupling lives. The dbt community converged on a simple layered convention — <strong>staging → intermediate →
          marts</strong> — that answers those questions from the folder structure alone. And it is not a new idea: it is the{' '}
          <GlossaryTerm k="medallion">medallion pattern</GlossaryTerm> from 3.3.3 (bronze/silver/gold) expressed in dbt.
        </p>
        <Tiered
          layman={
            <>
              <p>
                A kitchen where every ingredient, half-made sauce, and finished dish is piled on one counter is chaos. A working
                kitchen has stations: prep (wash and chop), cooking (combine into components), and plating (final dishes for the
                table). You instantly know where a thing is in its journey by which station it sits at. dbt&apos;s layers are those
                stations for data.
              </p>
              <p>
                The stations are not bureaucracy for its own sake — they are what lets a new cook walk in and be useful in an
                hour instead of a week. Structure is a gift to the next person, who is often you.
              </p>
            </>
          }
          student={
            <>
              <p>
                Three layers, each with a clear job and a naming prefix. <GlossaryTerm k="staging-model">Staging</GlossaryTerm>{' '}
                (<code>stg_</code>): one model per source table, doing only light cleanup — rename columns, cast types, basic
                standardization. This is the <em>only</em> layer that references sources, so all source coupling is quarantined
                here. <GlossaryTerm k="intermediate-model">Intermediate</GlossaryTerm> (<code>int_</code>): reusable joins and
                business logic that more than one mart needs, kept out of the marts to stay DRY.{' '}
                <GlossaryTerm k="mart">Marts</GlossaryTerm> (<code>fct_</code>/<code>dim_</code>): the business-facing facts and
                dimensions people actually query — the star schemas from Phase 2.
              </p>
              <p>
                It maps almost one-to-one onto medallion: staging ≈ silver (cleaned/conformed), marts ≈ gold (business-ready),
                with bronze being your raw sources. The layers live in folders under <code>models/</code>, and you set the
                materialization per folder in <code>dbt_project.yml</code> — staging as views, marts as tables — so a model&apos;s
                storage follows from where it sits.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The dbt-labs recommended structure is a dependency-direction discipline: refs flow strictly rightward (staging →
                intermediate → marts), never backward and never skipping the source-isolation boundary. Staging is a thin
                anti-corruption layer — the single place where a source&apos;s idiosyncratic shape is normalized — so a source
                schema change ripples through exactly one <code>stg_</code> model instead of scattering across the DAG. This is
                the same coupling-isolation argument as ports-and-adapters in application architecture, applied to data.
              </p>
              <p>
                Intermediate models exist to factor shared logic to one place (DRY) and to break a complex mart into named,
                testable steps; they are frequently ephemeral since they are implementation detail, not products. Marts encode
                grain explicitly — one row per business event (fact) or per conformed entity (dimension) — which is Kimball
                dimensional modeling (Phase 2) as the terminal layer. The convention is not aesthetic: it makes lineage legible,
                localizes change, assigns materialization by layer semantics, and gives onboarding engineers a mental model that
                matches the folder tree.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The three layers as refinement stages">
        <p>
          Read the layers left to right — raw source shape enters staging, gets combined in intermediate, and emerges as
          business-facing marts. Click each zone; this is the medallion refinement of 3.3.3, wearing dbt&apos;s layer names:
        </p>
        <MedallionFlow
          layers={DBT_LAYERS}
          caption={
            <>
              <b>Click a layer.</b> <b style={{ color: '#22d3ee' }}>Staging</b> isolates each source (the only layer that reads
              raw); <b style={{ color: '#a78bfa' }}>intermediate</b> holds shared joins/logic; <b style={{ color: '#34d399' }}>marts</b>{' '}
              are the facts and dimensions people query. Refs flow strictly left-to-right — the same bronze→silver→gold refinement
              you saw in the medallion architecture.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                Prep station: wash and chop each ingredient the same way every time, so nothing downstream has to worry about
                grit or odd shapes. Cooking station: combine prepped items into components a few dishes share — a base sauce used
                by three mains. Plating station: the actual dishes that go to the table. Each station only hands work forward,
                never back.
              </p>
              <p>
                Because prep is the only place that touches raw ingredients, if a supplier changes how they package something, you
                fix it once at prep and every dish is fine. That single choke-point is the whole payoff.
              </p>
            </>
          }
          student={
            <>
              <p>
                <strong>Staging</strong> is deliberately boring: <code>SELECT</code> from one source, rename to your conventions,
                cast types, maybe standardize casing — no joins, no aggregation. One <code>stg_</code> model per source table.
                Because it is the sole layer that touches sources, source changes are contained here. <strong>Intermediate</strong>{' '}
                models take staging models and do the reusable heavy lifting — a join two marts both need, a de-duplication, a
                windowed calculation — so that logic lives once. <strong>Marts</strong> assemble intermediates/staging into the
                facts (<code>fct_</code>) and dimensions (<code>dim_</code>) that dashboards and analysts consume, at an explicit
                grain.
              </p>
              <p>
                The DRY rule that ties it together: any logic used by more than one downstream model gets its own model (usually
                intermediate) and is pulled in with <code>ref()</code> — never copy-pasted. One source of truth per concept, one
                place to fix it.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Grain is the load-bearing concept at the marts layer: a fact&apos;s grain is the business event it counts (one
                row per order, per order-line, per payment), and mixing grains in one mart is the classic dimensional-modeling
                error that inflates or double-counts measures. Intermediate models are where you resolve grain and fan-out before
                the mart, so the mart&apos;s SELECT stays a clean projection at a single, documented grain.
              </p>
              <p>
                The staging anti-corruption boundary has a testable payoff: a source-schema drift fails the <code>stg_</code>{' '}
                model (or its source freshness/tests) and stops there, giving a precise blast radius. Contrast a flat project
                where a renamed source column is referenced from fifteen models — the failure is diffuse and the fix is fifteen
                edits. The layered convention trades a little upfront ceremony for locality of change, legible lineage, and
                per-layer materialization defaults that encode intent (staging cheap/fresh as views, marts fast as tables).
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={LAYERS}
          code={`-- models/intermediate/int_orders_payments.sql
-- Reusable join+aggregate that marts will build on. In the file these two
-- FROMs are {{ ref('stg_orders') }} and {{ ref('stg_payments') }}.
SELECT
  o.order_id,
  o.customer_id,
  o.order_date,
  o.status,
  SUM(p.amount) AS amount_paid          -- fan-in resolved here, not in the mart
FROM stg_orders o
LEFT JOIN stg_payments p ON p.order_id = o.order_id
GROUP BY o.order_id, o.customer_id, o.order_date, o.status
ORDER BY o.order_id;`}
        />
        <p>
          Order 1 has two payments totalling 150.00, order 2 has 80.00, order 3 has 50.00. A mart like{' '}
          <code>fct_orders</code> then <code>ref()</code>s this intermediate and filters to completed orders — the mart never
          re-derives the payment join, because the intermediate owns it once.
        </p>
      </Section>

      <Section kicker="core concepts" title="Folders and config: materialization follows the layer">
        <Tiered
          layman={
            <>
              <p>
                Once the stations exist, you can give each one a house rule — &quot;prep work is quick and disposable, plated
                dishes get kept warm and ready.&quot; You set that rule for the whole station at once, not dish by dish. dbt lets
                you say &quot;everything in the staging folder is a view, everything in marts is a table&quot; in one place.
              </p>
              <p>
                So a model&apos;s behavior comes from which folder it lives in. Move it, and its rules change to match its new
                neighbors. Less to remember, fewer inconsistent choices.
              </p>
            </>
          }
          student={
            <>
              <p>
                Folders under <code>models/</code> (<code>staging/</code>, <code>intermediate/</code>, <code>marts/</code>) mirror
                the layers, and <code>dbt_project.yml</code> sets a default materialization per folder with the <code>+</code>{' '}
                config syntax. Staging defaults to <code>view</code> (thin, fresh, cheap), intermediate often to{' '}
                <code>ephemeral</code> (implementation detail, no object), marts to <code>table</code> (read-heavy, fast). A model
                inherits its folder&apos;s default and can still override per file with a <code>config()</code> block when it needs
                to.
              </p>
              <p>
                This is why the structure is more than tidiness: the folder a model sits in decides both its role in the lineage{' '}
                <em>and</em> how it is stored, with no per-model boilerplate. New model in <code>staging/</code>? It is a view,
                named <code>stg_</code>, reads a source. The convention makes the right thing the default.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Hierarchical config resolution in dbt is nearest-wins: project-level folder defaults are overridden by
                subfolder configs, then by in-file <code>config()</code>, so you express the common case once and only annotate
                exceptions. Config applies to more than materialization — <code>+schema</code>, <code>+tags</code>,{' '}
                <code>+docs</code>, <code>+access</code>, and grants can all be set per layer, letting the folder tree carry
                governance (e.g. marts in a <code>marts</code> schema, staging tagged and hidden).
              </p>
              <p>
                The deeper property is that layer semantics and physical strategy are made to coincide: the same boundary that
                isolates source coupling (staging) also carries the cheapest materialization, and the boundary that serves
                consumers (marts) carries the fastest. Structure, lineage, and storage policy become one decision — which is the
                organizational payoff that makes the convention worth its ceremony past a threshold of project size.
              </p>
            </>
          }
        />
        <CodeBlock
          label="dbt_project.yml — materialization per layer, set once"
          code={`models:
  jaffle_duck:
    staging:
      +materialized: view          # thin, always-fresh, cheap to build
    intermediate:
      +materialized: ephemeral     # implementation detail, inlined as CTEs
    marts:
      +materialized: table         # business-facing, read often, fast reads`}
        />
        <CodeBlock
          label="the folder tree the config mirrors"
          code={`models/
  staging/
    _sources.yml
    stg_orders.sql
    stg_payments.sql
  intermediate/
    int_orders_payments.sql
  marts/
    fct_orders.sql
    dim_customers.sql`}
        />
        <Callout kind="tip" title="Folders organize, but model names must be globally unique">
          dbt resolves <code>ref('stg_orders')</code> by <em>name</em>, not by path — folders are purely for humans and config.
          So every model filename must be unique across the whole project: you cannot have both{' '}
          <code>staging/orders.sql</code> and <code>marts/orders.sql</code>. This is exactly why the <code>stg_</code> /{' '}
          <code>int_</code> / <code>fct_</code> / <code>dim_</code> prefixes exist — they keep names unique and self-describing
          at the same time.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Layered convention, a flat models/ dir, or deep nesting?">
        <p>
          Structure is a cost as well as a benefit. The honest question is whether your project is big enough to earn it — and
          whether you have gone past helpful into ceremony:
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Layered convention (staging / intermediate / marts)',
              strengths: [
                'Lineage is legible from the folder tree; refs flow one direction',
                'Source coupling isolated in staging — schema changes have a precise blast radius',
                'Per-layer materialization and naming; fast onboarding, matches the community standard',
              ],
              weaknesses: [
                'Real upfront ceremony — folders, prefixes, config — before you have many models',
                'Can feel like overkill for a five-model project',
              ],
              chooseWhen: 'a project that will grow past a handful of models and be maintained by more than one person — the default for anything real.',
            },
            {
              name: 'Flat models/ directory',
              strengths: [
                'Zero structure to set up; fastest to a first result',
                'Perfectly fine for a tiny, short-lived, single-author project',
              ],
              weaknesses: [
                'No visible layering: what depends on what, and where source coupling lives, is invisible',
                'Becomes an unnavigable maze fast; painful and risky to refactor later',
              ],
              chooseWhen: 'a throwaway prototype or a genuinely tiny project (a few models) you will not grow.',
            },
            {
              name: 'Deep / over-engineered nesting',
              strengths: [
                'Can mirror a large, multi-domain org with many subfolders per source and mart area',
                'Fine-grained config and ownership boundaries at scale',
              ],
              weaknesses: [
                'Ceremony without payoff on a small project — folders with one model, endless indirection',
                'Navigation and mental overhead can exceed the structure it buys',
              ],
              chooseWhen: 'a large multi-team, multi-domain project where the extra hierarchy maps to real ownership — not before.',
            },
          ]}
          note={
            <>
              Match structure to size. Start layered but shallow (the three folders) the moment a project is more than a toy;
              add sub-structure (per-source staging subfolders, per-domain marts) only when the flat version of a layer itself
              gets crowded. The failure modes are symmetric: too little structure on a big project is a maze, too much on a small
              one is ceremony. The three-layer convention is the well-worn middle that fits the vast majority of projects.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: restructure the project into layers with per-folder config">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will reorganize the flat <code>jaffle_duck</code> models into <code>staging/</code>, <code>intermediate/</code>,
              and <code>marts/</code> folders with the naming convention, set materialization per folder in{' '}
              <code>dbt_project.yml</code>, rebuild, and confirm the layers in the lineage graph. Run from{' '}
              <code>C:\de-lab\dbt-lab\jaffle_duck</code>.
            </p>
          }
          steps={[
            {
              title: 'Create the layer folders and move models in',
              body: (
                <>
                  <p>
                    Make the three folders under <code>models/</code> and move your existing models into the right layer, keeping
                    the naming prefixes (<code>stg_orders.sql</code> → <code>staging/</code>, the fact →{' '}
                    <code>marts/fct_orders.sql</code>). Move <code>_sources.yml</code> and <code>_stg.yml</code> into{' '}
                    <code>staging/</code> too.
                  </p>
                  <CodeBlock
                    label="PowerShell — create folders and move files"
                    code={`mkdir models\\staging, models\\intermediate, models\\marts
move models\\stg_orders.sql models\\staging\\
move models\\_sources.yml   models\\staging\\
move models\\_stg.yml       models\\staging\\
move models\\fct_completed_orders.sql models\\marts\\fct_orders.sql`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  <code>models/</code> now has three subfolders; <code>stg_orders.sql</code> lives under <code>staging/</code> and
                  the fact under <code>marts/</code>. dbt does not care about folder depth for <code>ref()</code> — names stay
                  unique project-wide — so nothing is broken yet.
                </>
              ),
            },
            {
              title: 'Add an intermediate model',
              body: (
                <>
                  <p>
                    Create <code>models/intermediate/int_orders_payments.sql</code> — the reusable join, referencing staging via{' '}
                    <code>ref()</code> (add a <code>stg_payments</code> seed + model first if you want it to run; otherwise adapt
                    to just <code>stg_orders</code>):
                  </p>
                  <CodeBlock
                    label="models/intermediate/int_orders_payments.sql"
                    code={`SELECT
  order_id,
  customer_id,
  order_date,
  amount   AS amount_paid
FROM {{ ref('stg_orders') }}
WHERE status = 'completed'`}
                  />
                  <p>Point the mart at the intermediate instead of staging:</p>
                  <CodeBlock
                    label="models/marts/fct_orders.sql"
                    code={`SELECT order_id, order_date, customer_id, amount_paid
FROM {{ ref('int_orders_payments') }}`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  The chain is now <code>stg_orders → int_orders_payments → fct_orders</code> — three layers, each referencing the
                  one before with <code>ref()</code>.
                </>
              ),
            },
            {
              title: 'Set materialization per folder',
              body: (
                <>
                  <p>Edit <code>dbt_project.yml</code> so each layer gets the right default:</p>
                  <CodeBlock
                    label="dbt_project.yml (models section)"
                    code={`models:
  jaffle_duck:
    staging:
      +materialized: view
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table`}
                  />
                  <p>Remove any per-file <code>materialized</code> config that would override these, then rebuild everything.</p>
                </>
              ),
              commands: [{ ps: 'uv run dbt run' }],
              checkpoint: (
                <>
                  All models build green. In DuckDB, <code>stg_orders</code> is a <code>VIEW</code>, <code>fct_orders</code> is a{' '}
                  <code>BASE TABLE</code>, and <code>int_orders_payments</code> is <em>nowhere</em> as an object — it was inlined
                  as ephemeral. Materialization now follows the folder.
                </>
              ),
            },
            {
              title: 'Confirm the layering in the lineage graph',
              body: (
                <>
                  <p>Regenerate the docs and open the lineage graph to see the three layers flow left to right.</p>
                  <RevealSolution label="What the graph should show">
                    <p>
                      Source <code>jaffle.raw_orders</code> → <code>stg_orders</code> (staging) → <code>int_orders_payments</code>{' '}
                      (intermediate) → <code>fct_orders</code> (marts), strictly left-to-right with no backward edges. The folder
                      structure and the DAG now tell the same story — that is the whole goal of the convention.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'uv run dbt docs generate\nuv run dbt docs serve' }],
              checkpoint: (
                <>
                  The lineage graph shows source → staging → intermediate → marts in order. Verify the object types with{' '}
                  <code>uv run duckdb dev.duckdb &quot;SELECT table_name, table_type FROM information_schema.tables ORDER BY
                  table_name;&quot;</code>: views for staging, a base table for the mart, no object for the ephemeral
                  intermediate.
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
              q: 'What is the standard dbt layering, in dependency order?',
              options: [
                'marts → intermediate → staging',
                'staging → intermediate → marts',
                'raw → marts → staging',
                'facts → dimensions → sources',
              ],
              answer: 1,
              explain: 'Refs flow staging (1:1 with sources, light cleaning) → intermediate (reusable joins/logic) → marts (business-facing facts/dimensions), strictly left to right. It is the medallion bronze→silver→gold refinement in dbt.',
            },
            {
              q: 'Why is staging the ONLY layer that should reference sources?',
              options: [
                'sources are slow to query',
                'It isolates source coupling: a source schema change ripples through one stg_ model instead of scattering across the DAG',
                'dbt forbids source() elsewhere',
                'Staging models are always views',
              ],
              answer: 1,
              explain: 'Staging is an anti-corruption boundary. Quarantining source references there gives a precise blast radius: a renamed source column breaks one stg_ model, not fifteen models scattered through the project.',
            },
            {
              q: 'Two different marts both need the same order-to-payment join. Where should that logic live?',
              options: [
                'Copy-pasted into both marts',
                'In one intermediate (int_) model that both marts ref() — DRY, one source of truth',
                'In the staging layer',
                'In a source YAML',
              ],
              answer: 1,
              explain: 'Shared logic used by more than one downstream model belongs in its own model (usually intermediate), pulled in with ref(). Copy-pasting it into both marts violates DRY and creates two places to fix.',
            },
            {
              q: 'How do you make every staging model a view and every mart a table without per-file config?',
              options: [
                'Add config() to each file individually',
                'Set +materialized per folder in dbt_project.yml (staging: view, marts: table); models inherit their folder’s default',
                'Rename the files',
                'Use a snapshot',
              ],
              answer: 1,
              explain: 'dbt_project.yml sets defaults per folder with +materialized. A model inherits its folder’s default (nearest-wins), so materialization follows the layer with no boilerplate; per-file config() overrides only when needed.',
            },
            {
              q: 'The dbt layering maps onto which two things you already learned?',
              options: [
                'Docker layers and container images',
                'The medallion pattern (3.3.3: bronze/silver/gold) and Kimball dimensional modeling (Phase 2 facts/dimensions in the marts layer)',
                'Incremental and full-refresh',
                'Python and SQL',
              ],
              answer: 1,
              explain: 'Staging ≈ silver (cleaned/conformed), marts ≈ gold (business-ready) over bronze raw sources — the medallion refinement. And the marts layer is exactly the fct_/dim_ star schemas from Kimball dimensional modeling.',
            },
            {
              q: 'When is a flat models/ directory (no layers) actually a reasonable choice?',
              options: [
                'Always — layers are pointless',
                'For a tiny, short-lived, single-author project of a few models you will not grow',
                'For any project with more than 50 models',
                'When you use snapshots',
              ],
              answer: 1,
              explain: 'Structure is a cost. For a throwaway prototype or a genuinely tiny project it can be overkill. The moment a project will grow or be shared, adopt the three-layer convention — too little structure on a big project becomes a maze.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Describe how you structure a dbt project.',
            a: (
              <p>
                Three layers under <code>models/</code>. <strong>Staging</strong> (<code>stg_</code>): one model per source
                table, only light cleaning — rename, recast, standardize — and the sole layer that references sources, so source
                coupling is isolated. <strong>Intermediate</strong> (<code>int_</code>): reusable joins and business logic shared
                by multiple marts, kept DRY and often ephemeral. <strong>Marts</strong> (<code>fct_</code>/<code>dim_</code>):
                business-facing facts and dimensions at an explicit grain — the Kimball star schemas. Refs flow strictly
                left-to-right. I set materialization per folder in <code>dbt_project.yml</code> (staging views, marts tables), so
                a model&apos;s storage and role follow from where it lives. It is the medallion pattern in dbt.
              </p>
            ),
          },
          {
            q: 'Why put light staging between sources and marts instead of just querying sources in the marts?',
            a: (
              <p>
                To isolate source coupling. Staging is an anti-corruption boundary: every source&apos;s quirky shape is
                normalized in exactly one <code>stg_</code> model, so a source schema change (a renamed or retyped column)
                breaks one model with a precise blast radius, rather than fifteen marts that each referenced the raw table.
                It also gives every downstream model clean, conformed, consistently-named inputs for free. The cost is one thin
                pass-through model per source — cheap insurance that pays for itself the first time a source changes.
              </p>
            ),
          },
          {
            q: 'When is this structure overkill, and what do you do instead?',
            a: (
              <p>
                For a genuinely tiny, short-lived, single-author project — a few models you will not grow — the folders,
                prefixes, and per-layer config are ceremony that buys little; a flat <code>models/</code> dir is fine. The
                symmetric failure is over-nesting a small project into many one-model subfolders. The rule is to match structure
                to size: adopt the shallow three-layer convention as soon as a project is more than a toy, and add sub-structure
                (per-source or per-domain subfolders) only once a layer itself gets crowded. Structure should track real
                complexity, not anticipate imaginary scale.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>The standard dbt layering is <strong>staging → intermediate → marts</strong>, with refs flowing strictly left-to-right — the medallion (3.3.3) refinement expressed in dbt.</>,
          <><strong>Staging</strong> (<code>stg_</code>): 1:1 with sources, light cleaning only, and the <em>only</em> layer that references sources — so source coupling has a precise blast radius.</>,
          <><strong>Intermediate</strong> (<code>int_</code>): reusable joins/logic shared by multiple marts, kept DRY via <code>ref()</code> and often ephemeral; <strong>marts</strong> (<code>fct_</code>/<code>dim_</code>) are the business-facing Kimball facts and dimensions at an explicit grain.</>,
          <>Folders under <code>models/</code> mirror the layers, and <code>dbt_project.yml</code> sets materialization per folder (staging views, marts tables) — a model&apos;s storage follows from where it sits, no boilerplate.</>,
          <>DRY: any logic used by more than one model becomes its own model referenced with <code>ref()</code> — one source of truth, one place to fix.</>,
          <>Match structure to size: flat is fine for a toy, the three-layer convention is the default for anything real, and deep nesting is ceremony until a large multi-domain project earns it.</>,
        ]}
      />
    </>
  )
}
