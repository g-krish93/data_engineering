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

const ID = '1.2.6'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="A ship's logbook, not shouting into the wind">
        <Tiered
          layman={
            <>
              <p>
                Every ship keeps a logbook: each watch writes the time, position, weather, and anything unusual.
                Weeks later, in a dispute or an inquiry, anyone can reconstruct exactly what happened on the night
                of the storm — because it was written down as it happened, with timestamps, by name.
              </p>
              <p>
                <code>print()</code> is shouting into the wind: heard only if someone happens to be standing there
                at that exact moment. Your pipelines run at 3am precisely when nobody is standing there. Logging is
                the logbook — every run writes what it did, how much, how long, and how it failed, to places that
                outlive the moment: the console <em>and</em> files <em>and</em>, later, central systems.
              </p>
            </>
          }
          student={
            <>
              <p>
                What print cannot do: mark severity (is this line routine or an emergency?), timestamp itself, say
                which module spoke, be silenced or redirected without editing code, or write to two places at once.
                The <code>logging</code> module does all five with three concepts: <strong>loggers</strong> (named
                sources arranged in a tree), <strong>levels</strong> (DEBUG / INFO / WARNING / ERROR / CRITICAL),
                and <strong>handlers</strong> (destinations, each with a <strong>formatter</strong> that adds
                timestamp, level, and logger name).
              </p>
              <p>
                For a <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm>, the log <em>is</em> the run's
                observable record: when yesterday's 3am run misbehaved, the log file is the only witness. That is
                why this lesson's lab ends with realpy writing a structured run-summary line to console and file on
                every invocation.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A log is an append-only event stream — and in data engineering you sit on both ends of it: later
                phases will land other systems' logs in <GlossaryTerm k="object-storage">object storage</GlossaryTerm>{' '}
                and parse them as datasets. Emitting <em>structured</em> events (JSON, key=value) instead of prose
                closes the loop: your own runs become queryable data — reject rates over time, duration
                regressions — with zero extra instrumentation.
              </p>
              <p>
                Levels are a sampling policy, not decoration: code emits at full detail, configuration decides what
                is recorded, per module, at runtime. DEBUG costs nothing while filtered (lazy %-formatting) but is
                one config flip away during an incident. This line of thinking ends at observability platforms and
                OpenTelemetry — logs, metrics, and traces as three views of one event stream (Phase 6); the habits
                you set here (structured events, correlation-friendly names) are what make that migration trivial.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Loggers, levels, handlers: a newsroom, not a megaphone">
        <Tiered
          layman={
            <>
              <p>
                Think newsroom. Reporters (<em>loggers</em>) file stories from their beat, each stamped with
                importance (<em>level</em>). The editor's desk decides what is worth running today — routine notes
                are spiked, warnings make the paper. The printing presses (<em>handlers</em>) deliver the chosen
                stories to different places — the screen, a file — and layout (<em>formatter</em>) adds the date
                and byline.
              </p>
              <p>
                The key division of labor: reporters never decide what gets published, and the editor never writes
                stories. Your modules report everything; one place — the program's entry point — decides what is
                heard, and where it goes.
              </p>
            </>
          }
          student={
            <>
              <p>
                Every module gets one line at the top: <code>logger = logging.getLogger(__name__)</code>. Because{' '}
                <code>__name__</code> is the dotted module path, you get a named tree for free —{' '}
                <code>realpy.io</code>, <code>realpy.transform</code> — and records propagate up to the root, where
                handlers live. Result: turn one module to DEBUG while the rest stays at INFO, without touching any
                module's code.
              </p>
              <p>
                Configuration happens exactly once, in the CLI's <code>main()</code>:{' '}
                <code>logging.basicConfig(level=..., format=..., handlers=[...])</code>. Libraries (io, transform)
                never configure — a library that calls <code>basicConfig</code> hijacks the application's setup the
                moment it is imported. And pass values as arguments —{' '}
                <code>logger.info("kept=%d", n)</code> — not f-strings: the formatting is skipped entirely when the
                level is filtered.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The tree is policy/mechanism separation: emission sites (loggers, everywhere) are decoupled from
                routing and presentation (handlers + formatters, configured once at the composition root). A
                record's journey: level check against the logger's effective level (inherited down the tree), then
                propagation upward, then each handler applies its own level and formatter. Libraries that might log
                before any app configures attach a <code>NullHandler</code> — the polite default.
              </p>
              <p>
                Run the demo below twice: once as-is, once with <code>level=logging.DEBUG</code>. Note{' '}
                <code>force=True</code> — this page keeps one Python interpreter alive between runs, and{' '}
                <code>basicConfig</code> is a no-op if handlers already exist; <code>force</code> resets them. The
                same subtlety appears in notebooks and REPLs, so it is worth having seen once.
              </p>
            </>
          }
        />
        <CodeRunner
          language="python"
          code={`import logging

logging.basicConfig(
    level=logging.INFO,                      # try logging.DEBUG on a re-run
    format="%(levelname)-7s %(name)s: %(message)s",
    force=True,                              # reset handlers (REPL/notebook-safe)
)
log = logging.getLogger("realpy.transform")

log.debug("parsed line 1 ok")                # below INFO: filtered out
log.info("clean: rows_in=%d kept=%d rejected=%d", 5, 3, 2)
log.warning("reject rate above 20 percent")
log.error("input missing - run cannot proceed")`}
        />
      </Section>

      <Section kicker="core concepts" title="What a pipeline should log (and what it must never log)">
        <Tiered
          layman={
            <>
              <p>
                A logbook entry is counts, times, and identifiers — "took on 340 crates at pier 4, two damaged,
                loading took 90 minutes" — not the full cargo manifest copied out by hand. And never the captain's
                safe combination: the logbook is read by many people you will never meet.
              </p>
              <p>
                Same for pipelines: log how many, how long, and which run — not every record's contents, and never
                a password.
              </p>
            </>
          }
          student={
            <>
              <p>
                The workhorse is the <strong>run summary</strong> — one INFO line per invocation with the numbers
                you will ask for at 3am: <code>rows_in</code>, <code>rows_kept</code>, <code>rows_rejected</code>,
                duration, and which inputs (date, file, batch id). Per-record detail goes to DEBUG (visible on
                demand), anomalies to WARNING. Write it as <code>key=value</code> pairs: greppable today,
                machine-parseable tomorrow.
              </p>
              <p>
                Never log secrets: tokens, passwords, connection strings, API keys — and be deliberate about
                personal data. Logs are the most-copied, longest-lived, least-protected data in a company: shipped
                to aggregators, attached to tickets, quoted in chat. A credential logged once is a credential
                leaked.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The economics: log volume scales with events times cardinality, and per-record INFO logging in a
                million-row pipeline is a self-inflicted denial of service on your logging bill. Aggregate per run
                or per batch; reserve per-record emission for filtered levels. Summary lines double as{' '}
                <em>log-based metrics</em> — parse <code>rows_rejected</code> over time and you have a data-quality
                time series without a metrics system.
              </p>
              <p>
                Structured logging taken seriously means one JSON object per line — the demo below builds a
                formatter in eight lines. From there the path is short to correlation ids (one id stamped on every
                line of a run, the ancestor of distributed trace ids) and to shipping events to platforms that
                index them. The secrets rule becomes architecture: redaction filters at the handler boundary,
                because humans forget.
              </p>
            </>
          }
        />
        <CodeRunner
          language="python"
          code={`import json
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "level": record.levelname,
            "logger": record.name,
            "event": record.getMessage(),
        })

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)

log = logging.getLogger("realpy.cli")
log.info("run_summary rows_in=%d kept=%d rejected=%d", 5, 3, 2)
log.warning("reject_rate_high value=0.4")
# each line is one JSON object: grep it, load it into a table, alert on it`}
        />
      </Section>

      <Section kicker="trade-offs" title="print vs logging vs structured/JSON">
        <Tradeoffs
          options={[
            {
              name: 'print()',
              strengths: ['Zero setup; perfect for interactive exploration and CLI output that IS the product', 'No configuration to misconfigure'],
              weaknesses: ['No levels, timestamps, sources, or routing; silencing means editing code', 'Invisible once the process is not attached to your terminal'],
              chooseWhen: 'REPL experiments, and a CLI\'s intended user-facing output (a report, a table).',
            },
            {
              name: 'logging (stdlib)',
              strengths: ['Levels, module tree, multiple destinations, runtime-configurable — no new deps', 'Third-party libraries already use it: one config captures their warnings too'],
              weaknesses: ['Dated API with real footguns (double configuration, propagation surprises)', 'Prose messages need discipline (key=value) to stay parseable'],
              chooseWhen: 'every long-running or scheduled program — realpy from today onward.',
            },
            {
              name: 'structlog / JSON logging',
              strengths: ['Events are data: fields, not prose — queryable and platform-ready by construction', 'Context binding (run_id stamped on every line) without threading arguments through'],
              weaknesses: ['A dependency and conventions to learn; JSON lines are noisy for humans without tooling', 'Overkill for a small CLI nobody aggregates'],
              chooseWhen: 'services and pipelines whose logs feed dashboards, alerts, or an aggregator (Phase 6 territory).',
            },
          ]}
          note={
            <>
              The migration path is deliberately smooth: disciplined stdlib logging with <code>key=value</code>{' '}
              messages (today's lab) converts to structlog or an aggregator later by swapping configuration — the
              call sites barely change.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: realpy keeps a logbook">
        <Lab
          lessonId={ID}
          intro={
            <p>
              realpy's prints become log records; every run writes a summary to the console <em>and</em> to{' '}
              <code>realpy.log</code>. Work in <code>C:\de-lab\realpy</code>.
            </p>
          }
          steps={[
            {
              title: 'Configure logging at the entry point (only here)',
              body: (
                <CodeBlock
                  label="python — src/realpy/cli.py"
                  code={`import logging

from realpy.errors import RealpyError
from realpy.io import load_raw
from realpy.timing import timer
from realpy.transform import clean

logger = logging.getLogger(__name__)


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("realpy.log", encoding="utf-8"),
        ],
    )


def main() -> None:
    configure_logging()
    try:
        lines = load_raw()
        with timer("clean"):
            records, rejected = clean(lines)
        logger.info(
            "run_summary rows_in=%d rows_kept=%d rows_rejected=%d",
            len(lines), len(records), rejected,
        )
    except RealpyError as exc:
        logger.error("run_failed error=%s", exc)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()`}
                />
              ),
              checkpoint: <>Two handlers in one <code>basicConfig</code>; no other module configures anything.</>,
            },
            {
              title: 'Give transform and timing module loggers',
              body: (
                <>
                  <p>
                    In <code>transform.py</code>, add <code>import logging</code> and{' '}
                    <code>logger = logging.getLogger(__name__)</code> at the top, then instrument{' '}
                    <code>clean</code>:
                  </p>
                  <CodeBlock
                    label="python — transform.py (inside clean)"
                    code={`        except ParseError as exc:
            logger.debug("rejected %s", exc)
            rejected += 1
    logger.info("clean rows_in=%d kept=%d rejected=%d", len(lines), len(records), rejected)
    return records, rejected`}
                  />
                  <p>In <code>timing.py</code>, replace the print with a log call:</p>
                  <CodeBlock
                    label="python — timing.py (the changed lines)"
                    code={`import logging
import time
from contextlib import contextmanager

logger = logging.getLogger(__name__)


@contextmanager
def timer(label):
    start = time.perf_counter()
    try:
        yield
    finally:
        ms = (time.perf_counter() - start) * 1000
        logger.info("%s took %.1f ms", label, ms)`}
                  />
                </>
              ),
              checkpoint: <>Each module has its own <code>getLogger(__name__)</code>; no module imports the CLI's config.</>,
            },
            {
              title: 'Run and read the console channel',
              commands: [{ ps: 'uv run clean' }],
              checkpoint: (
                <>
                  Timestamped lines with logger names: <code>realpy.transform clean rows_in=5 ...</code>,{' '}
                  <code>realpy.timing clean took ...</code>, and <code>realpy.cli run_summary rows_in=5 rows_kept=3
                  rows_rejected=2</code>.
                </>
              ),
            },
            {
              title: 'Verify the file channel and that runs append',
              commands: [{ ps: 'uv run clean\nGet-Content realpy.log' }],
              checkpoint: (
                <>
                  <code>realpy.log</code> contains the same structured lines — and after this second run, <em>two</em>{' '}
                  <code>run_summary</code> lines with different timestamps. The logbook accumulates.
                </>
              ),
            },
            {
              title: 'Flip one dial: see DEBUG detail on demand',
              body: (
                <p>
                  In <code>configure_logging</code>, change <code>level=logging.INFO</code> to{' '}
                  <code>logging.DEBUG</code>, run, then change it back.
                </p>
              ),
              commands: [{ ps: 'uv run clean' }],
              checkpoint: (
                <>
                  Two new <code>DEBUG realpy.transform rejected line 2...</code> lines appear — per-record detail
                  that was always emitted, only now recorded. Revert to INFO afterward.
                </>
              ),
            },
            {
              title: 'Keep the logbook out of git',
              commands: [{ ps: 'Add-Content .gitignore "realpy.log"\ngit status' }],
              checkpoint: <><code>git status</code> no longer lists <code>realpy.log</code> as untracked.</>,
            },
          ]}
        />
        <Callout kind="warn" title="Never log secrets">
          No tokens, passwords, connection strings, or API keys — ever, at any level. Logs get copied to
          aggregators, tickets, and chat, and they outlive rotations. A credential logged once is leaked.
        </Callout>
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Why is logger = logging.getLogger(__name__) the standard first line of a module?',
              options: [
                'It is required before any logging call works',
                'It names the logger after the module path, giving a hierarchy you can filter per module without touching code',
                'It creates a new log file per module',
                'It makes logging calls faster',
              ],
              answer: 1,
              explain:
                'The name realpy.transform slots into the logger tree — so configuration can dial one module to DEBUG while others stay at INFO. Handlers and files are configured elsewhere, once.',
            },
            {
              q: 'Why must basicConfig live only in the CLI entry point, never in library modules?',
              options: [
                'basicConfig is deprecated inside packages',
                'A library configuring logging at import time hijacks the application\'s setup; modules should only emit, the entry point decides routing',
                'It would slow down imports',
                'Handlers cannot be created outside main()',
              ],
              answer: 1,
              explain:
                'Emission everywhere, configuration once at the composition root. A library that calls basicConfig steals that decision from every application that imports it.',
            },
            {
              q: 'The config level is INFO and code calls logger.debug("parsed %s", huge_record). What happens?',
              options: [
                'The line is written to the file handler only',
                'The record is dropped — and with %-style args, the message is never even formatted',
                'It raises because DEBUG is disabled',
                'It is buffered until the level changes',
              ],
              answer: 1,
              explain:
                'Filtered levels cost almost nothing when values are passed as arguments — the formatting is skipped. An f-string would build the full string first and then throw it away; that is why lazy %-args are the habit.',
            },
            {
              q: 'What belongs in a pipeline\'s per-run INFO log line?',
              options: [
                'Every record processed, for full auditability',
                'Counts (rows in/kept/rejected), duration, and run identifiers — as key=value pairs',
                'The database connection string, for debugging',
                'Nothing — INFO should be silent in production',
              ],
              answer: 1,
              explain:
                'The run summary answers 3am questions and doubles as a metrics source. Per-record detail is DEBUG; connection strings are secrets and never appear at any level.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Why is logging preferred over print in production code?',
            a: (
              <p>
                Severity levels, timestamps, and source names for free; routing to multiple destinations without
                code changes; runtime-configurable verbosity per module; and third-party libraries integrate into
                the same stream. Strong answers add the library rule — emit in modules via{' '}
                <code>getLogger(__name__)</code>, configure once at the entry point — and lazy %-formatting.
              </p>
            ),
          },
          {
            q: 'What do you log in a data pipeline, and at which levels?',
            a: (
              <p>
                One INFO run-summary per invocation — rows in/kept/rejected, duration, run parameters — as
                key=value pairs so logs double as metrics; WARNING for anomalies (reject-rate spikes); DEBUG for
                per-record detail, off by default; ERROR with the exception when the run dies. And an explicit
                never-list: credentials and raw PII, because logs are copied everywhere and live forever.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>print is shouting into the wind; logging is the logbook — pipelines need the logbook because nobody watches at 3am.</>,
          <>Three concepts: named loggers in a tree, levels as a runtime-adjustable filter, handlers+formatters as destinations.</>,
          <>Modules emit (<code>logger = logging.getLogger(__name__)</code>); only the entry point configures (<code>basicConfig</code>, once).</>,
          <>Log the run summary as <code>key=value</code>: rows in/kept/rejected, duration, run ids — DEBUG for detail, WARNING for anomalies.</>,
          <>Never log secrets. Logs are the most-copied, longest-lived data you produce.</>,
          <>Structured (JSON) events turn logs into queryable data — the on-ramp to observability platforms in Phase 6.</>,
        ]}
      />
    </>
  )
}
