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
import { PipelineDAG } from '../../../viz/PipelineDAG'
import type { DagNode } from '../../../viz/PipelineDAG'

const ID = '3.4.1'

const NODES: DagNode[] = [
  { id: 'raw_trips', label: 'raw_trips', col: 0, sub: 'source', color: '#fbbf24' },
  { id: 'stg_trips', label: 'stg_trips', col: 1, sub: 'staging', color: '#22d3ee' },
  { id: 'revenue_by_zone', label: 'revenue_by_zone', col: 2, sub: 'mart', color: '#34d399' },
  { id: 'trips_per_zone', label: 'trips_per_zone', col: 2, sub: 'mart', color: '#a78bfa' },
]

const EDGES: [string, string][] = [
  ['raw_trips', 'stg_trips'],
  ['stg_trips', 'revenue_by_zone'],
  ['stg_trips', 'trips_per_zone'],
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="You have scripts. What decides the order?">
        <p>
          By now you can pull data from an API (3.2), land it as Parquet, and load it into Postgres. Each of those is a
          script. But a real pipeline is a dozen of them, and the order matters: you cannot build the revenue table before
          the cleaned trips table exists, which cannot exist before the raw extract lands. Something has to know that order,
          run the steps in it, skip what is already fresh, and tell you which step broke. That something is an{' '}
          <GlossaryTerm k="orchestrator">orchestrator</GlossaryTerm>, and Dagster — the tool this module uses — models your
          pipeline in a way that is worth understanding before you touch it.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Two ways to write a recipe. The first lists steps in order: &quot;boil water, then add pasta, then drain,
                then add sauce.&quot; The second lists the finished dishes and what each is made from: &quot;the plated
                pasta is made from drained pasta and sauce; drained pasta is made from boiled pasta; boiled pasta is made
                from raw pasta and water.&quot; Hand the second recipe to a good kitchen and it works out the order by
                itself — because every dish says what it depends on.
              </p>
              <p>
                Old orchestrators wanted the first kind of recipe: you spell out every step and the arrows between them by
                hand. Dagster wants the second kind. You describe the <em>things that should exist</em> — the tables and
                files — and what each is built from, and Dagster figures out the order, tracks what got made when, and
                knows exactly what to rebuild if one ingredient changes.
              </p>
            </>
          }
          student={
            <>
              <p>
                Older orchestrators are <em>task-centric</em>: you define tasks (&quot;run this Python&quot;, &quot;run that
                SQL&quot;) and wire dependencies between the tasks. The unit is an action. Dagster is{' '}
                <em>asset-centric</em>: the unit is a <GlossaryTerm k="software-defined-asset">software-defined asset</GlossaryTerm> —
                a persistent object you care about, like a table or a file. You write a Python function that produces that
                object, decorate it <code>@asset</code>, and Dagster treats the function&apos;s name as the asset&apos;s name.
              </p>
              <p>
                Dependencies are not wired separately — they are the function&apos;s <em>parameters</em>. If{' '}
                <code>stg_trips</code> takes an argument named <code>raw_trips</code>, Dagster reads that as &quot;stg_trips
                is built from raw_trips&quot; and inserts the edge for you. From all the decorated functions it builds the{' '}
                asset graph, tracks each <GlossaryTerm k="materialization">materialization</GlossaryTerm> (when an asset was
                last computed and to what), and gives you <GlossaryTerm k="data-lineage">lineage</GlossaryTerm> for free.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The distinction is declarative-vs-imperative applied to data. Task orchestration composes{' '}
                <em>ops</em> (side-effecting computations) into a job DAG; the graph is a control-flow artifact and the data
                each op produces is implicit, invisible to the orchestrator. The Software-Defined Assets model inverts this:
                the asset — an addressable, persistent entity keyed by an <code>AssetKey</code> — is the primary object, and
                the op that computes it is an implementation detail Dagster generates. The dependency graph is therefore a{' '}
                <em>data</em> lineage graph, not a control-flow graph.
              </p>
              <p>
                This buys three things a task graph cannot express natively: (1) lineage as first-class state you can query
                — &quot;what is this table built from, and what breaks if it changes&quot;; (2) reconciliation — Dagster can
                compare declared assets against last-materialized state and compute the minimal set to rebuild; and (3){' '}
                <GlossaryTerm k="freshness-policy">freshness policies</GlossaryTerm> and auto-materialization, where you
                declare &quot;this asset should be no more than one hour stale&quot; and the system decides when to run,
                rather than you pinning a cron by hand. Ops still exist underneath — an asset is sugar over an op with a
                declared output — but you rarely drop to that level.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="An asset is named by the function that makes it">
        <p>
          Here is the whole idea in code. Three functions, three assets. Notice there is no separate place where you list
          the dependencies — the parameter names <em>are</em> the dependencies.
        </p>
        <CodeBlock
          label="defs.py — three assets"
          code={`import dagster as dg

@dg.asset
def raw_trips() -> list[dict]:
    # In real life this reads an API or a file. Here: a tiny fixed sample.
    return [
        {"zone": "A", "fare": 12.50},
        {"zone": "B", "fare": 9.00},
        {"zone": "A", "fare": 7.25},
        {"zone": "B", "fare": 0.00},   # a junk row to clean out
    ]

@dg.asset
def stg_trips(raw_trips: list[dict]) -> list[dict]:
    # Depends on raw_trips SOLELY because it takes a parameter of that name.
    return [r for r in raw_trips if r["fare"] > 0]

@dg.asset
def revenue_by_zone(stg_trips: list[dict]) -> dict:
    totals: dict[str, float] = {}
    for r in stg_trips:
        totals[r["zone"]] = totals.get(r["zone"], 0.0) + r["fare"]
    return totals

# Definitions is the single object Dagster loads to discover everything.
defs = dg.Definitions(assets=[raw_trips, stg_trips, revenue_by_zone])`}
        />
        <Tiered
          layman={
            <>
              <p>
                Read it like the dish-list recipe. <code>revenue_by_zone</code> is a dish made from <code>stg_trips</code>.{' '}
                <code>stg_trips</code> is a dish made from <code>raw_trips</code>. <code>raw_trips</code> is made from
                nothing (it is where the ingredients come in). You never wrote &quot;do this, then this&quot; — you only
                said what each thing is made from, and the order falls out of that.
              </p>
              <p>
                The <code>Definitions</code> line at the bottom is just handing the kitchen the full recipe book so it knows
                all the dishes exist.
              </p>
            </>
          }
          student={
            <>
              <p>
                Each <code>@asset</code> function returns the data that <em>is</em> the asset. When you materialize{' '}
                <code>stg_trips</code>, Dagster runs <code>raw_trips()</code> first (because <code>stg_trips</code> needs it),
                passes its return value in as the <code>raw_trips</code> argument, then runs <code>stg_trips</code>. Where
                does the return value get stored between assets? An <em>IO manager</em> handles that — by default it pickles
                each asset&apos;s output to local storage, so a downstream asset in a later run can load an upstream value
                without recomputing it. You will swap that default for a real database in 3.4.4.
              </p>
              <p>
                The type hints (<code>list[dict]</code>, <code>dict</code>) are ordinary Python — Dagster does not require
                them, but they document what flows between assets. The one thing that is load-bearing is the parameter{' '}
                <em>name</em>: it must match the upstream asset&apos;s name exactly, because that string is how Dagster
                resolves the dependency.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The <code>@asset</code> decorator wraps the function into an <code>AssetsDefinition</code>: it derives the
                output <code>AssetKey</code> from the function name and one input <code>AssetKey</code> per parameter (unless
                you override with <code>deps=</code> or <code>AssetIn</code>). At load time Dagster stitches every
                definition&apos;s keys into a global asset graph; a parameter referencing a key no definition produces is a
                load-time error, not a silent no-op — the graph must be closed.
              </p>
              <p>
                Materialization is mediated by the IO manager: for each asset, <code>handle_output</code> persists the return
                value and <code>load_input</code> rehydrates it for downstream consumers, keyed by <code>AssetKey</code> (and
                partition key, in 3.4.3). This indirection is why the same asset function can write to a pickle in dev and to
                a warehouse table in prod without touching the business logic — the storage decision lives in the IO manager,
                not the asset. It is dependency inversion applied to persistence.
              </p>
            </>
          }
        />
        <p>
          The transformation logic inside those assets is plain Python. Run the core of it here — the same cleaning and
          aggregation, minus Dagster (which cannot run in a browser) — to see what each asset actually returns:
        </p>
        <CodeRunner
          language="python"
          code={`raw_trips = [
    {"zone": "A", "fare": 12.50},
    {"zone": "B", "fare": 9.00},
    {"zone": "A", "fare": 7.25},
    {"zone": "B", "fare": 0.00},
]

stg_trips = [r for r in raw_trips if r["fare"] > 0]

totals = {}
for r in stg_trips:
    totals[r["zone"]] = totals.get(r["zone"], 0.0) + r["fare"]

print("stg_trips rows:", len(stg_trips))
print("revenue_by_zone:", totals)`}
        />
      </Section>

      <Section kicker="core concepts" title="The graph and its lineage are the payoff">
        <p>
          From those three functions Dagster builds a graph. Click any asset below: it lights the{' '}
          <span style={{ color: '#fbbf24' }}>upstream</span> it is built from and the{' '}
          <span style={{ color: '#22d3ee' }}>downstream</span> that breaks if it fails. This is exactly the picture the
          Dagster UI draws for the code above (with one extra mart asset, <code>trips_per_zone</code>, to show a single
          upstream feeding two downstreams).
        </p>
        <PipelineDAG
          nodes={NODES}
          edges={EDGES}
          caption={
            <>
              <b>Click an asset.</b> This is the asset graph Dagster derives from your <code>@asset</code> functions — the
              same lineage view the web UI shows. <code>revenue_by_zone</code> and <code>trips_per_zone</code> both depend on{' '}
              <code>stg_trips</code>, so a bad <code>stg_trips</code> materialization is visibly upstream of both. You wrote
              functions; Dagster drew the map.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                Because the kitchen knows what every dish is made from, it can answer two questions instantly. &quot;Where
                did this come from?&quot; — trace the arrows back. &quot;If this ingredient is bad, what do I have to throw
                out?&quot; — trace the arrows forward. That map, drawn automatically, is worth more than any single script.
              </p>
              <p>
                It also means you never rebuild the whole meal to fix one dish. Change the sauce, and only the plated pasta
                needs replating — the boiled pasta is untouched.
              </p>
            </>
          }
          student={
            <>
              <p>
                Lineage answers the questions you get paged about. A number in a dashboard looks wrong: click the mart asset,
                walk upstream, find the staging asset whose last materialization failed. A source schema changed: click it,
                walk downstream, see every asset you must rerun. In a pile of loose scripts you reconstruct this in your head
                (or from tribal knowledge); Dagster keeps it as live state.
              </p>
              <p>
                Each asset also records its materialization history — when it last ran, whether it succeeded, and metadata you
                attach (row counts, file sizes). That history is what lets Dagster show an asset as stale, and what lets you
                answer &quot;is the revenue table fresh?&quot; without opening the database.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The lineage graph is queryable structure, not a drawing. Dagster exposes it over GraphQL, so tooling can ask
                &quot;all downstream assets of key X&quot; or &quot;the subgraph feeding this mart&quot; programmatically —
                the basis for impact analysis, selective reruns, and column-level lineage integrations. Because edges are
                derived from code rather than maintained by hand, the graph cannot drift out of sync with the pipeline the way
                a hand-drawn Airflow DAG plus a separate data model can.
              </p>
              <p>
                Materialization events are the other half: each is an immutable log entry (asset key, partition, run id,
                timestamp, user metadata) in the event store. Freshness, staleness, and auto-materialization are all functions
                over this event log plus the code version of each asset — Dagster can detect that an asset&apos;s code changed
                since its last materialization and mark it stale even though its inputs did not, a form of change detection a
                pure task graph has no vocabulary for.
              </p>
            </>
          }
        />
        <Callout kind="tip" title="The mental flip">
          Stop asking &quot;what steps do I run, in what order?&quot; Start asking &quot;what objects should exist, and what
          is each made from?&quot; Answer the second and the first is derived for you. That flip is the entire point of the
          asset model.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Asset-centric or task-centric orchestration?">
        <p>
          Dagster&apos;s asset model is powerful but not universal, and it is the newer of the two philosophies. The honest
          comparison is against Airflow, which most of the industry still runs, and against having no orchestrator at all.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Asset-centric (Dagster)',
              strengths: [
                'The orchestrator knows what data exists — lineage, freshness, and staleness are first-class',
                'Dependencies are code (function parameters), so the graph cannot drift from the pipeline',
                'Can rebuild the minimal set of affected assets, and reason about "is this table fresh?"',
              ],
              weaknesses: [
                'Newer and less ubiquitous — smaller hiring pool, fewer legacy examples than Airflow',
                'The asset framing is awkward for pure side-effect work with no data output (e.g. "send an email")',
                'A mental model to learn before it clicks; over-modelling tiny pipelines is real overhead',
              ],
              chooseWhen: 'building data pipelines where the outputs are tables/files and you want lineage and freshness — the curriculum default.',
            },
            {
              name: 'Task-centric (Airflow)',
              strengths: [
                'The incumbent standard — enormous community, integrations, and a deep hiring pool',
                'Imperative task-and-dependency model is a natural fit for arbitrary workflows, not just data',
              ],
              weaknesses: [
                'The orchestrator does not know what data your tasks produce — no built-in lineage or freshness',
                'Dependencies are wired separately from the code that produces the data, so they drift',
              ],
              chooseWhen: 'you are in an Airflow shop, need its ecosystem, or your workflows are general actions rather than data assets.',
            },
            {
              name: 'No orchestrator (cron + scripts)',
              strengths: [
                'Zero infrastructure — a scheduled task per script, nothing to run or learn',
                'Fine for one or two independent jobs with no ordering between them',
              ],
              weaknesses: [
                'Ordering, retries, backfills, and lineage are all manual and live in your head',
                'A mid-pipeline failure leaves you diagnosing by hand with no run history',
              ],
              chooseWhen: 'a single standalone job with no dependencies, where an orchestrator is more machinery than the problem needs.',
            },
          ]}
          note={
            <>
              This is not &quot;Dagster wins.&quot; If you interview at an Airflow shop, the task model is the one you must
              speak. What transfers either way is the concept underneath: a pipeline is a directed acyclic graph, and the
              orchestrator&apos;s job is to run it in order, with retries and history. Dagster makes the <em>data</em> the
              nodes; Airflow makes the <em>tasks</em> the nodes.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: your first asset graph, materialized">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will scaffold a tiny Dagster project with <code>uv</code>, define the three assets from this lesson, launch
              the Dagster web UI, materialize the graph, and confirm a real output file exists. Dagster runs on your machine,
              not in the browser — every command here is real. You need Python 3.13 and <code>uv</code> (Phase 0).
            </p>
          }
          steps={[
            {
              title: 'Create the project and add Dagster',
              body: (
                <p>
                  Make a project folder, initialize it with <code>uv</code>, and add Dagster plus its web UI package.
                </p>
              ),
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\dagster-lab\ncd C:\\de-lab\\dagster-lab\nuv init --bare\nuv add dagster dagster-webserver',
                  bash: 'mkdir -p ~/de-lab/dagster-lab && cd ~/de-lab/dagster-lab\nuv init --bare\nuv add dagster dagster-webserver',
                },
              ],
              checkpoint: (
                <>
                  <code>uv add</code> finishes without error and a <code>pyproject.toml</code> now lists <code>dagster</code>{' '}
                  and <code>dagster-webserver</code> under dependencies. <code>uv run dagster --version</code> prints a
                  version.
                </>
              ),
            },
            {
              title: 'Write the three assets',
              body: (
                <>
                  <p>
                    Create <code>defs.py</code> in the project folder with the code from this lesson — the final asset also
                    writes a CSV so there is an observable artifact on disk:
                  </p>
                  <CodeBlock
                    label="defs.py"
                    code={`import csv
import dagster as dg

@dg.asset
def raw_trips() -> list[dict]:
    return [
        {"zone": "A", "fare": 12.50},
        {"zone": "B", "fare": 9.00},
        {"zone": "A", "fare": 7.25},
        {"zone": "B", "fare": 0.00},
    ]

@dg.asset
def stg_trips(raw_trips: list[dict]) -> list[dict]:
    return [r for r in raw_trips if r["fare"] > 0]

@dg.asset
def revenue_by_zone(stg_trips: list[dict]) -> dict:
    totals: dict[str, float] = {}
    for r in stg_trips:
        totals[r["zone"]] = totals.get(r["zone"], 0.0) + r["fare"]
    with open("revenue_by_zone.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["zone", "revenue"])
        for zone, total in sorted(totals.items()):
            w.writerow([zone, total])
    return totals

defs = dg.Definitions(assets=[raw_trips, stg_trips, revenue_by_zone])`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  The file saves with no syntax errors. <code>uv run dagster definitions validate -f defs.py</code> reports
                  the definitions load successfully (or simply move to the next step, which will surface any error).
                </>
              ),
            },
            {
              title: 'Launch the Dagster UI',
              body: (
                <p>
                  Start the development server pointed at your file. It serves a web UI (default{' '}
                  <code>http://localhost:3000</code>) and prints the URL.
                </p>
              ),
              commands: [{ ps: 'uv run dagster dev -f defs.py' }],
              checkpoint: (
                <>
                  The terminal prints something like <code>Serving dagster-webserver on http://127.0.0.1:3000</code>. Open
                  that URL. Under <b>Assets</b> you see all three assets, and the <b>lineage</b> view draws the exact graph
                  from this lesson: <code>raw_trips → stg_trips → revenue_by_zone</code>. Leave this running.
                </>
              ),
            },
            {
              title: 'Materialize the graph',
              body: (
                <p>
                  In the UI, open the asset graph (Assets → View global asset lineage), select all, and click{' '}
                  <b>Materialize</b>. Watch the run execute the assets in dependency order.
                </p>
              ),
              checkpoint: (
                <>
                  A run launches; each asset turns <b>green</b> as it materializes, in order (raw → stg → revenue). The run
                  log shows one step per asset. Each asset now displays a &quot;materialized&quot; timestamp — Dagster is
                  tracking history.
                </>
              ),
            },
            {
              title: 'Confirm the real artifact, and the point',
              body: (
                <>
                  <p>
                    In a second terminal (leave <code>dagster dev</code> running), confirm the CSV the final asset wrote
                    actually exists and holds the aggregated revenue.
                  </p>
                  <RevealSolution label="What the output should contain">
                    <p>
                      <code>revenue_by_zone.csv</code> has a header plus two rows: zone A = 19.75 (12.50 + 7.25) and zone B =
                      9.00 (the 0.00 junk row was dropped by <code>stg_trips</code>). You declared three objects and what each
                      was made from; Dagster ran them in order and produced a real file. That is the asset model working.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                {
                  ps: 'Get-Content C:\\de-lab\\dagster-lab\\revenue_by_zone.csv',
                  bash: 'cat ~/de-lab/dagster-lab/revenue_by_zone.csv',
                },
              ],
              checkpoint: (
                <>
                  The file prints <code>zone,revenue</code> then <code>A,19.75</code> and <code>B,9.0</code>. A materialized
                  asset is a persistent object on disk, not just a green box in a UI.
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
              q: 'In Dagster, what does the @asset decorator turn a function into?',
              options: [
                'A scheduled task that runs every minute',
                'A definition of a persistent object (like a table or file) named after the function, tracked in the asset graph',
                'A database connection',
                'A one-time script that Dagster runs and forgets',
              ],
              answer: 1,
              explain: 'An asset is a persistent object you care about, named by the function that produces it. Dagster tracks its lineage and every materialization — it is not a fire-and-forget task.',
            },
            {
              q: 'How do you express that stg_trips depends on raw_trips?',
              options: [
                'Call raw_trips() manually inside stg_trips',
                'Add a separate edge in a dependency config file',
                'Give stg_trips a function parameter named raw_trips — the parameter name IS the dependency',
                'List them in alphabetical order',
              ],
              answer: 2,
              explain: 'Dagster reads each parameter name as an upstream asset key. Naming the parameter raw_trips both declares the dependency and receives that asset’s value — no separate wiring.',
            },
            {
              q: 'What is the core difference between asset-centric (Dagster) and task-centric (Airflow) orchestration?',
              options: [
                'Dagster is faster at running Python',
                'In Dagster the nodes are the data objects (assets); in Airflow the nodes are actions (tasks), and the data they produce is invisible to the orchestrator',
                'Airflow cannot run on a schedule',
                'There is no difference — the words are synonyms',
              ],
              answer: 1,
              explain: 'Task graphs model control flow; the orchestrator does not know what data each task makes. Asset graphs make the data the nodes, which is what gives Dagster built-in lineage and freshness.',
            },
            {
              q: 'A number in your revenue mart looks wrong. How does the asset graph help?',
              options: [
                'It automatically fixes the number',
                'It lets you click the mart asset and walk upstream to find which staging/source asset last failed or changed — lineage',
                'It deletes the bad asset',
                'It emails the source system owner',
              ],
              answer: 1,
              explain: 'Lineage is the payoff: trace arrows backward to find the cause, forward to find the blast radius. Dagster keeps this as live state instead of tribal knowledge.',
            },
            {
              q: 'By default, how does a downstream asset receive the value an upstream asset returned, across runs?',
              options: [
                'It recomputes the upstream asset every time',
                'An IO manager persists each asset’s output (by default pickled to local storage) and loads it back for downstream consumers',
                'The value is passed as an environment variable',
                'Dagster does not pass values between assets at all',
              ],
              answer: 1,
              explain: 'The IO manager handles persistence: it stores an asset’s output and rehydrates it for downstream assets. Swapping the IO manager is how the same asset writes to a warehouse in prod without changing the logic (3.4.4).',
            },
            {
              q: 'Why prefer the asset model’s framing "declare what should exist" over "script the steps"?',
              options: [
                'It runs the same script faster',
                'Because the order, the minimal rebuild set, lineage, and freshness can all be derived from the declared dependencies instead of maintained by hand',
                'Because it uses less disk space',
                'It is not actually preferable in any situation',
              ],
              answer: 1,
              explain: 'When each object declares what it is made from, the orchestrator derives ordering, impact, and staleness. Scripting steps by hand means maintaining all of that yourself, and it drifts.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain the difference between an asset-based and a task-based orchestrator.',
            a: (
              <p>
                A task-based orchestrator (Airflow) makes actions the unit: you define tasks and wire dependencies between
                them, and the orchestrator has no idea what data each task produces. An asset-based orchestrator (Dagster)
                makes persistent data objects the unit: you write a function per table/file, decorate it <code>@asset</code>,
                and declare dependencies by referencing upstream assets as parameters. Because the nodes are data, Dagster
                gets lineage, freshness, and the ability to rebuild the minimal affected set for free — things a task graph
                cannot express natively. The trade is maturity and ubiquity: Airflow is the incumbent with the bigger
                ecosystem and hiring pool.
              </p>
            ),
          },
          {
            q: 'How does Dagster know the order to run your pipeline?',
            a: (
              <p>
                It derives the order from the asset dependency graph, which it builds from the code itself: each{' '}
                <code>@asset</code> function&apos;s parameters name its upstream assets. From those edges Dagster produces a
                DAG and executes it in topological order, running an upstream asset before any downstream one that consumes
                it. You never write the order explicitly — it is a consequence of what each asset declares it is made from.
              </p>
            ),
          },
          {
            q: 'What is data lineage and why does it matter operationally?',
            a: (
              <p>
                Lineage is the recorded graph of what each dataset is built from and what depends on it. Operationally it
                answers the two questions you get paged about: root-cause (&quot;this dashboard number is wrong — walk
                upstream to the failed source&quot;) and impact (&quot;this source schema changed — walk downstream to every
                asset I must rerun&quot;). An asset orchestrator keeps lineage as live, queryable state derived from code, so
                it cannot drift from reality the way a hand-maintained diagram does.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>An orchestrator runs your pipeline in dependency order, with retries and run history, and tells you what broke — the job a pile of loose scripts cannot do for you.</>,
          <>A Dagster asset is a persistent object (table/file) named by the <code>@asset</code> function that produces it; you declare what should exist, not the steps.</>,
          <>Dependencies are the function&apos;s parameters: a parameter named after an upstream asset both declares the edge and receives that asset&apos;s value.</>,
          <>From the decorated functions Dagster builds the asset graph and tracks each materialization, giving you lineage (upstream cause, downstream impact) and freshness for free.</>,
          <>Asset-centric (Dagster) vs task-centric (Airflow): data as nodes vs actions as nodes. Dagster gives lineage/freshness natively; Airflow is the incumbent with the larger ecosystem.</>,
          <>An IO manager persists each asset&apos;s output and reloads it downstream — the seam that later lets the same asset write to a warehouse in prod without changing its logic.</>,
        ]}
      />
    </>
  )
}
