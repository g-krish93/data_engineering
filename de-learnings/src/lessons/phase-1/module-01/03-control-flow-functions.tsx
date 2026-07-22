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

const ID = '1.1.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Decisions, repetition, and named steps">
        <Tiered
          layman={
            <>
              <p>A recipe is not just ingredients — it is instructions with decisions ("if the dough is sticky, add flour"), repetition ("knead for ten minutes"), and named sub-recipes ("make the sauce" — defined once, used by many dishes). The last two lessons gave you ingredients: values and containers. This one gives you the cooking: <code>if</code> for decisions, <code>for</code> for repetition, and functions for naming a set of steps so you never write them twice.</p>
              <p>Or think of a factory: each station does one job to each item passing through. Stations are functions; the conveyor is a loop; the quality-control gate is an <code>if</code>. Every data system you will ever build is stations on a conveyor.</p>
            </>
          }
          student={
            <>
              <p>A <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> step is almost always this exact skeleton: <em>for each row → decide → act</em>. Filter is a loop with an <code>if</code>; transformation is a loop building new rows; validation is a loop sorting rows into good and bad. You wrote these as bare loops in 1.1.2. Today you get the full control-flow toolkit (<code>elif</code>, <code>range</code>, <code>enumerate</code>, <code>zip</code>, <code>while</code>/<code>break</code>) and the bigger idea: wrapping logic in <strong>functions</strong> with clear inputs and outputs.</p>
              <p>Functions are where scripts become software: a named function can be tested by itself, reused across scripts, and read as a sentence. Lesson 1.2.5 brings automated tests, and only code shaped as functions is testable — the habits formed today decide whether your future pipelines can be trusted.</p>
            </>
          }
          phd={
            <>
              <p>Python functions are first-class objects: created at runtime by <code>def</code> (which is executable code, not a declaration), assignable, passable as arguments, returnable. That single fact powers half of professional Python — <code>key=</code> functions, callbacks, decorators (module 1.2), and the closures you will build below.</p>
              <p>It also explains this lesson's famous trap: because <code>def</code> runs like any other statement, default argument values are evaluated <em>once</em>, at definition time, and stored on the function object. A mutable default (an empty list, say) is one shared object across all calls — a bug so canonical it lives in interview question banks, and which you will trigger live in a minute.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Branching and looping over data">
        <Tiered
          layman={
            <>
              <p><code>if / elif / else</code> is a chain of gates: Python takes the first gate whose condition is true and skips the rest. Order matters — most specific condition first, catch-all <code>else</code> last.</p>
              <p><code>for</code> visits each item on the conveyor once. Helpers ride along: <code>enumerate</code> hands you a running counter next to each item; <code>zip</code> runs two conveyors side by side, pairing items up. <code>while</code> loops until a condition changes — with <code>break</code> as the emergency stop button.</p>
            </>
          }
          student={
            <>
              <CodeRunner
                language="python"
                code={`temp_c = 31.4        # edit me and re-run

if temp_c >= 35:
    label = "extreme"
elif temp_c >= 30:
    label = "hot"       # first true gate wins; the rest are skipped
elif temp_c >= 20:
    label = "warm"
else:
    label = "cool"
print(temp_c, "->", label)`}
              />
              <CodeRunner
                language="python"
                code={`cities = ["Chennai", "Mumbai", "Delhi"]
temps = [31.4, 29.0, 35.2]

for i, city in enumerate(cities):      # index + item, no manual counter
    print(i, city)

for city, temp in zip(cities, temps):  # parallel lists, paired up
    print(city, temp)

for n in range(3):                     # 0, 1, 2 -- classic counted loop
    print("batch", n)`}
              />
              <p><code>while</code> is for "loop until something happens" — polling, retrying, consuming until a sentinel:</p>
              <CodeRunner
                language="python"
                code={`readings = [21.0, 22.5, None, 23.1]   # None = sensor dropout

i = 0
while True:
    if i >= len(readings):
        print("all readings processed")
        break
    value = readings[i]
    if value is None:
        print("sensor dropout at position", i, "- stopping early")
        break
    print("ok:", value)
    i += 1`}
              />
            </>
          }
          phd={
            <>
              <p>Conditions rely on <em>truthiness</em>: empty collections, <code>0</code>, <code>""</code>, and <code>None</code> are falsy. Idiomatic Python writes <code>if rows:</code> rather than <code>if len(rows) &gt; 0:</code> — but data code carries a trap: <code>if value:</code> treats a legitimate reading of <code>0.0</code> the same as missing data. When zero is meaningful, the honest test is <code>if value is not None:</code>. Sensor data, prices, and deltas all hit this.</p>
              <p>Also: <code>zip</code> stops at the <em>shortest</em> input, silently discarding the longer tail — a quiet data-loss bug when two "parallel" columns drift out of sync. Python 3.10 added <code>zip(a, b, strict=True)</code> to crash instead; prefer it in pipeline code. Loops also support an <code>else</code> clause that runs only without <code>break</code> — legal, obscure, best avoided in code others must read.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Functions: parameters, returns, defaults">
        <Tiered
          layman={
            <>
              <p>A function is a named sub-recipe: ingredients in (parameters), dish out (return value). Once "make the sauce" has a name, three good things happen: you write it once, you can taste it on its own before serving, and the main recipe reads as a story instead of a wall of steps.</p>
              <p>Defaults are pre-filled ingredients — "serves 4 unless you say otherwise". Callers override them only when they need to, keeping the common case short.</p>
            </>
          }
          student={
            <>
              <CodeRunner
                language="python"
                code={`def to_fahrenheit(celsius):
    return celsius * 9 / 5 + 32

def label_temp(temp_c, hot_threshold=30.0):    # default parameter
    if temp_c >= hot_threshold:
        return "hot"
    return "not hot"           # every path returns something

print(to_fahrenheit(31.4))
print(label_temp(31.4))                        # default threshold
print(label_temp(31.4, hot_threshold=35.0))    # keyword override

result = print("side note")    # print RETURNS nothing...
print(result)                  # ...so result is None`}
              />
              <p>Two rules of thumb. <em>Return, don't print</em>: a returned value can be tested and reused; printed text can only be watched. And keep functions <em>pure</em> where possible — output depends only on inputs, nothing else touched — because pure functions are the easiest code on earth to test. Now the canonical trap, live. Predict the output before running:</p>
              <CodeRunner
                language="python"
                code={`def add_row(row, batch=[]):      # DANGER: mutable default
    batch.append(row)
    return batch

first = add_row("row-a")
second = add_row("row-b")        # expecting ["row-b"]...
print(first)
print(second)                    # same list! the default was created
print(first is second)           # ONCE, at def time -- and shared

# The standard fix: None as sentinel, create inside
def add_row_fixed(row, batch=None):
    if batch is None:
        batch = []
    batch.append(row)
    return batch

print(add_row_fixed("row-a"))
print(add_row_fixed("row-b"))    # fresh list per call`}
              />
            </>
          }
          phd={
            <>
              <p>Name lookup follows LEGB: Local, Enclosing, Global, Builtins. Assignment anywhere in a function makes that name local for the <em>whole</em> body — which is why read-then-assign on a would-be global raises <code>UnboundLocalError</code>, and why mutating global state from functions is a habit to strangle early. The E enables closures — inner functions capturing enclosing variables:</p>
              <CodeRunner
                language="python"
                code={`def make_threshold_filter(threshold):
    def keep(value):
        return value >= threshold   # captured from enclosing scope
    return keep                     # the function ESCAPES with its context

keep_hot = make_threshold_filter(30.0)
keep_extreme = make_threshold_filter(35.0)
print(keep_hot(31.4), keep_extreme(31.4))
print(keep_hot.__closure__)         # the captured cell, visible`}
              />
              <p>And since functions are objects, we can look inside the machine. Python compiles source to bytecode for the CPython virtual machine; <code>dis</code> disassembles it:</p>
              <CodeRunner
                language="python"
                code={`import dis

def double(x):
    return x * 2

dis.dis(double)   # load x, load 2, multiply, return -- a tiny stack machine`}
              />
            </>
          }
        />
        <Callout kind="warn" title="Never use a mutable default argument">
          <code>def f(x, acc=[])</code> shares one list across every call of <code>f</code>, forever. The idiom is <code>acc=None</code> plus <code>if acc is None: acc = []</code> inside. Linters flag this (lesson 1.2.3), but you should recognize it by eye — it is a beloved interview question precisely because it separates people who know Python's evaluation model from people who guess.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Shaping code: guards, functions, scripts">
        <p>Two structural decisions arrive with functions. First, nested conditionals vs flat guard clauses:</p>
        <CodeBlock
          label="nested vs guard clauses"
          code={`# Nested: the happy path is buried three levels deep
def process(row):
    if row is not None:
        if "temp_c" in row:
            if row["temp_c"] is not None:
                return row["temp_c"] * 9 / 5 + 32
    return None

# Guard clauses: reject early, then the real work stands alone
def process(row):
    if row is None:
        return None
    if "temp_c" not in row:
        return None
    if row["temp_c"] is None:
        return None
    return row["temp_c"] * 9 / 5 + 32`}
        />
        <p>Both are correct; the guard version scales. Each precondition is one flat, deletable line, and the happy path sits unindented at the bottom. The second decision is bigger:</p>
        <Tradeoffs
          options={[
            {
              name: 'One big script, top to bottom',
              strengths: [
                'Zero structure overhead — fastest way to explore',
                'Reads linearly, like the story of one run',
              ],
              weaknesses: [
                'Nothing can be tested or reused without running everything',
                'State leaks everywhere: any line can touch any variable',
                'Growth is quadratic pain — each addition risks all previous lines',
              ],
              chooseWhen: 'exploring, one-off analysis, or code you will genuinely delete this week.',
            },
            {
              name: 'Small, pure functions + a main()',
              strengths: [
                'Each piece testable alone — the door to automated tests (1.2.5)',
                'Names become documentation: load_rows, filter_by, count_by',
                'Reuse across scripts; changes stay local to one function',
              ],
              weaknesses: [
                'More ceremony up front; premature abstraction is a real disease',
                'Poorly chosen boundaries are worse than no boundaries',
              ],
              chooseWhen: 'the code will live, be tested, or be read by anyone — including future you.',
            },
          ]}
          note={
            <>The professional pattern is to <em>graduate</em> code: explore as a script, and the moment it proves useful, refactor into functions — precisely what this lab does to your 1.1.2 script. The <code>if __name__ == "__main__":</code> guard is the door between the two worlds: it lets one file be both runnable and importable.</>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: refactor the weather script into functions">
        <Lab
          lessonId={ID}
          intro={
            <p>You will reshape lesson 1.1.2's <code>weather.py</code> into named, reusable functions with a <code>main()</code> entry point — the structure every serious Python file uses from now on. Output must not change: refactoring means reshaping code while proving behavior stayed identical.</p>
          }
          steps={[
            {
              title: 'Record the current output',
              commands: [{ ps: 'cd C:\\de-lab\\python-lab\nuv run python weather.py' }],
              checkpoint: <>The "before" output is visible in the terminal. This is your reference — refactoring succeeds only if "after" matches it.</>,
            },
            {
              title: 'Create weather_funcs.py',
              body: (
                <>
                  <p>Same data, same logic — now with names and boundaries:</p>
                  <CodeBlock
                    label="weather_funcs.py"
                    code={`# weather_funcs.py -- the 1.1.2 lab, graduated into functions

def load_rows():
    """Return the raw dataset: a list of dicts, one per reading."""
    return [
        {"city": "Chennai",  "temp_c": 31.4, "rain_mm": 0.0},
        {"city": "Mumbai",   "temp_c": 29.0, "rain_mm": 12.5},
        {"city": "Delhi",    "temp_c": 35.2, "rain_mm": 0.0},
        {"city": "Chennai",  "temp_c": 30.1, "rain_mm": 2.0},
        {"city": "Kolkata",  "temp_c": 27.8, "rain_mm": 8.1},
        {"city": "Mumbai",   "temp_c": 28.5, "rain_mm": 20.3},
        {"city": "Delhi",    "temp_c": 36.0, "rain_mm": 0.0},
        {"city": "Chennai",  "temp_c": 29.9, "rain_mm": 0.5},
        {"city": "Pune",     "temp_c": 24.6, "rain_mm": 4.2},
        {"city": "Delhi",    "temp_c": 34.1, "rain_mm": 0.0},
    ]

def filter_by(rows, key, minimum):
    """Keep rows where row[key] >= minimum. Pure: builds a new list."""
    kept = []
    for row in rows:
        if row[key] >= minimum:
            kept.append(row)
    return kept

def distinct(rows, key):
    """The set of values appearing under key."""
    values = set()
    for row in rows:
        values.add(row[key])
    return values

def count_by(rows, key):
    """Count rows per value of key, as a plain dict accumulator."""
    counts = {}
    for row in rows:
        value = row[key]
        if value in counts:
            counts[value] += 1
        else:
            counts[value] = 1
    return counts

def main():
    rows = load_rows()
    hot = filter_by(rows, "temp_c", 30.0)
    print("hot rows:", len(hot))
    print("distinct cities:", sorted(distinct(rows, "city")))
    print("rows per city:", count_by(rows, "city"))

if __name__ == "__main__":
    main()`}
                  />
                </>
              ),
              checkpoint: <>The file exists. Notice every function <em>returns</em> data; only <code>main()</code> prints. That separation is what makes them testable in 1.2.5.</>,
            },
            {
              title: 'Run and compare',
              commands: [{ ps: 'uv run python weather_funcs.py' }],
              checkpoint: <>Output matches step 1 exactly: same hot count (5), same cities, same per-city counts. Identical behavior + better structure = a successful refactor.</>,
            },
            {
              title: 'Feel the reuse',
              body: <p>In <code>main()</code>, add two lines: count heavy-rain rows via <code>filter_by(rows, "rain_mm", 10.0)</code>, and count hot rows per city via <code>count_by(hot, "city")</code>. No new loops — that is the payoff.</p>,
              checkpoint: <>Two new output lines: 2 heavy-rain rows, and hot-rows-per-city showing Delhi 3, Chennai 2. You composed existing functions instead of writing new loops.</>,
            },
            {
              title: 'Prove the import guard works',
              commands: [{ ps: 'uv run python -c "import weather_funcs; print(len(weather_funcs.load_rows()))"' }],
              checkpoint: <>Prints <code>10</code> and nothing else — importing ran no <code>main()</code>, because the <code>__main__</code> guard was False under import. Your file is now a library <em>and</em> a script.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'In an if/elif/elif/else chain, how many branches run?',
              options: [
                'Every branch whose condition is true',
                'Exactly one: the first true condition (or else)',
                'Always the else, plus any true branches',
                'It depends on indentation',
              ],
              answer: 1,
              explain:
                'The chain short-circuits at the first true condition and skips the rest — which is why ordering conditions from most to least specific matters.',
            },
            {
              q: 'def f(x, acc=[]) is dangerous because…',
              options: [
                'empty lists cannot be defaults',
                'the default list is created once at def time and shared across every call',
                'lists are slower than tuples as defaults',
                'acc will shadow a global variable',
              ],
              answer: 1,
              explain:
                'def is an executable statement; defaults are evaluated then, once, and stored on the function object. Every call that omits acc appends to the same list. Fix: acc=None, create the list inside.',
            },
            {
              q: 'zip(["a", "b", "c"], [1, 2]) yields…',
              options: [
                'an error — lengths differ',
                '("a",1), ("b",2), ("c",None)',
                '("a",1), ("b",2) — it stops at the shorter input, silently',
                '("a",1), ("b",2), ("c",1) — it wraps around',
              ],
              answer: 2,
              explain:
                'zip truncates to the shortest input with no warning — silent row loss if "parallel" lists drifted. zip(a, b, strict=True) (Python 3.10+) raises instead; prefer it in pipeline code.',
            },
            {
              q: 'The point of the if __name__ == "__main__": guard is…',
              options: [
                'to make the script run faster',
                'to let a file be imported for its functions without executing its script behavior',
                'Python refuses to run files without it',
                'to declare the main function',
              ],
              answer: 1,
              explain:
                'Run directly, __name__ is "__main__" and the guard fires; imported, __name__ is the module name and it does not. One file, two roles: library and executable.',
            },
            {
              q: 'Why prefer functions that return values over functions that print them?',
              options: [
                'print is deprecated',
                'returned values can be tested, composed, and reused; printed text can only be watched',
                'returning is faster than printing',
                'printed values are garbage collected sooner',
              ],
              answer: 1,
              explain:
                'A return value can be asserted in a test (1.2.5) or fed to another function; print output cannot without ugly tricks. Keep printing at the edges — in main() — and logic pure.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What does the mutable default argument bug look like, and what is the fix?',
            a: (
              <p><code>def f(x, acc=[])</code>: the list is evaluated once at definition time and shared by all calls, so state leaks between invocations. Fix: default to <code>None</code>, create the list inside. The principle interviewers want named: <code>def</code> is executed, not declared, and defaults live on the function object.</p>
            ),
          },
          {
            q: 'Explain Python scope resolution.',
            a: (
              <p>LEGB: Local, Enclosing, Global, Builtins — first hit wins. The classic wrinkle: assigning to a name anywhere in a function makes it local for the entire body, so read-before-assign raises <code>UnboundLocalError</code>. Closures capture enclosing names, which is how a function factory like <code>make_filter(threshold)</code> keeps working after the factory returns.</p>
            ),
          },
          {
            q: 'What makes a function easy to test?',
            a: (
              <p>Purity: output depends only on parameters, no I/O or global mutation inside, data returned rather than printed. Pure logic plus a thin <code>main()</code> for printing and file-touching means tests call functions with tiny inputs and assert on returns — the structure this module's labs enforce.</p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Pipeline logic is one skeleton: <em>for each row → decide → act</em>. if/elif chains take the first true branch only.</>,
          <><code>enumerate</code> for index+item, <code>zip</code> for parallel sequences (it silently truncates — use <code>strict=True</code> in data code), <code>while</code>/<code>break</code> for "until something happens".</>,
          <>Functions: parameters in, <code>return</code> out; defaults for the common case; return data, print only in <code>main()</code>. Guard clauses beat deep nesting.</>,
          <>Never <code>def f(x, acc=[])</code> — defaults are evaluated once at def time. Use <code>None</code> and create inside.</>,
          <><code>if __name__ == "__main__":</code> makes a file both importable library and runnable script — the standard shape of every Python file you will write from now on.</>,
        ]}
      />
    </>
  )
}
