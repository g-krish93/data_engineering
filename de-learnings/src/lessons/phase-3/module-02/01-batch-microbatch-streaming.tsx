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
import { RevealSolution } from '../../../components/RevealSolution'
import { WatermarkTimeline } from '../../../viz/WatermarkTimeline'

const ID = '3.2.1'

// A tiny arrival-time simulation the reader runs. Ten records, each with the
// second it "arrived" at the pipeline. We measure how long each waited before
// it was processed under three cadences. stdlib only — no pandas.
const SIM = `# Ten records, each tagged with the second it ARRIVED at the pipeline.
# We measure processing LATENCY = when it got processed minus when it arrived.
records = [
    {"id": 1, "arrived": 0},  {"id": 2, "arrived": 1},
    {"id": 3, "arrived": 3},  {"id": 4, "arrived": 4},
    {"id": 5, "arrived": 6},  {"id": 6, "arrived": 7},
    {"id": 7, "arrived": 9},  {"id": 8, "arrived": 12},
    {"id": 9, "arrived": 13}, {"id": 10, "arrived": 14},
]
horizon = 15  # the collection window closes at second 15

def report(name, processed_at):
    lat = [processed_at[r["id"]] - r["arrived"] for r in records]
    avg = sum(lat) / len(lat)
    print(f"{name:12} avg latency = {avg:5.1f}s   max = {max(lat):2}s")

# BATCH: everything waits until the window closes, then is processed at once.
batch = {r["id"]: horizon for r in records}
report("batch", batch)

# MICRO-BATCH: process in fixed 5-second windows; a record waits until the
# end of the window it fell into.
window = 5
micro = {}
for r in records:
    win_end = (r["arrived"] // window + 1) * window
    micro[r["id"]] = win_end
report("micro-batch", micro)
for w in range(0, horizon + 1, window):
    n = sum(1 for r in records if w <= r["arrived"] < w + window)
    print(f"   window [{w:2}-{w+window:2}) processed {n} records")

# STREAMING: each record is processed the instant it arrives — latency ~0.
stream = {r["id"]: r["arrived"] for r in records}
report("streaming", stream)`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The same data, three speeds — and the price of each">
        <p>
          You now know how to <em>package</em> a pipeline (Phase 3.1). The next question is <em>when</em> it runs: once a
          night over yesterday&apos;s data, every few seconds over a trickle, or the instant each record appears. That
          single choice — the <em>cadence</em> of ingestion — sets your latency, your cost, and how hard the system is to
          operate. Pick it deliberately, not by habit.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Think about laundry. <strong>Batch</strong> is the weekly wash: you let the basket fill all week, then do
                one big load on Sunday. Cheap and efficient — the machine runs full — but that shirt you wore Monday sat
                dirty for six days. <strong>Micro-batch</strong> is running a small load whenever the basket is a quarter
                full: a few times a day, less waiting, but the machine runs more often and never quite full.{' '}
                <strong>Streaming</strong> is washing each sock the moment you take it off: nothing ever waits, but you are
                standing at the machine all day and it never rests.
              </p>
              <p>
                None of these is &quot;right&quot;. A hotel washes towels in big batches because nobody needs a specific
                towel back in five seconds. A hospital cleans a surgeon&apos;s hands immediately because the delay is the
                whole problem. The skill is matching the speed to how fresh the answer actually needs to be — and paying
                only for the freshness you need.
              </p>
            </>
          }
          student={
            <>
              <p>
                Three cadences sit on one axis. <GlossaryTerm k="batch-processing">Batch</GlossaryTerm> collects a
                bounded chunk of data (a day, an hour, a file) and processes it in one pass on a schedule — high
                throughput, high latency (minutes to hours old). <GlossaryTerm k="micro-batch">Micro-batch</GlossaryTerm>
                is batch with a tiny window: process every few seconds/minutes, trading some throughput for far lower
                latency (this is how Spark Structured Streaming actually works under the hood).{' '}
                <GlossaryTerm k="stream-processing">Streaming</GlossaryTerm> processes each event as it arrives —
                lowest latency (sub-second), but the most complex to build and operate correctly.
              </p>
              <p>
                The two numbers you are trading are <GlossaryTerm k="latency">latency</GlossaryTerm> (how stale the output
                is) against <GlossaryTerm k="throughput">throughput</GlossaryTerm> (records processed per second) — plus a
                third, hidden cost: operational complexity. Batch fails at 2am and you fix it at 9am; a streaming job that
                falls behind is on fire <em>now</em>. Most data platforms are mostly batch, with streaming reserved for
                the few use cases that genuinely need it.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The deeper distinction is <GlossaryTerm k="bounded-data">bounded</GlossaryTerm> versus{' '}
                <GlossaryTerm k="unbounded-data">unbounded</GlossaryTerm> data. Batch assumes a finite, complete dataset:
                you can see every record before emitting a result, so aggregations are exact and terminating. A stream is
                unbounded — there is no &quot;end of the data&quot; at which to compute a final answer — so any aggregate
                over event-time must be windowed, and completeness becomes a <em>probabilistic claim</em> the system makes
                via watermarks (next lesson). Micro-batch is a discretization of the unbounded stream into a sequence of
                small bounded batches, which is why it inherits batch&apos;s exactness within a window at the cost of
                per-window latency.
              </p>
              <p>
                The Dataflow model (Akidau et al., &quot;The Dataflow Model&quot;, VLDB 2015) reframes all three as one
                system answering four questions: <em>what</em> is computed, <em>where</em> in event-time (windowing),{' '}
                <em>when</em> in processing-time results fire (triggers), and <em>how</em> refinements relate (accumulation
                mode). Under that lens batch and streaming are not different paradigms but different trigger and window
                configurations of the same engine — the intellectual basis for &quot;unified&quot; systems like Beam and
                Flink.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Feel the trade-off: latency under each cadence">
        <p>
          Numbers beat adjectives. Below, ten records &quot;arrive&quot; at different seconds, and we measure how long
          each waits before it is processed under batch, micro-batch, and streaming. Run it, then change the{' '}
          <code>window</code> size and watch micro-batch slide between the two extremes.
        </p>
        <CodeRunner language="python" code={SIM} />
        <Tiered
          layman={
            <>
              <p>
                The batch line shows the worst waiting: the record that arrived at second 0 sat for the full 15 seconds
                because nothing happens until the window closes. Streaming shows zero waiting — but imagine a person doing
                that by hand all day. Micro-batch lands in between, and the window size is the dial: smaller window, less
                waiting, more frequent work.
              </p>
              <p>
                Notice batch does the <em>least total work</em> (one pass) while giving the <em>stalest</em> answer. That
                inverse relationship — freshness costs effort — is the whole lesson in one table.
              </p>
            </>
          }
          student={
            <>
              <p>
                Average batch latency is high because every record is pinned to the window close at second 15. Streaming
                latency is ~0 by construction. Micro-batch with a 5-second window averages roughly half the window plus
                arrival skew — shrink <code>window</code> to 1 and it approaches streaming; grow it to 15 and it becomes
                batch. That continuum is the practical insight: micro-batch is a <em>tunable</em> position on the latency
                axis, not a separate species.
              </p>
              <p>
                What the toy leaves out is the cost side. Each micro-batch and each streamed event carries fixed overhead
                (a query plan, a commit, a network round-trip). Halving the window roughly doubles the number of those
                overheads. Real systems pick the largest window whose latency the business still tolerates — freshness you
                do not need is money you are burning.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Formally, for Poisson arrivals at rate lambda and a tumbling window of width W, a record&apos;s expected
                in-window wait is W/2, independent of lambda — so mean added latency scales linearly with window width
                while per-record amortized overhead scales as O(1/(lambda·W)). Minimizing total cost is therefore a convex
                trade-off: latency pushes W down, fixed per-trigger overhead pushes W up, and the optimum sits where the
                marginal latency penalty equals the marginal overhead saving.
              </p>
              <p>
                The simulation also quietly conflates two clocks. &quot;arrived&quot; here is processing-time; real
                pipelines must reason in <em>event-time</em> (when the thing actually happened), which can lag arbitrarily
                behind processing-time due to network delays, retries, and mobile clients going offline. That gap is
                exactly what watermarks and allowed-lateness (lessons 3.2.2 and 3.2.4) exist to manage, and it is why a
                streaming average can never be declared &quot;final&quot; without a completeness heuristic.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="A watermark: the pipeline's claim about completeness">
        <p>
          Whichever cadence you choose, a pipeline over time-ordered data carries a{' '}
          <GlossaryTerm k="watermark">watermark</GlossaryTerm>: a moving line that means &quot;I have seen every event up
          to here.&quot; In the animation, the blue line sweeps across event-time; dots go green as it passes them (seen,
          on time), and a late arrival flashes red because it showed up <em>after</em> the line already moved past its
          event-time. Batch draws this line once (at the end of the window); streaming advances it continuously.
        </p>
        <WatermarkTimeline
          caption={
            <>
              The <span style={{ color: '#38bdf8' }}>watermark</span> is how any cadence decides &quot;this window is
              complete, emit the result.&quot; Batch waits for the window to fully close before drawing it; streaming
              advances it as events flow. The <span style={{ color: '#f43f5e' }}>red</span> late arrival is the case every
              cadence must plan for — the subject of lessons 3.2.2 and 3.2.4.
            </>
          }
        />
        <Callout kind="tip" title="One mental model, three speeds">
          Batch, micro-batch, and streaming are not three different machines — they are three positions of the same dial:
          how long you wait before declaring a chunk &quot;done&quot; and emitting it. Everything else in this module
          (watermarks, incremental loads, idempotency, late data) applies to all three; only the window width changes.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Batch vs micro-batch vs streaming">
        <p>
          This is the first real decision of an ingestion design, and the wrong default is expensive in both directions:
          streaming a nightly report wastes engineering months; batching a fraud check makes it useless. Match the cadence
          to the freshness the answer actually needs.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Batch',
              strengths: [
                'Highest throughput and lowest cost per record — one full pass over a complete, bounded dataset',
                'Simplest to build, test, and reason about: exact aggregates, easy re-runs, failures fixed in the morning',
                'Idempotent replays are natural — reprocess a whole partition and overwrite',
              ],
              weaknesses: [
                'Highest latency: results are minutes to hours stale',
                'Bursty resource use — idle all day, then a heavy spike at the scheduled hour',
              ],
              chooseWhen: 'the consumer tolerates hours of staleness: daily reports, ML training sets, warehouse loads. The correct default for most work.',
            },
            {
              name: 'Micro-batch',
              strengths: [
                'Latency in seconds-to-minutes while keeping batch-style exactness within each window',
                'One tunable knob (window size) slides you along the latency axis without a rewrite',
                'Reuses batch tooling and mental models — much simpler than true streaming',
              ],
              weaknesses: [
                'Per-window overhead multiplies as the window shrinks (more commits, more plans)',
                'Still not sub-second; a floor set by the window width',
              ],
              chooseWhen: 'you need fresher-than-nightly (dashboards, near-real-time metrics) but sub-second is overkill — the pragmatic middle, and where Spark Structured Streaming lives.',
            },
            {
              name: 'Streaming (per-event)',
              strengths: [
                'Lowest latency — sub-second reaction to each event',
                'Steady, even resource use rather than scheduled spikes',
              ],
              weaknesses: [
                'Highest complexity: state, exactly-once, watermarks, out-of-order and late data all become your problem',
                'Hardest to operate — a job falling behind is an incident now, not a morning fix; backfills and schema changes are painful',
              ],
              chooseWhen: 'the delay itself defeats the purpose: fraud detection, alerting, real-time personalization, trading. Reach for it only when latency is the requirement.',
            },
          ]}
          note={
            <>
              A healthy platform is mostly batch, with micro-batch for the dashboards that need it and true streaming
              reserved for the handful of latency-critical paths. &quot;Can this be a batch job?&quot; is the right first
              question — streaming is a capability you add where it pays, not a default you start from.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: time the same file in one batch vs in chunks">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will generate a data file, then process it two ways in Python — one big batch versus small chunks —
              and time each. This makes the throughput-vs-latency trade concrete on your own machine. Work in{' '}
              <code>C:\de-lab\cadence</code> with <code>uv</code> (Python 3.13); no third-party packages needed (stdlib
              only), so <code>uv run</code> works without installing anything.
            </p>
          }
          steps={[
            {
              title: 'Set up the folder and generate a data file',
              body: (
                <>
                  <p>
                    Create the project and a 200,000-line CSV of fake events. Save the generator as{' '}
                    <code>gen.py</code>:
                  </p>
                  <CodeBlock
                    label="gen.py"
                    code={`import csv, random
with open("events.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["id", "user", "amount"])
    for i in range(200_000):
        w.writerow([i, random.randint(1, 5000), round(random.random() * 100, 2)])
print("wrote events.csv")`}
                  />
                </>
              ),
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\cadence; cd C:\\de-lab\\cadence\nuv init --bare\nuv run python gen.py',
                  bash: 'mkdir -p ~/de-lab/cadence && cd ~/de-lab/cadence\nuv init --bare\nuv run python gen.py',
                },
              ],
              checkpoint: (
                <>
                  It prints <code>wrote events.csv</code> and <code>events.csv</code> exists (a few MB). Confirm the row
                  count with <code>(Get-Content events.csv).Length</code> in PowerShell — it reports{' '}
                  <strong>200001</strong> (header + 200k rows).
                </>
              ),
            },
            {
              title: 'Process the whole file in one batch, timed',
              body: (
                <>
                  <p>
                    Save <code>batch.py</code>: read the entire file, sum the amounts, print the total and the wall-clock
                    time. This is the batch cadence — one pass over the complete, bounded dataset.
                  </p>
                  <CodeBlock
                    label="batch.py"
                    code={`import csv, time
t0 = time.perf_counter()
total = 0.0
with open("events.csv", newline="") as f:
    r = csv.DictReader(f)
    for row in r:
        total += float(row["amount"])
dt = time.perf_counter() - t0
print(f"BATCH   rows summed, total={total:,.2f}, took {dt*1000:.1f} ms")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python batch.py' }],
              checkpoint: (
                <>
                  Prints one <code>BATCH ...</code> line with a total and a millisecond timing. The <em>first</em> result
                  appears only after the whole file is read — that delay is batch latency.
                </>
              ),
            },
            {
              title: 'Process the same file in chunks, emitting per chunk',
              body: (
                <>
                  <p>
                    Save <code>chunks.py</code>: process the file in windows of 20,000 rows, printing a running result
                    after <em>each</em> chunk. This simulates micro-batch — you get partial answers far sooner, at the cost
                    of more frequent work.
                  </p>
                  <CodeBlock
                    label="chunks.py"
                    code={`import csv, time
CHUNK = 20_000
t0 = time.perf_counter()
running = 0.0
count = 0
with open("events.csv", newline="") as f:
    r = csv.DictReader(f)
    for row in r:
        running += float(row["amount"])
        count += 1
        if count % CHUNK == 0:
            dt = time.perf_counter() - t0
            print(f"  window @ {count:>6} rows: running total={running:,.2f}  (+{dt*1000:.0f} ms)")
print(f"MICRO   done, final total={running:,.2f}")`}
                  />
                  <RevealSolution label="What you should observe">
                    <p>
                      Ten window lines print progressively, each showing a larger running total and a growing elapsed
                      time — you saw the first partial answer after ~1/10th of the work, whereas <code>batch.py</code>{' '}
                      showed nothing until the end. The total matches <code>batch.py</code> exactly (same data, same sum),
                      but the <em>shape</em> of when results appear is completely different. Shrink <code>CHUNK</code> to
                      2,000 and results stream out even sooner, with more overhead lines — the window-size dial from the
                      simulation, now on real data.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'uv run python chunks.py' }],
              checkpoint: (
                <>
                  Ten <code>window @ ...</code> lines print one after another with rising totals, then a{' '}
                  <code>MICRO done</code> line whose final total equals <code>batch.py</code>&apos;s total. Same answer,
                  earlier partial visibility: the latency/throughput trade in your own terminal.
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
              q: 'You need a dashboard refreshed every couple of minutes from a steady trickle of events. Which cadence fits best?',
              options: [
                'Batch — run it once a night',
                'Micro-batch — process in short windows for seconds-to-minutes latency with batch-style simplicity',
                'Streaming — sub-second per-event processing',
                'None — it cannot be done',
              ],
              answer: 1,
              explain: 'Minutes of latency with modest complexity is the micro-batch sweet spot. Nightly batch is too stale; per-event streaming is more complexity than a two-minute dashboard needs.',
            },
            {
              q: 'What is the core resource trade-off between batch and streaming?',
              options: [
                'Streaming uses less memory than batch',
                'Batch has higher throughput and lower cost per record but higher latency; streaming has lowest latency but higher complexity and cost',
                'They are identical except for the name',
                'Batch is always faster end-to-end',
              ],
              answer: 1,
              explain: 'Batch processes a complete chunk in one efficient pass (high throughput, high staleness). Streaming reacts per event (low latency) at the price of complexity, state management, and steady cost.',
            },
            {
              q: 'Why is a stream called "unbounded" data?',
              options: [
                'It has no schema',
                'There is no end of the data at which to compute a final, complete result — so aggregates must be windowed',
                'It is stored without limit on disk',
                'It contains unlimited columns',
              ],
              answer: 1,
              explain: 'A batch is a finite, bounded dataset you can see in full. A stream never "ends", so any aggregate over it must be scoped to a window, and completeness becomes a claim (a watermark) rather than a certainty.',
            },
            {
              q: 'In the simulation, shrinking the micro-batch window from 5 to 1 made average latency approach zero. Why not always use a window of 1?',
              options: [
                'A window of 1 is illegal',
                'Each window carries fixed overhead (a plan, a commit), so a tiny window multiplies that overhead — you pay more to gain freshness you may not need',
                'It would change the final total',
                'Smaller windows lose data',
              ],
              answer: 1,
              explain: 'Latency falls as the window shrinks, but per-window overhead rises. You pick the largest window whose latency the business still tolerates — freshness beyond that is wasted cost.',
            },
            {
              q: 'Which statement about micro-batch is most accurate?',
              options: [
                'It is a completely different engine from batch and streaming',
                'It is a discretization of a stream into a sequence of small bounded batches — a tunable point on the latency axis',
                'It has lower latency than streaming',
                'It cannot compute exact aggregates',
              ],
              answer: 1,
              explain: 'Micro-batch chops the unbounded stream into small bounded batches, inheriting batch exactness within each window. The window width is a dial between batch and streaming, not a separate paradigm.',
            },
            {
              q: 'A team proposes streaming their monthly finance report "to be modern." Best response?',
              options: [
                'Agree — streaming is always better',
                'Ask whether the report needs sub-second freshness; a monthly report tolerates hours, so batch is simpler, cheaper, and correct',
                'Refuse to build any report',
                'Switch the whole company to streaming',
              ],
              answer: 1,
              explain: 'Cadence should match required freshness. A monthly report has no low-latency requirement, so streaming only adds complexity and cost. "Can this be a batch job?" is the right first question.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain the difference between batch, micro-batch, and streaming, and how you would choose.',
            a: (
              <p>
                They sit on one axis: how long you wait before emitting a chunk. Batch processes a complete bounded
                dataset on a schedule — highest throughput, lowest cost, highest latency. Streaming processes each event
                as it arrives — lowest latency, highest complexity (state, watermarks, exactly-once, late data).
                Micro-batch is the tunable middle: short windows giving seconds-to-minutes latency with batch-style
                simplicity. I choose by required freshness and tolerance for staleness: default to batch, move to
                micro-batch for near-real-time dashboards, and reserve true streaming for latency-critical paths like
                fraud or alerting where the delay itself defeats the purpose.
              </p>
            ),
          },
          {
            q: 'What is the difference between bounded and unbounded data, and why does it matter?',
            a: (
              <p>
                Bounded data is finite and complete — you can see every record before producing a result, so aggregates
                are exact and terminating (classic batch). Unbounded data (a stream) has no end, so you cannot wait for
                &quot;all&quot; of it; aggregates must be windowed and completeness becomes a probabilistic claim managed
                by watermarks and allowed-lateness. It matters because it forces event-time thinking and out-of-order/late
                handling that batch simply never has to confront.
              </p>
            ),
          },
          {
            q: 'A stakeholder says everything should be real-time. How do you push back constructively?',
            a: (
              <p>
                I quantify the actual freshness requirement and its cost. Real-time streaming brings state management,
                watermarks, exactly-once semantics, and on-call complexity — real engineering months and ongoing
                operational load. For most reports and warehouse loads, hours of staleness is fine, so batch delivers the
                same business value at a fraction of the cost and risk. I&apos;d reserve streaming for the specific paths
                where latency is the requirement, and show the latency/cost curve so the choice is explicit rather than
                aspirational.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Batch, micro-batch, and streaming are three positions on one dial: how long you wait before declaring a chunk &quot;done&quot; and emitting it.</>,
          <>The core trade is latency (staleness) vs throughput/cost vs operational complexity — freshness always costs effort, and freshness you do not need is money burned.</>,
          <>Batch works over bounded (finite, complete) data with exact aggregates; streaming works over unbounded data where completeness is a claim (a watermark), not a certainty.</>,
          <>Micro-batch is a stream discretized into small bounded batches; its window width is a tunable knob that slides you between batch and streaming without a rewrite.</>,
          <>A healthy platform is mostly batch, with micro-batch for near-real-time dashboards and true streaming reserved for latency-critical paths (fraud, alerting, trading).</>,
          <>&quot;Can this be a batch job?&quot; is the right first question; add streaming where latency is the actual requirement, not as a default.</>,
        ]}
      />
    </>
  )
}
