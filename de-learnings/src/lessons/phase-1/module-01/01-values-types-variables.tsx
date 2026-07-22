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

const ID = '1.1.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Every pipeline is just typed values in motion">
        <Tiered
          layman={
            <>
              <p>Picture a pantry where every jar has a label: <em>flour</em>, <em>sugar</em>, <em>salt</em>. The powders look almost identical. The labels are the only thing standing between a cake and a disaster — and if someone refills the sugar jar with salt without changing the label, nothing looks wrong until a customer takes a bite.</p>
              <p>In programming, every piece of data carries a label too: this is a <em>whole number</em>, this is <em>text</em>, this is a <em>yes/no</em>. Python calls these labels <strong>types</strong>. A huge share of real-world data disasters are mislabeled jars: a price stored as text, an empty field pretending to be zero. This lesson teaches you to read the labels before you cook.</p>
            </>
          }
          student={
            <>
              <p>A <GlossaryTerm k="data-pipeline">data pipeline</GlossaryTerm> is a program that receives values, transforms them, and writes them somewhere else. Every value has a type — <code>int</code>, <code>float</code>, <code>str</code>, <code>bool</code>, <code>None</code> — and every transformation assumes something about it. Add a number to a string and Python stops you. But subtler mismatches pass silently: <code>"42" + "1"</code> is <code>"421"</code>, not <code>43</code>, and sorting numbers-stored-as-text puts <code>"9"</code> after <code>"10"</code>. Nothing crashes; the output is simply wrong.</p>
              <p>That is why data engineers obsess over types: CSV files deliver <em>everything</em> as text, APIs deliver JSON with its own rules, and databases enforce a <GlossaryTerm k="schema">schema</GlossaryTerm>. Your job is constantly converting between these worlds without corrupting anything. Today you learn Python's five core types, what a variable actually is, and how to convert and format values on purpose.</p>
            </>
          }
          phd={
            <>
              <p>In Python, <em>everything</em> is an object on the heap: <code>42</code> is a full <code>int</code> object with a type pointer, a reference count, and a value — not a bare machine word. A "variable" is not a box holding the object; it is an entry in a namespace mapping a name to an object reference. Assignment never copies data; it binds a name. This one model explains most Python behavior that surprises newcomers, and we lean on it all through Phase 1.</p>
              <p>Two consequences to preview. <em>Identity vs equality</em>: <code>==</code> asks "same value?" while <code>is</code> asks "same object?" — you will run both below. And memory: CPython frees an object when its reference count hits zero (plus a cycle collector). You rarely manage memory manually, but in Phase 4 you will care exactly <em>when</em> large objects become unreachable — a pipeline that accidentally keeps a reference to a 10 GB structure keeps 10 GB of RAM.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The five types that carry all your data">
        <Tiered
          layman={
            <>
              <p>Five kinds of jar cover almost everything:</p>
              <ul>
                <li><strong>int</strong> — whole numbers: row counts, IDs, quantities.</li>
                <li><strong>float</strong> — numbers with a decimal point: temperatures, ratios.</li>
                <li><strong>str</strong> — text: names, cities, anything in quotes.</li>
                <li><strong>bool</strong> — exactly two values, <code>True</code> or <code>False</code>.</li>
                <li><strong>None</strong> — a special "this jar is empty on purpose" marker.</li>
              </ul>
              <p>Ask any value what it is with <code>type(...)</code> — read the label instead of guessing from the color of the powder.</p>
            </>
          }
          student={
            <>
              <p>Run this, then edit it and re-run. Note that <code>None</code> is not zero and not an empty string — it means "no value here", which in data work usually means a missing measurement.</p>
              <CodeRunner
                language="python"
                code={`order_id = 1042            # int -- whole number
unit_price = 3.99          # float -- has a decimal point
city = "Bengaluru"         # str -- text in quotes
is_priority = True         # bool -- True or False
shipped_at = None          # NoneType -- "no value yet"

for value in [order_id, unit_price, city, is_priority, shipped_at]:
    print(repr(value), "->", type(value).__name__)

print(order_id + 1)        # ints and floats mix freely
# print(city + 5)          # uncomment to see Python protect you`}
              />
              <p>Now the most famous surprise in floating point. Run it before reading on.</p>
              <CodeRunner
                language="python"
                code={`print(0.1 + 0.2)
print(0.1 + 0.2 == 0.3)

# Now imagine this is money in a pipeline:
total = 0.0
for _ in range(100):
    total += 0.10          # add ten cents, one hundred times
print(total)               # should be exactly 10.0 ...

# The standard fix: count in integer cents, convert only for display
total_cents = 0
for _ in range(100):
    total_cents += 10
print(total_cents, "cents")`}
              />
            </>
          }
          phd={
            <>
              <p><code>float</code> is IEEE 754 double precision: 53 bits of binary significand. Any decimal fraction whose denominator is not a power of two — 0.1, 0.2, most prices — cannot be represented exactly, so it is rounded to the nearest representable binary fraction. Each arithmetic step rounds again, and the error compounds. That is why the loop drifts and why <code>0.1 + 0.2 != 0.3</code> is not a bug but a property of the representation, shared by every mainstream language.</p>
              <p>Python's <code>int</code>, by contrast, is arbitrary precision — it never overflows, which is why "count in integer cents" is the standard money pattern, alongside <code>decimal.Decimal</code> when fractional exactness is contractual. In Phase 2 you will meet SQL's <code>DECIMAL(p, s)</code> solving the same problem at the storage layer — a warehouse revenue column typed <code>FLOAT</code> is a finding you will one day report in a code review.</p>
            </>
          }
        />
        <Callout kind="warn" title="Money is never a float">
          A pipeline summing millions of float prices drifts by real dollars, and no error is ever raised — the worst kind of failure: silent corruption. Store money as integer cents or a decimal type. This rule reappears in Phase 2 (SQL types) and in every finance-adjacent job you will ever hold.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Variables are labels, not boxes">
        <Tiered
          layman={
            <>
              <p>Beginners imagine a variable as a box, so assignment copies the value into a new box. Python does not work that way. A variable is a <em>sticky label</em>, and assignment sticks another label on the <em>same</em> jar. Two labels, one jar: nothing is copied.</p>
              <p>Mostly you cannot tell the difference — until the jar's contents can change, and a change made under one label shows up under the other. You will see exactly that below, and it becomes very important next lesson, when jars hold whole collections.</p>
            </>
          }
          student={
            <>
              <p><code>b = a</code> copies nothing — it binds the name <code>b</code> to whatever object <code>a</code> names. For immutable values (ints, floats, strings, bools) this is invisible. For mutable objects it bites. Lists arrive properly next lesson; here is the phenomenon so you recognize it on sight:</p>
              <CodeRunner
                language="python"
                code={`a = [1, 2, 3]     # a list -- a mutable object (next lesson's star)
b = a             # second label on the SAME object, no copy
b.append(4)
print(a)          # a sees the change too

c = [1, 2, 3, 4]  # a different object with the same contents
print(a == c)     # equality: same VALUE?
print(a is c)     # identity: same OBJECT?
print(a is b)     # one object, two names
print(id(a), id(b), id(c))`}
              />
              <p>Practical rules: use <code>==</code> to compare values — almost always what you want. Reserve <code>is</code> for <code>None</code> checks (<code>if x is None:</code>), because there is only ever one <code>None</code> object.</p>
            </>
          }
          phd={
            <>
              <p>Names live in namespaces; <code>id(x)</code> exposes identity (the address, in CPython). Rebinding mutates the namespace, not the object — the old object's refcount drops, and at zero it is reclaimed immediately: deterministic destruction, unlike the JVM's tracing GC, plus a cyclic collector for reference cycles refcounting cannot free.</p>
              <p>A sharp edge: CPython caches small integers (roughly -5 to 256) and interns many strings, so <code>a = 7; b = 7; a is b</code> is <code>True</code> — but the same test with 10000 may be <code>False</code>. Using <code>is</code> for value comparison is therefore a bug that passes tests on small data and fails in production: the signature of all the worst bugs. Value comparison is <code>==</code>, always.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Conversions and f-strings: the daily tools">
        <Tiered
          layman={
            <>
              <p>Data rarely arrives with the right labels. A spreadsheet exported to a text file turns every number into text; you must pour the value into a correctly labeled jar before doing math. Python's converters are named after the target: <code>int(...)</code>, <code>float(...)</code>, <code>str(...)</code>.</p>
              <p>And to print a readable sentence with values inside it, an <em>f-string</em> is a template with holes: write <code>f"..."</code> and put expressions in curly braces. Python fills the holes.</p>
            </>
          }
          student={
            <>
              <p>CSVs and user input deliver text; conversion is explicit and loud when it fails — a feature, as lesson 1.1.5 will make a whole philosophy of. F-strings handle formatting, including rounding for display (<code>:.2f</code> means "2 decimal places").</p>
              <CodeRunner
                language="python"
                code={`raw = "42"                 # from a CSV, so it is text
n = int(raw)
print(n + 1, type(n).__name__)

price = float("3.99")
qty = int("3")
name = "steel bolt"
print(f"{qty} x {name} at {price:.2f} each = {qty * price:.2f}")

big = 1234567.891
print(f"|{big:,.1f}|")     # thousands separator, 1 decimal
print(f"|{name:>12}|")     # right-align in 12 characters

# Conversion fails LOUDLY on nonsense -- uncomment and read the error:
# int("42.7")
# float("N/A")`}
              />
              <p>Uncomment those last lines and run again. The <code>ValueError</code> is Python refusing to guess — exactly the behavior you want from a pipeline handling other people's data.</p>
            </>
          }
          phd={
            <>
              <p><code>int("42.7")</code> failing while <code>int(42.7)</code> truncates to 42 looks inconsistent until you see the design rule: conversions from text are strict parsers (one type, one grammar), while numeric-to-numeric conversions are defined mathematical maps. Composing them — <code>int(float("42.7"))</code> — is explicit about both steps. That is Pythonic doctrine ("refuse the temptation to guess"); compare JavaScript's <code>parseInt("42.7")</code> returning 42 silently.</p>
              <p>F-strings are compiled, not scanned at runtime: the brace expressions are parsed into the surrounding code's AST and evaluated in local scope, which is why they are fast and fully general. The format mini-language (<code>:.2f</code>, <code>:,</code>, <code>:&gt;12</code>) is shared with <code>format()</code> — learn it once, use it forever, including in the log messages you will grep at 2am.</p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Dynamic vs static typing">
        <p>Python checks types while the program runs; languages like Java or Rust check before it runs. This is a genuine trade-off, and data engineering sits on the fault line: exploratory scripts want freedom, production pipelines want guarantees.</p>
        <Tradeoffs
          options={[
            {
              name: 'Dynamic typing (Python default)',
              strengths: [
                'Fast to write: no type declarations, ideal for exploration',
                'Flexible: one function can handle many shapes of data',
                'The whole scientific-Python ecosystem is built on it',
              ],
              weaknesses: [
                'Type errors surface at runtime — possibly 3 hours into a pipeline run',
                'Refactoring is riskier: tools cannot see all the mismatches',
                'Wrong-type data can flow silently until something downstream breaks',
              ],
              chooseWhen: 'exploring, prototyping, or writing small scripts you will read tomorrow.',
            },
            {
              name: 'Static typing (Java, Rust, Go)',
              strengths: [
                'Whole classes of bugs impossible before the program ever runs',
                'Fearless refactoring — the compiler finds every affected line',
                'Types are documentation that cannot go stale',
              ],
              weaknesses: [
                'More ceremony up front; slower iteration on messy data',
                'Rigidity hurts when data shapes genuinely vary (real-world JSON)',
              ],
              chooseWhen: 'building large systems where correctness outranks iteration speed.',
            },
          ]}
          note={
            <>Python's answer is <em>gradual typing</em>: optional type hints checked by external tools — dynamic speed while exploring, static safety where it counts. That arrives in lesson 1.2.4, and professional data teams treat hints as non-negotiable. The trade-off does not disappear; you choose per-file where you sit on it.</>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: your first real Python project">
        <Lab
          lessonId={ID}
          intro={
            <p>You built <code>C:\de-lab</code> in Phase 0. Now it gets its first resident: a Python project managed by uv, home for every Phase 1 lab. You will meet the REPL, then write and run your first script.</p>
          }
          steps={[
            {
              title: 'Create the project with uv',
              body: <p>uv creates the skeleton and a pinned <GlossaryTerm k="virtual-environment">virtual environment</GlossaryTerm> on first run:</p>,
              commands: [{ ps: 'cd C:\\de-lab\nuv init python-lab\ncd python-lab' }],
              checkpoint: <><code>ls</code> shows <code>pyproject.toml</code> — the project's manifest.</>,
            },
            {
              title: 'Meet the REPL',
              body: <p>The REPL (read-eval-print loop) is a conversation with Python: type an expression, get the answer. It is where you test small ideas before putting them in scripts. Start it, then try the session below, line by line:</p>,
              commands: [
                { ps: 'uv run python' },
                {
                  ps: 'type(42)\ntype("42")\n0.1 + 0.2\nint("7") + 1\nname = "world"\nf"hello, {name}"\nexit()',
                  label: 'inside the REPL (>>> prompt)',
                },
              ],
              checkpoint: <>A <code>&gt;&gt;&gt;</code> prompt appeared; <code>type(42)</code> printed <code>&lt;class 'int'&gt;</code>; <code>0.1 + 0.2</code> printed the famous long decimal on your own machine; <code>exit()</code> returned you to PowerShell.</>,
            },
            {
              title: 'Write facts.py',
              body: (
                <>
                  <p>Open the project in VS Code with <code>code .</code> and create a file <code>facts.py</code>:</p>
                  <CodeBlock
                    label="facts.py"
                    code={`# facts.py -- typed facts about one sales record
# Every field arrives as text, exactly like a CSV row would.
raw_order_id = "1042"
raw_price = "3.99"
raw_qty = "3"
city = "Bengaluru"

order_id = int(raw_order_id)
price = float(raw_price)
qty = int(raw_qty)
total = price * qty

print(f"order {order_id} from {city}")
print(f"qty      = {qty}  (type: {type(qty).__name__})")
print(f"price    = {price}  (type: {type(price).__name__})")
print(f"total    = {total:.2f}  (type: {type(total).__name__})")
print(f"city, shouted: {city.upper()}")`}
                  />
                </>
              ),
              checkpoint: <>The file exists in VS Code's explorer under <code>python-lab</code>.</>,
            },
            {
              title: 'Run it',
              commands: [{ ps: 'uv run python facts.py' }],
              checkpoint: <>Five lines print; the types read <code>int</code>, <code>float</code>, <code>float</code>; the total shows exactly two decimals (<code>11.97</code>). If you see a <code>ValueError</code>, read its last line, fix the typo, re-run. That loop is programming.</>,
            },
            {
              title: 'Break it on purpose',
              body: <p>Change <code>raw_qty</code> to <code>"3.5"</code> and run again. Read the error bottom-up. Then decide the fix: is a fractional quantity an <code>int</code>?</p>,
              checkpoint: <>You saw <code>ValueError: invalid literal for int()</code>, understood why, and either restored an integer quantity or switched to <code>float(...)</code> deliberately. The error told you exactly what and where.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'A CSV file delivers the value 42 for a "quantity" column. What does Python see before you convert it?',
              options: [
                'The int 42, because it looks like a number',
                'The str "42" — CSVs deliver everything as text',
                'A float, to be safe',
                'None, until you assign a type',
              ],
              answer: 1,
              explain:
                'Text formats have no types — every field is a string until your code converts it. Forgetting this is why "42" + "1" giving "421" is the classic beginner pipeline bug.',
            },
            {
              q: 'Why is 0.1 + 0.2 == 0.3 False in Python?',
              options: [
                'A bug in Python that newer versions fix',
                'Floats are binary and most decimal fractions cannot be represented exactly',
                'The == operator does not work on floats',
                'Python rounds all floats to one decimal place',
              ],
              answer: 1,
              explain:
                'IEEE 754 floats store binary fractions; 0.1 and 0.2 are tiny approximations, and their sum lands on a different approximation than 0.3 does. Every mainstream language shares this — hence: money is never a float.',
            },
            {
              q: 'After a = [1, 2] then b = a then b.append(3), what is a?',
              options: [
                '[1, 2] — b got a copy',
                '[1, 2, 3] — a and b are two labels on the same object',
                'An error: you cannot assign a list to two variables',
                '[3, 1, 2]',
              ],
              answer: 1,
              explain:
                'Assignment binds a name to an object; it never copies. Both names see the one list, so a mutation through either label is visible through both.',
            },
            {
              q: 'When should you use "is" instead of "=="?',
              options: [
                'Whenever comparing numbers, because it is faster',
                'Never — they are identical',
                'When checking for None, because identity is the correct question there',
                'When comparing strings',
              ],
              answer: 2,
              explain:
                'is asks "same object?", == asks "same value?". There is exactly one None object, so x is None is the idiom. Using is on numbers works accidentally for small ints (CPython caches them) and fails for big ones.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What is the difference between == and is in Python?',
            a: (
              <p><code>==</code> compares values; <code>is</code> compares identity — whether two names point at the very same object. Strong answers add the practical rule (use <code>is</code> only for <code>None</code>) and the gotcha: small-integer caching makes <code>is</code> appear to work on numbers in tests, then fail in production.</p>
            ),
          },
          {
            q: 'Why should financial amounts never be stored as floats?',
            a: (
              <p>Binary floats cannot represent most decimal fractions exactly, so arithmetic accumulates rounding error silently — sums drift with no exception raised. Use integer minor units (cents) or <code>decimal.Decimal</code>, and exact <code>DECIMAL</code> types at the database layer. Naming the silent-corruption angle marks you as someone who thinks about pipelines, not just syntax.</p>
            ),
          },
          {
            q: 'Is Python dynamically or statically typed, and what does that mean day to day?',
            a: (
              <p>Dynamically typed: values carry types, names do not, checks happen at runtime. That means fast iteration but type bugs can hide until a code path runs. Modern teams recover much of static typing's safety with gradual type hints plus a checker (mypy/pyright) in CI — the best of both, at the cost of annotation discipline.</p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Five scalar types carry your data: <code>int</code>, <code>float</code>, <code>str</code>, <code>bool</code>, <code>None</code> — and <code>type()</code> reads the label.</>,
          <>Variables are labels bound to objects, not boxes holding copies — <code>b = a</code> copies nothing.</>,
          <><code>==</code> compares values; <code>is</code> compares identity; use <code>is</code> only for <code>None</code>.</>,
          <>Floats are binary approximations: fine for measurements, forbidden for money. Count cents in ints.</>,
          <>Text formats deliver strings; convert explicitly with <code>int()</code>/<code>float()</code>, let bad data fail loudly, and format output with f-strings (<code>{'{x:.2f}'}</code>).</>,
        ]}
      />
    </>
  )
}
