import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeBlock } from '../../../components/CodeBlock'
import { CodeRunner } from '../../../components/CodeRunner'

const ID = '1.2.5'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Pipelines run at 3am. Tests are how you sleep.">
        <Tiered
          layman={
            <>
              <p>
                No chef serves 200 guests a dish nobody tasted. They taste while cooking — the sauce alone, the
                seasoning after each change — so problems surface in the kitchen, not at the table. Now imagine the
                banquet is cooked overnight by machines while you sleep. The only tastings that can protect you are
                the ones you wrote down in advance and made automatic.
              </p>
              <p>
                Tests are exactly that: small automatic tastings. Each one prepares a bite of input, runs your code
                on it, and checks the result — every time, in seconds, without you. When one fails, it names the
                dish and the difference. That is the difference between "I think it works" and "it is checked 50
                times a day".
              </p>
            </>
          }
          student={
            <>
              <p>
                A <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> runs unattended on a schedule, and its
                failures are asymmetric: a crash pages you at 3am, but <em>silently wrong data</em> flows into
                dashboards and decisions for weeks. Tests are the only mechanism that checks behavior{' '}
                <em>before</em> deployment, every time anything changes — your code, a dependency bump, a refactor.
                The suite is an executable specification: "clean() keeps valid rows and counts rejects" stops being
                a comment and becomes a fact re-verified on every run.
              </p>
              <p>
                We use <strong>pytest</strong>, the Python standard: tests are plain functions named{' '}
                <code>test_*</code> in files named <code>test_*.py</code>, assertions are the plain{' '}
                <code>assert</code> statement, and one command runs everything. Minimal ceremony is the point — the
                easier tests are to write, the more of them exist.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A test is a falsification attempt: it can prove the presence of a bug, never the absence. This is
                why <em>coverage is a vanity metric</em> — 100% line coverage with weak assertions proves only that
                code executes without crashing. Mutation testing inverts the question: inject small code mutations
                (flip a comparison, off-by-one a boundary) and check the suite <em>fails</em>; surviving mutants
                expose assertions that check nothing.
              </p>
              <p>
                Two ideas arrive later but deserve foreshadowing. <em>Property-based testing</em> (hypothesis):
                instead of enumerating cases, state invariants — for realpy, <code>len(records) + rejected ==
                len(lines)</code> for <em>any</em> input — and let the framework search hundreds of generated inputs
                for a counterexample, shrinking failures to minimal cases. And <em>test doubles via dependency
                injection</em>: Phase 1's capstone makes the HTTP fetch an injectable parameter precisely so tests
                can hand in a fake — the design-for-testability move that separates testable pipelines from
                untestable ones.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Anatomy of a test: arrange, act, assert">
        <Tiered
          layman={
            <>
              <p>
                Every good tasting has the same three beats: set out the ingredients (arrange), cook the one thing
                you are checking (act), compare against what should have happened (assert). One tasting, one claim
                — a test that checks five dishes at once tells you little when it fails.
              </p>
              <p>
                The robot tasters are found by name: any file starting with <code>test_</code>, any function
                starting with <code>test_</code>. Drop them in a <code>tests</code> folder and the runner finds and
                runs them all — no registration, no lists to maintain.
              </p>
            </>
          }
          student={
            <>
              <p>
                Discovery: pytest walks the project for <code>test_*.py</code> files and collects{' '}
                <code>test_*</code> functions. Assertions are plain <code>assert x == y</code> — on failure pytest
                shows both values, unpacking lists and dataclasses, so you see <em>what differed</em>, not just
                "False". Expected exceptions are their own assertion: <code>with pytest.raises(ParseError):</code>{' '}
                fails the test if the block does <em>not</em> raise. Run subsets while iterating with{' '}
                <code>-k</code> (name filter): <code>uv run pytest -k parse</code>.
              </p>
              <p>
                The habit that makes tests trustworthy: see them <em>fail first</em>. A test born green is
                unverified — maybe it asserts nothing, maybe it tests the wrong function. Red, then green, proves
                the test is wired to reality. Try it live below: the third case fails (tests can fail by raising,
                too); fix <code>clean_temp</code> (hint: <code>.replace(",", ".")</code>) and re-run until it
                passes.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Plain asserts give rich reports through <em>assertion rewriting</em>: at import time pytest rewrites
                the AST of test modules, replacing <code>assert a == b</code> with instrumented code that captures
                operand values before evaluation. No special <code>assertEquals</code> API needed — a nice example
                of metaprogramming buying ergonomics, and of why the mechanism only works in files pytest collects.
              </p>
              <p>
                Arrange-act-assert is a statement about causality: one behavior per test means a failure localizes
                the fault. Suites double as a <em>ratchet</em> — every fixed bug leaves behind the test that would
                have caught it, so the class of silent regressions shrinks monotonically. That property, not any
                single test, is what makes large refactors (and dependency upgrades) routine instead of terrifying.
              </p>
            </>
          }
        />
        <CodeRunner
          language="python"
          code={`def clean_temp(raw: str) -> float:
    return float(raw.strip())

def test_clean_temp():
    assert clean_temp(" 7.5 ") == 7.5      # arrange+act+assert in one line
    assert clean_temp("-3") == -3.0
    assert clean_temp("21,7") == 21.7      # European comma decimal - fails!

test_clean_temp()
print("all assertions passed")             # only prints once you fix clean_temp`}
        />
      </Section>

      <Section kicker="core concepts" title="Parametrize and fixtures: many cases, clean setups">
        <Tiered
          layman={
            <>
              <p>
                To taste twelve sauce variations you don't write twelve recipes — you write one tasting procedure
                and a table of variations. That is <em>parametrize</em>: one test body, a list of cases, each
                reported separately, so "variation 7 failed" is instant knowledge.
              </p>
              <p>
                And every tasting deserves a clean pan. A <em>fixture</em> hands each test fresh, private equipment
                — most usefully <code>tmp_path</code>, a brand-new temporary folder that appears for one test and
                is discarded after. Tests never touch your real files and never see each other's leftovers.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>@pytest.mark.parametrize("bad", [...])</code> runs the test once per value, each a separate
                pass/fail line — the difference between "one of my loop iterations failed somewhere" and a named
                failing case. Fixtures are arguments: declare <code>def test_x(tmp_path):</code> and pytest builds
                and injects a fresh <code>Path</code> to an empty directory. Writing a file there and reading it
                back gives you a <em>real</em> file-I/O test with zero cleanup code and zero global state.
              </p>
              <p>
                Together they cover the two test flavors realpy needs: pure-logic tests of{' '}
                <code>parse_line</code>/<code>clean</code> (fast, no I/O — the payoff of keeping transform pure in
                1.2.2) and a filesystem test of <code>read_file</code> against a real temp file.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Fixtures are a dependency-injection system: tests declare needs by parameter name; pytest resolves
                the graph (fixtures can require fixtures), instantiates respecting scopes (function, module,
                session), and finalizes in reverse order. <code>tmp_path</code> sits on this machinery. It is the
                same inversion of control you will use for injectable fetches — the test chooses the
                implementation, the code under test just declares a dependency.
              </p>
              <p>
                Parametrize is enumeration; property-based testing is search. Enumerated cases document specific
                intended behaviors; hypothesis-style generation explores the input space for violations of stated
                invariants and <em>shrinks</em> counterexamples to minimal reproductions. Mature suites use both:
                parametrize for contracts you can name, properties for the inputs you failed to imagine.
              </p>
            </>
          }
        />
        <CodeBlock
          label="python — the two tools in five lines each"
          code={`@pytest.mark.parametrize("bad", ["", "junk", "BER,2024-01-01,abc"])
def test_parse_line_rejects(bad):
    with pytest.raises(ParseError):
        parse_line(1, bad)

def test_read_file_roundtrip(tmp_path):        # tmp_path: injected fresh dir
    p = tmp_path / "raw.csv"
    p.write_text("BER,2024-01-01,7.5\\n", encoding="utf-8")
    assert read_file(p) == ["BER,2024-01-01,7.5"]`}
        />
      </Section>

      <Section kicker="trade-offs" title="Unit vs integration; test-first vs test-after">
        <Tradeoffs
          options={[
            {
              name: 'Unit tests (pure functions, no I/O)',
              strengths: ['Milliseconds per run — you run them constantly, so feedback is immediate', 'Failures localize to one function; no flaky external dependencies'],
              weaknesses: ['Prove parts work, not that the assembled pipeline works', 'Can ossify internal structure if they test implementation details'],
              chooseWhen: 'transform logic — realpy\'s parse/clean, and most of your future business logic.',
            },
            {
              name: 'Integration tests (real files, DBs, services)',
              strengths: ['Real confidence: the wiring, config, and SQL actually execute together', 'Catch the failures units cannot — schema drift, connection handling, bad assumptions between layers'],
              weaknesses: ['Seconds to minutes per run; need infrastructure (Docker) and data setup', 'Failures are diffuse — "something in the run broke" starts an investigation'],
              chooseWhen: 'the seams: end-to-end through a small dataset, against real engines (from Phase 2, in containers).',
            },
          ]}
          note={
            <>
              The classic pyramid: many fast unit tests, fewer integration tests, a handful end-to-end. On{' '}
              <em>when</em> to write them — test-first forces testable design and guarantees you saw red;
              test-after is fine for exploratory code you then harden. What is not fine is test-never, or tests
              written only after the 3am incident they would have prevented.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: a real suite for realpy">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will install pytest, test the transform, drive a new feature red-green, and test real file I/O
              with <code>tmp_path</code>. Work in <code>C:\de-lab\realpy</code>.
            </p>
          }
          steps={[
            {
              title: 'Install pytest as a dev dependency',
              commands: [{ ps: 'uv add --dev pytest\nuv run pytest' }],
              checkpoint: <>pytest runs and reports <code>no tests ran</code> — installed, discovering, nothing to find yet.</>,
            },
            {
              title: 'Write the transform tests',
              body: (
                <CodeBlock
                  label="python — tests/test_transform.py"
                  code={`import pytest

from realpy.errors import ParseError
from realpy.models import WeatherRecord
from realpy.transform import clean, parse_line


def test_parse_line_valid():
    rec = parse_line(1, "BER,2024-01-01,7.5")
    assert rec == WeatherRecord("BER", "2024-01-01", 7.5)


@pytest.mark.parametrize(
    "bad",
    ["", "BER,2024-01-01,", "BER,2024-01-01,abc", "no-commas-here"],
)
def test_parse_line_rejects(bad):
    with pytest.raises(ParseError):
        parse_line(1, bad)


def test_clean_counts_rejects():
    records, rejected = clean(["BER,2024-01-01,7.5", "junk"])
    assert len(records) == 1
    assert rejected == 1`}
                />
              ),
              commands: [{ ps: 'uv run pytest' }],
              checkpoint: <><code>6 passed</code> — one valid-parse, four parametrized rejects, one count test.</>,
            },
            {
              title: 'Red: specify a feature that does not exist yet',
              body: (
                <>
                  <p>Real feeds have stray spaces: <code>"BER , 2024-01-01 , 7.5"</code>. Specify the fix as a test first — append to <code>test_transform.py</code>:</p>
                  <CodeBlock
                    label="python — tests/test_transform.py (append)"
                    code={`def test_parse_line_strips_whitespace():
    rec = parse_line(1, "BER , 2024-01-01 , 7.5")
    assert rec == WeatherRecord("BER", "2024-01-01", 7.5)`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run pytest -k whitespace' }],
              checkpoint: <><code>1 failed</code> — and the report shows exactly why: <code>station='BER '</code> with a trailing space. Red confirmed: this test can detect the missing feature.</>,
            },
            {
              title: 'Green: implement it',
              body: (
                <>
                  <p>In <code>transform.py</code>, make <code>parse_line</code> strip each field:</p>
                  <CodeBlock
                    label="python — transform.py (the changed line)"
                    code={`        station, date, raw_temp = [part.strip() for part in line.split(",")]`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run pytest' }],
              checkpoint: <><code>7 passed</code> — the new test went red to green, and the six old ones prove you broke nothing.</>,
            },
            {
              title: 'Test real file I/O with tmp_path',
              body: (
                <>
                  <p>Add a file reader to <code>io.py</code>:</p>
                  <CodeBlock
                    label="python — src/realpy/io.py (append)"
                    code={`from pathlib import Path


def read_file(path: str | Path) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return [line.rstrip("\\n") for line in f]`}
                  />
                  <p>And its test:</p>
                  <CodeBlock
                    label="python — tests/test_io.py"
                    code={`from realpy.io import read_file


def test_read_file_roundtrip(tmp_path):
    p = tmp_path / "raw.csv"
    p.write_text("BER,2024-01-01,7.5\\nMUC,2024-01-02,3.1\\n", encoding="utf-8")
    assert read_file(p) == ["BER,2024-01-01,7.5", "MUC,2024-01-02,3.1"]`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run pytest' }],
              checkpoint: <><code>8 passed</code> — including a genuine write-then-read against a temp directory pytest created and will discard.</>,
            },
            {
              title: 'Run a subset while iterating',
              commands: [{ ps: 'uv run pytest -k parse' }],
              checkpoint: <><code>6 passed, 2 deselected</code> — <code>-k</code> filtered to the parse tests. This is your inner-loop command when working on one function.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'How does pytest find your tests?',
              options: [
                'You register each test in a pytest.toml manifest',
                'By naming convention: test_*.py files and test_* functions are collected automatically',
                'It runs every function in the project and records which ones assert',
                'Tests must subclass pytest.TestCase',
              ],
              answer: 1,
              explain:
                'Discovery is convention over registration — no lists to maintain, no base classes. (unittest uses TestCase; pytest collects plain functions.)',
            },
            {
              q: 'Why insist on seeing a new test fail before making it pass?',
              options: [
                'Failing first warms up the pytest cache',
                'A test born green is unverified — red proves it actually detects the behavior it claims to check',
                'pytest requires at least one failure per session',
                'It makes the coverage number more accurate',
              ],
              answer: 1,
              explain:
                'The whitespace test failed with station=\'BER \' before the fix — proof it was wired to the real behavior. A test that has never failed might assert nothing (a surviving mutant, in mutation-testing terms).',
            },
            {
              q: 'What does @pytest.mark.parametrize buy over a for-loop inside one test?',
              options: [
                'It runs the cases in parallel automatically',
                'Each case is reported as its own pass/fail, and remaining cases still run after one fails',
                'It is the only way to test multiple inputs',
                'It caches results between runs',
              ],
              answer: 1,
              explain:
                'A loop stops at the first failing assert and reports one opaque failure. Parametrize names each case — you learn "empty string fails, the others pass" at a glance.',
            },
            {
              q: 'What does the tmp_path fixture provide?',
              options: [
                'The path to the project\'s data directory',
                'A fresh temporary directory per test, isolated from other tests and cleaned up automatically',
                'A mocked filesystem that never touches disk',
                'A shared scratch folder reused across the whole session',
              ],
              answer: 1,
              explain:
                'Real disk, zero pollution: each test gets its own empty directory, so file tests are order-independent and leave nothing behind. It is a real filesystem — not a mock.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How do you test a data pipeline?',
            a: (
              <p>
                Layered: fast unit tests on pure transforms (the bulk), integration tests running the pipeline over
                a small fixture dataset against real engines in containers, and data-quality checks on outputs (row
                counts, nulls, ranges) because correct code can still receive garbage. Design for it: keep
                transforms pure and inject I/O dependencies so tests can substitute fakes.
              </p>
            ),
          },
          {
            q: 'Is 100% test coverage a goal worth pursuing?',
            a: (
              <p>
                No — coverage measures execution, not verification; you can hit 100% with assertions that check
                nothing. Better signals: critical paths covered, every fixed bug leaving a regression test, and
                assertions that would fail under mutation. Chasing the last percentage points buys ossified tests
                of trivial code instead of confidence.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Tests are the only check that runs before every deploy — for unattended pipelines they are the sleep aid, and silent wrongness is the enemy they exist for.</>,
          <>pytest = convention over ceremony: <code>test_*.py</code>, <code>test_*</code> functions, plain <code>assert</code> with rich failure output.</>,
          <>Arrange-act-assert, one behavior per test; <code>pytest.raises</code> asserts expected failures; <code>-k</code> runs subsets.</>,
          <>Red before green: a test you never saw fail is a test you cannot trust.</>,
          <><code>parametrize</code> turns case tables into named results; <code>tmp_path</code> gives real file I/O with zero pollution.</>,
          <>Pyramid: many fast unit tests on pure transforms, fewer integration tests at the seams; coverage is a vanity metric — assertion quality is not.</>,
        ]}
      />
    </>
  )
}
