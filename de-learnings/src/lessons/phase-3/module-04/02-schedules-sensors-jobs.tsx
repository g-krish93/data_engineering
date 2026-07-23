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
import { WatermarkTimeline } from '../../../viz/WatermarkTimeline'
import type { TimedEvent } from '../../../viz/WatermarkTimeline'

const ID = '3.4.2'

const EVENTS: TimedEvent[] = [
  { t: 0.12, label: 'tick' },
  { t: 0.32, label: 'tick' },
  { t: 0.52, label: 'tick' },
  { t: 0.72, label: 'tick' },
  { t: 0.92, label: 'tick' },
  { t: 0.24, late: true, label: 'file!' },
  { t: 0.63, late: true, label: 'file!' },
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Materializing by hand does not scale">
        <p>
          In 3.4.1 you clicked <b>Materialize</b> yourself. That is fine for learning and never fine in production — nobody
          is at the keyboard at 3 a.m. when the upstream extract lands. A pipeline has to run <em>on its own</em>, and there
          are exactly two reasons to kick one off: the clock says it is time, or something happened. Dagster gives you one
          mechanism for each — a <GlossaryTerm k="schedule">schedule</GlossaryTerm> for the clock, a{' '}
          <GlossaryTerm k="sensor">sensor</GlossaryTerm> for the event — and both start a <GlossaryTerm k="dagster-job">job</GlossaryTerm>,
          which is just the named selection of assets to run.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Think about how a household runs. Some chores happen on a timer: bins go out every Tuesday whether or not
                they are full. Other chores happen in reaction to something: the doorbell rings, so you answer it. You would
                not stand at the door all night waiting — you wait for the bell. Two triggers: the calendar, and the event.
              </p>
              <p>
                Pipelines are the same. &quot;Rebuild the sales report every morning at six&quot; is the calendar kind — a
                schedule. &quot;A new data file just landed in the folder, process it now&quot; is the doorbell kind — a
                sensor. And a &quot;job&quot; is simply the chore itself: the specific set of things you want done when the
                trigger fires.
              </p>
            </>
          }
          student={
            <>
              <p>
                A <em>job</em> is a named, runnable selection: &quot;these assets&quot; (or these ops). You define it once,
                then attach triggers to it. A <em>schedule</em> fires the job on a <GlossaryTerm k="cron">cron</GlossaryTerm>{' '}
                cadence — time-driven, predictable, and blind to whether there is new data. A <em>sensor</em> fires the job
                when a condition it polls becomes true — event-driven, reactive, and dependent on there being a signal to
                watch (a new file, a row in a queue table, an upstream materialization).
              </p>
              <p>
                The distinction is <b>time vs event</b>, and it is the first design decision for any pipeline. Schedules are
                simple and always run; you may waste a run when nothing changed. Sensors run only when there is work; you need
                a source of truth to poll and a way to not fire twice for the same thing — which is what run keys handle.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Both schedules and sensors are evaluated by the Dagster <em>daemon</em>, a long-running process separate from
                the web server. On each tick the daemon invokes the schedule/sensor function, which returns zero or more{' '}
                <code>RunRequest</code> objects; the daemon submits a run per request. A schedule&apos;s tick cadence is its
                cron expression evaluated against a timezone; a sensor&apos;s cadence is a minimum interval between
                evaluations (default ~30s). The function is the decision, the daemon is the loop.
              </p>
              <p>
                Idempotency of triggering is the subtle part. Each <code>RunRequest</code> may carry a{' '}
                <GlossaryTerm k="run-key">run key</GlossaryTerm> — a string the daemon dedupes on: if a run for that key
                already exists, it is not launched again. Sensors additionally keep a <em>cursor</em> (opaque persisted
                state) so successive evaluations resume where they left off instead of rescanning from zero. Schedules layer
                on catch-up/misfire semantics — if the daemon was down across several cron ticks, whether it backfills the
                missed ticks or skips to now is a policy choice, not an accident. All of this is the orchestration-level
                cousin of the <GlossaryTerm k="idempotency">idempotency</GlossaryTerm> you enforced at the data layer in 3.2.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="A job is the thing a trigger runs">
        <p>
          Before you can schedule anything, you need a job to schedule. In the asset world a job is a <em>selection</em> of
          assets. <code>&quot;*&quot;</code> means &quot;all of them&quot;; you can also select a subset by name.
        </p>
        <CodeBlock
          label="defs.py — define a job over the 3.4.1 assets"
          code={`import dagster as dg

# ... raw_trips, stg_trips, revenue_by_zone from lesson 3.4.1 above ...

# A job = a named selection of assets to run together.
daily_job = dg.define_asset_job(name="daily_job", selection="*")`}
        />
        <Tiered
          layman={
            <>
              <p>
                The job is the chore, written down and given a name so you can point at it. &quot;Do the whole morning
                routine&quot; is one named chore; &quot;just take out the bins&quot; is a smaller one. Naming it means both
                the calendar-timer and the doorbell can say &quot;when you fire, do <em>that</em> chore.&quot;
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>define_asset_job</code> bundles a selection into a runnable unit. Triggers do not run assets directly —
                they run jobs, and the job decides which assets. Selecting <code>&quot;*&quot;</code> runs the full graph;
                selecting <code>&quot;stg_trips*&quot;</code> would run <code>stg_trips</code> and everything downstream of it.
                One project usually has several jobs — an hourly one over cheap assets, a daily one over the whole graph.
              </p>
            </>
          }
          phd={
            <>
              <p>
                An asset job is materialized into an underlying op job over the selected subgraph, resolved at definition
                time against the global asset graph. The selection syntax (<code>AssetSelection</code>) supports set algebra —
                downstream/upstream closures, key prefixes, groups — so a job can be &quot;this asset and its transitive
                downstreams&quot; without enumerating them. Because the job is a view over the graph rather than a copy, it
                stays consistent as the graph evolves: add a downstream asset and a <code>&quot;stg_trips*&quot;</code> job
                includes it automatically on next load.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Schedule = the clock. Sensor = the event.">
        <p>
          Two triggers, same job. The schedule fires on cron; the sensor watches a folder and fires when a new file appears.
          The animation below is wall-clock time sweeping left to right: the evenly spaced{' '}
          <span style={{ color: '#34d399' }}>ticks</span> are the schedule firing on the clock; the off-beat{' '}
          <span style={{ color: '#f43f5e' }}>file!</span> marks are the sensor firing whenever a file happens to land —
          irregular, driven by the event, not the calendar.
        </p>
        <WatermarkTimeline
          events={EVENTS}
          caption={
            <>
              The sweeping line is <b>now</b> advancing. Evenly spaced{' '}
              <span style={{ color: '#34d399' }}>ticks</span> = a <b>schedule</b> firing on a fixed cron cadence, regardless
              of whether new data exists. Irregular <span style={{ color: '#f43f5e' }}>file!</span> marks = a <b>sensor</b>{' '}
              firing when a condition (a file landed) becomes true — event-driven, whenever the event occurs. Same job, two
              ways to decide <em>when</em>.
            </>
          }
        />
        <CodeBlock
          label="defs.py — a schedule and a sensor for daily_job"
          code={`import os
import dagster as dg

# TIME-DRIVEN: run daily_job every day at 06:00.
daily_schedule = dg.ScheduleDefinition(
    name="daily_schedule",
    job=daily_job,
    cron_schedule="0 6 * * *",   # min hour dom mon dow
)

# EVENT-DRIVEN: run daily_job whenever a new file appears in ./dropbox.
@dg.sensor(job=daily_job, minimum_interval_seconds=15)
def new_file_sensor(context: dg.SensorEvaluationContext):
    drop_dir = "dropbox"
    os.makedirs(drop_dir, exist_ok=True)
    for name in sorted(os.listdir(drop_dir)):
        path = os.path.join(drop_dir, name)
        # run_key makes triggering idempotent: same key -> never launched twice.
        run_key = name + ":" + str(int(os.path.getmtime(path)))
        yield dg.RunRequest(run_key=run_key)

defs = dg.Definitions(
    assets=[raw_trips, stg_trips, revenue_by_zone],
    jobs=[daily_job],
    schedules=[daily_schedule],
    sensors=[new_file_sensor],
)`}
        />
        <Tiered
          layman={
            <>
              <p>
                The cron string <code>0 6 * * *</code> is just &quot;at minute 0 of hour 6, every day&quot; — the calendar
                timer for the bins. The sensor is the doorbell: it peeks in the folder every few seconds, and if there is a
                file it has not already handled, it runs the chore.
              </p>
              <p>
                The tricky bit of a doorbell is not ringing twice for one visitor. The <code>run_key</code> is how the sensor
                remembers &quot;I already answered this one&quot; — same key, no second run. Without it, every peek at a
                folder that still has yesterday&apos;s file would fire the job again and again.
              </p>
            </>
          }
          student={
            <>
              <p>
                A <code>ScheduleDefinition</code> needs a job and a cron expression — the same five-field syntax from
                everywhere else in Unix. A sensor is a function decorated <code>@sensor</code> that Dagster&apos;s daemon
                calls on an interval; it inspects some external state and <code>yield</code>s a <code>RunRequest</code> for
                each unit of work it finds. Here it lists <code>./dropbox</code> and requests a run per file.
              </p>
              <p>
                The <code>run_key</code> is the whole game for a sensor. It is a string Dagster dedupes on: if a run with that
                key already exists, the request is ignored. Building the key from the filename plus its modification time
                means the same unchanged file never triggers twice, but a <em>new</em> file (or a changed one) does. Get the
                run key wrong and you either reprocess endlessly or miss updates.
              </p>
            </>
          }
          phd={
            <>
              <p>
                This folder-polling sensor is the naive form: it rescans the whole directory every evaluation. Production
                sensors use the <em>cursor</em> — <code>context.cursor</code> / <code>context.update_cursor(...)</code> — to
                persist a high-water mark (a max modification time, a last-seen offset, a Kafka position) so each evaluation
                processes only what is new, in O(new) rather than O(total). The run key handles at-most-once <em>launching</em>;
                the cursor handles efficient <em>discovery</em>. They are independent and you generally want both.
              </p>
              <p>
                Dagster also ships higher-level machinery over these primitives: asset sensors (fire when another asset
                materializes), multi-asset sensors, and freshness-based auto-materialization, where instead of writing a cron
                you attach a <GlossaryTerm k="freshness-policy">freshness policy</GlossaryTerm> to an asset and Dagster derives
                when to run to keep it fresh. That is the asset model&apos;s endgame: declare the freshness you want, not the
                schedule that might achieve it. Schedules and sensors remain the explicit, debuggable floor beneath it.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="Two states to remember">
          A schedule or sensor you define is <b>off</b> until you toggle it on (in the UI or via code), and it is the
          Dagster <b>daemon</b> — not the web server — that actually evaluates it. <code>dagster dev</code> runs both for you
          locally; in production they are separate processes, and a stopped daemon means nothing fires no matter how many
          schedules you defined.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Schedule, sensor, or manual?">
        <p>
          For any pipeline, &quot;how does it start?&quot; has three honest answers, and the right one depends on whether new
          data arrives on a predictable clock or at unpredictable moments — and on whether you even have a signal to watch.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Schedule (time-driven)',
              strengths: [
                'Dead simple and predictable — you always know when it runs, and it always runs',
                'No signal source required; just a cron expression',
                'Easy to reason about, alert on, and backfill by date',
              ],
              weaknesses: [
                'Runs even when there is no new data — wasted compute and noisy runs',
                'Runs late if data arrives after the tick, or on incomplete data if it arrives during the run',
              ],
              chooseWhen: 'data lands on a predictable cadence (a nightly dump, an hourly export) and a fixed clock is close enough.',
            },
            {
              name: 'Sensor (event-driven)',
              strengths: [
                'Runs only when there is real work — no empty runs, low latency to new data',
                'Reacts to reality: a file landing, an upstream asset materializing, a queue row appearing',
              ],
              weaknesses: [
                'Needs a signal source to poll and correct run keys, or it double-fires or misses events',
                'More moving parts to reason about; a broken cursor silently stops or floods runs',
              ],
              chooseWhen: 'data arrives irregularly and you want to process it promptly without polling on a clock.',
            },
            {
              name: 'Manual (on-demand)',
              strengths: [
                'Full human control — perfect for backfills, ad-hoc reruns, and development',
                'Zero risk of an automated run firing at a bad moment',
              ],
              weaknesses: [
                'Does not scale and does not run when you are asleep',
                'Relies on a person remembering — the failure mode 3.4.1 opened with',
              ],
              chooseWhen: 'developing, one-off backfills, or a pipeline a human deliberately gates before each run.',
            },
          ]}
          note={
            <>
              These are not exclusive: many pipelines use a schedule as the reliable floor and a sensor for low-latency
              reaction, with manual runs always available for backfills. The real question is whether your trigger should be
              the clock or the event — answer that first, and the mechanism follows.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: turn on a schedule, then fire a sensor with a file">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Continue in the <code>C:\de-lab\dagster-lab</code> project from 3.4.1. You will add a job, a schedule, and a
              file-watching sensor to <code>defs.py</code>, enable them in the UI, and prove each one launches a run — the
              schedule on the clock, the sensor when you drop a file.
            </p>
          }
          steps={[
            {
              title: 'Add the job, schedule, and sensor',
              body: (
                <>
                  <p>
                    Append to <code>defs.py</code> (keep your three assets), and update the <code>Definitions</code> to
                    register the new objects:
                  </p>
                  <CodeBlock
                    label="defs.py — additions"
                    code={`import os

daily_job = dg.define_asset_job(name="daily_job", selection="*")

# Set the cron a couple of minutes ahead of the current time to watch it fire.
daily_schedule = dg.ScheduleDefinition(
    name="daily_schedule",
    job=daily_job,
    cron_schedule="*/2 * * * *",   # every 2 minutes, for the demo
)

@dg.sensor(job=daily_job, minimum_interval_seconds=15)
def new_file_sensor(context: dg.SensorEvaluationContext):
    drop_dir = "dropbox"
    os.makedirs(drop_dir, exist_ok=True)
    for name in sorted(os.listdir(drop_dir)):
        path = os.path.join(drop_dir, name)
        run_key = name + ":" + str(int(os.path.getmtime(path)))
        yield dg.RunRequest(run_key=run_key)

defs = dg.Definitions(
    assets=[raw_trips, stg_trips, revenue_by_zone],
    jobs=[daily_job],
    schedules=[daily_schedule],
    sensors=[new_file_sensor],
)`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  The file saves cleanly. Restart <code>uv run dagster dev -f defs.py</code>; in the UI, under{' '}
                  <b>Automation</b> (or Overview → Schedules / Sensors), <code>daily_schedule</code> and{' '}
                  <code>new_file_sensor</code> now both appear, each toggled <b>off</b>.
                </>
              ),
            },
            {
              title: 'Turn the schedule on and watch a tick fire',
              body: (
                <p>
                  Flip <code>daily_schedule</code> to <b>on</b>. With the <code>*/2 * * * *</code> cron it evaluates every two
                  minutes. Wait for the next even-minute boundary.
                </p>
              ),
              checkpoint: (
                <>
                  Within about two minutes a run appears under <b>Runs</b>, launched by <code>daily_schedule</code>, and all
                  three assets materialize green — with no click from you. Toggle the schedule back off afterward so it stops
                  firing every two minutes.
                </>
              ),
            },
            {
              title: 'Turn the sensor on and drop a file',
              body: (
                <>
                  <p>
                    Flip <code>new_file_sensor</code> to <b>on</b>. It now polls <code>./dropbox</code> every ~15 seconds. In
                    a second terminal, create the folder and drop a file into it:
                  </p>
                </>
              ),
              commands: [
                {
                  ps: 'cd C:\\de-lab\\dagster-lab\nNew-Item -ItemType Directory -Force dropbox | Out-Null\n"landed" | Out-File dropbox\\trips_2024_01_01.csv',
                  bash: 'cd ~/de-lab/dagster-lab && mkdir -p dropbox\necho landed > dropbox/trips_2024_01_01.csv',
                },
              ],
              checkpoint: (
                <>
                  Within ~15 seconds a new run appears under <b>Runs</b>, launched by <code>new_file_sensor</code> (the sensor
                  tick log shows a <code>RunRequest</code>). You triggered a pipeline by landing a file, not by clicking.
                </>
              ),
            },
            {
              title: 'Prove the run key prevents a duplicate',
              body: (
                <>
                  <p>
                    The file is still sitting in <code>dropbox</code>. The sensor polls again in a few seconds — does it fire
                    a second run for the same file?
                  </p>
                  <RevealSolution label="What happens on the next poll">
                    <p>
                      No new run launches. The <code>run_key</code> for that file (name + modification time) already has a run,
                      so Dagster dedupes the request. Now touch the file so its modification time changes (or drop a
                      differently named file) and a fresh run <em>does</em> fire — because the run key is new. That is
                      idempotent triggering: the same unit of work runs at most once.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                {
                  ps: '# force a new run_key by updating the file mtime:\n(Get-Item dropbox\\trips_2024_01_01.csv).LastWriteTime = Get-Date',
                  bash: 'touch dropbox/trips_2024_01_01.csv',
                },
              ],
              checkpoint: (
                <>
                  Before you touch it: repeated sensor ticks launch <b>no</b> new runs for the unchanged file. After you
                  update its modification time: one new run fires. The run key is doing exactly its job.
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
              q: 'What is a Dagster job, in the asset world?',
              options: [
                'A single Python function',
                'A named selection of assets (or ops) to run together — the thing a trigger actually launches',
                'A scheduled cron entry',
                'The database where results are stored',
              ],
              answer: 1,
              explain: 'A job bundles a selection (e.g. "*" for all assets) into a runnable unit. Schedules and sensors do not run assets directly — they run a job, which decides which assets.',
            },
            {
              q: 'What is the core difference between a schedule and a sensor?',
              options: [
                'A schedule is faster than a sensor',
                'A schedule is time-driven (fires on a cron cadence); a sensor is event-driven (fires when a polled condition becomes true)',
                'A sensor can only run once',
                'There is no difference — both fire on cron',
              ],
              answer: 1,
              explain: 'Time vs event is the whole distinction. A schedule fires on the clock regardless of new data; a sensor fires when something happens (a file lands, an asset materializes).',
            },
            {
              q: 'What does a run_key on a RunRequest do?',
              options: [
                'It names the asset that will be produced',
                'It makes triggering idempotent — Dagster will not launch a second run for a run_key that already has one',
                'It sets the cron cadence',
                'It encrypts the run',
              ],
              answer: 1,
              explain: 'The run key dedupes triggers. Build it from something that changes only when there is genuinely new work (e.g. filename + mtime), so the same unit of work never runs twice but new work does.',
            },
            {
              q: 'A cron of 0 6 * * * means the schedule fires:',
              options: [
                'Every 6 minutes',
                'At 06:00 every day (minute 0, hour 6, every day of month/month/day of week)',
                'Only on the 6th of each month',
                'Six times a day',
              ],
              answer: 1,
              explain: 'The five fields are minute, hour, day-of-month, month, day-of-week. 0 6 * * * = minute 0 of hour 6, every day — the same cron syntax used across Unix schedulers.',
            },
            {
              q: 'You define a schedule but no runs ever fire. The most likely operational cause is:',
              options: [
                'The cron expression is always invalid',
                'The schedule is toggled off, or the Dagster daemon (not the web server) is not running',
                'Assets cannot be scheduled',
                'Dagster deleted the schedule',
              ],
              answer: 1,
              explain: 'Schedules and sensors start OFF and are evaluated by the daemon, a process separate from the web UI. dagster dev runs both locally; in prod a stopped daemon means nothing fires.',
            },
            {
              q: 'Your data lands at unpredictable times and you want to process it promptly without empty runs. Best trigger?',
              options: [
                'A schedule every minute',
                'A sensor that watches for the arrival and fires only when there is new data',
                'Manual runs only',
                'No trigger — process it yearly',
              ],
              answer: 1,
              explain: 'Irregular arrival plus "run only when there is work" is the sensor case. A minute-cron schedule would fire constantly on empty data; a sensor reacts to the event with low latency.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'When would you use a schedule versus a sensor?',
            a: (
              <p>
                Use a schedule when data arrives on a predictable cadence and a fixed clock is good enough — a nightly dump,
                an hourly export. It is simple, predictable, and always runs, at the cost of firing even when there is nothing
                new. Use a sensor when data arrives irregularly and you want low latency without polling on a clock — a file
                landing, an upstream asset materializing, a queue row appearing. Sensors run only when there is real work, but
                they need a signal to poll and correct run keys so they do not double-fire or miss events. Many pipelines use
                both: a schedule as a reliable floor plus a sensor for prompt reaction.
              </p>
            ),
          },
          {
            q: 'How do you stop a sensor from processing the same file twice?',
            a: (
              <p>
                Give each <code>RunRequest</code> a <code>run_key</code> that is unique per unit of work and stable for
                unchanged work — for a file, the name plus its modification time or a content hash. Dagster refuses to launch
                a second run for a run key that already has one, so an unchanged file never reprocesses, but a new or changed
                file (new key) does. For efficiency at scale you also keep a sensor cursor — a persisted high-water mark — so
                each evaluation only scans what is new rather than the whole source. It is the orchestration-layer echo of the
                idempotency and watermark ideas from incremental loading.
              </p>
            ),
          },
          {
            q: 'What is the Dagster daemon and why does it matter?',
            a: (
              <p>
                The daemon is a long-running process, separate from the web server, that evaluates schedules and sensors and
                submits the resulting runs (it also handles run queuing and auto-materialization). It matters because a
                perfectly correct schedule fires nothing if the daemon is not running — a classic &quot;my schedule isn&apos;t
                working&quot; cause. Locally <code>dagster dev</code> starts both the UI and the daemon; in production they are
                deployed and monitored as distinct processes.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A job is a named selection of assets to run; triggers launch jobs, and the job decides which assets (<code>&quot;*&quot;</code> = all).</>,
          <>A schedule is time-driven: it fires a job on a cron cadence, predictably, whether or not there is new data.</>,
          <>A sensor is event-driven: it polls a condition (a file landing, an asset materializing) and fires a job when the condition becomes true.</>,
          <>A <code>run_key</code> makes triggering idempotent — Dagster will not launch a second run for a key that already has one; build it so it changes only when there is genuinely new work.</>,
          <>Schedules and sensors start off and are evaluated by the Dagster daemon (separate from the web server) — no daemon, no runs, no matter what you defined.</>,
          <>Time vs event is the first design question; schedule, sensor, and manual are not exclusive — many pipelines combine a scheduled floor with a reactive sensor.</>,
        ]}
      />
    </>
  )
}
