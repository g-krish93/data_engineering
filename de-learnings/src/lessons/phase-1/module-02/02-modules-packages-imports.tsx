import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { RevealSolution } from '../../../components/RevealSolution'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeBlock } from '../../../components/CodeBlock'
import { CodeRunner } from '../../../components/CodeRunner'

const ID = '1.2.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="One giant file is where projects go to die">
        <Tiered
          layman={
            <>
              <p>
                A beginner's workshop is one big junk drawer — fine until you need the small Phillips head{' '}
                <em>right now</em> and spend twenty minutes digging. A real workshop has labeled drawers: screwdrivers
                here, cables there. A little organizing effort up front buys instant retrieval forever.
              </p>
              <p>
                Code is the same. A 900-line <code>script.py</code> works until you need to change one thing safely.
                Python's drawers are <strong>modules</strong> (one file = one drawer) grouped into a{' '}
                <strong>package</strong> (a labeled cabinet). This lesson: how Python finds a drawer when you ask —
                and how to arrange drawers so they never reference each other in circles.
              </p>
            </>
          }
          student={
            <>
              <p>
                Mechanically: a <strong>module</strong> is a <code>.py</code> file; a <strong>package</strong> is a
                folder containing an <code>__init__.py</code>. <code>import realpy.transform</code> loads{' '}
                <code>src/realpy/transform.py</code>, runs it top to bottom <em>once</em>, and binds the resulting
                module object — every top-level function, class, and constant becomes an attribute of it.
              </p>
              <p>
                The design question is bigger than the mechanics: which code goes where? realpy adopts a layering that
                scales to every pipeline you will write — <code>io</code> (raw data, bottom), <code>transform</code>{' '}
                (pure logic, middle), <code>cli</code> (wiring, top). Data flows upward through them, but{' '}
                <em>imports point strictly downward</em>: cli imports transform and io; io imports nothing of ours.
                That one rule makes circular imports structurally impossible.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A module is a namespace with an initialization protocol: on first import, a finder locates the source,
                Python creates an empty module object, registers it in <code>sys.modules</code>, then executes the body
                against its <code>__dict__</code>. Registration <em>before</em> execution is why circular imports fail
                strangely rather than loop forever — the second importer receives a real but{' '}
                <em>half-initialized</em> module.
              </p>
              <p>
                The import graph is your dependency graph, and keeping it a DAG is the same discipline as keeping a{' '}
                pipeline's task graph acyclic — an <GlossaryTerm k="orchestrator">orchestrator</GlossaryTerm> refuses
                cycles outright; Python merely punishes them at runtime. io/transform/cli is layered architecture
                (presentation over logic over data access) in its three-file version.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Modules are objects; scripts are modules too">
        <Tiered
          layman={
            <>
              <p>
                When Python "imports" something, it does not copy text into your file. It runs the other file once,
                collects everything it defined into a bundle, and hands you the bundle. <code>math.sqrt</code> is
                opening the <code>math</code> bundle and taking out one tool.
              </p>
              <p>
                The twist: the file you are <em>running</em> is also a bundle — labeled with the special name{' '}
                <code>__main__</code> instead of its filename. That label is how a file tells whether it is being run
                directly or merely imported by someone else.
              </p>
            </>
          }
          student={
            <>
              <p>
                Run the demo: a module is an ordinary object of type <code>module</code>, cached in{' '}
                <code>sys.modules</code>, shared by every importer. The executing script's own module is named{' '}
                <code>__main__</code> — hence the idiom <code>if __name__ == "__main__":</code>, "only when run
                directly, not when imported".
              </p>
              <p>
                Two ways to run package code: the console script (production style: <code>uv run clean</code>) and{' '}
                <code>python -m realpy.cli</code> (debug style — "import this module by name, run it as{' '}
                <code>__main__</code>"). Prefer <code>-m</code> over <code>python src/realpy/cli.py</code>: running a
                file by path puts the file's folder on the search path and bypasses the package, so absolute imports
                like <code>from realpy.io import ...</code> break.
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>__name__</code> is per-module state assigned at load: the import system sets the dotted name;
                direct execution sets <code>"__main__"</code>. Consequence: the same file executed both ways yields{' '}
                <em>two distinct module objects</em> with separate globals — the classic "my singleton isn't single"
                bug when a script gets imported transitively.
              </p>
              <p>
                <code>python -m pkg.mod</code> resolves the module via the import system; running a file by path
                instead inserts the <em>file's parent directory</em> on <code>sys.path</code>. That asymmetry is why
                path-running a module inside a package breaks its absolute imports — the package root is simply not on
                the path.
              </p>
            </>
          }
        />
        <CodeRunner
          language="python"
          code={`import math
import sys

print(type(math), math.__name__)      # a module is an object with a name
print(sys.modules["math"] is math)    # cached and shared: same instance
print(__name__)                       # the code you are reading is a module too`}
        />
      </Section>

      <Section kicker="core concepts" title="Where imports come from: the search path and the cache">
        <Tiered
          layman={
            <>
              <p>
                How does <code>import json</code> find the right drawer? Python keeps an ordered list of places to
                look; first match wins. "Why does it import the wrong version?" almost always means "an earlier place
                on the list had something with the same name".
              </p>
              <p>
                Python also remembers every drawer it has opened. Import the same thing twice and the second request
                is answered from memory — the file is <em>not</em> run again. Great for speed; occasionally surprising
                when you expected re-running.
              </p>
            </>
          }
          student={
            <>
              <p>
                The list is <code>sys.path</code>; the memory is <code>sys.modules</code>, a dict of dotted names to
                module objects. First import: find, create, register, execute. Later imports: dictionary lookup, done.
                Top-level code runs exactly once per process — which makes module-level state (like the loggers of
                1.2.6) effectively process-global.
              </p>
              <p>
                realpy's imports are <strong>absolute</strong> — <code>from realpy.io import load_raw</code> — naming
                the full path from the package root. Because realpy is installed into the project venv, the package is
                on <code>sys.path</code> in every context: console script, <code>-m</code>, tests. No path
                manipulation, ever. <code>sys.path.append(...)</code> in application code is a packaging problem
                wearing a trench coat.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Resolution is pluggable: <code>sys.meta_path</code> holds finders queried in order; the path-based
                finder walks <code>sys.path</code> for a spec (PEP 451). That machinery is why imports can come from
                zip files, frozen binaries, or — in this very page — Pyodide's virtual filesystem: run the demo and
                notice the search-path entries are nothing like a normal OS layout, yet the protocol is identical.
              </p>
              <p>
                There is no deeper magic. Build a module object with <code>types.ModuleType</code>, exec code into its{' '}
                <code>__dict__</code>, drop it into <code>sys.modules</code> — and <code>import</code> happily returns
                your forgery. The import statement is a cache lookup plus a protocol, which is precisely what test
                frameworks and hot-reloaders exploit.
              </p>
            </>
          }
        />
        <CodeRunner
          language="python"
          code={`import sys

print("first search-path entries:", sys.path[:3])
print("json cached before first import:", "json" in sys.modules)
import json
print("json cached after:", "json" in sys.modules)
import json as second_import
print("re-import returns the same object:", second_import is json)`}
        />
        <Callout kind="warn" title="Circular imports: the half-built module">
          If <code>io.py</code> imports <code>transform</code> while <code>transform.py</code> imports{' '}
          <code>io</code>, the second import finds the first module in <code>sys.modules</code> <em>before its body
          finished running</em>: <code>ImportError: cannot import name ... from partially initialized module</code>.
          The fix is never an import trick; it is restoring one-way layering.
        </Callout>
        <p>
          Quick check — realpy contains a module named <code>io.py</code>, but Python's standard library also has{' '}
          <code>io</code>. Why doesn't ours break the stdlib?
        </p>
        <RevealSolution label="Reveal answer">
          <p>
            Ours is not top-level: it is <code>realpy.io</code>, reachable only through the package. A bare{' '}
            <code>import io</code> searches <code>sys.path</code> for top-level names and finds the stdlib — Python 3
            has no implicit relative imports. (A <em>top-level</em> <code>io.py</code> in a flat layout <em>does</em>{' '}
            shadow the stdlib — one more point for src layout.)
          </p>
        </RevealSolution>
      </Section>

      <Section kicker="trade-offs" title="Splitting code, and how to spell imports">
        <Tradeoffs
          options={[
            {
              name: 'Single module (one .py file)',
              strengths: ['Zero indirection — everything greppable in one place', 'No import design needed; fastest possible start'],
              weaknesses: ['Beyond a few hundred lines, unrelated concerns tangle and merge conflicts multiply', 'Cannot reuse one part without importing (and running) the whole file'],
              chooseWhen: 'a script under ~200 lines with one job and one author.',
            },
            {
              name: 'Package (folder of focused modules)',
              strengths: ['Each module has one responsibility and an enforceable import direction', 'Parts are separately importable, testable, and reviewable'],
              weaknesses: ['More files to navigate; premature splitting creates hollow ceremony', 'Requires deciding a structure (and living with it for a while)'],
              chooseWhen: 'code has distinct layers or multiple consumers — realpy crossed that line today.',
            },
          ]}
          note={<>Split when a file accumulates a <em>second</em> responsibility, not at a line count.</>}
        />
        <Callout kind="info" title="Relative vs absolute imports">
          Large libraries often use relative imports (<code>from .io import load_raw</code>): shorter, and they
          survive renaming the top-level package. But they break when a file is run directly and read ambiguously in
          review ("which io is that?"). We standardize on <strong>absolute</strong> imports — one spelling that works
          in scripts, <code>-m</code>, entry points, and tests. Recognize relative imports in other people's code;
          don't write them here.
        </Callout>
      </Section>

      <Section kicker="hands-on" title="Lab: split realpy into layers">
        <Lab
          lessonId={ID}
          intro={
            <p>
              realpy graduates from one <code>__init__.py</code> to three layered modules — all files below go in{' '}
              <code>src\realpy\</code> inside <code>C:\de-lab\realpy</code>.
            </p>
          }
          steps={[
            {
              title: 'Create the bottom layer: io.py',
              body: (
                <CodeBlock
                  label="python — src/realpy/io.py"
                  code={`"""Raw record access. Bottom layer: imports nothing from realpy."""

SAMPLE = """BER,2024-01-01,7.5
BER,2024-01-02,
MUC,2024-01-01,3.1
MUC,2024-01-02,abc
BER,2024-01-03,8.4"""


def load_raw():
    """Return raw sample lines, including the messy ones."""
    return SAMPLE.splitlines()`}
                />
              ),
              checkpoint: <>File exists; note the deliberate mess — an empty temperature and a non-numeric one.</>,
            },
            {
              title: 'Create the middle layer: transform.py',
              body: (
                <CodeBlock
                  label="python — src/realpy/transform.py"
                  code={`"""Cleaning logic. Middle layer: may import realpy.io, never realpy.cli."""


def parse_line(line):
    """Parse 'station,date,temp' into a (station, date, temp_c) tuple."""
    station, date, raw_temp = line.split(",")
    return station, date, float(raw_temp)


def clean(lines):
    """Parse every line; return (records, rejected_count)."""
    records = []
    rejected = 0
    for line in lines:
        try:
            records.append(parse_line(line))
        except ValueError:
            rejected += 1
    return records, rejected`}
                />
              ),
              checkpoint: <>File exists. Pure logic — no printing, no file access; that purity pays off in 1.2.5.</>,
            },
            {
              title: 'Create the top layer: cli.py',
              body: (
                <CodeBlock
                  label="python — src/realpy/cli.py"
                  code={`"""Command-line entry point. Top layer: imports the layers below."""

from realpy.io import load_raw
from realpy.transform import clean


def main() -> None:
    lines = load_raw()
    records, rejected = clean(lines)
    print(f"realpy clean: kept {len(records)} of {len(lines)} lines ({rejected} rejected)")


if __name__ == "__main__":
    main()`}
                />
              ),
              checkpoint: <>File exists; imports are absolute and point only downward.</>,
            },
            {
              title: 'Rewire the package and the entry point',
              body: (
                <>
                  <p>Slim <code>__init__.py</code> to identity only, and point the script at the new top layer:</p>
                  <CodeBlock label="python — src/realpy/__init__.py" code={`"""realpy: clean messy weather records."""

__version__ = "0.2.0"`} />
                  <CodeBlock label="toml — pyproject.toml (section)" code={`[project.scripts]
clean = "realpy.cli:main"`} />
                </>
              ),
              checkpoint: <>The old <code>main()</code> in <code>__init__.py</code> is gone; the script targets <code>realpy.cli:main</code>.</>,
            },
            {
              title: 'Run both ways',
              commands: [{ ps: 'uv run clean\nuv run python -m realpy.cli' }],
              checkpoint: <>Both print exactly <code>realpy clean: kept 3 of 5 lines (2 rejected)</code> — console script and <code>-m</code> reach the same installed package.</>,
            },
            {
              title: 'Break it on purpose: manufacture a circular import',
              body: (
                <p>
                  Add <code>from realpy.cli import main</code> to the top of <code>transform.py</code> and run again:
                </p>
              ),
              commands: [{ ps: 'uv run clean' }],
              checkpoint: <>The traceback says <code>partially initialized module</code>. Delete the line; confirm <code>uv run clean</code> works again.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Why does importing the same module twice not re-run its code?',
              options: [
                'Python compares file timestamps and skips unchanged files',
                'The first import registers the module object in sys.modules; later imports are dictionary lookups',
                'The interpreter inlines the module into the caller',
                'It does re-run, but prints are suppressed',
              ],
              answer: 1,
              explain:
                'sys.modules is a name-to-module dict checked before any file search. One process, one execution per module — which is why module-level state behaves like a process-global singleton.',
            },
            {
              q: 'What does if __name__ == "__main__": actually test?',
              options: [
                'Whether the file is named main.py',
                'Whether the module is being executed directly (name is __main__) rather than imported (name is its dotted path)',
                'Whether the function main() has been defined',
                'Whether the script runs with administrator rights',
              ],
              answer: 1,
              explain:
                'Direct execution names the module __main__; import names it by dotted path. The idiom keeps "run as a program" behavior out of library contexts — importing cli.py must not launch the pipeline.',
            },
            {
              q: 'python -m realpy.cli works but python src\\realpy\\cli.py crashes on its imports. Why?',
              options: [
                'The -m flag enables absolute imports',
                'Running a file by path puts the file\'s folder on sys.path instead of the package root, so "realpy" is not findable',
                'Windows path separators confuse the interpreter',
                'cli.py must be renamed __main__.py first',
              ],
              answer: 1,
              explain:
                'Path-running inserts the file\'s parent folder on the search path — inside which no top-level "realpy" exists. -m resolves through the import system, where the installed package is visible.',
            },
            {
              q: 'The error "cannot import name X from partially initialized module" means:',
              options: [
                'The module file is corrupted on disk',
                'A circular import: the module was registered in sys.modules but its body had not finished executing when someone imported from it',
                'X is a private name starting with an underscore',
                'The package was installed without its dependencies',
              ],
              answer: 1,
              explain:
                'Registration happens before execution, so a cycle hands the second importer a real but incomplete module. The cure is structural — one-way layering — not import gymnastics.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Walk me through what happens when Python executes "import x".',
            a: (
              <p>
                Check <code>sys.modules</code>; on a hit, bind and stop. Otherwise the finders locate a spec, Python
                creates the module object, <em>registers it in the cache first</em>, executes the body against the
                module's namespace, then binds the name. Strong answers mention cache-before-execution — it explains
                both run-once semantics and the circular-import failure mode.
              </p>
            ),
          },
          {
            q: 'How do you resolve a circular import?',
            a: (
              <p>
                Treat it as an architecture smell, not a syntax puzzle: extract the shared piece into a lower module
                both sides import, or invert the dependency so imports flow one way. Deferring an import into a
                function body is a tourniquet; the honest fix redraws the module boundaries.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Module = file, package = folder with <code>__init__.py</code>; importing runs a file once and hands every importer the same cached object.</>,
          <><code>sys.path</code> is where imports come from; <code>sys.modules</code> is why they run once. Most import mysteries dissolve into one of the two.</>,
          <>Run package code with the console script or <code>python -m</code> — never by file path, which sidesteps the package and breaks absolute imports.</>,
          <>Layer pipeline code io / transform / cli with imports pointing strictly downward — circular imports become structurally impossible.</>,
          <><code>if __name__ == "__main__":</code> separates "run as a program" from "imported as a library"; absolute imports are our one spelling everywhere.</>,
        ]}
      />
    </>
  )
}
