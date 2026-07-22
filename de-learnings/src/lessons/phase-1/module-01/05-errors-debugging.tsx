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

const ID = '1.1.5'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Crashes are messages, not punishments">
        <Tiered
          layman={
            <>
              <p>A smoke alarm at 3am is unpleasant — and it is also the house telling you something true, as early as possible, while there is still time to act. Nobody's response to a smoke alarm is to remove the battery. Yet that is exactly what beginner code often does to errors: wrap everything in "ignore all problems and continue", so the program never beeps — and the kitchen quietly burns.</p>
              <p>This lesson reframes errors as the most useful output a program produces. A Python crash report — the <em>traceback</em> — tells you what went wrong, where, and what chain of calls led there. Reading one calmly is the difference between "my code is broken and I do not know why" and "line 12 got text where a number belonged; I know exactly what to fix."</p>
            </>
          }
          student={
            <>
              <p>For a data engineer, exceptions carry a second meaning: they are usually <em>facts about your data</em>. A <code>KeyError</code> says a record is missing a field — the upstream <GlossaryTerm k="schema">schema</GlossaryTerm> changed, or was never what you assumed. A <code>ValueError</code> from <code>float("N/A")</code> says the source encodes missing values as text. The exception type is a diagnosis, the traceback is the biopsy location, and together they tell you more about a dataset in five seconds than an hour of staring at the file.</p>
              <p>Today: read tracebacks bottom-up, learn what the four everyday exceptions each say about your data, handle errors narrowly with <code>try/except</code>, raise your own with messages your 2am self will thank you for, and debug with <code>print</code> honestly and <code>breakpoint()</code> properly.</p>
            </>
          }
          phd={
            <>
              <p>Mechanically, <code>raise</code> begins <em>stack unwinding</em>: frames pop one by one, each searched for a matching <code>except</code>; if none matches, the interpreter prints the traceback and exits nonzero — which is, note well, exactly what a good <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> step should do on unexpected input, because a nonzero exit is what an <GlossaryTerm k="orchestrator">orchestrator</GlossaryTerm> can see, retry, and alert on. A swallowed exception is invisible to every layer above you.</p>
              <p>Culturally, Python uses exceptions as ordinary control flow — EAFP, "easier to ask forgiveness than permission": try the operation and handle the specific failure, rather than pre-checking every precondition (LBYL). Since Python 3.11 the machinery is "zero-cost" when nothing raises, so the style question is about clarity and races, not micro-performance: a pre-check can be stale by the time you act; the attempt itself cannot.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Reading a traceback (bottom-up, always)">
        <Tiered
          layman={
            <>
              <p>A traceback looks like a wall of scary text, but it has exactly two parts. The <strong>last line</strong> is the headline: what kind of problem, in one sentence. Everything above it is the trail: the chain of "this called that" leading to the scene, newest call at the bottom. So the reading order is: last line first, then walk upward until you hit a line from a file <em>you</em> wrote. That line is almost always where to look.</p>
              <p>Read it like a detective at an incident: "what happened?" (last line), "where?" (the nearest line of your own code), "how did we get here?" (the calls above).</p>
            </>
          }
          student={
            <>
              <p>Run this — it crashes on purpose. Read the output bottom-up before the explanation below:</p>
              <CodeRunner
                language="python"
                code={`rows = [
    {"city": "Chennai", "temp_c": 31.4},
    {"city": "Mumbai"},                    # this row is missing temp_c
    {"city": "Delhi", "temp_c": 35.2},
]

def average_temp(rows):
    total = 0.0
    for row in rows:
        total += row["temp_c"]     # the crash will point HERE
    return total / len(rows)

print(average_temp(rows))`}
              />
              <p>Bottom line: <code>KeyError: 'temp_c'</code> — a dict lacked a requested key. Above it: the line inside <code>average_temp</code>, then the call that got us there. Note what the traceback does <em>not</em> say: which row. Add <code>print(row)</code> just above the crash line and re-run — now the culprit record is on screen. That two-step (read the traceback, then print the offending data) solves most data bugs. Now the bestiary — uncomment one line at a time:</p>
              <CodeRunner
                language="python"
                code={`row = {"city": "Chennai", "temp_c": 31.4}
values = [1, 2, 3]

# Each crashes differently -- each names a different DATA problem.
# print(row["temperature"])   # KeyError: field missing / name wrong
# print(values[10])           # IndexError: fewer items than assumed
# print("31.4" + 1)           # TypeError: wrong KIND of value
# print(int("31.4"))          # ValueError: right kind, bad CONTENT
print("uncomment one line above, run, read the last line, repeat")`}
              />
              <p>The distinction worth memorizing: <code>TypeError</code> means the <em>kind</em> is wrong (text where a number belongs); <code>ValueError</code> means the kind is right but the <em>content</em> does not parse. In pipeline terms: TypeError smells like a schema problem, ValueError like a dirty-values problem.</p>
            </>
          }
          phd={
            <>
              <p>Exceptions form a class hierarchy and handlers match by subclass — the fact that makes <code>except Exception:</code> so dangerously broad: <code>KeyError</code>, <code>TypeError</code>, and nearly everything else inherit from it, so one handler absorbs every diagnosis indiscriminately. Meanwhile <code>KeyboardInterrupt</code> and <code>SystemExit</code> deliberately sit <em>outside</em> <code>Exception</code> (under <code>BaseException</code>) precisely so broad handlers cannot trap Ctrl-C — the language designers building guardrails against the swallow-everything habit.</p>
              <p>Python 3.11+ made headlines materially better: tracebacks carry fine-grained position markers that underline the exact failing subexpression — in <code>a["x"]["y"]["z"]</code>, which lookup raised. With exception notes (<code>exc.add_note</code>) and the chaining below, modern tracebacks are a designed observability surface, not a dump. In Phase 3 they land in your logs and become the primary artifact of every production incident.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="try/except: narrow, honest, loud">
        <Tiered
          layman={
            <>
              <p>Sometimes a problem is expected — one bad row in a million-row file should not halt the whole job. <code>try/except</code> is the controlled version of the smoke alarm: "attempt this; if <em>this specific</em> problem occurs, here is the plan." The crucial word is specific. A plan for "any problem whatsoever" is not a plan — it is the battery coming out of the alarm.</p>
              <p>And when the plan is "set the bad value aside and keep a list of what was set aside", you get safety without silence: the job finishes <em>and</em> you know exactly what it skipped.</p>
            </>
          }
          student={
            <>
              <p>Catch the exceptions you expect; let the rest crash. When re-raising with better context, chain with <code>from</code> so neither diagnosis is lost:</p>
              <CodeRunner
                language="python"
                code={`def parse_temp(raw):
    """Convert a raw field to float, failing with CONTEXT."""
    try:
        return float(raw)
    except ValueError as err:
        raise ValueError(f"bad temperature reading: {raw!r}") from err

print(parse_temp("31.4"))
print(parse_temp("N/A"))   # read the output: cause first, then
                           # "The above exception was the direct cause..."
                           # -- both diagnoses survive`}
              />
              <p>Now the two philosophies side by side. The first looks robust and is a data-loss machine; the second is the pattern real pipelines use:</p>
              <CodeRunner
                language="python"
                code={`readings = ["31.4", "N/A", "29.0", None, "35.2"]

# Version 1: swallow everything. Runs "fine". Lies.
total, count = 0.0, 0
for raw in readings:
    try:
        total += float(raw)
        count += 1
    except Exception:
        pass                     # problems? what problems?
print("v1 average:", total / count, "-- how many rows died? unknowable")

# Version 2: narrow except + a reject lane
good, rejects = [], []
for raw in readings:
    try:
        good.append(float(raw))
    except (ValueError, TypeError):   # exactly the two we expect
        rejects.append(raw)
print("v2 average:", sum(good) / len(good))
print("v2 rejected:", rejects, "-- visible, countable, alertable")`}
              />
              <p>Version 2's <code>rejects</code> list is a baby <em>reject lane</em>: bad records go to a side channel for inspection instead of vanishing. In the Phase 1 milestone (M4) this becomes a rejects file with reasons; in production, a quarantine table with alerts. Same idea at every scale.</p>
            </>
          }
          phd={
            <>
              <p>Why is <code>except Exception: pass</code> the most destructive line in data engineering? Because it converts every future failure mode — schema drift, encoding corruption, even a misspelled variable name (<code>NameError</code> is an <code>Exception</code> too) — into silently missing data. The blast radius is unbounded in time: a handler written for one known glitch absorbs bugs that do not exist yet. Aggregates drift, nobody alerts, and the investigation starts weeks after the cause, when the trail is cold. A crash is cheap; corrupted trust in a dataset is not.</p>
              <p>Rules that survive production: catch the narrowest type expressing your actual expectation; keep the <code>try</code> body minimal (one risky operation, or you cannot know which line you forgave); re-raise with <code>raise ... from err</code>; and count what you skip — an unmonitored reject lane is a slow, polite swallow. The deepest habit: distinguish <em>expected dirt</em> (bad rows: divert and continue) from <em>broken assumptions</em> (missing column: crash now, loudly). Confusing those two is the root of most pipeline horror stories.</p>
            </>
          }
        />
        <Callout kind="warn" title="Never write a bare except: pass">
          If you cannot name the exception you expect, you are not handling an error — you are deleting evidence. Every swallowed exception is a data-corruption event scheduled for later discovery. The acceptable version names the type, does something visible (count, log, divert), and lets everything unexpected crash.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Debugging: print honestly, then step through">
        <Tiered
          layman={
            <>
              <p>Everyone's first debugger is <code>print()</code> — and used honestly, it is a fine tool: put "what do I <em>think</em> is in this variable?" on screen and compare with reality. The dishonest version is printing without a plan: ten unlabeled mystery values, deleted never. Print with a hypothesis — "I believe <code>row</code> always has a temp_c key; show me the row that proves me wrong."</p>
              <p>The step up is a <em>debugger</em>: pause the program mid-run and look around — every variable, at that exact moment, advancing one line at a time. It is the difference between photos of the crime scene and walking around in it.</p>
            </>
          }
          student={
            <>
              <p>Python's built-in pause button is <code>breakpoint()</code> — drop it on any line, run normally, and execution stops there in <code>pdb</code>, a prompt inside your paused program. (It needs a real terminal, so practice in the lab, not in this browser runner.) The five commands that are 95% of pdb:</p>
              <CodeBlock
                label="pdb survival kit"
                code={`p expr     print any expression, e.g.  p row       p len(rows)
n          next: run the current line, stay in this function
s          step: like n, but go INTO function calls
c          continue until the next breakpoint (or the end)
q          quit the program immediately

# drop this line anywhere in your code:
breakpoint()`}
              />
              <p>VS Code wraps the same idea in a friendlier suit: click left of a line number to set a red dot, press F5 (choose "Python File"), and execution pauses there with every variable listed in the sidebar — plus step over / step into / continue buttons. Same concepts, nicer view. The lab closes with both.</p>
            </>
          }
          phd={
            <>
              <p>Both pdb and VS Code ride CPython's tracing hooks — a callback per line/call/return (classically <code>sys.settrace</code>, redesigned in 3.12 as the far cheaper <code>sys.monitoring</code>). <code>breakpoint()</code> itself is a seam: it calls whatever <code>PYTHONBREAKPOINT</code> names, so the same line summons pdb locally, a richer debugger in an IDE, or nothing at all with <code>PYTHONBREAKPOINT=0</code> in production.</p>
              <p>Print-debugging deserves respect too: a labeled print is a hypothesis test, and a <em>kept</em>, structured one is called logging — Phase 3 formalizes exactly that. The professional ladder: traceback first (it often already contains the answer), targeted print/log second, stepping debugger third. And in distributed systems (Phase 4+) interactive stepping mostly stops being possible; logs and tracebacks become the only witnesses, which is why the reading skills in this lesson never expire.</p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="When bad data arrives: crash, continue, or divert?">
        <Tradeoffs
          options={[
            {
              name: 'Crash loud (catch nothing / narrow only)',
              strengths: [
                'Zero silent corruption — problems surface at first contact',
                'Nonzero exit is visible to orchestrators: retry, alert, halt downstream',
                'Simplest code; the traceback itself is the incident report',
              ],
              weaknesses: [
                'One bad row can halt a million-row job',
                'Reruns are wasteful unless the job is resumable (idempotency, Phase 2)',
              ],
              chooseWhen: 'an assumption breaks (missing column, unreachable source) — continuing would build on sand.',
            },
            {
              name: 'Catch broad, keep going',
              strengths: [
                'The job "always succeeds" and dashboards stay green',
                'Nobody is paged at 3am (today)',
              ],
              weaknesses: [
                'Silently drops or corrupts data — errors invisible by design',
                'Absorbs future bugs you have not written yet; debugging starts weeks late',
                'Green dashboards over wrong numbers destroy trust in the whole platform',
              ],
              chooseWhen: 'almost never. Defensible only where availability truly outranks correctness, with loud logging.',
            },
            {
              name: 'Narrow catch + reject lane',
              strengths: [
                'Expected dirt diverts to a visible side channel with reasons; the job completes',
                'Unexpected failures still crash loud — both failure classes handled correctly',
                'Reject counts become a data-quality metric you can alert on',
              ],
              weaknesses: [
                'More machinery: a rejects destination, monitoring, and someone who looks at it',
                'A reject lane nobody reviews decays into a slow, polite swallow',
              ],
              chooseWhen: 'production pipelines with known-dirty sources — the default posture from milestone M4 on.',
            },
          ]}
          note={
            <>The decision rule to internalize: <em>expected dirt gets a lane; broken assumptions get a crash.</em> Data pipelines mostly want loud crashes plus a reject lane — never quiet continuation. You will build the full pattern (rejects file with reasons, counts in the run summary) in the Phase 1 milestone.</>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: three planted bugs and a debugger">
        <Lab
          lessonId={ID}
          intro={
            <p>Below is a sabotaged copy of lesson 1.1.3's weather functions with three planted bugs. Fix them <em>one at a time</em>, letting each traceback lead you — run, read bottom-up, fix, run again. Then step through the fixed program once with <code>breakpoint()</code>.</p>
          }
          steps={[
            {
              title: 'Create sabotage.py exactly as shown',
              body: (
                <>
                  <p>In <code>C:\de-lab\python-lab</code>, create <code>sabotage.py</code>. Copy it faithfully, bugs and all — resist fixing anything by eye:</p>
                  <CodeBlock
                    label="sabotage.py (three bugs included)"
                    code={`# sabotage.py -- three bugs planted. Fix ONE at a time,
# guided by tracebacks: run, read bottom-up, fix, rerun.

def load_rows():
    return [
        {"city": "Chennai", "temp_c": 31.4},
        {"city": "Mumbai",  "temp_c": 29.0},
        {"city": "Delhi",   "temp_c": "35.2"},
        {"city": "Chennai", "temp_c": 30.1},
        {"city": "Kolkata", "temp_c": 27.8},
    ]

def filter_by(rows, key, minimum):
    kept = []
    for row in rows:
        if row[key] >= minimum:
            kept.append(row)
    return kept

def count_by(rows, key):
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
    threshold = int("30.0")
    hot = filter_by(rows, "temp", threshold)
    print("hot rows:", len(hot))
    print("rows per city:", count_by(rows, "city"))

if __name__ == "__main__":
    main()`}
                  />
                </>
              ),
              checkpoint: <>The file exists, copied verbatim — including the bugs you may already smell.</>,
            },
            {
              title: 'Bug 1: let the ValueError name itself',
              commands: [{ ps: 'cd C:\\de-lab\\python-lab\nuv run python sabotage.py' }],
              checkpoint: <>The run dies with <code>ValueError: invalid literal for int() with base 10: '30.0'</code> at the <code>threshold</code> line. Diagnosis: right kind, bad content for <code>int</code> — the classic config-value-parsing bug. Fix: <code>float("30.0")</code>. Re-run: the crash <em>moves</em>. Progress.</>,
            },
            {
              title: 'Bug 2: the KeyError knows which field',
              commands: [{ ps: 'uv run python sabotage.py' }],
              checkpoint: <>Now <code>KeyError: 'temp'</code>, pointing inside <code>filter_by</code>, with the call in <code>main()</code> above it. The rows have no field named <code>temp</code> — the caller passed the wrong column name. Fix the call to use <code>"temp_c"</code>. Re-run: a third, different crash.</>,
            },
            {
              title: 'Bug 3: the TypeError smells like dirty data',
              commands: [{ ps: 'uv run python sabotage.py' }],
              checkpoint: <><code>TypeError: '&gt;=' not supported between instances of 'str' and 'float'</code> at the comparison in <code>filter_by</code>. Someone stored Delhi's temperature as text. Two honest fixes: correct the data (<code>35.2</code> without quotes) or make <code>filter_by</code> defensive with <code>float(row[key])</code>. Do either — the program finally prints <code>hot rows: 3</code> and per-city counts with Chennai at 2.</>,
            },
            {
              title: 'Step through it once with breakpoint()',
              body: <p>Add a line containing just <code>breakpoint()</code> right after <code>rows = load_rows()</code>, then run again. At the <code>(Pdb)</code> prompt try, in order: <code>p rows</code>, <code>p len(rows)</code>, <code>n</code> (twice, watching each line execute), <code>p threshold</code>, <code>s</code> (step <em>into</em> <code>filter_by</code>), <code>p row</code>, then <code>c</code> to finish.</p>,
              commands: [{ ps: 'uv run python sabotage.py' }],
              checkpoint: <>You saw the <code>(Pdb)</code> prompt, printed live variables, watched <code>threshold</code> come into existence after its line ran, and stood <em>inside</em> <code>filter_by</code> looking at a single <code>row</code>. Remove the <code>breakpoint()</code> line afterwards.</>,
            },
            {
              title: 'Optional: the same pause, in VS Code',
              body: <p>Open <code>sabotage.py</code> in VS Code, click left of the <code>hot = ...</code> line to set a red dot, press F5 and choose "Python File". When it pauses, inspect <code>rows</code> and <code>threshold</code> in the Variables panel, then Step Into <code>filter_by</code>.</p>,
              checkpoint: <>Execution paused at your red dot with variables visible in the sidebar — the same pdb session wearing a GUI. You now own both debuggers.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Where do you start reading a Python traceback?',
              options: [
                'Top line — errors are chronological',
                'Bottom line (the exception itself), then walk up to the nearest line of YOUR code',
                'Middle — the important frames are there',
                'Anywhere; the order is arbitrary',
              ],
              answer: 1,
              explain:
                'The last line is the diagnosis; the frames above are the call trail, newest at the bottom. Headline first, then find your own file in the trail.',
            },
            {
              q: 'int("31.4") raises ValueError while "31.4" + 1 raises TypeError. The distinction is…',
              options: [
                'none — the names are interchangeable',
                'TypeError = wrong KIND of value; ValueError = right kind, unparseable CONTENT',
                'ValueError is more serious than TypeError',
                'TypeError only occurs with numbers',
              ],
              answer: 1,
              explain:
                'Adding a string to an int is a category mismatch (TypeError). int() accepts strings — this one just does not parse as an integer (ValueError). In data terms: schema problem vs dirty-values problem.',
            },
            {
              q: 'A pipeline wraps its whole row loop in try: ... except Exception: pass. The consequence is…',
              options: [
                'safety: the job can no longer fail',
                'every current AND future bug becomes silently missing data, discovered weeks late',
                'a performance penalty only',
                'Python refuses to run it',
              ],
              answer: 1,
              explain:
                'Broad swallowing absorbs exceptions that do not exist yet — schema drift, typos, encoding issues — leaving no trace. The job "succeeds" while the data quietly rots: the worst failure mode in the field.',
            },
            {
              q: 'What does raise ValueError("bad reading...") from err add over a plain raise?',
              options: [
                'It runs faster',
                'It preserves the causal chain: the original exception prints as the explicit cause of yours',
                'It suppresses the original traceback',
                'It retries the failed operation once',
              ],
              answer: 1,
              explain:
                'Chaining keeps both diagnoses — your high-level context AND the low-level cause, linked by "The above exception was the direct cause...". Context without evidence-deletion.',
            },
            {
              q: 'One malformed row appears in a million-row file from a known-dirty source. The professional default is…',
              options: [
                'except Exception: pass — keep the job green',
                'crash immediately, always, for any bad row',
                'divert the row to a visible reject lane with a reason, continue, and alert on the count',
                'delete the row from the source file',
              ],
              answer: 2,
              explain:
                'Expected dirt gets a lane (visible, counted); broken assumptions get a crash. Quiet continuation is never on the menu — and a reject lane nobody monitors is just a slow swallow.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How do you handle bad records in a pipeline — fail the job or skip them?',
            a: (
              <p>Classify first: expected dirt (malformed rows from a known-messy source) diverts to a reject lane — quarantined, counted, alertable — while broken assumptions (missing column, schema drift) crash loudly so the orchestrator can stop downstream consumers. The answer interviewers penalize is unconditional <code>except: continue</code>; the phrase they reward is "silent data loss is worse than a failed run".</p>
            ),
          },
          {
            q: 'What is EAFP and how does it differ from LBYL?',
            a: (
              <p>EAFP — easier to ask forgiveness than permission — attempts the operation and handles the specific exception; LBYL pre-checks conditions before acting. Python favors EAFP: no duplicated logic, no check-then-act races, and since 3.11 the no-exception path is essentially free. The discipline that makes it work: the except clause must be narrow — catching <code>Exception</code> is not EAFP, it is negligence.</p>
            ),
          },
          {
            q: 'Walk me through debugging a KeyError in a transform you did not write.',
            a: (
              <p>Traceback bottom-up: the missing key from the last line, the exact frame from the trail. Then see the offending record — a targeted print or log of <code>row</code> at the crash site, or <code>breakpoint()</code> there and inspect live. Then the data question: is the field optional (<code>.get</code> with an explicit default), renamed upstream (fix the mapping), or a contract violation (validate at ingestion and reject early)? Naming those three outcomes shows you debug data, not just code.</p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Read tracebacks bottom-up: last line = diagnosis, then walk up to the nearest line of your own code. Then print the offending data.</>,
          <>The bestiary maps to data problems: KeyError = missing field, IndexError = fewer rows than assumed, TypeError = wrong kind (schema), ValueError = right kind, dirty content.</>,
          <>Catch narrow, keep try-bodies small, chain re-raises with <code>raise ... from err</code>. <code>except Exception: pass</code> converts every future bug into silently missing data.</>,
          <>Production posture: expected dirt goes to a counted, visible reject lane; broken assumptions crash loud for the orchestrator. Milestone M4 builds exactly this.</>,
          <>Debugging ladder: traceback, then labeled prints with a hypothesis, then <code>breakpoint()</code> / VS Code stepping — in that order.</>,
        ]}
      />
    </>
  )
}
