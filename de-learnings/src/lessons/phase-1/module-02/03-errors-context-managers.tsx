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

const ID = '1.2.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Failure is a feature you design">
        <Tiered
          layman={
            <>
              <p>
                Two humble household safety devices are worth studying. The <strong>circuit breaker</strong>: when
                wiring faults, it trips loudly, at one designed spot, telling you which circuit died — no quiet
                toaster fires. The <strong>door-closer</strong>: a spring arm shuts the door behind every person,
                every time, however distracted. Nobody has to remember.
              </p>
              <p>
                Good programs copy both. Exceptions are circuit breakers: stop at a designed point with a clear
                label instead of letting damage spread silently. Context managers are door-closers: cleanup happens
                automatically, even when things go wrong mid-step. This lesson installs both into realpy.
              </p>
            </>
          }
          student={
            <>
              <p>
                A <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> meets two kinds of failure.{' '}
                <strong>Expected</strong> ones — a malformed record — are data: reject, count, keep going.{' '}
                <strong>Unexpected</strong> ones — a typo'd key, a wrong type — are bugs: crash loudly. Blur the two
                and you either die on every dirty row or, far worse, swallow bugs with{' '}
                <code>except Exception: pass</code> and publish silently wrong data — the cardinal sin of DE.
              </p>
              <p>
                The tools: a <em>custom exception hierarchy</em> to catch "errors realpy raises on purpose" and
                nothing else; <code>raise ... from</code> to keep the low-level cause; <code>with</code> blocks so
                resources are released on every path.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The deeper idea is <em>invariants by construction</em>. "The file is always closed" can be a
                discipline (everyone remembers <code>close()</code> on every path) or a structural guarantee. C++
                calls this RAII — resources bound to scope, released deterministically by destructors. Python's GC
                makes no timing promise, so the language reintroduces determinism syntactically: <code>__exit__</code>{' '}
                is the destructor you can rely on.
              </p>
              <p>
                Exceptions are a structured alternative to error codes: failure travels by stack unwinding and cannot
                be ignored by accident, unlike a C return code every caller must remember to check. Rust's{' '}
                <code>Result</code> makes checking compulsory at compile time — a different point in the same space.
                Chaining preserves causal history that error codes lose entirely.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="A vocabulary of failure: custom exceptions and raise from">
        <Tiered
          layman={
            <>
              <p>
                A generic "something broke" note is useless at 3am. Hospitals triage with labeled categories; your
                library should too. realpy gets a family of failure labels: a base ("a realpy problem") and specific
                ones underneath ("this line would not parse"). Users can ask for "realpy problems" without being
                buried in unrelated ones.
              </p>
              <p>
                When one problem causes another — deep reason "not a number", surface symptom "line 3 rejected" —
                Python staples the two notes together, so whoever debugs sees the whole chain, not just the last
                page.
              </p>
            </>
          }
          student={
            <>
              <p>
                Define a base <code>RealpyError(Exception)</code>; subclass per failure kind (<code>ParseError</code>,
                later <code>FetchError</code>...). Catch the base at the boundary (the CLI), subclasses where you can
                genuinely recover. Because the hierarchy is <em>yours</em>, catching it can never swallow a{' '}
                <code>TypeError</code> bug or a <code>KeyboardInterrupt</code> — the fatal flaw of bare excepts.
              </p>
              <p>
                <code>raise ParseError(...) from exc</code> re-raises at the right abstraction level while preserving
                the cause: the traceback shows both, joined by "The above exception was the direct cause of...".
                Domain-level error for control flow, root cause for debugging — never choose between them.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Chaining has two channels. <code>raise X from Y</code> sets <code>X.__cause__</code> (explicit
                translation); raising <em>during</em> an <code>except</code> block sets <code>__context__</code>{' '}
                (implicit). Tracebacks render the two differently; <code>raise X from None</code> suppresses
                irrelevant context. Exception groups (3.11) extend the model to concurrent failures.
              </p>
              <p>
                Hierarchy design mirrors API design: the base class is a stable contract, subclasses are extension
                points — the stdlib's <code>OSError</code> tree is the model. Pipelines copy it so retry logic
                (Phase 2, <GlossaryTerm k="idempotency">idempotent</GlossaryTerm> re-runs) can tell transient from
                permanent failures by type alone.
              </p>
            </>
          }
        />
        <CodeRunner
          language="python"
          code={`class RealpyError(Exception):
    """Base for everything realpy raises on purpose."""

class ParseError(RealpyError):
    def __init__(self, line_no, line, reason):
        super().__init__(f"line {line_no}: {reason}: {line!r}")
        self.line_no = line_no

def parse_temp(line_no, raw):
    try:
        return float(raw)
    except ValueError as exc:
        raise ParseError(line_no, raw, "not a number") from exc

try:
    parse_temp(3, "7.5C")
except RealpyError as err:        # catching the base catches subclasses
    print("caught:", err)
    print("cause :", repr(err.__cause__))   # original ValueError, preserved`}
        />
      </Section>

      <Section kicker="core concepts" title="Context managers: cleanup you cannot forget">
        <Tiered
          layman={
            <>
              <p>
                A <code>with</code> block is a door-closer contract: "on the way in, set things up; on the way out —{' '}
                <em>any</em> way out — put them away." Finish normally? Door closes. Trip halfway (an error)? Door
                still closes. The person walking through cannot forget, because closing isn't their job anymore.
              </p>
              <p>
                Files are the classic case: open one inside a <code>with</code>, and it is guaranteed closed. But the
                pattern fits any setup/teardown pair: start a stopwatch / print elapsed; borrow a connection / return
                it; lock / unlock.
              </p>
            </>
          }
          student={
            <>
              <p>
                The protocol is two methods: <code>__enter__</code> runs at the top of the <code>with</code> (its
                return binds to <code>as x</code>); <code>__exit__(exc_type, exc, tb)</code> runs on every exit path.
                If the body raised, the details arrive as arguments; return <code>False</code> to propagate (almost
                always correct), <code>True</code> to swallow (rare, deliberate).
              </p>
              <p>
                Writing a class per pair is boilerplate, so <code>contextlib.contextmanager</code> converts a
                generator: code before <code>yield</code> is enter, code after is exit — and try/finally around the{' '}
                <code>yield</code> makes teardown unconditional on success, exception, or early return.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Run the protocol demo and watch the ordering: enter, body, exit — in the failure case, exit{' '}
                <em>before</em> the exception continues unwinding. <code>with</code> desugars to try/finally, so its
                guarantee is exactly <code>finally</code>'s: the only escapes are process death (kill -9, power
                loss), which is why Phase 2 crash-safety comes from idempotent design, not cleanup code.
              </p>
              <p>
                The generator form: <code>@contextmanager</code> advances your generator once at enter, then either{' '}
                <code>next()</code>s it (success) or <code>throw()</code>s the body's exception <em>into it at the
                yield point</em> — which is why code before/after <code>yield</code> behaves as enter/exit, and why
                the try/finally around the yield is load-bearing.
              </p>
            </>
          }
        />
        <CodeRunner
          language="python"
          code={`class Managed:
    def __enter__(self):
        print("enter: acquire")
        return "RESOURCE"
    def __exit__(self, exc_type, exc, tb):
        print("exit: release, exc_type =", exc_type)
        return False          # False = let exceptions propagate

with Managed() as r:
    print("body used", r)
try:
    with Managed():
        raise ValueError("boom")
except ValueError as e:
    print("caught outside:", e, "- but exit had already run")`}
        />
        <p>The lab's <code>timing.py</code> below is the complete generator-form example.</p>
      </Section>

      <Section kicker="trade-offs" title="EAFP vs LBYL: try first, or check first?">
        <p>
          Two idioms for risky operations: <strong>EAFP</strong> ("easier to ask forgiveness than permission" — try it, handle the exception) and <strong>LBYL</strong> ("look before you leap" — check first, then act).
        </p>
        <Tradeoffs
          options={[
            {
              name: 'EAFP: try, then handle',
              strengths: ['One code path — the operation itself is the check, so logic and validation cannot drift apart', 'Atomic: no gap between checking and acting for the world to change in'],
              weaknesses: ['Exceptions as flow control read oddly to newcomers', 'A too-broad except can hide real bugs if you are sloppy about types'],
              chooseWhen: 'parsing records: float(raw) already detects every bad case — pre-checking would duplicate the parser badly.',
            },
            {
              name: 'LBYL: check, then act',
              strengths: ['Reads as explicit preconditions — intent visible up front', 'Can check cheaply before an expensive or irreversible action'],
              weaknesses: ['Check-then-act races: the file that existed a millisecond ago may be gone now', 'The check logic can drift from what the operation actually requires'],
              chooseWhen: 'guarding expensive work: verify a watermark or that an input partition exists before launching an hour-long backfill.',
            },
          ]}
          note={
            <>
              Rule of thumb: <em>per-record</em> failures are EAFP (realpy's <code>clean()</code>); <em>per-run</em>{' '}
              preconditions are LBYL — failing before doing any work beats failing halfway through it.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: realpy learns to fail well">
        <Lab
          lessonId={ID}
          intro={
            <p>
              realpy gains a failure vocabulary, a timing tool, and rejection-with-cause — all files in{' '}
              <code>C:\de-lab\realpy\src\realpy\</code>.
            </p>
          }
          steps={[
            {
              title: 'Create errors.py and timing.py',
              body: (
                <>
                  <CodeBlock
                    label="python — src/realpy/errors.py"
                    code={`"""realpy's failure vocabulary. Catch RealpyError to catch anything we raise."""


class RealpyError(Exception):
    """Base class for every error realpy raises on purpose."""


class ParseError(RealpyError):
    def __init__(self, line_no, line, reason):
        super().__init__(f"line {line_no}: {reason}: {line!r}")
        self.line_no = line_no`}
                  />
                  <CodeBlock
                    label="python — src/realpy/timing.py"
                    code={`import time
from contextlib import contextmanager


@contextmanager
def timer(label):
    start = time.perf_counter()
    try:
        yield
    finally:
        ms = (time.perf_counter() - start) * 1000
        print(f"{label} took {ms:.1f} ms")`}
                  />
                </>
              ),
              checkpoint: <>Both files exist; the <code>finally</code> around the report is what makes the timer unconditional.</>,
            },
            {
              title: 'Upgrade transform.py: reject with a cause',
              body: (
                <CodeBlock
                  label="python — src/realpy/transform.py"
                  code={`from realpy.errors import ParseError


def parse_line(line_no, line):
    try:
        station, date, raw_temp = line.split(",")
        return station, date, float(raw_temp)
    except ValueError as exc:
        raise ParseError(line_no, line, "expected station,date,numeric-temp") from exc


def clean(lines):
    """Parse every line; return (records, rejected_count). EAFP per record."""
    records = []
    rejected = 0
    for line_no, line in enumerate(lines, start=1):
        try:
            records.append(parse_line(line_no, line))
        except ParseError:
            rejected += 1
    return records, rejected`}
                />
              ),
              checkpoint: <><code>parse_line</code> raises <code>ParseError ... from exc</code>; <code>clean</code> catches only <code>ParseError</code> — a bug would still crash loudly.</>,
            },
            {
              title: 'Wire the CLI: catch at the boundary, time the transform',
              body: (
                <CodeBlock
                  label="python — src/realpy/cli.py"
                  code={`from realpy.errors import RealpyError
from realpy.io import load_raw
from realpy.timing import timer
from realpy.transform import clean


def main() -> None:
    try:
        lines = load_raw()
        with timer("clean"):
            records, rejected = clean(lines)
        print(f"realpy clean: kept {len(records)} of {len(lines)} lines ({rejected} rejected)")
    except RealpyError as exc:
        print(f"realpy failed: {exc}")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()`}
                />
              ),
              commands: [{ ps: 'uv run clean' }],
              checkpoint: <>The only <code>except</code> in the CLI names <code>RealpyError</code> — never bare. Running prints two lines: <code>clean took ... ms</code> (the timer) then <code>realpy clean: kept 3 of 5 lines (2 rejected)</code>. Rejections are counted, not fatal.</>,
            },
            {
              title: 'Prove the chain survives',
              body: <p>Temporarily replace <code>rejected += 1</code> in <code>clean</code> with <code>raise</code> and run <code>uv run clean</code>.</p>,
              checkpoint: <>The traceback shows the <code>ValueError</code>, then "The above exception was the direct cause of...", then <code>ParseError: line 2</code>. Revert; re-run shows <code>kept 3 of 5</code>.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Why give realpy its own RealpyError base class instead of raising ValueError everywhere?',
              options: [
                'Custom exceptions are faster to raise',
                'Callers can catch exactly "errors realpy raises on purpose" without also swallowing unrelated bugs',
                'Python requires libraries to define custom exceptions',
                'It makes tracebacks shorter',
              ],
              answer: 1,
              explain:
                'except RealpyError is precise: a TypeError from a genuine bug sails through to the traceback. except ValueError would also catch ValueErrors from any unrelated code inside the try — including your bugs.',
            },
            {
              q: 'What does "raise ParseError(...) from exc" preserve that a plain raise would obscure?',
              options: [
                'The memory address of the original exception',
                'The causal chain: the traceback shows the original low-level error as the direct cause of the domain-level one',
                'The ability to retry the operation',
                'Nothing — from is purely stylistic',
              ],
              answer: 1,
              explain:
                'from sets __cause__, and the traceback prints both errors joined by "was the direct cause of". You keep the domain-level type for control flow and the root cause for 3am debugging.',
            },
            {
              q: 'A with-block body raises. What happens to __exit__?',
              options: [
                'It is skipped — exceptions bypass cleanup',
                'It runs, receiving the exception details; returning False lets the exception continue propagating',
                'It runs only if the exception is caught somewhere',
                'It runs twice — once for the error, once for cleanup',
              ],
              answer: 1,
              explain:
                'Exit always runs (with desugars to try/finally) and gets (exc_type, exc, tb). Return False to propagate — the near-universal choice; returning True swallows the exception, which is rare and must be deliberate.',
            },
            {
              q: 'Parsing millions of possibly-dirty records: why does EAFP beat LBYL?',
              options: [
                'Exceptions are faster than if-statements in every case',
                'A pre-check would have to duplicate the parser\'s logic and can still miss cases — trying the parse IS the complete check',
                'LBYL cannot handle numeric data',
                'EAFP uses less memory',
              ],
              answer: 1,
              explain:
                'float(raw) already detects every malformed value; a regex pre-check would drift from float\'s real rules. Try it, catch the narrow failure, count the reject. LBYL earns its keep for per-run preconditions instead.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How do you design error handling for a data pipeline?',
            a: (
              <p>
                Separate expected data failures from bugs: reject, count, and log unparseable records near the data,
                keep the run alive; let bugs crash loudly. Mechanically: a custom hierarchy caught at the boundary,{' '}
                <code>raise from</code> to keep causes, narrow excepts, reject counts surfaced as metrics so silent
                data loss is impossible.
              </p>
            ),
          },
          {
            q: 'Explain context managers beyond "with open(...)".',
            a: (
              <p>
                A scoped invariant: <code>__enter__</code> establishes a state, <code>__exit__</code> restores it on
                every exit path, because <code>with</code> desugars to try/finally. Strong answers write one via{' '}
                <code>@contextmanager</code>, note that <code>__exit__</code> chooses propagation via its return
                value, and name non-file uses: timers, locks, connection pools.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Two failure kinds: expected dirty data (reject, count, continue) and bugs (crash loudly). Never blur them with broad excepts.</>,
          <>A custom hierarchy (<code>RealpyError</code> and children) lets callers catch your failures precisely — bugs still surface.</>,
          <><code>raise X from exc</code> keeps the causal chain: domain error for control flow, root cause for debugging.</>,
          <><code>with</code> = try/finally with names: <code>__enter__</code> / <code>__exit__</code> guarantee cleanup on every exit path; <code>@contextmanager</code> + try/finally around the <code>yield</code> is the quick way to write one.</>,
          <>EAFP for per-record operations (the attempt is the check); LBYL for per-run preconditions (fail before the expensive work).</>,
        ]}
      />
    </>
  )
}
