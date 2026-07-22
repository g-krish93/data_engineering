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

const ID = '1.6.4'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="A pipeline you must remember to run is a hobby">
        <Tiered
          layman={
            <>
              <p>
                An alarm clock that starts the dishwasher every night at 2am is genuinely useful — until the morning you
                find it ran with the door open, or didn&apos;t run because the power blinked, and nobody noticed for a
                week. The alarm clock&apos;s whole skill is <em>starting things on time</em>. It cannot check that the
                job finished, retry a failure, or refuse to start a second wash while the first is mid-cycle.
              </p>
              <p>
                A kitchen manager can do all of that — but you don&apos;t hire a manager to run one dishwasher. This
                lesson teaches you the alarm clocks (cron on Linux, Task Scheduler on Windows), exactly what they can
                and cannot do, and when the manager (an orchestrator, Phase 3) earns their salary.
              </p>
            </>
          }
          student={
            <>
              <p>
                Everything module 1.6 built converges here. Your realpy CLI (1.6.3) is a well-behaved tool: configurable
                without edits (1.6.2), operable from a shell (1.6.1), honest about success via exit codes. The last step
                from hobby to infrastructure: it runs on a clock, not on your memory. A{' '}
                <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> that only runs when someone remembers is just a
                script with ambitions.
              </p>
              <p>
                Two skills follow. Reading and writing cron expressions — the five-field scheduling language every
                scheduler, CI system, and <GlossaryTerm k="orchestrator">orchestrator</GlossaryTerm> borrowed — and
                driving Windows Task Scheduler from the command line with <code>schtasks</code>, including the three
                pitfalls (working directory, PATH, invisible output) that break nearly everyone&apos;s first scheduled
                job.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Scheduling is the degenerate case of workflow orchestration: a single node, a time trigger, no
                dependency edges, no state. That framing tells you exactly when cron stops sufficing — the moment you
                have two jobs where one must follow the other&apos;s <em>success</em>, you have a DAG and a scheduler
                has no vocabulary for it. Cron&apos;s model is purely time-driven polling: the daemon wakes each minute
                and fires whatever matches, which sets its resolution (one minute) and its failure semantics — a trigger
                that passes while the machine sleeps simply never happened (anacron and Task Scheduler&apos;s catch-up
                flag exist precisely to patch this).
              </p>
              <p>
                The deep prerequisite is <GlossaryTerm k="idempotency">idempotency</GlossaryTerm>. Schedulers
                double-fire (DST transitions, manual runs beside scheduled ones) and miss runs; retries and catch-ups
                re-execute work. Only jobs whose re-run changes nothing are safe to schedule aggressively — which is why
                P1 makes idempotency a non-negotiable requirement (NFR-1) before the pipeline ever meets a scheduler.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Cron expressions: five fields that run the world">
        <Tiered
          layman={
            <>
              <p>
                A cron expression is an appointment written in the world&apos;s tersest calendar notation: five slots
                meaning <em>minute, hour, day-of-month, month, day-of-week</em>. A star in a slot means
                &quot;every&quot;. So <code>0 3 * * *</code> reads: minute 0, hour 3, every day — 3:00am daily.
              </p>
              <p>
                It looks like line noise for about an hour, and then you can read it forever. It&apos;s worth the hour:
                this exact notation appears in Linux cron, GitHub Actions, Airflow, Dagster, and every cloud scheduler
                you will ever configure.
              </p>
            </>
          }
          student={
            <>
              <p>
                The five fields, in order: <code>minute hour day-of-month month day-of-week</code> (weekday 0 or 7 =
                Sunday). Three operators do most of the work: <code>*</code> every, <code>*/n</code> every n-th,{' '}
                <code>a-b</code> range, <code>a,b</code> list. Run the explainer, then feed it your own expressions —
                try <code>0 0 1 * *</code> or break it on purpose:
              </p>
              <CodeRunner
                language="python"
                code={'FIELDS = ["minute", "hour", "day-of-month", "month", "day-of-week"]\nDOW = {0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",\n       4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday"}\n\ndef explain_field(value, name):\n    if value == "*":\n        return "every " + name\n    if value.startswith("*/"):\n        return "every " + value[2:] + " " + name + "(s)"\n    if "-" in value:\n        lo, hi = value.split("-")\n        if name == "day-of-week":\n            return DOW[int(lo)] + " through " + DOW[int(hi)]\n        return name + " " + lo + " through " + hi\n    if "," in value:\n        return name + " in [" + value + "]"\n    if name == "day-of-week":\n        return "only " + DOW[int(value)]\n    return name + " = " + value\n\ndef explain(expr):\n    parts = expr.split()\n    if len(parts) != 5:\n        return "not a 5-field cron expression"\n    return " | ".join(explain_field(v, n) for v, n in zip(parts, FIELDS))\n\nfor expr in ["*/15 2 * * 1-5", "0 3 * * 0", "30 6 1 * *", "0 */4 * * *"]:\n    print(expr.ljust(15), "->", explain(expr))'}
              />
              <p>
                Note the classic misreading in the first example: <code>*/15 2 * * 1-5</code> is <em>not</em>{' '}
                &quot;every 15 minutes on weekdays&quot;. The hour field pins it: fires at 02:00, 02:15, 02:30, 02:45,
                Monday through Friday — four times a day. Fields combine with AND (day-of-month and day-of-week being
                the historical exception: when both are restricted, classic cron ORs them).
              </p>
            </>
          }
          phd={
            <>
              <p>
                Why has a notation from 1975 outlived its host system? It hits a local optimum: dense enough to live in
                a single config column, expressive enough for the overwhelming majority of periodic needs, simple
                enough to evaluate with modular arithmetic each minute. Its blind spots are equally instructive — no
                &quot;last weekday of month&quot; without extensions, no timezone awareness in classic cron (a 02:30
                job runs twice or never on DST nights), no &quot;run once when I say so&quot;. Systems that outgrow it
                don&apos;t replace the notation; they embed it (Airflow schedules, Kubernetes CronJob) and add the
                missing semantics — catch-up, timezones, jitter — around it.
              </p>
              <p>
                Operational habit worth stealing: schedule fleets with jitter. A thousand jobs at{' '}
                <code>0 0 * * *</code> is a nightly stampede — a thundering herd against your own database and
                everyone&apos;s API. Spreading start times (or hashing job names into the minute field) is the cheap
                fix, and managed schedulers increasingly do it for you.
              </p>
            </>
          }
        />
        <p>Practice — translate these before revealing (write your answers down first):</p>
        <ul>
          <li><code>0 3 * * 0</code></li>
          <li><code>*/10 * * * *</code></li>
          <li><code>0 9-17 * * 1-5</code></li>
          <li>Write the expression: daily at 02:30</li>
          <li>Write the expression: Mondays at 07:00</li>
        </ul>
        <RevealSolution label="Reveal answers">
          <ul>
            <li><code>0 3 * * 0</code> — 03:00 every Sunday.</li>
            <li><code>*/10 * * * *</code> — every 10 minutes, all day, every day.</li>
            <li><code>0 9-17 * * 1-5</code> — on the hour, 09:00 through 17:00, Monday to Friday.</li>
            <li>Daily at 02:30 — <code>30 2 * * *</code> (minute first — the most common transposition bug).</li>
            <li>Mondays at 07:00 — <code>0 7 * * 1</code>.</li>
          </ul>
        </RevealSolution>
      </Section>

      <Section kicker="core concepts" title="Windows Task Scheduler: schtasks and the three classic pitfalls">
        <Tiered
          layman={
            <>
              <p>
                Windows&apos; alarm clock is Task Scheduler. You can click through its GUI, but we drive it with a
                command — <code>schtasks</code> — for the usual reason: commands can be saved, reviewed, and repeated
                exactly.
              </p>
              <p>
                The surprise for newcomers: a scheduled job runs in a bare little world with nobody watching. It
                doesn&apos;t start in your project folder, it may not know your shortcuts, and anything it prints goes
                nowhere — no terminal window is attached. All three surprises have one-line fixes you&apos;re about to
                learn once and reuse forever.
              </p>
            </>
          }
          student={
            <>
              <p>The core commands:</p>
              <CodeBlock
                label="powershell"
                code={'# create: run realpy status every 5 minutes\nschtasks /create /tn de-realpy-status /sc minute /mo 5 /tr "cmd /c cd /d C:\\de-lab\\realpy && uv run realpy status >> C:\\de-lab\\realpy\\task.log 2>&1"\n\nschtasks /query /tn de-realpy-status /v /fo list   # inspect it\nschtasks /run /tn de-realpy-status                 # trigger now, without waiting\nschtasks /delete /tn de-realpy-status /f           # remove it'}
              />
              <p>That one <code>/tr</code> string dodges all three pitfalls:</p>
              <ul>
                <li>
                  <strong>Working directory:</strong> tasks start in <code>C:\Windows\System32</code>, so relative paths
                  (realpy&apos;s <code>data</code> dir, <code>config.toml</code>) resolve wrong.{' '}
                  <code>cd /d C:\de-lab\realpy &amp;&amp;</code> moves home first.
                </li>
                <li>
                  <strong>No terminal:</strong> stdout and stderr of a scheduled task go nowhere.{' '}
                  <code>&gt;&gt; task.log 2&gt;&amp;1</code> appends both streams to a log — the 1.6.1 redirection
                  operators, now load-bearing. No log line, no evidence the run ever happened.
                </li>
                <li>
                  <strong>PATH:</strong> the task&apos;s environment is not your interactive shell&apos;s. If the log
                  says <code>&apos;uv&apos; is not recognized</code>, replace <code>uv</code> with its full path —{' '}
                  <code>(Get-Command uv).Source</code> tells you what that is.
                </li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                Task Scheduler is trigger-driven rather than polling like cron, which buys sub-minute precision and
                event triggers (logon, idle, event-log entries) — closer to &quot;run on file arrival&quot; than cron
                can get. Its missed-run semantics are explicit but off by default: &quot;run as soon as possible after
                a missed start&quot; is the anacron-style catch-up, and it lives in the task&apos;s XML definition —
                exportable and versionable, worth knowing the GUI produces an artifact you <em>can</em> check into git.
              </p>
              <p>
                Concurrency is the other differentiator: Task Scheduler&apos;s default multiple-instance policy is
                &quot;ignore new&quot; — a 9:00 run still going at 9:05 means the 9:05 trigger is skipped. Classic cron
                has no such guard: both runs execute concurrently, and protecting shared state is your job (lock files,{' '}
                <code>flock</code>, a database advisory lock). Either way the lesson is identical: overlap and
                double-fire are normal scheduler behavior, not edge cases — which is why idempotent, lockable jobs are
                the only kind worth scheduling.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="What schedulers do NOT give you">
          No retries (failed at 9:00? see you at 9:05, context lost). No dependencies (&quot;run transform only if
          ingest succeeded&quot; is unexpressible). No backfills (&quot;re-run last week&quot; means a manual loop). No
          alerting (jobs fail silently into their logs). Those four are precisely what an{' '}
          <GlossaryTerm k="orchestrator">orchestrator</GlossaryTerm> adds — Dagster, in Phase 3. Until then: cron-style
          scheduling plus idempotent jobs is a respectable floor, and it&apos;s what you ship this week.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Scheduler vs orchestrator vs run-on-arrival">
        <Tradeoffs
          options={[
            {
              name: 'OS scheduler (cron / Task Scheduler)',
              strengths: [
                'Already installed, zero infrastructure, understood everywhere',
                'Perfectly adequate for a few independent, idempotent jobs; cron notation transfers to every tool',
              ],
              weaknesses: [
                'No retries, dependencies, backfills, or alerting — failures are silent',
                'State lives on one machine; the laptop lid is a single point of failure',
              ],
              chooseWhen: 'a handful of independent jobs, tolerant of missed runs, logs checked by humans.',
            },
            {
              name: 'Orchestrator (Dagster, Airflow — Phase 3)',
              strengths: [
                'Dependency graphs, retries with backoff, backfills, alerting, run history UI',
                'Schedules are code: versioned, tested, reviewed',
              ],
              weaknesses: [
                'Real infrastructure to run and upgrade — heavy for one small job',
                'A learning curve that only pays off at multi-job scale',
              ],
              chooseWhen: 'jobs depend on each other, failures must page someone, backfills are routine.',
            },
            {
              name: 'Event-driven (run on file arrival)',
              strengths: [
                'Zero lag and zero wasted polls — work starts when data exists',
                'The natural shape for irregular arrivals (uploads, webhooks)',
              ],
              weaknesses: [
                'Needs an event source (object-store notifications, queues) — more moving parts',
                'Harder to reason about ordering, duplicates, and storms of events',
              ],
              chooseWhen: 'data arrives unpredictably and freshness matters more than simplicity (Phase 5 territory).',
            },
          ]}
          note={
            <>
              These compose rather than compete: orchestrators run cron expressions internally, and event-driven
              systems still want an orchestrator downstream. The honest default for one tested, idempotent CLI on one
              Windows machine — exactly what you have — is the OS scheduler.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: put realpy on a clock, watch it run alone, then clean up">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Schedule <code>realpy status</code> (from lesson 1.6.3) every 5 minutes, catch two runs landing in a log{' '}
              <em>without your involvement</em>, then delete the task. Deleting is not optional — orphaned scheduled
              tasks are litter, and cleanup discipline is part of operating anything.
            </p>
          }
          steps={[
            {
              title: 'Preflight: the command must work before you schedule it',
              body: <p>Never schedule a command you haven&apos;t just run by hand. Confirm realpy works and note uv&apos;s full path in case the task environment needs it:</p>,
              commands: [
                { ps: 'Set-Location C:\\de-lab\\realpy\nuv run realpy status\n$LASTEXITCODE\n(Get-Command uv).Source' },
              ],
              checkpoint: (
                <>A status line prints, <code>$LASTEXITCODE</code> is <code>0</code>, and you know uv&apos;s full path (something like <code>C:\Users\you\.local\bin\uv.exe</code>).</>
              ),
            },
            {
              title: 'Create the task',
              body: <p>One line: every 5 minutes, hop to the project directory, run status, append both output streams to <code>task.log</code>:</p>,
              commands: [
                {
                  ps: 'schtasks /create /tn de-realpy-status /sc minute /mo 5 /tr "cmd /c cd /d C:\\de-lab\\realpy && uv run realpy status >> C:\\de-lab\\realpy\\task.log 2>&1"',
                },
              ],
              checkpoint: (
                <><code>SUCCESS: The scheduled task &quot;de-realpy-status&quot; has successfully been created.</code> If Windows prompts about credentials, accept — it runs as your user.</>
              ),
            },
            {
              title: 'Inspect it like an operator',
              commands: [{ ps: 'schtasks /query /tn de-realpy-status /v /fo list' }],
              checkpoint: (
                <>The listing shows Status <code>Ready</code>, a concrete <code>Next Run Time</code> within 5 minutes, and your full command under &quot;Task To Run&quot;. Reading this listing is how you will debug every future scheduled job.</>
              ),
            },
            {
              title: 'Force the first run — do not wait for the clock',
              commands: [
                { ps: 'schtasks /run /tn de-realpy-status\nStart-Sleep -Seconds 10\nGet-Content C:\\de-lab\\realpy\\task.log -Tail 3' },
              ],
              checkpoint: (
                <>One timestamped status line is in <code>task.log</code>. If instead you see <code>&apos;uv&apos; is not recognized</code>: delete the task (step 6&apos;s command) and recreate it with uv&apos;s full path from step 1 — you just met the PATH pitfall in the wild.</>
              ),
            },
            {
              title: 'Let it run without you',
              body: <p>Walk away. Make tea. After 5+ minutes, read the log — and resist the urge to run anything meanwhile; the point is that <em>nothing you do</em> causes the next line:</p>,
              commands: [{ ps: 'Get-Content C:\\de-lab\\realpy\\task.log' }],
              checkpoint: (
                <>At least two lines with <strong>two distinct timestamps</strong> — one from your forced run, one the machine did alone. That second timestamp is the entire point of this lesson: the pipeline no longer needs you.</>
              ),
            },
            {
              title: 'Tear it down and prove it is gone',
              commands: [
                { ps: 'schtasks /delete /tn de-realpy-status /f\nschtasks /query /tn de-realpy-status' },
              ],
              checkpoint: (
                <>Delete reports SUCCESS, and the query now errors (<code>ERROR: The system cannot find the file specified.</code>) — the task is gone. <code>task.log</code> remains as the run&apos;s historical record; keep or delete it as you like.</>
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
              q: 'How often does */15 2 * * 1-5 fire?',
              options: [
                'Every 15 minutes, all day, on weekdays',
                'At 02:00, 02:15, 02:30, and 02:45, Monday through Friday',
                'Every 2 hours and 15 minutes on weekdays',
                'Once at 02:15 on weekdays',
              ],
              answer: 1,
              explain:
                'Fields combine with AND: minute matches every 15th minute, but the hour field restricts firing to hour 2. The "every 15 minutes all day" reading is the classic misparse this lesson warned about.',
            },
            {
              q: 'Your scheduled task logs "config.toml not found" although the file exists in your project. Most likely cause?',
              options: [
                'Task Scheduler cannot read TOML files',
                'The task runs in C:\\Windows\\System32, so the relative path resolves there — you forgot the cd /d step',
                'The file is corrupted',
                'schtasks requires absolute task names',
              ],
              answer: 1,
              explain:
                'Scheduled tasks do not start in your project directory. Relative paths in your code silently resolve against System32. The fix is baked into the /tr string: cd /d into the project first.',
            },
            {
              q: 'Which of these does a plain scheduler (cron or Task Scheduler) actually provide?',
              options: [
                'Retrying a failed run with backoff',
                'Running job B only if job A succeeded',
                'Starting a command at times matching a schedule',
                'Alerting a human when a job fails',
              ],
              answer: 2,
              explain:
                'Time-based triggering is the whole feature set. Retries, dependencies, backfills, and alerting are exactly the gap orchestrators like Dagster fill in Phase 3 — knowing the boundary is the interview answer.',
            },
            {
              q: 'The 9:00 run of a job is still going at 9:05 when the next trigger fires. What happens?',
              options: [
                'Both systems always run the second instance in parallel',
                'Task Scheduler by default skips the new instance; classic cron starts it concurrently — locking is your job',
                'Both systems always queue the second run until the first finishes',
                'The operating system kills the first run to make room',
              ],
              answer: 1,
              explain:
                'The two tools chose different defaults, and neither is "safe" — a skipped run is missing data, an overlapped run is a race. Idempotent jobs plus explicit locking are what make either default survivable.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'A nightly cron job silently failed for two weeks. How do you make sure that never happens again?',
            a: (
              <p>
                Layer the defenses: the job must return honest exit codes and log to a known file (this module); wrap it
                so non-zero exits trigger a notification, or use a dead-man&apos;s-switch service that alerts when a
                heartbeat <em>stops</em> arriving — catching both failures and never-ran. The structural answer is an
                orchestrator where runs are recorded, retried, and alerting is built in. Interviewers want to hear
                &quot;silent failure is a design smell, not bad luck&quot;.
              </p>
            ),
          },
          {
            q: 'When would you move from cron to an orchestrator like Dagster or Airflow?',
            a: (
              <p>
                At the first dependency, the first needed backfill, or the first failure that should have paged someone —
                whichever comes first. Cron is fine for independent, idempotent, loss-tolerant jobs. The moment jobs form
                a graph, or missed runs must be reconciled, you are hand-rolling an orchestrator badly. Bonus points for
                noting orchestrators still speak cron syntax for their schedules — the notation survives the upgrade.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Unscheduled pipelines are hobbies. Cron and Task Scheduler are the minimum bar: a clock that starts your CLI without you.</>,
          <>Cron notation — <code>minute hour dom month dow</code> — is universal; read <code>*/15 2 * * 1-5</code> carefully (hour pinned, weekdays only) and you can read them all.</>,
          <>
            The three scheduled-job pitfalls: wrong working directory (<code>cd /d</code> first), missing PATH (use full
            paths), invisible output (<code>&gt;&gt; log 2&gt;&amp;1</code> — no log, no evidence).
          </>,
          <>Schedulers only start things. Retries, dependencies, backfills, and alerting are the orchestrator&apos;s job — Dagster arrives in Phase 3 with exactly that pitch.</>,
          <>Overlap and double-fire are normal: Task Scheduler skips by default, cron overlaps. Idempotency is what makes scheduled re-execution safe — P1&apos;s NFR-1 exists for this reason.</>,
          <>
            Phase 1 complete — your next stop is portfolio project P1 (<code>de-portfolio/p1-pipeline-zero</code>):
            everything this phase taught, assembled into one shippable tool.
          </>,
        ]}
      />
    </>
  )
}
