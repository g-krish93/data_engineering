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
import { RevealSolution } from '../../../components/RevealSolution'
import { WatermarkTimeline } from '../../../viz/WatermarkTimeline'
import type { TimedEvent } from '../../../viz/WatermarkTimeline'

const ID = '3.4.3'

const EVENTS: TimedEvent[] = [
  { t: 0.1, label: 'Jan 01' },
  { t: 0.25 },
  { t: 0.4, label: 'Jan 03' },
  { t: 0.55 },
  { t: 0.7, label: 'Jan 05' },
  { t: 0.85 },
  { t: 0.3, late: true, label: 'backfill' },
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Reprocessing one bad day should cost one day, not the whole history">
        <p>
          Your daily pipeline has run for a year. This morning you discover last Tuesday&apos;s source file was corrupt — one
          day out of 365 is wrong. With a single monolithic asset that always rebuilds everything, fixing one day means
          recomputing the entire year: slow, expensive, and it re-touches 364 days that were fine. In 3.2 you learned to load
          data <em>incrementally</em> using watermarks. Partitions are that same idea promoted into the orchestrator: one
          logical asset, sliced into independent pieces — usually one per day — each materialized, and reprocessed, on its
          own.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Imagine a year&apos;s worth of a daily newspaper. You would not reprint every issue ever published just
                because one Tuesday had a typo — you reprint that one Tuesday. The archive is one thing (the newspaper), but
                it is made of separate daily issues, and you can fix, reprint, or reread any single issue without disturbing
                the rest.
              </p>
              <p>
                A partitioned asset is that archive. It is still one named thing — &quot;daily revenue&quot; — but under the
                hood it is a shelf of daily issues. Need to redo one day? Redo that day&apos;s issue. Need to fill in a whole
                month you missed? Reprint that range. Everything else stays exactly as it was.
              </p>
            </>
          }
          student={
            <>
              <p>
                A <GlossaryTerm k="partitioned-asset">partitioned asset</GlossaryTerm> is a single asset whose data is divided
                along a key — most commonly time. A <code>DailyPartitionsDefinition</code> gives you one partition per
                calendar day. The asset function runs once <em>per partition</em>, and Dagster tracks the materialization
                status of each partition separately: it can show you that Jan 01 through Jan 05 are green but Jan 06 is
                missing.
              </p>
              <p>
                This gives you two operations that a monolithic asset cannot. Materialize a <em>single</em> partition — rerun
                exactly one day. And <GlossaryTerm k="backfill">backfill</GlossaryTerm> — launch materializations across a
                range of partitions in one action, to build history you never ran or to reprocess a stretch that went bad. The
                partition key is the direct descendant of 3.2&apos;s watermark: it is the &quot;which slice of time is this
                run responsible for&quot; made explicit and first-class.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A <code>PartitionsDefinition</code> is a named, ordered key space (time windows, static strings, or a product
                of several dimensions via <code>MultiPartitionsDefinition</code>). Each partition key is an independent
                materialization target with its own event-log history, so partition status is a per-key projection over the
                materialization event store, not a single boolean. Time-window partitions carry a concrete <code>[start,
                end)</code> interval, which the asset reads via <code>context.partition_time_window</code> — the run knows
                exactly which slice of event-time it owns.
              </p>
              <p>
                The link to incremental loading is exact. In 3.2 a watermark was implicit state you persisted and advanced;
                here the partition key <em>is</em> the watermark, but externalized into the orchestrator, which makes gaps
                observable (unmaterialized partitions) and reprocessing first-class (rematerialize a key). The
                partition-scoped IO manager keys storage by <code>(AssetKey, partition_key)</code>, so each day&apos;s output
                lands in its own object/table-partition and a rerun overwrites only that slice — idempotency by construction,
                the same property you engineered by hand with merge/upsert in 3.2.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="One asset, many partitions, keyed by day">
        <p>
          You turn an ordinary asset into a partitioned one by attaching a <code>partitions_def</code>. The function now reads{' '}
          <code>context.partition_key</code> to know which day it is responsible for, and does work for that day only.
        </p>
        <CodeBlock
          label="defs.py — a daily-partitioned asset"
          code={`import csv
import os
import dagster as dg

daily = dg.DailyPartitionsDefinition(start_date="2024-01-01")

@dg.asset(partitions_def=daily)
def daily_trips(context: dg.AssetExecutionContext) -> None:
    day = context.partition_key           # e.g. "2024-01-03"
    # In real life: read only THIS day's slice from the source.
    rows = [
        {"zone": "A", "fare": 10.0},
        {"zone": "B", "fare": 5.0},
    ]
    os.makedirs("out", exist_ok=True)
    with open(os.path.join("out", "trips_" + day + ".csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["zone", "fare"])
        for r in rows:
            w.writerow([r["zone"], r["fare"]])
    context.add_output_metadata({"day": day, "rows": len(rows)})`}
        />
        <Tiered
          layman={
            <>
              <p>
                One recipe, run once per day, and it always asks &quot;which day am I making?&quot; before it starts. It only
                fetches that day&apos;s ingredients and only writes that day&apos;s issue. Give it Jan 03 and it makes the
                Jan 03 issue; give it Jan 04 and it makes the Jan 04 issue. Same recipe, different day, separate output.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>partitions_def=daily</code> declares the key space. When Dagster runs this asset it runs it for a
                specific partition, and <code>context.partition_key</code> hands the function that day&apos;s date string. The
                function uses it twice: to read only that day&apos;s slice from the source, and to write to a per-day output
                path (<code>trips_2024-01-03.csv</code>). Because each partition has its own output location, rerunning one day
                overwrites only that day — the incremental, idempotent behavior you built by hand in 3.2, now handed to you.
              </p>
              <p>
                In the UI this asset shows a grid of partitions rather than a single box: each cell is one day, colored by
                whether it has been materialized. That grid is the observable version of &quot;what have I loaded, and where
                are the gaps.&quot;
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>context.partition_key</code> is the point key; <code>context.partition_time_window</code> gives the
                half-open <code>[start, end)</code> interval, which is what you actually push down into a source query
                (<code>WHERE event_time &gt;= start AND event_time &lt; end</code>) to guarantee non-overlapping,
                gap-free slices. The default IO manager namespaces outputs by partition key, so <code>load_input</code> of a
                partitioned upstream returns just the requested partition(s) — the asset function never sees other days unless
                a partition mapping asks for them.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Materialize one day; backfill a range">
        <p>
          The animation is a timeline of daily partitions. As time (the sweeping line) advances, each day&apos;s partition
          materializes <span style={{ color: '#34d399' }}>on time</span> — the normal daily run. The{' '}
          <span style={{ color: '#f43f5e' }}>backfill</span> mark is a past day being rematerialized out of order: its date is
          behind &quot;now,&quot; but you deliberately rerun it to fix or fill it. Backfilling a <em>range</em> is just doing
          that for many days at once.
        </p>
        <WatermarkTimeline
          events={EVENTS}
          caption={
            <>
              Each dot is a <b>daily partition</b>. The sweeping line is time advancing; partitions turn{' '}
              <span style={{ color: '#34d399' }}>green</span> as their day arrives and the normal run materializes them. The{' '}
              <span style={{ color: '#f43f5e' }}>backfill</span> dot is a <em>past</em> partition rerun deliberately — the day
              is behind &quot;now,&quot; but you reprocess it to fix corrupt data or fill a gap. A range backfill does this
              across many days in one action.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                Two everyday actions with the newspaper. First: reprint one issue — you point at Tuesday and reprint only
                Tuesday. Second: you just launched the paper and want the last three months on the shelf, so you print the
                whole range in one batch job. That batch print of a date range is a backfill.
              </p>
            </>
          }
          student={
            <>
              <p>
                <b>Single partition:</b> in the UI you pick a partition (say <code>2024-01-03</code>) and materialize just that
                one — one run, one day rewritten. <b>Backfill:</b> you select a range of partitions and launch a backfill;
                Dagster fans out one run per partition (or chunks them), tracks each independently, and shows the range filling
                in cell by cell. You backfill to build history you never ran, or to reprocess a stretch after fixing a bug or a
                bad source file.
              </p>
              <p>
                Because partitions are independent and each rerun overwrites only its own slice, a backfill is safe to rerun and
                safe to interrupt — the exact idempotency guarantee that made incremental loads trustworthy in 3.2. Contrast a
                monolithic full-refresh asset, where &quot;fix one day&quot; and &quot;reprocess everything&quot; are the same
                expensive operation.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A backfill is a first-class object in Dagster: a set of <code>(asset, partition_key)</code> targets executed as
                many runs, with its own progress, cancellation, and retry surface. Partial backfills — a subset of an
                asset&apos;s partitions, or a subset of assets over a range — are the norm for targeted reprocessing. Because
                each partition-run is scoped, backfills parallelize across the key space up to your run-launcher concurrency,
                which is why partition granularity is also a throughput knob, not only a correctness one.
              </p>
              <p>
                The subtle part is cross-asset dependency under partitioning. By default a partitioned asset depends on the{' '}
                <em>same</em> partition of its upstream (identity mapping). When day <code>D</code> of a rollup needs days{' '}
                <code>D-6..D</code> of its input, you declare a <code>TimeWindowPartitionMapping(start_offset=-6,
                end_offset=0)</code> so Dagster loads the correct upstream window and its backfill/lineage math stays correct —
                a fan-in a monolithic asset hides but cannot make safe to reprocess partially.
              </p>
            </>
          }
        />
        <Callout kind="tip" title="Partition mappings in one line">
          By default, partition <code>2024-01-03</code> of a downstream asset depends on partition <code>2024-01-03</code> of
          its upstream — same day to same day. When it needs a different window (a 7-day rolling total needs the previous six
          days too), a <b>partition mapping</b> tells Dagster which upstream partitions to pull. Same-day identity is the
          default; you only reach for a mapping when the shapes differ.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Partitioned asset or one monolithic full-refresh asset?">
        <p>
          Partitions are not free — they add a key space to reason about and a grid of state to manage. The honest choice is
          against the simplest possible alternative: one asset that always rebuilds the whole dataset from scratch.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Partitioned asset (e.g. daily)',
              strengths: [
                'Reprocess exactly one day (or a range) — cost scales with what changed, not total history',
                'Gaps are observable (unmaterialized partitions) and backfills are first-class and parallelizable',
                'Each partition overwrites only its own slice — idempotent reruns by construction',
              ],
              weaknesses: [
                'More concepts: partition keys, mappings, partition-scoped IO, backfill management',
                'Cross-asset dependencies need partition mappings when windows differ — easy to get subtly wrong',
                'Overkill for small datasets that rebuild in seconds',
              ],
              chooseWhen: 'append-mostly, time-sliced data (events, logs, daily loads) where full refresh is expensive or history is large.',
            },
            {
              name: 'Monolithic full-refresh asset',
              strengths: [
                'Dead simple — one function, no key space, no partition grid to reason about',
                'Always internally consistent; no risk of a mismatched or missing partition',
              ],
              weaknesses: [
                'Fixing one day means recomputing everything — cost scales with total history, not the change',
                'No per-slice status; "what did I load and where are the gaps" is invisible',
              ],
              chooseWhen: 'small or reference datasets that rebuild cheaply, or where the whole thing genuinely must be recomputed together.',
            },
          ]}
          note={
            <>
              The deciding question is &quot;how expensive is a full rebuild, and how often do I need to reprocess just part of
              the data?&quot; Small dimension tables: rebuild the whole thing, do not partition. A billion-row event fact that
              grows daily and occasionally needs one bad day fixed: partition it. This mirrors the incremental-vs-full-load
              decision from 3.2 — partitions are that decision, expressed in the orchestrator.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: materialize one partition, then backfill a range">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Continue in <code>C:\de-lab\dagster-lab</code>. You will add a daily-partitioned asset, materialize a single
              day, confirm one file appeared, then backfill a small date range and watch several partitions fill in — each
              writing its own per-day file.
            </p>
          }
          steps={[
            {
              title: 'Add a daily-partitioned asset',
              body: (
                <>
                  <p>
                    Add this asset to <code>defs.py</code> and register it in <code>Definitions</code> alongside your existing
                    assets:
                  </p>
                  <CodeBlock
                    label="defs.py — additions"
                    code={`import csv, os

daily = dg.DailyPartitionsDefinition(start_date="2024-01-01")

@dg.asset(partitions_def=daily)
def daily_trips(context: dg.AssetExecutionContext) -> None:
    day = context.partition_key
    rows = [{"zone": "A", "fare": 10.0}, {"zone": "B", "fare": 5.0}]
    os.makedirs("out", exist_ok=True)
    with open(os.path.join("out", "trips_" + day + ".csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["zone", "fare"])
        for r in rows:
            w.writerow([r["zone"], r["fare"]])
    context.add_output_metadata({"day": day, "rows": len(rows)})

# add daily_trips to the assets=[...] list in your Definitions(...)`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  Restart <code>uv run dagster dev -f defs.py</code>. In the UI, <code>daily_trips</code> now shows a{' '}
                  <b>partition grid</b> (one cell per day from 2024-01-01), all currently unmaterialized (grey).
                </>
              ),
            },
            {
              title: 'Materialize a single partition',
              body: (
                <p>
                  Open <code>daily_trips</code>, click <b>Materialize</b>, and when prompted choose a single partition — enter{' '}
                  <code>2024-01-03</code>. Launch the run.
                </p>
              ),
              checkpoint: (
                <>
                  Exactly one run launches, for partition <code>2024-01-03</code>. In the partition grid, only the Jan 03 cell
                  turns green; every other day stays grey. One day materialized, the rest untouched.
                </>
              ),
            },
            {
              title: 'Confirm the single-day artifact',
              body: (
                <p>In a second terminal, list the output folder. Only one day&apos;s file should exist so far.</p>
              ),
              commands: [
                {
                  ps: 'Get-ChildItem C:\\de-lab\\dagster-lab\\out',
                  bash: 'ls ~/de-lab/dagster-lab/out',
                },
              ],
              checkpoint: (
                <>
                  The folder contains exactly <code>trips_2024-01-03.csv</code> and nothing else. The partition key drove both
                  which day ran and where it wrote.
                </>
              ),
            },
            {
              title: 'Backfill a date range',
              body: (
                <>
                  <p>
                    Now build history. Materialize <code>daily_trips</code> again, but this time select a <em>range</em> of
                    partitions — <code>2024-01-01</code> through <code>2024-01-05</code> — and launch. Dagster creates a
                    backfill that fans out one run per day.
                  </p>
                  <RevealSolution label="What you should observe">
                    <p>
                      A backfill appears under <b>Overview → Backfills</b> covering five partitions. The grid fills in Jan 01
                      through Jan 05, each cell going green as its run completes (Jan 03 was already green — rerunning it simply
                      overwrites its own file, harmlessly). This is the &quot;fix or fill a range in one action&quot; operation,
                      and because each partition is independent it is safe to rerun.
                    </p>
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  Under <b>Backfills</b>, a backfill over 5 partitions runs to completion; the partition grid shows Jan 01–Jan
                  05 all green while Jan 06 onward stays grey.
                </>
              ),
            },
            {
              title: 'Confirm the per-day files',
              body: <p>List the output folder again — one file per backfilled day.</p>,
              commands: [
                {
                  ps: 'Get-ChildItem C:\\de-lab\\dagster-lab\\out | Select-Object Name',
                  bash: 'ls ~/de-lab/dagster-lab/out',
                },
              ],
              checkpoint: (
                <>
                  Five files: <code>trips_2024-01-01.csv</code> through <code>trips_2024-01-05.csv</code>. Each partition wrote
                  its own slice; reprocessing any single day would touch only that one file — the whole point of partitions.
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
              q: 'What is a partitioned asset?',
              options: [
                'Several unrelated assets stored in one folder',
                'A single logical asset divided along a key (often one partition per day), each partition materialized and tracked independently',
                'An asset that has been deleted',
                'An asset split across multiple databases for speed',
              ],
              answer: 1,
              explain: 'It is still one named asset, but sliced — commonly one partition per calendar day. Dagster tracks each partition’s materialization status separately, which is what makes per-day reruns possible.',
            },
            {
              q: 'How does a partitioned asset function know which day it is responsible for?',
              options: [
                'It always processes today',
                'It reads context.partition_key (and, for time partitions, context.partition_time_window)',
                'It processes all days every run',
                'The day is hardcoded in the function',
              ],
              answer: 1,
              explain: 'The run is scoped to one partition, and context.partition_key hands the function that day. The function uses it to read only that day’s slice and to write to a per-day output location.',
            },
            {
              q: 'What is a backfill?',
              options: [
                'Deleting old partitions to save space',
                'Launching materializations across a range of partitions in one action — to build history or reprocess a bad stretch',
                'A schedule that runs at midnight',
                'A way to merge two assets',
              ],
              answer: 1,
              explain: 'A backfill fans out one run per partition over a chosen range. You use it to fill history you never ran, or to reprocess a range after fixing a bug or a corrupt source.',
            },
            {
              q: 'Last Tuesday’s source file was corrupt. With a daily-partitioned asset, fixing it costs:',
              options: [
                'A full recompute of all history',
                'Rematerializing just that one partition — one day of work, overwriting only that day’s slice',
                'Deleting the asset and starting over',
                'Nothing can be done',
              ],
              answer: 1,
              explain: 'That is the core payoff. Rerun the single partition; its output location is per-day, so only that day is overwritten and the other 364 days are untouched — idempotent by construction.',
            },
            {
              q: 'A downstream 7-day rolling total needs the previous six days of its upstream, not just the same day. What handles this?',
              options: [
                'Nothing — it works automatically with any dependency',
                'A partition mapping (e.g. TimeWindowPartitionMapping) that tells Dagster which upstream partitions to load',
                'A separate database',
                'A schedule',
              ],
              answer: 1,
              explain: 'By default a partition depends on the same-day partition upstream (identity). When windows differ, a partition mapping declares which upstream partitions each downstream partition needs, keeping lineage and backfills correct.',
            },
            {
              q: 'How do partitions relate to the incremental/watermark ideas from lesson 3.2?',
              options: [
                'They are unrelated',
                'The partition key is the watermark made explicit and first-class in the orchestrator — it names which slice of time each run owns',
                'Partitions replace the need for any incremental logic',
                'Watermarks are only for streaming; partitions are only for batch',
              ],
              answer: 1,
              explain: 'In 3.2 the watermark was implicit state you advanced by hand. A partition key externalizes that into the orchestrator, making gaps observable and reprocessing first-class — the same idea, promoted.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What are partitioned assets and why use them?',
            a: (
              <p>
                A partitioned asset is one logical asset sliced along a key — usually one partition per day. Dagster runs the
                asset once per partition and tracks each partition&apos;s status independently, so you can materialize a single
                day, see exactly which days are missing, and backfill a range. The reason is cost and correctness: reprocessing
                one bad day costs one day instead of recomputing all history, and because each partition writes only its own
                slice, reruns are idempotent. It is the incremental-load decision from the data layer, expressed in the
                orchestrator. The trade is complexity — you take on a key space, partition mappings, and backfill management —
                so tiny datasets that rebuild in seconds are better off as a single full-refresh asset.
              </p>
            ),
          },
          {
            q: 'Walk me through backfilling a month of a daily pipeline after a bug fix.',
            a: (
              <p>
                First fix the asset code so the logic is correct. Then launch a backfill over the affected partition range — say
                the 30 days of last month — which Dagster fans out into one run per day, each scoped to its partition key and
                writing only that day&apos;s slice. Because partitions are independent and idempotent, the backfill is safe to
                run over days that were already correct (they simply overwrite themselves) and safe to interrupt and resume. You
                watch the partition grid fill in and the backfill&apos;s progress view for failures. If a downstream rollup
                depends on multiple upstream days, its partition mapping ensures the backfill pulls the right windows.
              </p>
            ),
          },
          {
            q: 'When would you NOT partition an asset?',
            a: (
              <p>
                When a full rebuild is cheap and you rarely need to reprocess just part of the data — small dimension or
                reference tables, lookups, anything that recomputes in seconds. Partitioning adds a key space, partition
                mappings for cross-asset dependencies, and backfill management; for a small dataset that is pure overhead with
                no payoff. Partition when history is large, the data is time-sliced and append-mostly, and full refresh is
                expensive enough that fixing one day by recomputing everything is unacceptable.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A partitioned asset is one logical asset sliced along a key (commonly one partition per day); Dagster tracks each partition&apos;s materialization status independently.</>,
          <>The asset function reads <code>context.partition_key</code> to process — and write — only its slice, so per-day outputs make reruns overwrite one day, not everything.</>,
          <>Materialize a single partition to rerun exactly one day; backfill a range to build history or reprocess a bad stretch in one first-class, parallelizable action.</>,
          <>By default a downstream partition depends on the same-day upstream partition; when windows differ (rolling totals), a partition mapping declares which upstream partitions to pull.</>,
          <>Partitions are the incremental/watermark idea from 3.2 promoted into the orchestrator — the key names which slice of time a run owns, making gaps observable and reprocessing idempotent.</>,
          <>Partition when full refresh is expensive and history is large; keep a single monolithic asset when the dataset rebuilds cheaply — the same call as incremental-vs-full loading.</>,
        ]}
      />
    </>
  )
}
