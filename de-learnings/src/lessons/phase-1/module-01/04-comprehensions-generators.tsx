import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeRunner } from '../../../components/CodeRunner'
import { CodeBlock } from '../../../components/CodeBlock'
import { BenchBars } from '../../../viz/BenchBars'

const ID = '1.1.4'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Data bigger than memory: the idea hiding in Python syntax">
        <Tiered
          layman={
            <>
              <p>Two ways to wash 10,000 dishes. Option one: stack all 10,000 on the counter, then wash the pile. You need a very big counter. Option two: take one dish, wash it, pass it on — a conveyor. The counter never holds more than one dish, and 10,000 dishes need no more counter than 10 did.</p>
              <p>Programs face the same choice. <em>Eager</em> code builds the whole pile in memory before working on it. <em>Lazy</em> code processes one item at a time and never holds the pile. Python has beautiful syntax for both — comprehensions for concise pile-building, generators for the conveyor — and knowing which to reach for is the most data-engineer-flavored skill in this module.</p>
            </>
          }
          student={
            <>
              <p>Real <GlossaryTerm k="data-pipeline">pipelines</GlossaryTerm> routinely process more data than fits in RAM: a 50 GB log file on a 16 GB laptop is a normal Tuesday. The eager version — read everything into a list, then filter — dies with an out-of-memory error. The lazy version — stream line by line, keep only running results — handles it without noticing. Same logic, different memory shape: eager cost grows with the <em>dataset</em>, lazy cost grows with the <em>result</em> (or stays constant, for counts and sums).</p>
              <p>This lesson gives you both tools properly: comprehensions (list, dict, set) as the idiomatic way to build collections from collections, and generators as the idiomatic way to stream. The transform step of every <GlossaryTerm k="etl">ETL</GlossaryTerm> job you write from Phase 2 onward will be one of these two shapes.</p>
            </>
          }
          phd={
            <>
              <p>The deep frame: <em>materializing vs streaming</em> is THE recurring trade-off of data systems, and Python syntax is your first encounter with it. A list comprehension materializes a relation; a generator expression is a pull-based operator producing values on demand — the same iterator model as database query executors (Volcano-style <code>next()</code> pipelines), and the same reason Spark builds a lazy operator DAG and executes nothing until an action forces it (Phase 4 makes this exact connection).</p>
              <p>Under the hood a generator is a suspended stack frame: <code>yield</code> freezes the frame — locals, instruction pointer and all — and hands a value to the consumer; <code>next()</code> thaws it exactly where it stopped. Coroutines and <code>async</code> (Phase 3) reuse this machinery. So this is not syntax trivia — it is the execution model of half the systems in this curriculum, at toy scale.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Comprehensions: build collections in one honest line">
        <Tiered
          layman={
            <>
              <p>A comprehension is a sentence pattern: "give me <em>this</em>, for each <em>that</em>, keeping only <em>those</em>". "The city of each row, for rows hotter than 30" — that sentence is nearly character-for-character the Python. Once your eye learns the pattern, a comprehension reads faster than the four-line loop it replaces, because the shape itself announces what is being built.</p>
              <p>Three flavors, one per container from lesson 1.1.2: square brackets build a list, curly braces with colons build a dict, plain curly braces build a set.</p>
            </>
          }
          student={
            <>
              <CodeRunner
                language="python"
                code={`rows = [
    {"city": "Chennai", "temp_c": 31.4},
    {"city": "Mumbai", "temp_c": 29.0},
    {"city": "Delhi", "temp_c": 35.2},
    {"city": "Chennai", "temp_c": 30.1},
]

# The loop you wrote in 1.1.2...
cities_loop = []
for row in rows:
    cities_loop.append(row["city"])

# ...as a comprehension: [EXPRESSION for ITEM in SOURCE]
cities = [row["city"] for row in rows]
print(cities)

# With a filter clause: [EXPR for ITEM in SOURCE if CONDITION]
hot_cities = [row["city"] for row in rows if row["temp_c"] > 30]
print(hot_cities)

# Transform while building: convert to Fahrenheit
temps_f = [round(row["temp_c"] * 9 / 5 + 32, 1) for row in rows]
print(temps_f)`}
              />
              <CodeRunner
                language="python"
                code={`rows = [
    {"city": "Chennai", "temp_c": 31.4},
    {"city": "Mumbai", "temp_c": 29.0},
    {"city": "Delhi", "temp_c": 35.2},
    {"city": "Chennai", "temp_c": 30.1},
]

# dict comprehension: {KEY: VALUE for ...} -- build an index
temp_by_city = {row["city"]: row["temp_c"] for row in rows}
print(temp_by_city)   # note: the LAST Chennai row won -- keys are unique

# set comprehension: {EXPR for ...} -- dedup while extracting
print({row["city"] for row in rows})

# The 1.1.2 lab's filter + dedup, each in one line:
hot = [row for row in rows if row["temp_c"] >= 30.0]
print(len(hot), "hot rows;", {r["city"] for r in hot}, "are the hot cities")`}
              />
              <p>Note the dict comprehension quietly kept only the <em>last</em> temperature for Chennai — duplicate keys overwrite. Sometimes that is exactly what you want (latest reading wins); sometimes it is silent data loss. Comprehensions are concise, not magic: the same data decisions apply.</p>
            </>
          }
          phd={
            <>
              <p>Comprehensions are not mere sugar: each runs in its own scope (the loop variable does not leak, unlike a bare <code>for</code>), and the building uses specialized bytecode (<code>LIST_APPEND</code> in a tight loop) — typically faster than a loop calling <code>append</code> through attribute lookup each iteration. Declarative form also gives the <em>reader</em> a guarantee: a comprehension announces "this builds a collection, no side effects" — a property the equivalent loop only has if you audit every line.</p>
              <p>That guarantee is a contract not to break: a comprehension executed for side effects (<code>[print(x) for x in xs]</code>) compiles fine and is wrong — it materializes a list of <code>None</code> and lies to the reader. And nesting: two <code>for</code> clauses flatten pairs like a nested loop — occasionally elegant, quickly unreadable. The honest rule: past one <code>if</code> or two <code>for</code>s, it wants to be a loop (or generator function) again.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Generators: the conveyor belt">
        <Tiered
          layman={
            <>
              <p>Swap a comprehension's square brackets for parentheses and something profound happens: nothing runs. You get a <em>promise</em> to produce the items one at a time when asked — a recipe, not the meal. Ask with <code>next()</code>, or hand the promise to something like <code>sum()</code>, which asks repeatedly until the recipe is exhausted.</p>
              <p>The catch: a conveyor runs once. After the last item passes, the belt is empty — asking again yields nothing. Piles can be re-read forever; conveyors cannot. That single difference drives every choice between them.</p>
            </>
          }
          student={
            <>
              <p>A <code>def</code> containing <code>yield</code> becomes a <strong>generator function</strong>: calling it runs no code — it returns a generator object. Each <code>next()</code> runs to the next <code>yield</code> and pauses there, alive, mid-function:</p>
              <CodeRunner
                language="python"
                code={`def read_sensor(n):
    print("  (sensor warming up)")   # runs at FIRST next(), not at call
    for i in range(n):
        yield 20.0 + i

gen = read_sensor(3)
print("created:", gen)         # nothing has executed yet

print("got:", next(gen))       # warm-up + first value happen NOW
print("got:", next(gen))       # resumes exactly where it paused
print("total of the rest:", sum(gen))   # consumes what remains
# next(gen) now would raise StopIteration -- the belt is empty`}
              />
              <p>Generator <em>expressions</em> are the parentheses form, and aggregations consume them without ever building a list. Watch the memory difference directly:</p>
              <CodeRunner
                language="python"
                code={`import sys

eager = [n * n for n in range(100_000)]   # 100k results, all in memory
lazy = (n * n for n in range(100_000))    # a paused computation

print(sys.getsizeof(eager), "bytes -- the list")
print(sys.getsizeof(lazy), "bytes -- the generator (size does not matter!)")

print(sum(lazy))                           # streams through, O(1) memory
print(max(n * n for n in range(100_000)))  # genexp straight into max()

# The single-pass catch, on purpose:
squares = (n * n for n in range(5))
print(list(squares))   # consumed here...
print(list(squares))   # ...so this is empty. Generators do not rewind.`}
              />
              <p>The stdlib's <code>itertools</code> module is a toolbox of belt attachments — <code>islice</code> (take the first k lazily), <code>chain</code> (concatenate streams), <code>count</code> (infinite counter). File it away; you will meet it properly in module 1.2.</p>
            </>
          }
          phd={
            <>
              <p>Generators implement the <em>iterator protocol</em>, and demystifying it removes all the magic: a <code>for</code> loop calls <code>iter()</code> on its source, then <code>next()</code> repeatedly, until <code>StopIteration</code>. Anything implementing <code>__iter__</code> and <code>__next__</code> is a first-class citizen of every loop, comprehension, and unpacking:</p>
              <CodeRunner
                language="python"
                code={`class Countdown:
    def __init__(self, n):
        self.n = n
    def __iter__(self):
        return self               # an iterator is its own iterable
    def __next__(self):
        if self.n <= 0:
            raise StopIteration   # the protocol's end-of-stream signal
        self.n -= 1
        return self.n + 1

for x in Countdown(3):            # the for loop speaks the protocol
    print(x)

it = iter([10, 20])               # lists provide iterators too
print(next(it), next(it))         # a for loop is sugar for exactly this`}
              />
              <p>A generator is the same protocol implemented by frame suspension — compare the class above with the three-line function that replaces it: the interpreter maintains your state machine for you. Hold on to the pull-based mental model: database executors iterate operator trees the same way, and when Spark (Phase 4) refuses to run your transformations until an action arrives, you will recognize laziness you have already programmed by hand.</p>
            </>
          }
        />
        <BenchBars
          title="Holding 10 million integers: materialize vs stream"
          betterIs="lower"
          items={[
            { label: 'list (eager, materialized)', value: 400000000, unit: 'bytes', note: 'every element object exists at once, plus the pointer array' },
            { label: 'generator (lazy, streaming)', value: 200, unit: 'bytes', note: 'one suspended frame; one element alive at a time' },
          ]}
          caption={
            <>Illustrative numbers (order-of-magnitude, typical CPython — not your machine). The point is the shape: the list's cost scales with the dataset, the generator's is constant. At 10x the data, the left bar grows 10x; the right bar does not move.</>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Comprehension, loop, or generator?">
        <Tradeoffs
          options={[
            {
              name: 'List comprehension',
              strengths: [
                'Concise, declarative, side-effect-free by convention',
                'Result is reusable: iterate twice, index it, len() it',
              ],
              weaknesses: [
                'Materializes everything — memory scales with the dataset',
                'Unreadable past one if-clause or two for-clauses',
              ],
              chooseWhen: 'the result comfortably fits in memory and you need it more than once.',
            },
            {
              name: 'Explicit for loop',
              strengths: [
                'Handles complex logic: multiple accumulators, try/except, early break',
                'Every step debuggable; no cleverness tax on readers',
              ],
              weaknesses: [
                'Verbose for simple transforms; intent buried in mechanics',
                'The reader must audit the body to know nothing else happens',
              ],
              chooseWhen: 'the logic outgrows one clean expression — which is often, and is not a failure.',
            },
            {
              name: 'Generator (expression or function)',
              strengths: [
                'O(1) memory: handles datasets larger than RAM',
                'Composable into pipelines: source → transform → aggregate',
              ],
              weaknesses: [
                'Single-pass: consumed once, then empty — a classic bug source',
                'No len(), no indexing; harder to inspect mid-stream',
              ],
              chooseWhen: 'data is large or streaming, and each element is needed exactly once.',
            },
          ]}
          note={
            <>The default that serves data engineers: <strong>generators between stages, lists at rest</strong>. Stream while transforming; materialize only when you genuinely need random access or a second pass. That habit, applied at cluster scale, is most of what "we optimized the pipeline's memory footprint" means in a job interview.</>
          }
        />
        <Callout kind="warn" title="The single-pass bug, named early">
          Assign a generator to a variable, consume it in one place, then innocently loop over it again somewhere else: the second loop silently sees <em>zero items</em> — no error, just missing data downstream. If code needs two passes, materialize with <code>list()</code> on purpose, with a comment saying why.
        </Callout>
      </Section>

      <Section kicker="hands-on" title="Lab: stream a million rows and time it">
        <Lab
          lessonId={ID}
          intro={
            <p>You will generate a one-million-line CSV on disk, then count matching rows two ways — slurp with <code>readlines()</code> vs stream line by line — timing both with <code>time.perf_counter()</code>. The numbers come from your machine, not this page.</p>
          }
          steps={[
            {
              title: 'Create bench_stream.py',
              body: (
                <>
                  <p>In <code>C:\de-lab\python-lab</code> (safely outside OneDrive — this writes a ~14 MB file), create:</p>
                  <CodeBlock
                    label="bench_stream.py"
                    code={`# bench_stream.py -- write 1M rows, then read them two ways
import random
import time

PATH = "readings.csv"
CITIES = ["Chennai", "Mumbai", "Delhi", "Kolkata", "Pune"]

def write_csv(path, n_rows=1_000_000):
    random.seed(42)                     # same "random" data every run
    with open(path, "w") as f:
        f.write("city,temp_c\\n")
        for _ in range(n_rows):
            city = random.choice(CITIES)
            temp = round(random.uniform(15.0, 45.0), 1)
            f.write(city + "," + str(temp) + "\\n")

def count_eager(path):
    """Slurp the WHOLE file into a list of lines, then scan it."""
    with open(path) as f:
        lines = f.readlines()           # entire file in memory
    count = 0
    for line in lines:
        if line.startswith("Chennai"):
            count += 1
    return count

def count_lazy(path):
    """Stream: the file object is a generator of lines."""
    count = 0
    with open(path) as f:
        for line in f:                  # one line in memory at a time
            if line.startswith("Chennai"):
                count += 1
    return count

def timed(fn, path):
    start = time.perf_counter()
    result = fn(path)
    return result, time.perf_counter() - start

def main():
    print("writing 1,000,000 rows...")
    write_csv(PATH)
    eager_count, eager_s = timed(count_eager, PATH)
    lazy_count, lazy_s = timed(count_lazy, PATH)
    print(f"eager (readlines): {eager_count} matches in {eager_s:.3f}s")
    print(f"lazy  (iterate):   {lazy_count} matches in {lazy_s:.3f}s")
    print("same answer:", eager_count == lazy_count)

if __name__ == "__main__":
    main()`}
                  />
                </>
              ),
              checkpoint: <>File exists; note it follows lesson 1.1.3's shape — pure counting functions, printing only in <code>main()</code>.</>,
            },
            {
              title: 'Run it',
              commands: [{ ps: 'cd C:\\de-lab\\python-lab\nuv run python bench_stream.py' }],
              checkpoint: <>Both counts print, they are equal (<code>same answer: True</code>), and both timings show. The seeded generator makes the match count identical on every machine — around 200,000 (one city of five).</>,
            },
            {
              title: 'Confirm the file is real',
              commands: [{ ps: 'Get-Item readings.csv | Select-Object Name, Length' }],
              checkpoint: <><code>readings.csv</code> is roughly 14,000,000 bytes. A million rows now feels like what it is: a small file.</>,
            },
            {
              title: 'Interpret honestly, then scale the pressure',
              body: <p>At 1M rows the two timings are probably close — the file is too small for memory pressure to bite, and eager can even win slightly. So push it: change <code>n_rows</code> to <code>10_000_000</code> and run again (writes ~140 MB, takes a minute). Watch Task Manager's memory graph during the run: the eager pass visibly balloons the Python process by hundreds of MB; the lazy pass barely moves it. Same answers, same code shape — different scaling law.</p>,
              checkpoint: <>Both counts still match at 10M, and you watched the eager version's memory spike vs the lazy version's flat line — the entire lesson in one graph. (You may delete <code>readings.csv</code> afterwards.)</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'The difference between [x*x for x in big] and (x*x for x in big) is…',
              options: [
                'none — parentheses are style',
                'the first computes everything now into a list; the second is a lazy one-pass producer',
                'the second is a tuple of results',
                'the first is faster AND uses less memory',
              ],
              answer: 1,
              explain:
                'Brackets materialize a list immediately (memory scales with the data); parentheses create a generator that computes each value only when asked and holds no results.',
            },
            {
              q: 'sum(x for x in range(10**9)) works on a small laptop because…',
              options: [
                'Python compresses the list of a billion numbers',
                'sum() pulls one value at a time from the generator; only a running total is stored',
                'range secretly returns a list',
                'it does not work — it raises MemoryError',
              ],
              answer: 1,
              explain:
                'The generator yields values on demand and sum keeps a single accumulator — O(1) memory. It takes a while, but it never blows up. (range is itself lazy for the same reason.)',
            },
            {
              q: 'You consume a generator with list(g), then call list(g) again. The second call returns…',
              options: [
                'the same list',
                'an empty list — generators are single-pass and do not rewind',
                'a StopIteration error',
                'a reversed copy',
              ],
              answer: 1,
              explain:
                'Exhausted generators simply yield nothing more; no error is raised. That silence is what makes accidental double consumption a nasty pipeline bug — missing data, no crash.',
            },
            {
              q: 'A for loop over any iterable is, under the hood…',
              options: [
                'index arithmetic: obj[0], obj[1], ...',
                'iter() once, then next() repeatedly until StopIteration',
                'a recursive function call per element',
                'special-cased for each built-in type',
              ],
              answer: 1,
              explain:
                'That is the iterator protocol — one contract (__iter__/__next__) that lists, dicts, files, ranges, and your own classes all speak, which is why every one of them works in a for loop.',
            },
            {
              q: 'A 50 GB log file must be filtered on a 16 GB machine. Which approach survives?',
              options: [
                'f.readlines() then a list comprehension over the lines',
                'iterating the file object line by line, writing matches out as you go',
                'reading the file into one giant string first',
                'none — you need a bigger machine',
              ],
              answer: 1,
              explain:
                'File objects are generators of lines: streaming holds one line at a time regardless of file size. Every slurping variant needs the whole 50 GB in RAM first. This is the canonical DE interview probe on laziness.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'When would you use a generator instead of a list in a data pipeline?',
            a: (
              <p>When data is large relative to memory or consumed exactly once: streaming a file, chaining transform stages, feeding an aggregation. Generators give O(1) memory and compose into pipelines; the cost is single-pass consumption and no random access. Strong answers state the default — stream between stages, materialize deliberately — and name each side's failure mode (OOM for lists, silent double consumption for generators).</p>
            ),
          },
          {
            q: 'Explain the iterator protocol.',
            a: (
              <p><code>iter(obj)</code> returns an iterator; repeated <code>next()</code> calls produce values until <code>StopIteration</code> — and a for loop is exactly that, as syntax. Generators implement the protocol via suspended stack frames, which is why a three-line <code>yield</code> function replaces a whole iterator class. Bonus depth: database executors and Spark's lazy DAG are the same pull-based model at system scale.</p>
            ),
          },
          {
            q: 'Why did sys.getsizeof show a tiny number for your generator over 100k items?',
            a: (
              <p>Because a generator stores no items at all — only a paused frame: locals and a resume point. Its size is independent of how many values it will produce; the values exist one at a time, on demand. This question checks whether a candidate parrots "generators save memory" or knows where the memory is not.</p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Eager materializes the pile; lazy runs the conveyor. Memory: dataset-sized vs constant. This trade-off recurs from here to Spark.</>,
          <>Comprehensions build collections declaratively — <code>[expr for x in src if cond]</code>, with dict and set flavors. Past one if or two fors, go back to a loop.</>,
          <>Parentheses make it lazy: generator expressions and <code>yield</code> functions stream one <code>next()</code> at a time, feeding <code>sum()</code>/<code>max()</code> without stored intermediates.</>,
          <>Generators are single-pass. Need two passes or random access? Materialize with <code>list()</code> — deliberately, with a comment.</>,
          <>A file object is already a generator of lines: <code>for line in f</code> processes any size file in constant memory. You proved it with a stopwatch and Task Manager.</>,
        ]}
      />
    </>
  )
}
