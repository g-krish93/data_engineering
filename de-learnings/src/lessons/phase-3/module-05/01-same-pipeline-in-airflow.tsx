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
import { RevealSolution } from '../../../components/RevealSolution'
import { PipelineDAG } from '../../../viz/PipelineDAG'
import type { DagNode } from '../../../viz/PipelineDAG'

const ID = '3.5.1'

const TASK_NODES: DagNode[] = [
  { id: 'extract_trips', label: 'extract_trips', col: 0, sub: 'task', color: '#fbbf24' },
  { id: 'extract_zones', label: 'extract_zones', col: 0, sub: 'task', color: '#fbbf24' },
  { id: 'transform', label: 'transform', col: 1, sub: 'task', color: '#22d3ee' },
  { id: 'load_revenue', label: 'load_revenue', col: 2, sub: 'task', color: '#34d399' },
]

const TASK_EDGES: [string, string][] = [
  ['extract_trips', 'transform'],
  ['extract_zones', 'transform'],
  ['transform', 'load_revenue'],
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="You already have the mental model. Now meet the incumbent.">
        <p>
          In module 3.4 you learned to orchestrate with Dagster: you declared the <em>things you want to exist</em> —
          a <code>raw_trips</code> asset, a <code>stg_trips</code> asset, a <code>revenue</code> asset — and Dagster
          worked out the order. That is one way to build a pipeline. It is not the way most of the industry actually
          runs today. The tool you will meet on almost every data team is{' '}
          <GlossaryTerm k="airflow">Apache Airflow</GlossaryTerm>, and it thinks about the problem from the opposite
          end: you list the <em>steps to run</em>, in order, and the data those steps move is invisible to the tool.
        </p>
        <p>
          This lesson is a translation exercise. You are not starting from zero — you are re-expressing a pipeline you
          already understand in a second language. Learning both, and seeing exactly where they diverge, is worth far
          more than learning either alone: it is how you reason about which{' '}
          <GlossaryTerm k="orchestrator">orchestrator</GlossaryTerm> a team should reach for.
        </p>
        <Tiered
          layman={
            <>
              <p>
                There are two ways to write a to-do list for laundry. The first lists the <em>chores</em>, in order:
                &quot;wash, then dry, then fold.&quot; The second lists the <em>result you want to exist</em>: &quot;clean,
                folded laundry in the drawer,&quot; and trusts whoever reads it to work backward through the steps that
                produce it.
              </p>
              <p>
                Airflow is the first kind of list — a checklist of chores in sequence. Dagster, which you already know,
                is the second kind — a description of the finished results. Both get your laundry done. But the chore
                list does not really know <em>what</em> clean laundry is; it only knows the motions. That single
                difference — steps versus results — explains almost everything about how these two tools feel to use.
              </p>
            </>
          }
          student={
            <>
              <p>
                Airflow is <strong>task-centric</strong>: the unit you declare is a task (a step of work), and a
                pipeline is a graph of tasks wired by dependencies. Dagster is <strong>asset-centric</strong>: the unit
                you declare is an asset (a table, file, or model that should exist), and the graph is inferred from
                which asset feeds which. Airflow moves data as a side effect of running steps; it does not model the
                data itself.
              </p>
              <p>
                Airflow is roughly a decade older (open-sourced at Airbnb in 2015, an Apache project since 2016) and is
                the default choice on a large majority of data teams — the ecosystem, the hiring pool, and the managed
                offerings (Amazon MWAA, Google Cloud Composer, Astronomer) all assume it. Knowing it is close to
                non-negotiable for a data engineering role. So we translate your Dagster pipeline into Airflow, step by
                step, and mark every place the mental models pull apart.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The distinction is a choice about the primary abstraction the scheduler reasons over. In Airflow the
                scheduler&apos;s state is keyed on (dag_id, task_id, logical_date) — task instances — and the data
                artifacts are outside its model entirely; lineage, freshness, and schema are things you bolt on with
                external tooling (OpenLineage, Marquez, a data catalog). In Dagster the artifact <em>is</em> the node,
                so lineage and freshness are first-class and the scheduler can reason about staleness of data, not just
                success of steps.
              </p>
              <p>
                Neither is strictly more expressive — any asset graph can be encoded as a task graph and vice versa —
                but the default abstraction shapes what is cheap to ask. &quot;Which downstream tables are stale because
                an upstream one changed?&quot; is a native question in Dagster and a bolt-on in Airflow. &quot;Run this
                arbitrary sequence of operational steps against forty different systems&quot; is Airflow&apos;s home
                turf, because a task need not produce a data artifact at all. The industry migration debate — covered in
                the trade-offs — is really an argument about which of those questions your platform asks more often.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Same pipeline, different nodes: tasks, not tables">
        <p>
          Here is the exact pipeline from module 3.4 — raw trips and zones, cleaned and joined, aggregated into daily
          revenue — but drawn the way Airflow sees it. Click a node to light its lineage. Notice what the nodes{' '}
          <em>are</em>:
        </p>
        <PipelineDAG
          nodes={TASK_NODES}
          edges={TASK_EDGES}
          caption={
            <>
              <b>Click a task.</b> In Airflow each node is a <span style={{ color: '#fbbf24' }}>step of work</span> — a
              verb: <code>extract_trips</code>, <code>transform</code>, <code>load_revenue</code>. The arrows are
              declared dependencies, not inferred from data. In <b>Dagster</b> (module 3.4) the same pipeline&apos;s
              nodes were the <em>tables themselves</em> — <code>raw_trips</code>, <code>stg_trips</code>,{' '}
              <code>revenue</code> — nouns, and the arrows were inferred from which table read which. Steps versus
              results, drawn out.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                Look at the labels on the boxes. They are all <em>actions</em>: extract, transform, load. This is the
                chore list. If you drew the same laundry as a Dagster diagram, the boxes would be labeled with{' '}
                <em>things</em> instead — &quot;washed clothes,&quot; &quot;dried clothes,&quot; &quot;folded clothes&quot;
                — the results, not the motions.
              </p>
              <p>
                Same laundry, same order, two different ways of naming the boxes. That naming choice is the whole
                personality difference between the two tools.
              </p>
            </>
          }
          student={
            <>
              <p>
                In Airflow you author a <GlossaryTerm k="airflow-dag">DAG</GlossaryTerm> — a directed acyclic graph
                whose nodes are <strong>tasks</strong> and whose edges are dependencies you state explicitly.{' '}
                <code>extract_trips</code> and <code>extract_zones</code> both feed <code>transform</code>, which feeds{' '}
                <code>load_revenue</code>. Airflow guarantees a task only starts once every upstream task has succeeded;
                it does not know or care that <code>transform</code> produced a cleaned table, only that its function
                returned without raising.
              </p>
              <p>
                Compare the Dagster version: there the nodes were <code>raw_trips → stg_trips → revenue</code>, the
                tables, and you never drew the arrows — Dagster read them off the function parameters (an asset that
                takes <code>stg_trips</code> as an argument is downstream of it). In Airflow you draw the arrows
                yourself, with <code>{'>>'}</code> or by calling one task&apos;s output into the next. The graph is your
                declaration, not an inference.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Both graphs are DAGs over the same partial order, so they are isomorphic as dependency structures. What
                differs is the labeling functor: Airflow labels vertices with computations, Dagster labels them with
                the artifacts those computations persist. This is why an Airflow task can legitimately have <em>no</em>{' '}
                data output (trigger a report, poke an API, run a dbt build as one opaque step) while a Dagster asset is
                definitionally a persisted object — a task graph is a strict superset of the shapes an asset graph can
                take.
              </p>
              <p>
                The cost of that generality is data-blindness. Because Airflow&apos;s vertices are opaque callables,
                the scheduler cannot answer questions about the artifacts — it cannot prune a run because an output is
                already fresh, cannot type-check the hand-off between two tasks, cannot draw table-level lineage without
                you emitting it. Airflow 2.4+ added &quot;datasets&quot; (renamed &quot;assets&quot; in Airflow 3) to
                bolt a data-aware scheduling layer on top, which is a direct acknowledgment that the pure task model
                leaves those questions unanswerable natively.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The core objects: DAG, operators, scheduler, executor, task instances">
        <Tiered
          layman={
            <>
              <p>
                An Airflow setup has a few moving parts, and they map onto a restaurant. The <em>recipe cards</em> are
                your DAG files — the written plans. A <em>manager</em> reads all the recipe cards, checks the clock, and
                decides &quot;it is time to start tonight&apos;s dinner.&quot; A team of <em>cooks</em> actually does the
                work the manager hands out. And a <em>ticket</em> is pinned up for each dish on each night, tracking
                whether it is waiting, cooking, done, or burned.
              </p>
              <p>
                You mostly write recipe cards. The manager and the cooks are machinery that runs in the background,
                turning your written plans into actual dinners on a schedule.
              </p>
            </>
          }
          student={
            <>
              <p>Five objects you must be able to name:</p>
              <ul>
                <li>
                  <strong>DAG</strong> — the pipeline definition: a Python file describing tasks and their dependencies,
                  plus a <GlossaryTerm k="schedule">schedule</GlossaryTerm>.
                </li>
                <li>
                  <strong><GlossaryTerm k="airflow-operator">Operators / tasks</GlossaryTerm></strong> — a task is one
                  node; classically you build it from an <em>operator</em> (a reusable template):{' '}
                  <code>PythonOperator</code> runs a Python function, <code>BashOperator</code> runs a shell command,
                  and there are hundreds more (Postgres, S3, Spark, dbt) in provider packages.
                </li>
                <li>
                  <strong><GlossaryTerm k="airflow-scheduler">Scheduler</GlossaryTerm></strong> — the long-running
                  process that parses your DAG files, watches the clock and dependencies, and decides which task
                  instances are ready to run.
                </li>
                <li>
                  <strong><GlossaryTerm k="airflow-executor">Executor</GlossaryTerm></strong> — how those ready tasks
                  actually run: <code>LocalExecutor</code> (subprocesses on one machine), <code>CeleryExecutor</code> or{' '}
                  <code>KubernetesExecutor</code> (distributed across workers).
                </li>
                <li>
                  <strong><GlossaryTerm k="task-instance">Task instance</GlossaryTerm></strong> — one task on one
                  scheduled date. <code>transform</code> for 2024-01-01 is a different task instance from{' '}
                  <code>transform</code> for 2024-01-02, each with its own state (queued, running, success, failed,
                  up_for_retry) in Airflow&apos;s metadata database.
                </li>
              </ul>
              <p>
                In classic style you instantiate operators and wire them with the bitshift operator{' '}
                <code>{'>>'}</code>. Read it left-to-right as &quot;then&quot;:
              </p>
              <CodeBlock
                label="classic operator style — dags/trips_pipeline_classic.py"
                code={`from datetime import datetime
from airflow import DAG
# Airflow 3.x: operators live in provider packages
from airflow.providers.standard.operators.python import PythonOperator
# (Airflow 2.x import was: from airflow.operators.python import PythonOperator)

def extract(**context):
    rows = 1000
    context["ti"].xcom_push(key="rows", value=rows)   # hand a small value forward

def transform(**context):
    rows = context["ti"].xcom_pull(key="rows")         # pull it back
    clean = int(rows * 0.9)                             # drop 10% bad rows
    context["ti"].xcom_push(key="clean", value=clean)

def load(**context):
    clean = context["ti"].xcom_pull(key="clean")
    print("loaded", clean, "rows into revenue")

with DAG(
    dag_id="trips_pipeline_classic",
    schedule="0 6 * * *",              # cron: daily at 06:00
    start_date=datetime(2024, 1, 1),
    catchup=False,
) as dag:
    e = PythonOperator(task_id="extract", python_callable=extract)
    t = PythonOperator(task_id="transform", python_callable=transform)
    l = PythonOperator(task_id="load", python_callable=load)

    e >> t >> l                        # you draw the dependencies by hand`}
              />
              <p>
                Notice the manual <code>xcom_push</code> / <code>xcom_pull</code> — in classic style, passing even a
                single number between tasks is explicit plumbing. The TaskFlow API (next section) hides that.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The scheduler runs a continuous loop: parse DAG files into an in-memory representation (DAG parsing is
                CPU work and a real performance axis — hundreds of heavy DAG files can starve the parser), then for each
                DAG evaluate which task instances are schedulable given upstream states and the schedule, and enqueue
                them. The executor is a pluggable strategy for turning &quot;this task instance should run&quot; into an
                actual process: Local forks subprocesses, Celery pushes onto a broker for remote workers, Kubernetes
                spawns a pod per task. The scheduler decides <em>what</em>; the executor decides <em>where and how</em>.
              </p>
              <p>
                A task instance is a node in a state machine persisted in the metadata DB — none → scheduled → queued →
                running → (success | failed | up_for_retry) — and that persistence is what makes Airflow restartable and
                observable: kill the scheduler mid-run and it reconstructs pending work from the DB. It is also the
                source of Airflow&apos;s operational weight: a real deployment is a scheduler, a metadata database
                (Postgres), workers, and a web server, which is why local development is heavier than Dagster&apos;s and
                why the lab deliberately sidesteps the full stack with <code>dags test</code>.
              </p>
            </>
          }
        />
        <Callout kind="info" title="Airflow on Windows: use WSL2 or Docker">
          Airflow does not officially support running on native Windows — it depends on Unix-only process primitives.
          On your Windows 11 machine, run it inside <strong>WSL2</strong> (a real Linux environment) or a{' '}
          <strong>Docker</strong> container. The lab below assumes a WSL2 shell; the commands are the same ones a
          Linux or macOS engineer would type.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="The TaskFlow API: the modern way to write it">
        <Tiered
          layman={
            <>
              <p>
                The old way of writing Airflow made you spell out every hand-off: &quot;take the number from step one,
                put it in a labeled box; in step two, open the box, read the number.&quot; Tedious. The modern way lets
                you write plain functions that <em>return</em> a value and <em>take</em> a value, the way normal code
                does — and Airflow does the box-shuffling for you behind the scenes.
              </p>
              <p>
                It reads almost like ordinary Python: call extract, hand its result to transform, hand that to load.
                The result looks a lot closer to the Dagster code you already wrote — which is exactly why it is the
                recommended style for new pipelines.
              </p>
            </>
          }
          student={
            <>
              <p>
                The <GlossaryTerm k="taskflow-api">TaskFlow API</GlossaryTerm> (<code>@dag</code> and <code>@task</code>{' '}
                decorators) turns plain Python functions into tasks. You wire dependencies by <em>calling</em> the task
                functions and passing return values — Airflow infers the graph from the calls, and moves the return
                values between tasks as <GlossaryTerm k="xcom">XComs</GlossaryTerm> automatically. Here is the same
                three-step pipeline, TaskFlow style:
              </p>
              <CodeBlock
                label="taskflow style — dags/trips_pipeline.py"
                code={`from datetime import datetime
# Airflow 3.x:
from airflow.sdk import dag, task
# (Airflow 2.x import was: from airflow.decorators import dag, task)

@dag(
    schedule="0 6 * * *",              # cron: daily at 06:00 (same as the Dagster schedule)
    start_date=datetime(2024, 1, 1),
    catchup=False,                     # do not backfill history on first run
    tags=["de-academy"],
)
def trips_pipeline():

    @task
    def extract() -> int:
        rows = 1000
        print("extracted", rows, "raw trips")
        return rows                    # returned value becomes an XCom

    @task
    def transform(rows: int) -> int:
        clean = int(rows * 0.9)        # drop 10% bad rows
        print("transformed ->", clean, "clean trips")
        return clean

    @task
    def load(clean: int) -> None:
        print("loaded", clean, "rows into revenue")

    load(transform(extract()))         # calling the tasks wires the dependencies

trips_pipeline()                       # the DAG object Airflow discovers`}
              />
              <p>
                Read the last line inside the function: <code>load(transform(extract()))</code>. Those calls do not run
                the functions now — they build the graph <code>extract {'>>'} transform {'>>'} load</code>, and at run
                time Airflow passes each return value forward as an XCom. Compare the classic version&apos;s manual{' '}
                <code>xcom_push</code>/<code>xcom_pull</code>: TaskFlow is the same wiring, written like ordinary code.
              </p>
              <Callout kind="warn" title="XComs are for small values, not datasets">
                An <GlossaryTerm k="xcom">XCom</GlossaryTerm> is stored in Airflow&apos;s metadata database, so it is
                meant for <em>small</em> data — a row count, a file path, a run id. Never return a DataFrame or a large
                blob through an XCom; write the data to storage (Parquet in your data lake, a Postgres table) and pass
                the <em>path</em>. This is the same discipline as the Dagster IO managers you saw — here it is your
                responsibility, not the tool&apos;s.
              </Callout>
            </>
          }
          phd={
            <>
              <p>
                TaskFlow is syntactic sugar over the classic model, not a new execution model. The <code>@task</code>{' '}
                decorator wraps the callable in a <code>_PythonDecoratedOperator</code>; calling it returns an{' '}
                <code>XComArg</code>, a lazy handle to that task&apos;s output. Passing an <code>XComArg</code> as an
                argument to another task both establishes the dependency edge and registers an XCom pull at render time.
                So <code>load(transform(extract()))</code> is desugared into three operator instantiations plus{' '}
                <code>extract {'>>'} transform {'>>'} load</code> plus templated XCom lookups — identical task instances,
                identical metadata-DB state machine, identical XCom backend.
              </p>
              <p>
                The XCom backend is the sharp edge. By default values are serialized into the metadata database, which
                bounds their size and couples pipeline throughput to your Postgres. Production deployments swap in a
                custom XCom backend (S3/GCS-backed) so that &quot;passing a value&quot; transparently spills large
                objects to object storage while keeping a reference in the DB — recovering, by convention, the typed-IO
                ergonomics that Dagster&apos;s IO managers give you by construction. The fact that this is opt-in
                configuration rather than the default is a concrete instance of Airflow&apos;s data-blindness: the
                framework does not know your return value is a 2 GB frame, so it cannot make the right storage decision
                for you.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Airflow, Dagster, or just cron and scripts?">
        <p>
          &quot;Use Airflow&quot; is not automatic. The honest comparison is against the tool you just learned and
          against having no orchestrator at all. The axis is how much your steps need to know about the <em>data</em>{' '}
          they move, weighed against ecosystem maturity and operational weight.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Airflow (task-centric)',
              strengths: [
                'The industry default: largest ecosystem, hiring pool, and managed offerings (MWAA, Composer, Astronomer)',
                'Mature and battle-tested since 2015; hundreds of operators for nearly every system',
                'Tasks need not produce data — great for arbitrary operational workflows across many systems',
              ],
              weaknesses: [
                'Tasks are data-blind: no native lineage, freshness, or typed hand-offs — you bolt those on',
                'Heavier local development and operations (scheduler + metadata DB + workers + web server)',
                'XComs pass only small values by default; large data is your problem to route',
              ],
              chooseWhen: 'a team wants the safe, ubiquitous default, or the workload is arbitrary steps across many systems rather than a clean chain of data assets.',
            },
            {
              name: 'Dagster (asset-centric)',
              strengths: [
                'Data-aware: lineage, asset freshness, and typed IO are first-class, not add-ons',
                'Lighter, friendlier local development; the graph is inferred from your code',
                'Reasons about staleness of data, not just success of steps',
              ],
              weaknesses: [
                'Younger, smaller ecosystem and hiring pool than Airflow',
                'The asset model can feel awkward for workflows that are pure operational steps with no data artifact',
              ],
              chooseWhen: 'the work is fundamentally a graph of data assets and you value lineage, freshness, and local ergonomics over ubiquity.',
            },
            {
              name: 'Plain cron + scripts',
              strengths: [
                'Zero orchestration overhead — a cron entry and a Python file, nothing to run or maintain',
                'Perfectly adequate for one or two independent, reliable jobs',
              ],
              weaknesses: [
                'No dependency management, retries, backfills, observability, or a UI when something fails at 3 a.m.',
                'Breaks down the moment jobs depend on each other or you need to re-run history',
              ],
              chooseWhen: 'you have a handful of independent jobs and the cost of an orchestrator outweighs its benefit — do not reach for Airflow to run one nightly script.',
            },
          ]}
          note={
            <>
              The live industry debate is not &quot;Airflow is dead.&quot; It is: your steps are increasingly about
              data, and a data-aware scheduler answers &quot;what is stale?&quot; natively while a task scheduler makes
              you build that yourself. Airflow&apos;s response was to add datasets/assets on top of tasks. The pragmatic
              read for a new engineer: learn Airflow because you will meet it everywhere, understand Dagster&apos;s asset
              model because it is where the ideas are heading, and never install either to run a single cron job.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: rebuild the 3.4 pipeline as an Airflow DAG">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will install Airflow in a fresh <code>uv</code> project, point <code>AIRFLOW_HOME</code> at a lab
              folder, drop in the TaskFlow DAG from this lesson, and execute it with <code>airflow dags test</code> —
              which runs a DAG end-to-end <em>without</em> starting the full scheduler + web server stack, keeping
              things light. Run this inside a <strong>WSL2</strong> shell (Ubuntu) on your Windows machine, since
              Airflow needs Linux. Commands are shown PowerShell-first to launch WSL, then bash inside it.
            </p>
          }
          steps={[
            {
              title: 'Open a WSL2 Linux shell',
              body: (
                <p>
                  Airflow will not run on native Windows. Drop into your WSL2 Ubuntu environment (installed in Phase 0);
                  everything after this runs there.
                </p>
              ),
              commands: [
                { ps: 'wsl', bash: '# already in Linux? skip this', label: 'enter WSL2 from PowerShell' },
              ],
              checkpoint: (
                <>
                  Your prompt changes to a Linux shell (e.g. <code>you@machine:~$</code>). <code>uname -s</code> prints{' '}
                  <code>Linux</code>.
                </>
              ),
            },
            {
              title: 'Create a fresh uv project and install Airflow (pinned)',
              body: (
                <>
                  <p>
                    Make a project, add Airflow at a pinned version, and use Airflow&apos;s official constraints file so
                    the large dependency tree resolves to a known-good set.
                  </p>
                </>
              ),
              commands: [
                {
                  ps: '# (in WSL bash)',
                  bash: 'mkdir -p ~/airflow-lab && cd ~/airflow-lab\nuv init --python 3.12\nuv add "apache-airflow==3.0.3" \\\n  --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-3.0.3/constraints-3.12.txt"',
                  label: 'create project + install',
                },
              ],
              checkpoint: (
                <>
                  <code>uv run airflow version</code> prints <code>3.0.3</code>. (Airflow supports Python up to 3.12 for
                  this release, so the project pins 3.12 rather than 3.13.)
                </>
              ),
            },
            {
              title: 'Point AIRFLOW_HOME at the lab folder and initialise it',
              body: (
                <p>
                  <code>AIRFLOW_HOME</code> is where Airflow keeps its config, its metadata database, and — crucially —
                  the <code>dags/</code> folder it scans. Set it to your project so nothing touches your home directory.
                </p>
              ),
              commands: [
                {
                  ps: '# (in WSL bash)',
                  bash: 'export AIRFLOW_HOME=~/airflow-lab/airflow\nuv run airflow db migrate\nmkdir -p "$AIRFLOW_HOME/dags"',
                  label: 'set home + init DB + make dags dir',
                },
              ],
              checkpoint: (
                <>
                  <code>db migrate</code> ends without error and a folder <code>~/airflow-lab/airflow</code> now exists
                  containing <code>airflow.cfg</code> and a <code>dags/</code> subfolder.
                </>
              ),
            },
            {
              title: 'Add the TaskFlow DAG',
              body: (
                <>
                  <p>
                    Save this as <code>$AIRFLOW_HOME/dags/trips_pipeline.py</code> — the exact TaskFlow DAG from the
                    lesson (extract → transform → load):
                  </p>
                  <CodeBlock
                    label="dags/trips_pipeline.py"
                    code={`from datetime import datetime
from airflow.sdk import dag, task

@dag(
    schedule="0 6 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["de-academy"],
)
def trips_pipeline():

    @task
    def extract() -> int:
        rows = 1000
        print("extracted", rows, "raw trips")
        return rows

    @task
    def transform(rows: int) -> int:
        clean = int(rows * 0.9)
        print("transformed ->", clean, "clean trips")
        return clean

    @task
    def load(clean: int) -> None:
        print("loaded", clean, "rows into revenue")

    load(transform(extract()))

trips_pipeline()`}
                  />
                </>
              ),
              checkpoint: <>The file exists at <code>$AIRFLOW_HOME/dags/trips_pipeline.py</code> and saves without syntax errors.</>,
            },
            {
              title: 'Confirm Airflow discovers the DAG',
              body: <p>Ask Airflow to list every DAG it parsed from the dags folder.</p>,
              commands: [
                { ps: '# (in WSL bash)', bash: 'uv run airflow dags list', label: 'list DAGs' },
              ],
              checkpoint: (
                <>
                  A table prints with a row for <code>trips_pipeline</code>. If it is missing, re-check{' '}
                  <code>AIRFLOW_HOME</code> is exported in this shell and the file is under its <code>dags/</code> folder.
                  <strong> Checkpoint 1 reached.</strong>
                </>
              ),
            },
            {
              title: 'Run the whole DAG without the scheduler',
              body: (
                <>
                  <p>
                    <code>dags test</code> executes the DAG for one logical date, in-process, running each task in
                    dependency order and printing its output — no scheduler, no web server, no workers. This is the
                    fastest way to run a DAG locally.
                  </p>
                </>
              ),
              commands: [
                { ps: '# (in WSL bash)', bash: 'uv run airflow dags test trips_pipeline 2024-01-01', label: 'execute the DAG' },
              ],
              checkpoint: (
                <>
                  The log shows the three tasks running <em>in order</em> — <code>extract</code>, then{' '}
                  <code>transform</code>, then <code>load</code> — with their prints:{' '}
                  <code>extracted 1000 raw trips</code>, <code>transformed -&gt; 900 clean trips</code>,{' '}
                  <code>loaded 900 rows into revenue</code>, and each task ending in state <code>success</code>.{' '}
                  <strong>Checkpoint 2 reached</strong> — the return value flowed forward through XComs with no manual
                  push/pull.
                </>
              ),
            },
            {
              title: 'Optional: see the classic-operator equivalent',
              body: (
                <>
                  <p>
                    Real codebases mix both styles. Before you look, predict: in the classic version, how does the row
                    count get from <code>extract</code> to <code>transform</code>?
                  </p>
                  <RevealSolution label="Reveal the classic-operator DAG">
                    <p>
                      Explicitly, via <code>xcom_push</code> / <code>xcom_pull</code> — the plumbing TaskFlow hid. Save
                      this as <code>dags/trips_pipeline_classic.py</code>, then run{' '}
                      <code>uv run airflow dags test trips_pipeline_classic 2024-01-01</code>; it produces the same
                      ordered output.
                    </p>
                    <CodeBlock
                      label="dags/trips_pipeline_classic.py"
                      code={`from datetime import datetime
from airflow import DAG
from airflow.providers.standard.operators.python import PythonOperator

def extract(**context):
    rows = 1000
    print("extracted", rows, "raw trips")
    context["ti"].xcom_push(key="rows", value=rows)

def transform(**context):
    rows = context["ti"].xcom_pull(key="rows")
    clean = int(rows * 0.9)
    print("transformed ->", clean, "clean trips")
    context["ti"].xcom_push(key="clean", value=clean)

def load(**context):
    clean = context["ti"].xcom_pull(key="clean")
    print("loaded", clean, "rows into revenue")

with DAG(
    dag_id="trips_pipeline_classic",
    schedule="0 6 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["de-academy"],
) as dag:
    e = PythonOperator(task_id="extract", python_callable=extract)
    t = PythonOperator(task_id="transform", python_callable=transform)
    l = PythonOperator(task_id="load", python_callable=load)
    e >> t >> l`}
                    />
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  The classic DAG appears in <code>airflow dags list</code> alongside the TaskFlow one, and{' '}
                  <code>dags test trips_pipeline_classic 2024-01-01</code> prints the same three lines in the same order
                  — proving the two styles compile to identical task graphs.
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
              q: 'In an Airflow DAG, what does a node represent — and how does that differ from Dagster?',
              options: [
                'A table; Dagster nodes are also tables',
                'A task (a step of work); in Dagster the node is the asset/table itself',
                'A schedule; Dagster nodes are schedules',
                'A database connection; Dagster nodes are functions',
              ],
              answer: 1,
              explain:
                'Airflow is task-centric: nodes are steps (verbs like extract, transform, load). Dagster is asset-centric: nodes are the data artifacts (nouns like raw_trips, revenue). Same pipeline, different labeling — steps versus results.',
            },
            {
              q: 'In the TaskFlow API, how do you wire a dependency between two tasks?',
              options: [
                'You must always write task_a >> task_b explicitly',
                'By calling one task function and passing its return value into another; Airflow infers the edge',
                'By registering them in a separate dependencies.yaml file',
                'Airflow guesses from the alphabetical order of task names',
              ],
              answer: 1,
              explain:
                'Calling load(transform(extract())) both builds the graph and passes each return value forward as an XCom. The classic style uses >> and manual xcom_push/pull; TaskFlow makes the wiring look like ordinary function calls.',
            },
            {
              q: 'What are XComs for, and what should you NOT put in one?',
              options: [
                'For any data of any size — including large DataFrames',
                'For small values (a row count, a file path); never large datasets, since XComs live in the metadata database',
                'For scheduling information only',
                'For storing the DAG definition itself',
              ],
              answer: 1,
              explain:
                'XComs are serialized into Airflow’s metadata DB, so they are bounded and meant for small values. Write large data to storage (Parquet, Postgres) and pass the path via XCom — the same discipline Dagster’s IO managers handle for you.',
            },
            {
              q: 'What is the difference between the Airflow scheduler and the executor?',
              options: [
                'They are two names for the same process',
                'The scheduler decides which task instances are ready to run; the executor determines where and how they actually run',
                'The scheduler runs tasks; the executor writes the DAG files',
                'The executor parses DAGs; the scheduler stores results',
              ],
              answer: 1,
              explain:
                'The scheduler parses DAGs and, based on the clock and upstream states, decides what should run. The executor (Local, Celery, Kubernetes) is the pluggable strategy for actually running those ready task instances.',
            },
            {
              q: 'You run "airflow dags test trips_pipeline 2024-01-01". What does it do, and why use it in this lab?',
              options: [
                'It validates syntax only, without running any task',
                'It executes the whole DAG for that date in-process — running tasks in order — without needing the full scheduler + web server stack',
                'It schedules the DAG to run every day at midnight',
                'It deploys the DAG to a production cluster',
              ],
              answer: 1,
              explain:
                'dags test runs the DAG end-to-end for one logical date in a single process, so you see extract → transform → load execute and print — no metadata-DB-backed scheduler, workers, or web server to stand up. It keeps local runs light.',
            },
            {
              q: 'A pipeline is a clean chain of data tables and the team cares most about lineage and knowing which tables are stale. Which orchestrator best fits — and why is that not automatic?',
              options: [
                'Always Airflow, because it is the most popular',
                'Dagster’s asset model fits the data-aware needs, but Airflow’s ubiquity, ecosystem, and hiring pool are real reasons a team may still pick it',
                'Plain cron, because orchestrators are overkill for any pipeline',
                'It makes no difference; the tools are identical',
              ],
              answer: 1,
              explain:
                'Asset-centric Dagster answers "what is stale?" natively, which suits this workload. But choosing a tool weighs maturity, ecosystem, and staffing too — which is exactly why Airflow remains the common default even when a data-aware model would fit the problem better.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain the difference between task-centric and asset-centric orchestration, with an example.',
            a: (
              <p>
                Task-centric (Airflow) declares <em>steps</em>: a DAG of tasks like <code>extract</code>,{' '}
                <code>transform</code>, <code>load</code>, wired by dependencies you state, where the scheduler tracks
                success of steps and is blind to the data they move. Asset-centric (Dagster) declares the <em>data
                artifacts</em> that should exist — <code>raw_trips</code>, <code>stg_trips</code>, <code>revenue</code> —
                and infers the graph from which asset feeds which, so lineage and freshness are first-class. Same
                pipeline, different primary abstraction: verbs versus nouns. The practical upshot is that &quot;which
                downstream tables are stale?&quot; is native in Dagster and a bolt-on in Airflow, while &quot;run
                arbitrary operational steps across many systems&quot; is Airflow&apos;s strength because a task need not
                produce any data at all.
              </p>
            ),
          },
          {
            q: 'What is an XCom, and what is the classic mistake engineers make with it?',
            a: (
              <p>
                An XCom (&quot;cross-communication&quot;) is Airflow&apos;s mechanism for passing a small value from one
                task to another — the TaskFlow API moves task return values through it automatically. Because XComs are
                serialized into the metadata database by default, the classic mistake is pushing large objects through
                them (a full DataFrame, a big file), which bloats and slows the DB. The correct pattern is to write the
                data to storage — Parquet in the lake, a warehouse table — and pass only a small reference (a path or
                id) via XCom. Production deployments can swap in a custom XCom backend that spills to object storage,
                but the discipline is the engineer&apos;s to enforce.
              </p>
            ),
          },
          {
            q: 'Why is Airflow still the industry default, and when would you choose Dagster instead?',
            a: (
              <p>
                Airflow&apos;s defaults are maturity and ubiquity: a decade of production hardening, hundreds of
                operators, managed offerings on every cloud (MWAA, Composer, Astronomer), and the largest hiring pool,
                so it is the low-risk institutional choice. You reach for Dagster when the workload is fundamentally a
                graph of data assets and the team values native lineage, asset freshness, typed IO, and lighter local
                development over ecosystem size. Neither is strictly more powerful — any asset graph can be expressed as
                a task graph — so the decision is really about which questions your platform asks most often
                (&quot;did the steps run?&quot; versus &quot;is the data fresh?&quot;) and how much you weigh ubiquity
                against data-awareness.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>
            Airflow is <strong>task-centric</strong> — a DAG of steps (verbs) wired by dependencies you declare —
            whereas Dagster is <strong>asset-centric</strong> — a graph of data artifacts (nouns) inferred from your
            code. Same pipeline, opposite primary abstraction.
          </>,
          <>
            The core objects: a <strong>DAG</strong> (the pipeline definition), <strong>operators/tasks</strong> (the
            steps), the <strong>scheduler</strong> (decides what runs), the <strong>executor</strong> (runs it), and{' '}
            <strong>task instances</strong> (one task on one date, with its own state).
          </>,
          <>
            The <strong>TaskFlow API</strong> (<code>@dag</code>/<code>@task</code>) lets you write plain functions and
            wire dependencies by calling them; it is sugar over the classic <code>PythonOperator</code> + <code>{'>>'}</code>{' '}
            style and passes return values forward as XComs automatically.
          </>,
          <>
            <strong>XComs</strong> carry only small values through the metadata DB — pass a row count or a path, never a
            large dataset; write big data to storage and pass the reference.
          </>,
          <>
            Airflow is data-blind: no native lineage, freshness, or typed hand-offs, and a heavier local/ops footprint —
            the price of a huge, mature ecosystem and being the industry default you will meet everywhere.
          </>,
          <>
            Pick the lightest tool that fits: plain cron for a handful of independent jobs, Dagster when lineage and
            freshness of data assets dominate, Airflow when ubiquity, ecosystem, and arbitrary cross-system steps matter
            most.
          </>,
        ]}
      />
    </>
  )
}
