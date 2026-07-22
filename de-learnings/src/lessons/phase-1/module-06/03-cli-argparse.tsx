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

const ID = '1.6.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="A pipeline you reconfigure by editing code is a trap">
        <Tiered
          layman={
            <>
              <p>
                Picture two vending machines. One has a labeled panel: buttons with names, a slot that tells you what it
                accepts, and a printed guide on the front. The other is a plain metal box with twelve unmarked switches
                inside a hatch — the technician who built it knows switch 7 means &quot;decaf&quot;, and everyone else
                electrocutes themselves guessing.
              </p>
              <p>
                A program without a command-line interface is the mystery box: to change what it does, you open the code
                and flip things. A program <em>with</em> a CLI is the labeled panel: named options, complaints when you
                press a wrong combination, and a built-in instruction sheet (<code>--help</code>). This lesson teaches
                you to build the panel.
              </p>
            </>
          }
          student={
            <>
              <p>
                So far you run realpy&apos;s code by editing a script and hitting run. That doesn&apos;t survive contact
                with reality: the same <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> must load london today,
                backfill oslo for March, and do a dry run in CI — without three copies of the code. A command-line
                interface turns your program into a tool: <code>ingest --city london</code> is a sentence anyone (or any
                scheduler) can speak.
              </p>
              <p>
                Concretely, a CLI buys you: named, typed, validated inputs; free documentation via <code>--help</code>;
                and an exit code telling the caller whether you succeeded — invisible to humans, everything to machines
                (lesson 1.6.4&apos;s scheduler and every CI system decide what to do next from it). This is also a
                direct rehearsal: P1&apos;s milestone M0 is exactly the skeleton you&apos;ll build here.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A CLI is an API contract, and deserves the same discipline. Renaming a flag or repurposing an exit code
                breaks every script, cron entry, and CI job that calls you — the callers you cannot see. Mature tools
                treat their flag surface like a semver-versioned interface: additions are minor, removals are major,
                deprecations get a warning period. The conventions are old and worth following: POSIX short options
                (<code>-v</code>), GNU long options (<code>--verbose</code>), exit code 0 for success, 2 for usage
                errors, diagnostics on stderr.
              </p>
              <p>
                Those conventions are what make tools composable — the 1.6.1 pipe philosophy applied to your own
                programs. Because results go to stdout and complaints to stderr, callers can redirect your output
                without losing your errors; because failure is an exit code, callers chain you with &quot;and
                then&quot; / &quot;or else&quot; logic without parsing your text. Follow the contract and your pipeline
                plugs into infrastructure written decades before it.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="argparse: declare the interface, get parsing and help for free">
        <Tiered
          layman={
            <>
              <p>
                You don&apos;t wire the vending machine panel by hand — you fill in a form: &quot;this button is called
                city, it takes a word, the default is london&quot;. From that form, the machine builds the panel, checks
                every press, and prints the instruction sheet, all by itself.
              </p>
              <p>
                That form-filling is what <code>argparse</code> is: you <em>declare</em> what inputs exist, and it does
                the arguing — wrong types, missing values, unknown buttons — with polite errors you never had to write.
              </p>
            </>
          }
          student={
            <>
              <p>
                Three moves: create an <code>ArgumentParser</code>, declare arguments with <code>add_argument</code>,
                call <code>parse_args()</code>. Declarations carry behavior: <code>type=int</code> converts and
                validates, <code>default=</code> fills gaps, <code>choices=</code> restricts,{' '}
                <code>action=&quot;store_true&quot;</code> makes a boolean flag. One trick makes this runnable in the
                browser: in a terminal, <code>parse_args()</code> reads <code>sys.argv</code>; hand it a list instead
                and you&apos;ve simulated any command line — the exact trick your tests will use later.
              </p>
              <CodeRunner
                language="python"
                code={'import argparse\n\nparser = argparse.ArgumentParser(\n    prog="pipeline-zero",\n    description="Weather ingestion CLI (rehearsal for portfolio project P1).")\nparser.add_argument("--city", default="london", help="city to ingest")\nparser.add_argument("--days", type=int, default=7, help="how many days back")\nparser.add_argument("--dry-run", action="store_true", help="plan only, write nothing")\n\n# A real shell fills sys.argv. There is no shell in this browser, so we hand\n# parse_args() the exact list the shell would have built:\nargs = parser.parse_args(["--city", "oslo", "--days", "30"])\nprint("parsed:", args)\nprint("types :", type(args.city).__name__, type(args.days).__name__, type(args.dry_run).__name__)\n\n# --help normally prints and exits the process; ask for the text directly:\nprint()\nprint(parser.format_help())'}
              />
              <p>Notice what you did not write: the conversion of <code>--days</code> to a real <code>int</code>, the <code>--dry-run</code>/<code>args.dry_run</code> name mapping, and the entire help text. Declared once, derived everywhere.</p>
            </>
          }
          phd={
            <>
              <p>
                The design idea is declarative interfaces: you specify <em>what</em> the interface is, and parsing,
                validation, and documentation are all derived from one source of truth — so they can never disagree.
                Hand-rolled <code>sys.argv</code> loops inevitably drift: the README documents a flag the code renamed
                last month. Deriving <code>--help</code> from the declaration makes the documentation self-verifying,
                the same philosophy behind OpenAPI specs and typed schemas you&apos;ll meet later.
              </p>
              <p>
                Also deliberate: <code>parse_args(argv=None)</code> defaulting to <code>sys.argv[1:]</code> is a seam —
                a place where the real world (the process&apos;s actual command line) can be replaced by a value you
                control (a list). Seams are what make code testable without subprocesses, and you&apos;ll exploit this
                one in the lab with pytest.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Subcommands, dispatch, exit codes, and the two output streams">
        <Tiered
          layman={
            <>
              <p>
                Bigger tools are verbs: <code>git commit</code>, <code>docker run</code>. One machine, many buttons,
                each with its own sub-panel. Your pipeline works the same way: ingest, backfill, query, status — four
                verbs of one tool, not four separate tools.
              </p>
              <p>
                And when the machine finishes, it reports back through two channels: the receipt (its results) and a
                status light (did it work?). Humans mostly read the receipt; other machines only watch the light. Both
                must be honest.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>add_subparsers(dest=&quot;command&quot;)</code> gives each verb its own parser, and{' '}
                <code>dest</code> records which verb was used. Then dispatch with a dict — mapping name to function —
                instead of an if/elif ladder. Each handler returns an exit code: 0 for success, non-zero for failure,
                and diagnostics go to <code>stderr</code> so results on <code>stdout</code> stay clean for pipes and
                redirection (1.6.1). This is the P1-shaped skeleton, running live — note the backfill run failing{' '}
                <em>properly</em>:
              </p>
              <CodeRunner
                language="python"
                code={'import argparse, sys\n\ndef cmd_ingest(args):\n    print("ingest: loading", args.city, "from last watermark through yesterday")\n    return 0\n\ndef cmd_backfill(args):\n    if args.start > args.end:\n        print("error: --start must be on or before --end", file=sys.stderr)\n        return 2\n    print("backfill:", args.city, args.start, "..", args.end, "(idempotent reload)")\n    return 0\n\ndef cmd_query(args):\n    print("query: running saved query", args.name)\n    return 0\n\ndef cmd_status(args):\n    print("city    watermark    rows")\n    print("london  2026-07-20   48210")\n    return 0\n\ndef build_parser():\n    p = argparse.ArgumentParser(prog="pipeline-zero")\n    sub = p.add_subparsers(dest="command", required=True)\n    ing = sub.add_parser("ingest", help="load new data since the watermark")\n    ing.add_argument("--city", required=True)\n    bf = sub.add_parser("backfill", help="reload an explicit date range")\n    bf.add_argument("--city", required=True)\n    bf.add_argument("--start", required=True)\n    bf.add_argument("--end", required=True)\n    q = sub.add_parser("query", help="run a saved analytical query")\n    q.add_argument("--name", choices=["daily-summary", "hottest-days"], required=True)\n    sub.add_parser("status", help="show watermarks and row counts")\n    return p\n\nDISPATCH = {"ingest": cmd_ingest, "backfill": cmd_backfill,\n            "query": cmd_query, "status": cmd_status}\n\ndef main(argv=None):\n    args = build_parser().parse_args(argv)\n    return DISPATCH[args.command](args)\n\nfor argv in [\n    ["ingest", "--city", "london"],\n    ["backfill", "--city", "oslo", "--start", "2026-07-10", "--end", "2026-07-01"],\n    ["status"],\n]:\n    print("run: pipeline-zero", " ".join(argv))\n    print("exit code:", main(argv))\n    print("-" * 46)\n\n# Bad usage: argparse itself prints to stderr and exits with code 2:\ntry:\n    main(["ingest"])  # missing required --city\nexcept SystemExit as e:\n    print("argparse rejected it: exit code", e.code, "(usage errors are 2 by convention)")'}
              />
              <p>
                The backfill with a backwards date range printed its complaint to stderr and returned 2 — the run
                &quot;completed&quot; as a process but told every caller it failed. That returned integer becomes the
                process exit code (PowerShell reads it as <code>$LASTEXITCODE</code>), and re-running a correct{' '}
                <code>backfill</code> is safe precisely because P1 makes it{' '}
                <GlossaryTerm k="idempotency">idempotent</GlossaryTerm>.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The dispatch dict is the data-driven alternative to control flow: commands become entries in a mapping,
                so adding one touches two places (handler, dict) instead of growing a ladder every reader must re-scan.
                It also opens doors an if/elif chain keeps shut — you can enumerate commands programmatically, check
                that every subparser has a handler with one assert, or register handlers via decorators. Registry-style
                dispatch is the same pattern Flask routes and pytest fixtures use; meet it here in miniature.
              </p>
              <p>
                On streams: the separation is a protocol, not a style preference. A scheduler redirecting stdout to a
                data file must still capture your failure message; a pipe consuming your query results must not choke on
                a progress bar. Mixing streams is how tools become un-composable — and un-debuggable at 3am when the log
                shows results interleaved with errors. Discipline: results to stdout, everything about <em>the run
                itself</em> to stderr (later: structured logging, which P1 requires as NFR-4).
              </p>
            </>
          }
        />
        <Callout kind="tip" title="The main(argv=None) pattern">
          Write <code>def main(argv=None)</code> and pass it through to <code>parse_args(argv)</code>. In production
          argv is None (real command line); in tests you pass a list — no subprocesses, just a function call returning
          an exit code. The lab&apos;s pytest suite leans entirely on this.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="argparse vs click/typer vs no CLI at all">
        <Tradeoffs
          options={[
            {
              name: 'argparse (stdlib)',
              strengths: [
                'Zero dependencies — works anywhere Python does, forever',
                'Teaches the raw model: argv in, parsed namespace out, exit code back',
                'Enough for real tools: subcommands, types, choices, generated help',
              ],
              weaknesses: [
                'Verbose for big CLIs; nesting many subcommands gets clunky',
                'No shell completion, colors, or prompts out of the box',
              ],
              chooseWhen: 'dependencies are a cost, the CLI is modest, or you are learning the primitive (P1: yes).',
            },
            {
              name: 'click / typer',
              strengths: [
                'Declarative decorators (typer derives flags from type hints) — less boilerplate',
                'Niceties included: completion, colors, prompting, testing helpers',
              ],
              weaknesses: [
                'A dependency (and an abstraction) between you and argv',
                'Magic can obscure what a CLI actually is while you are still learning',
              ],
              chooseWhen: 'you build many or large CLIs and the team already carries the dependency happily.',
            },
            {
              name: 'No CLI — importable functions only',
              strengths: [
                'Simplest possible thing; ideal for library code called by other Python',
                'No interface surface to design, document, or version',
              ],
              weaknesses: [
                'Unreachable from schedulers, CI, and teammates who do not write Python',
                'Every "just tweak and re-run" edit risks the code itself',
              ],
              chooseWhen: 'the code is only ever called by other code — never operated as a tool.',
            },
          ]}
          note={
            <>
              Same conclusion as the P1 spec: learn argparse first because it <em>is</em> the model — click and typer
              are ergonomic layers over the identical argv/exit-code contract. Switching later is easy; understanding
              later is not.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: give realpy a real CLI (with tests)">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Add a two-verb CLI to realpy — <code>clean</code> and <code>status</code> — wired to the layered config
              from lesson 1.6.2, registered as a real console command, covered by pytest. Work in <code>C:\de-lab\realpy</code>.
            </p>
          }
          steps={[
            {
              title: 'Create realpy/cli.py',
              body: (
                <>
                  <p>Next to <code>config.py</code> from last lesson, create <code>cli.py</code>:</p>
                  <CodeBlock
                    label="python"
                    code={'"""realpy command line. Run as: uv run realpy <command>"""\nimport argparse\nimport sys\nfrom datetime import datetime\nfrom pathlib import Path\n\nfrom realpy.config import load_config\n\ndef cmd_clean(args):\n    cfg = load_config()\n    data_dir = Path(cfg["data_dir"])\n    data_dir.mkdir(parents=True, exist_ok=True)\n    removed = 0\n    for tmp in sorted(data_dir.glob("*.tmp")):\n        if args.dry_run:\n            print("would remove", tmp)\n        else:\n            tmp.unlink()\n            removed += 1\n            print("removed", tmp)\n    mode = "dry-run: " if args.dry_run else ""\n    print(mode + "clean finished, removed " + str(removed) + " file(s)")\n    return 0\n\ndef cmd_status(args):\n    cfg = load_config()\n    data_dir = Path(cfg["data_dir"])\n    if not data_dir.exists():\n        print("error: data dir does not exist:", data_dir, file=sys.stderr)\n        return 1\n    files = [p for p in data_dir.iterdir() if p.is_file()]\n    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")\n    print(now, "status: data_dir=" + str(data_dir),\n          "files=" + str(len(files)), "api_base=" + cfg["api_base"])\n    return 0\n\ndef build_parser():\n    parser = argparse.ArgumentParser(prog="realpy", description="realpy maintenance commands")\n    sub = parser.add_subparsers(dest="command", required=True)\n    clean = sub.add_parser("clean", help="remove *.tmp files from the data directory")\n    clean.add_argument("--dry-run", action="store_true", help="report only, delete nothing")\n    sub.add_parser("status", help="print a one-line data directory status")\n    return parser\n\nDISPATCH = {"clean": cmd_clean, "status": cmd_status}\n\ndef main(argv=None):\n    args = build_parser().parse_args(argv)\n    return DISPATCH[args.command](args)\n\nif __name__ == "__main__":\n    raise SystemExit(main())'}
                  />
                </>
              ),
              checkpoint: (
                <><code>uv run python -m realpy.cli status</code> prints a one-line status ending in <code>api_base=https://archive-api.open-meteo.com</code> (the module runs even before we register the command name).</>
              ),
            },
            {
              title: 'Register the console command',
              body: (
                <>
                  <p>Add to <code>pyproject.toml</code>, then let uv reinstall the project:</p>
                  <CodeBlock label="toml" code={'[project.scripts]\nrealpy = "realpy.cli:main"'} />
                  <Callout kind="info" title="If uv complains the project is not packaged">
                    Console scripts need a buildable package: ensure <code>src/realpy/__init__.py</code> exists and
                    pyproject.toml has a build-system block (<code>uv init --package</code> projects already do):{' '}
                    <code>[build-system] requires = [&quot;hatchling&quot;]</code>, <code>build-backend = &quot;hatchling.build&quot;</code>.
                  </Callout>
                </>
              ),
              commands: [{ ps: 'Set-Location C:\\de-lab\\realpy\nuv sync\nuv run realpy --help\nuv run realpy clean --help' }],
              checkpoint: (
                <>Both help screens render: the first lists <code>clean</code> and <code>status</code> as subcommands, the second shows <code>--dry-run</code> with its help text. You wrote none of that prose layout — argparse derived it.</>
              ),
            },
            {
              title: 'Exit codes: a scheduler-visible success and failure',
              body: <p>Run status twice — once normally, once pointed (via the 1.6.2 env layer) at a directory that does not exist:</p>,
              commands: [
                {
                  ps: 'uv run realpy status\n$LASTEXITCODE\n$env:REALPY_DATA_DIR = "C:\\definitely\\not\\real"\nuv run realpy status\n$LASTEXITCODE\nRemove-Item Env:REALPY_DATA_DIR',
                },
              ],
              checkpoint: (
                <>First run: status line, then <code>0</code>. Second run: the error message, then <code>1</code>. That integer is the entire language schedulers and CI speak — your tool now speaks it correctly.</>
              ),
            },
            {
              title: 'Prove stdout and stderr are different rivers',
              commands: [
                {
                  ps: '$env:REALPY_DATA_DIR = "C:\\definitely\\not\\real"\nuv run realpy status > out.txt\nGet-Content out.txt\nRemove-Item Env:REALPY_DATA_DIR, out.txt -ErrorAction SilentlyContinue',
                },
              ],
              checkpoint: (
                <>The error message still appeared <em>on your screen</em> even though stdout was redirected — and <code>out.txt</code> is empty. Diagnostics survived because they travel on stderr.</>
              ),
            },
            {
              title: 'Exercise clean: dry-run first, then for real',
              commands: [
                {
                  ps: 'New-Item -ItemType Directory -Force data | Out-Null\nSet-Content data\\a.tmp "x"\nSet-Content data\\b.tmp "x"\nuv run realpy clean --dry-run\nuv run realpy clean\nuv run realpy status',
                },
              ],
              checkpoint: (
                <>
                  Dry run prints two <code>would remove</code> lines and <code>removed 0 file(s)</code>; the real run
                  prints <code>removed 2 file(s)</code>. The <code>--dry-run</code> pattern — plan visibly, act
                  deliberately — recurs through every serious data tool you will meet.
                </>
              ),
            },
            {
              title: 'Test the CLI without a shell',
              body: (
                <>
                  <p>
                    Create <code>tests/test_cli.py</code> — no subprocesses, just <code>main(argv)</code> plus
                    pytest&apos;s <code>capsys</code> (captures both streams) and <code>monkeypatch</code> (controls the
                    env layer):
                  </p>
                  <CodeBlock
                    label="python"
                    code={'from realpy.cli import main\n\ndef test_status_ok(tmp_path, monkeypatch, capsys):\n    monkeypatch.setenv("REALPY_DATA_DIR", str(tmp_path))\n    assert main(["status"]) == 0\n    out = capsys.readouterr().out\n    assert "status:" in out\n    assert "files=0" in out\n\ndef test_status_missing_dir_fails(tmp_path, monkeypatch, capsys):\n    monkeypatch.setenv("REALPY_DATA_DIR", str(tmp_path / "nope"))\n    assert main(["status"]) == 1\n    assert "does not exist" in capsys.readouterr().err\n\ndef test_clean_dry_run_deletes_nothing(tmp_path, monkeypatch, capsys):\n    monkeypatch.setenv("REALPY_DATA_DIR", str(tmp_path))\n    (tmp_path / "junk.tmp").write_text("x")\n    assert main(["clean", "--dry-run"]) == 0\n    assert "would remove" in capsys.readouterr().out\n    assert (tmp_path / "junk.tmp").exists()'}
                  />
                </>
              ),
              commands: [{ ps: 'uv run pytest tests/test_cli.py -q' }],
              checkpoint: (
                <><code>3 passed</code>. Read the middle test again: it asserts on the <em>exit code</em> and on <em>stderr</em> — you are testing the machine-facing contract, not just the happy path.</>
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
              q: 'What does dest="command" in add_subparsers(dest="command") accomplish?',
              options: [
                'It names the program in help output',
                'It stores which subcommand was chosen, so your code can dispatch on args.command',
                'It sets the default subcommand',
                'It is required syntax with no effect',
              ],
              answer: 1,
              explain:
                'dest is the attribute name where the chosen verb lands. Without it you cannot tell ingest from status after parsing — the dispatch dict keys off exactly this value.',
            },
            {
              q: 'Why do schedulers and CI systems care about exit codes?',
              options: [
                'Exit codes control how much memory the process may use',
                'They are the machine-readable success/failure signal that decides retries, alerts, and whether the next step runs',
                'They are only used for logging',
                'Python requires them for garbage collection',
              ],
              answer: 1,
              explain:
                'A caller cannot parse your prose. Zero means proceed; non-zero means stop, retry, or alert. A tool that fails but exits 0 silently corrupts every automation built on top of it.',
            },
            {
              q: 'Your CLI prints query results to stdout and progress messages to stderr. A user runs: realpy query > results.txt. What happens?',
              options: [
                'Both results and progress end up in results.txt',
                'results.txt gets the results; progress still shows in the terminal',
                'The command errors — you cannot redirect a CLI',
                'results.txt gets the progress; results are lost',
              ],
              answer: 1,
              explain:
                'Redirection with > captures stdout only. Keeping diagnostics on stderr is what makes your output pipeable — the file stays clean data while the human still sees the run narrative.',
            },
            {
              q: 'For --days with type=int, the user passes --days seven. What does argparse do?',
              options: [
                'Stores the string "seven" and moves on',
                'Crashes with an unhandled ValueError and a stack trace',
                'Prints a usage error to stderr and exits with code 2',
                'Silently uses the default value',
              ],
              answer: 2,
              explain:
                'Declared types are validation: argparse converts, and on failure produces a polite usage message and the conventional usage-error exit code 2 — no try/except needed in your code.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Why do exit codes and stderr discipline matter for a data pipeline CLI?',
            a: (
              <p>
                Because the primary consumer is not human. Schedulers decide retry-or-alert from the exit code; CI gates
                deployments on it; shell operators chain steps with it. Meanwhile stdout may be redirected to files or
                pipes, so diagnostics must ride stderr or they vanish exactly when needed. Strong answers name the
                conventions — 0 success, 2 usage error — and call the CLI a versioned contract with unseen callers.
              </p>
            ),
          },
          {
            q: 'Would you use argparse or click for a new internal tool?',
            a: (
              <p>
                Either is defensible — the reasoning is the answer. argparse: stdlib, zero deps, fine for a handful of
                subcommands. click/typer: better ergonomics and completion for large CLIs, at the price of a dependency.
                What does not change is the contract underneath: argv in, validated namespace out, exit code back, help
                derived from declarations. Interviewers probe whether you understand the model or only the library.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>
            A CLI turns code into a tool: named, typed, validated inputs plus free <code>--help</code> — the labeled
            panel instead of the mystery box.
          </>,
          <>
            argparse is declarative: parsing, validation, and documentation all derive from one set of{' '}
            <code>add_argument</code> declarations, so they cannot drift apart.
          </>,
          <>
            Subcommands via <code>add_subparsers(dest=&quot;command&quot;)</code>; route with a dispatch dict — commands
            as data, not ladders.
          </>,
          <>
            Exit codes are the machine contract (0 success, non-zero failure, 2 for usage; PowerShell:{' '}
            <code>$LASTEXITCODE</code>), and results go to stdout, diagnostics to stderr — redirection-safe, pipe-safe.
          </>,
          <>
            <code>main(argv=None)</code> is the testability seam: realpy&apos;s CLI now has pytest coverage of help,
            exit codes, and dry-run behavior — P1 milestone M0, rehearsed.
          </>,
        ]}
      />
    </>
  )
}
