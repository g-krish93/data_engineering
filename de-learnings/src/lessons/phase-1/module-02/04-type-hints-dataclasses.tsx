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

const ID = '1.2.4'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Luggage tags that a scanner can verify">
        <Tiered
          layman={
            <>
              <p>
                An airport moves millions of bags because every bag wears a tag saying what it is and where it
                belongs — and scanners <em>check</em> those tags at every belt junction. Without them, bags still
                move; a Berlin bag just lands in Bangkok and nobody notices until a person opens it.
              </p>
              <p>
                Type hints are luggage tags for data: this function takes "a list of numbers", returns "a
                temperature". Python itself ignores the tags while running — but a <em>checker</em> program reads
                your whole codebase and flags every junction where a tag mismatches, before you ever run it. In data
                work, where a mislabeled bag is a corrupted column, that pre-flight scan is gold.
              </p>
            </>
          }
          student={
            <>
              <p>
                Annotations are syntax for declaring shapes: <code>def mean(values: list[float]) -&gt; float</code>,{' '}
                <code>counts: dict[str, int]</code>, <code>temp: float | None</code>. At runtime they are inert
                metadata — Python stores them and moves on. The value comes from a static checker (we use{' '}
                <strong>pyright</strong>) that reads them and reports every inconsistent call, assignment, and
                return across the codebase in seconds — a whole class of production bugs moved to edit time.
              </p>
              <p>
                For a <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm>, the highest-value hint is the{' '}
                <em>row shape</em>. A raw <code>tuple</code> or <code>dict</code> says nothing; a{' '}
                <code>WeatherRecord</code> dataclass with named, typed fields is a{' '}
                <GlossaryTerm k="schema">schema</GlossaryTerm> in miniature — the same idea as a table schema,
                enforced by tools instead of tribal memory. This lesson gives realpy exactly that.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Python implements <em>gradual typing</em> (Siek &amp; Taha, 2006): typed and untyped code coexist,
                with an implicit <code>Any</code> at the boundary that silences the checker in both directions.
                Annotations are erased at runtime — no performance change, no enforcement — so "type safety" is
                exactly as strong as your checker coverage. The checker is deliberately unsound at the edges
                (<code>Any</code>, casts, third-party stubs) and incomplete in the middle; it is a bug-finder with a
                contract, not a proof system.
              </p>
              <p>
                Python's checkers are mostly <em>nominal</em> (a <code>WeatherRecord</code> is what its class says)
                with an opt-in <em>structural</em> escape hatch: <code>typing.Protocol</code> types by shape ("has a{' '}
                <code>fetch()</code> method"), like Go interfaces — you will use it in Phase 1's capstone to inject
                fake data sources into tests. Runtime validation (pydantic) is a different animal: it{' '}
                <em>executes</em> checks on real data, catching what static analysis by construction cannot — the
                shape of bytes arriving from outside.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Annotations: read by tools, ignored by the interpreter">
        <Tiered
          layman={
            <>
              <p>
                The crucial (and initially confusing) fact: Python does not enforce the tags. Hand a function "a
                dictionary" where the tag says "list of numbers" and Python will happily try — and sometimes
                produce a plausible-looking wrong answer, which is far worse than a crash.
              </p>
              <p>
                Run the demo below. The wrong call does not error — it returns a clean-looking <code>15.0</code>{' '}
                computed from nonsense. Only the scanner (the checker) would have told you. That is the whole
                argument for running one.
              </p>
            </>
          }
          student={
            <>
              <p>
                Modern syntax, all lowercase, no imports needed: <code>list[str]</code>,{' '}
                <code>dict[str, float]</code>, <code>tuple[str, int]</code>, and unions with the pipe —{' '}
                <code>float | None</code> is "a float or nothing". <code>X | None</code> is the workhorse: the
                checker then forces every caller to handle the <code>None</code> branch before using the value,
                which converts "forgot the empty case" from a 3am page into a red squiggle.
              </p>
              <p>
                Where hints pay rent in pipeline code: function signatures at module boundaries (io, transform,
                cli), row shapes, and return types of anything that can fail (<code>-&gt; WeatherRecord | None</code>
                ). Inside a short function body, let inference do the work — annotating every local is noise, not
                safety.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Erasure is literal: annotations evaluate to objects stashed in <code>__annotations__</code> and
                nothing else consults them. The demo prints that dict — it is ordinary, inspectable data, which is
                exactly how runtime-validation libraries bootstrap themselves: pydantic reads the same annotations
                the static checker reads, but compiles them into validators that execute against incoming data.
              </p>
              <p>
                The dict call in the demo shows why "it ran" is weak evidence: iterating a dict yields keys, so{' '}
                <code>sum</code> and <code>len</code> both "work" and the function returns a well-typed float from a
                type-invalid premise. Static checking rejects the premise itself — the call site — which no amount
                of testing <code>mean</code> in isolation would catch.
              </p>
            </>
          }
        />
        <CodeRunner
          language="python"
          code={`def mean(values: list[float]) -> float:
    return sum(values) / len(values)

print(mean([20.1, 21.7, 19.4]))     # intended use
print(mean.__annotations__)         # hints are just data on the function

# Nothing stops a wrong call at runtime - a checker flags this line:
print(mean({10: "a", 20: "b"}))     # sums the KEYS: plausible nonsense, 15.0`}
        />
      </Section>

      <Section kicker="core concepts" title="Dataclasses: the row shape for everything that follows">
        <Tiered
          layman={
            <>
              <p>
                A weather reading is three facts that belong together: which station, which day, what temperature.
                You could carry them as a bare list — position 0, position 1, position 2 — and trust everyone to
                remember the order forever. Or you could put them on a printed form with labeled boxes.
              </p>
              <p>
                A dataclass is that form: you list the labeled boxes once, and Python builds the paperwork —
                construction, printing, comparison — automatically. Mark the form "do not amend" (
                <code>frozen=True</code>) and filled-in forms can be passed around freely, with no fear that some
                distant code quietly edits a temperature in place.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>@dataclass</code> generates <code>__init__</code>, <code>__repr__</code>, and{' '}
                <code>__eq__</code> from the field list — the boilerplate you would otherwise hand-write for every
                record type. Defaults are per-field; for mutable defaults you <em>must</em> use{' '}
                <code>field(default_factory=list)</code>, because a plain <code>= []</code> would be evaluated once
                and shared by every instance — a classic Python trap the dataclass machinery refuses to let you
                fall into (it raises at class definition).
              </p>
              <p>
                <code>frozen=True</code> makes instances immutable: assignments raise, and records become hashable
                (usable in sets and as dict keys). For pipeline rows, immutability is the right default —
                transforms produce <em>new</em> records instead of mutating shared ones, which kills a whole
                category of aliasing bugs and makes steps trivially parallelizable later.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The record-type design space: <code>tuple</code> (positional, no names),{' '}
                <code>TypedDict</code> (names + static types over plain dicts — zero runtime cost, zero runtime
                identity), <code>dataclass</code> (nominal class, generated methods, optional immutability),{' '}
                <code>attrs</code> (the dataclass's feature-rich ancestor), pydantic (runtime validation +
                serialization). The axis is how much checking happens and when: static-only on the left, executed
                validation on the right, with dataclasses the pragmatic middle.
              </p>
              <p>
                <code>frozen=True</code> approximates value semantics: with <code>__eq__</code> and{' '}
                <code>__hash__</code> derived from fields, records behave like the immutable rows of relational
                algebra — dedupe with a <code>set</code>, group by hashing — as analytical engines treat rows:
                values, not objects with identity. (Immutability is shallow: a frozen dataclass holding a list
                still holds a mutable list.)
              </p>
            </>
          }
        />
        <CodeRunner
          language="python"
          code={`from dataclasses import dataclass, asdict

@dataclass(frozen=True)
class WeatherRecord:
    station: str
    date: str
    temp_c: float

r = WeatherRecord("BER", "2024-01-01", 7.5)
print(r)                                             # repr for free
print(r == WeatherRecord("BER", "2024-01-01", 7.5))  # value equality for free
print(asdict(r))                                     # dict view for serialization

try:
    r.temp_c = 99.9
except Exception as e:
    print("mutation blocked:", type(e).__name__)`}
        />
        <Callout kind="warn" title="The mutable-default trap">
          <code>records: list[str] = []</code> as a field default would be one list shared by every instance —
          dataclasses refuse it at definition time; write <code>field(default_factory=list)</code> instead. The same
          bug lurks unwarned in function defaults (<code>def f(x, acc=[])</code>).
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Row shape: dataclass vs raw dict vs pydantic">
        <Tradeoffs
          options={[
            {
              name: 'Raw dict',
              strengths: ['Zero ceremony — matches JSON one-to-one, instant to create', 'Flexible when the shape genuinely varies record to record'],
              weaknesses: ['Typos in keys fail at runtime, deep in the pipeline, or never', 'No single place that documents what a "record" contains'],
              chooseWhen: 'exploration and truly schema-less payloads you pass through without touching.',
            },
            {
              name: 'Dataclass (our default)',
              strengths: ['Named, typed, checker-verified fields; free init/repr/eq; frozen immutability', 'Stdlib — zero dependencies, fast, and pyright understands it deeply'],
              weaknesses: ['No runtime validation: a str smuggled into temp_c at a boundary walks right in', 'Schema evolution is manual (add fields, update call sites)'],
              chooseWhen: 'internal row shapes between your own pipeline stages — data you already parsed.',
            },
            {
              name: 'Pydantic model',
              strengths: ['Validates and coerces real data at runtime — catches what static checks cannot', 'Serialization, JSON Schema export, rich error reports built in'],
              weaknesses: ['A dependency with real import and validation cost per record', 'Easy to overuse: validating the same data at every stage buys nothing twice'],
              chooseWhen: 'the trust boundary — parsing external input: API responses, configs, user files (Phase 2).',
            },
          ]}
          note={
            <>
              The pattern that scales: <em>validate once at the boundary (pydantic territory), then pass typed
              records (dataclasses) internally</em>. Static types guard your code against itself; runtime validation
              guards it against the outside world.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: annotate realpy, then let pyright judge it">
        <Lab
          lessonId={ID}
          intro={
            <p>
              realpy gets its permanent row shape and full annotations — then a type checker verifies the whole
              package. Work in <code>C:\de-lab\realpy</code>.
            </p>
          }
          steps={[
            {
              title: 'Create the row shape: models.py',
              body: (
                <CodeBlock
                  label="python — src/realpy/models.py"
                  code={`from dataclasses import dataclass


@dataclass(frozen=True)
class WeatherRecord:
    """One cleaned weather reading. The row shape for all of Phase 1."""
    station: str
    date: str
    temp_c: float`}
                />
              ),
              checkpoint: <>File exists; <code>frozen=True</code> — transforms will build new records, never mutate.</>,
            },
            {
              title: 'Make the transform produce WeatherRecords, fully annotated',
              body: (
                <CodeBlock
                  label="python — src/realpy/transform.py"
                  code={`from realpy.errors import ParseError
from realpy.models import WeatherRecord


def parse_line(line_no: int, line: str) -> WeatherRecord:
    try:
        station, date, raw_temp = line.split(",")
        return WeatherRecord(station=station, date=date, temp_c=float(raw_temp))
    except ValueError as exc:
        raise ParseError(line_no, line, "expected station,date,numeric-temp") from exc


def clean(lines: list[str]) -> tuple[list[WeatherRecord], int]:
    records: list[WeatherRecord] = []
    rejected = 0
    for line_no, line in enumerate(lines, start=1):
        try:
            records.append(parse_line(line_no, line))
        except ParseError:
            rejected += 1
    return records, rejected`}
                />
              ),
              checkpoint: <>Signatures now say exactly what flows in and out: <code>list[str]</code> to <code>tuple[list[WeatherRecord], int]</code>.</>,
            },
            {
              title: 'Annotate the remaining signatures',
              body: (
                <p>
                  In <code>io.py</code>: <code>def load_raw() -&gt; list[str]:</code>. In <code>errors.py</code>:{' '}
                  <code>def __init__(self, line_no: int, line: str, reason: str) -&gt; None:</code>.{' '}
                  <code>cli.py</code> already has <code>-&gt; None</code>. Confirm with <code>uv run clean</code>.
                </p>
              ),
              checkpoint: <>Still prints <code>kept 3 of 5 lines (2 rejected)</code> — annotations changed nothing at runtime.</>,
            },
            {
              title: 'Seed a bug that runs but is wrong',
              body: (
                <p>
                  In <code>cli.py</code>, temporarily replace <code>lines = load_raw()</code> with{' '}
                  <code>lines = "BER,2024-01-01,7.5"</code>. A string is iterable, so <code>clean</code> will
                  "work" — on the eighteen individual characters:
                </p>
              ),
              commands: [{ ps: 'uv run clean' }],
              checkpoint: (
                <>
                  It prints <code>kept 0 of 18 lines (18 rejected)</code>. No crash, wrong everything — precisely
                  the failure mode checkers exist for.
                </>
              ),
            },
            {
              title: 'Let pyright catch it, then fix it',
              body: <p>Run the checker via uvx (downloads on first use), then restore the original line and re-run:</p>,
              commands: [{ ps: 'uvx pyright src' }],
              checkpoint: (
                <>
                  First run: 1 error — <code>"str" is not assignable to "list[str]"</code> at the call to{' '}
                  <code>clean</code>. After reverting: <code>0 errors, 0 warnings, 0 informations</code>. That final
                  line is the lab's exit criterion.
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
              q: 'You call a function annotated values: list[float] with a dict. What does Python do at runtime?',
              options: [
                'Raises TypeError immediately',
                'Converts the dict to a list',
                'Runs anyway — annotations are inert metadata; only a static checker flags the call',
                'Prints a deprecation warning',
              ],
              answer: 2,
              explain:
                'Hints are erased at runtime: stored in __annotations__, enforced by nothing. The demo returned plausible nonsense (15.0). Enforcement is the checker\'s job, at edit/CI time.',
            },
            {
              q: 'Why frozen=True on WeatherRecord?',
              options: [
                'It makes attribute access faster',
                'Immutable records can be shared between pipeline stages without aliasing bugs, and become hashable for sets and dict keys',
                'It compresses the record in memory',
                'pyright requires frozen dataclasses',
              ],
              answer: 1,
              explain:
                'Transforms produce new records instead of mutating shared ones — no spooky action at a distance, and hashability enables dedupe via set(). Speed and memory are unchanged (slots would be the memory lever).',
            },
            {
              q: 'Where does pydantic genuinely beat a dataclass?',
              options: [
                'Internal records passed between your own functions',
                'At trust boundaries: it executes validation against external data, catching wrong shapes static checking cannot see',
                'Everywhere — it is strictly better',
                'When you need value equality between records',
              ],
              answer: 1,
              explain:
                'Static types cannot inspect bytes arriving at runtime from an API or file. Validate once at the boundary, then pass cheap typed dataclasses internally — validating the same data repeatedly buys nothing.',
            },
            {
              q: 'What does temp: float | None buy you over just float?',
              options: [
                'Nothing — None is already a float',
                'The checker forces every consumer to handle the None case before using the value',
                'It makes temp optional in the constructor',
                'It rounds the float when None is passed',
              ],
              answer: 1,
              explain:
                'The union is honest about absence, and pyright refuses arithmetic on float | None until you narrow it (if temp is not None). "Forgot the missing case" becomes a red squiggle instead of a 3am TypeError.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'TypedDict vs dataclass vs pydantic — how do you choose?',
            a: (
              <p>
                TypedDict when the data must stay a plain dict (JSON pass-through) but you want static key/type
                checking; dataclass for internal record types — named fields, generated methods, immutability, zero
                deps; pydantic at trust boundaries where bytes from outside must be validated and coerced at
                runtime. Strong answers name the pattern: validate once at the edge, typed records inside.
              </p>
            ),
          },
          {
            q: 'Python type hints do nothing at runtime — so what is the point?',
            a: (
              <p>
                The point is a static analysis pass over the whole codebase: checkers catch mismatched calls,
                missing None-handling, and wrong returns at edit time, and hints double as machine-verified
                documentation and IDE fuel. Gradual typing means you adopt incrementally; erasure means zero
                runtime cost. The honest caveat: coverage is only as good as your annotations, and Any is a hole by
                design.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Annotations are inert at runtime; a checker (pyright) turns them into edit-time bug detection across the codebase.</>,
          <>Core vocabulary: <code>list[str]</code>, <code>dict[str, float]</code>, <code>tuple[X, Y]</code>, and <code>X | None</code> — which forces None-handling at every use.</>,
          <>A dataclass is your row schema in miniature: named typed fields, free init/repr/eq — <code>WeatherRecord</code> is the shape for all of Phase 1, <code>frozen=True</code> so transforms build new rows.</>,
          <>Mutable defaults need <code>field(default_factory=...)</code> — the shared-default trap also lurks in function defaults.</>,
          <>Static types guard code against itself; runtime validation (pydantic) guards the trust boundary. Use each where it pays.</>,
        ]}
      />
    </>
  )
}
