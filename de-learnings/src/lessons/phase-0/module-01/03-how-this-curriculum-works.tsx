import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { RevealSolution } from '../../../components/RevealSolution'
import { CurriculumMap3D } from '../../../viz/CurriculumMap3D'

const ID = '0.1.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="the big idea" title="Three depths, one curriculum">
        <p>
          Every concept in this curriculum is written three times. Use the depth switcher at the top of any
          lesson (or on the home page) and watch this very paragraph change — here is “what is a data
          pipeline?” at each depth:
        </p>
        <Tiered
          layman={
            <p>
              A data pipeline is a conveyor belt for information. Messy raw records go in one end; clean,
              organized, question-ready data comes out the other — automatically, on a schedule, without a
              human pushing buttons. When you hear “the pipeline broke,” picture the conveyor jammed: the data
              stopped arriving, and someone’s dashboard is quietly going stale.
            </p>
          }
          student={
            <p>
              A data pipeline is a directed sequence of automated steps — extract from sources, validate,
              transform, load into analytical storage — typically expressed as a DAG in an orchestrator,
              scheduled or event-triggered, with retries, alerting, and idempotent writes so that reruns are
              safe. The craft is less in the happy path than in the failure modes: late data, duplicate
              deliveries, schema drift, backfills.
            </p>
          }
          phd={
            <p>
              A pipeline is a materialized-view maintenance program: it maintains derived datasets as
              (incrementally) recomputed functions over source datasets, under a consistency contract —
              typically eventual with bounded staleness, occasionally transactional. The deep questions are the
              database ones: incremental view maintenance vs full recomputation, exactly-once <em>effects</em>{' '}
              via idempotence + retries (delivery guarantees compose badly otherwise), and lineage as the
              provenance graph. Phases 4–8 keep pulling on these threads until you implement the machinery
              yourself.
            </p>
          }
        />
        <Callout kind="tip" title="How to use the tiers">
          They are not skill levels to graduate from — they are lenses. A strong engineer moves between all
          three: Layman for explaining to stakeholders (and to check you truly get it), Student as the working
          default, PhD when you need the why behind the rules. Re-reading a lesson at a different tier is a
          legitimate study technique here.
        </Callout>
      </Section>

      <Section kicker="the journey" title="Nine phases, eight projects, ~52 weeks">
        <p>
          The same map as the home page — hover the nodes. Solid spheres have authored lessons; wireframes are
          planned. The green ring means you finished a phase.
        </p>
        <CurriculumMap3D height={420} />
        <Tiered
          student={
            <>
              <p>The shape of the year, at ~20 hrs/week:</p>
              <ul>
                <li>
                  <strong>Phases 0–1 (7 wk):</strong> workstation, git, Python, SQL — the raw materials.
                </li>
                <li>
                  <strong>Phases 2–3 (12 wk):</strong> databases, modeling, file formats, then real pipelines
                  with Docker, Dagster, dbt, and a local lakehouse you keep extending.
                </li>
                <li>
                  <strong>Phases 4–5 (12 wk):</strong> distributed processing (Spark, Iceberg) and streaming
                  (Kafka, CDC, watermarks) — the hard, well-paid stuff.
                </li>
                <li>
                  <strong>Phase 6 (6 wk):</strong> the one cloud (AWS), Terraform, cost, observability,
                  security — mapping everything you built locally onto managed services.
                </li>
                <li>
                  <strong>Phases 7–8 (15 wk):</strong> staff-level architecture and design docs, then the
                  papers canon and three from-scratch mini-engines: an LSM store, a columnar query engine, a
                  stream processor.
                </li>
              </ul>
              <p>
                Weeks are a pace target, not a deadline. The order, however, is deliberate — each phase’s
                project reuses the previous platform.
              </p>
            </>
          }
          layman={
            <p>
              Read the map bottom-up: first you set up your tools and learn the two languages of data (Python
              and SQL). Then you learn how data is stored well, then how to move it automatically, then how to
              handle data too big for one computer, then data that never stops arriving, then how to run it
              all in the cloud without surprise bills. The last two stops turn you from a user of tools into
              someone who could explain — and even rebuild — the tools themselves.
            </p>
          }
          phd={
            <p>
              The sequencing encodes a pedagogy: concrete-before-abstract (you run Postgres for weeks before
              meeting MVCC formally; you suffer the Hive-table problem before Iceberg solves it), and
              build-before-read for the finale — the Phase 8 papers land only after you have operated the
              production embodiments of their ideas for months. The mini-engines close the loop: implementation
              is the only reading comprehension test that cannot be faked.
            </p>
          }
        />
      </Section>

      <Section kicker="the loop" title="How a lesson, a checkpoint, and “done” work">
        <p>Each lesson is the same loop:</p>
        <ol>
          <li>
            <strong>Read</strong> at your tier (switch freely — the good stuff is often in another lens).
          </li>
          <li>
            <strong>Lab</strong>: run real commands on your machine. Every step ends in a{' '}
            <strong>checkpoint</strong> — observable proof it worked. The checkboxes persist in this browser.
          </li>
          <li>
            <strong>Quiz</strong>: closed-book, then read the explanations — they teach the near-misses.
          </li>
          <li>
            <strong>Mark done</strong> at the bottom. Progress lives in this browser (export it from the home
            page; it is yours, not a cloud account).
          </li>
        </ol>
        <p>
          Answers and solutions always hide behind a reveal — attempt honestly first. Try one; the honesty is
          the entire mechanism:
        </p>
        <RevealSolution label="Reveal: why hide solutions at all?">
          <p>
            Retrieval practice: the struggle to produce an answer — even a failed one — is what writes the
            memory. Reading a solution first feels like learning and measures nothing. The reveal button is a
            tiny speed bump that keeps you honest, which is also why quiz explanations only appear after you
            commit to answers.
          </p>
        </RevealSolution>
        <Callout kind="info" title="Two kinds of progress">
          <p>
            <strong>Authored</strong> = the lesson exists (only {`{`}3 of many{`}`} are, on day one — this
            curriculum is generated as you go). <strong>Done</strong> = you completed it. To get the next
            lesson authored: open this repo in Claude Code and say <code>next lesson</code>. One lesson is
            written per request, in order, following strict conventions in <code>CLAUDE.md</code> — so the
            curriculum never runs ahead of you and never drifts in style.
          </p>
        </Callout>
      </Section>

      <Section kicker="the other half" title="The portfolio: where you become hireable">
        <Tiered
          student={
            <>
              <p>
                Lessons happen in this app; <strong>careers are built in the terminal</strong>. Each phase ends
                with a real project in <code>de-portfolio/</code>, driven by two documents:
              </p>
              <ul>
                <li>
                  <code>SPEC.md</code> — what you are building: testable requirements, architecture with
                  trade-offs, milestones, and a definition of done that includes “a stranger can run this with
                  3 commands.”
                </li>
                <li>
                  <code>BUILD-GUIDE.md</code> — how to build it <em>yourself</em>: milestone steps, escalating
                  hints (nudge → approach → code), checkpoints, and commit points.
                </li>
              </ul>
              <p>
                The iron rule: <strong>Claude coaches, you code.</strong> Anything Claude writes for you gets
                flagged so you revisit and rewrite it. Interviewers can smell a portfolio the candidate didn’t
                build — and more importantly, so can you, at minute three of a technical screen.
              </p>
            </>
          }
          layman={
            <p>
              Watching cooking shows doesn’t make you a chef. The app teaches; the projects — built with your
              own hands in your own terminal, with an AI coach who gives hints before answers — are the meals
              you actually cooked. By the end you’ll have eight of them, each one something you can demo and
              defend in an interview.
            </p>
          }
          phd={
            <p>
              The projects are cumulative by design: P3’s local lakehouse becomes the substrate P4 migrates to
              Iceberg, P5 attaches CDC streams to, P6 lifts into AWS, and P7 retrospectively critiques in a
              redesign document. That final artifact — a bottleneck-and-cost review of a system you built and
              operated yourself — is the closest a self-learner can get to real staff-engineer evidence.
            </p>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Why learn this way? (The design defends itself)">
        <Tradeoffs
          options={[
            {
              name: 'This curriculum (guided building)',
              strengths: [
                'Hands-on from lesson one; every claim ends in a runnable checkpoint',
                'Trade-offs taught explicitly — the actual skill interviews probe',
                'Content generated at your pace, at three depths, never ahead of you',
              ],
              weaknesses: [
                'Slower than binge-watching a course',
                'No cohort, no external deadline — discipline is on you',
                'Depends on you actually typing, not just reading',
              ],
              chooseWhen: 'you want durable skill and a defensible portfolio, not a certificate.',
            },
            {
              name: 'Video courses / bootcamps',
              strengths: [
                'Structured pace, cohort accountability, quick overview of a tool’s surface',
              ],
              weaknesses: [
                'Passive; projects are copy-along and identical across thousands of graduates',
                'Content ages fast and depth is capped at the demo',
              ],
              chooseWhen: 'you need a fast survey of a specific tool, or external structure to start at all.',
            },
            {
              name: 'Pure project hacking',
              strengths: ['Maximum motivation and ownership; real problems teach real lessons'],
              weaknesses: [
                'Unknown unknowns: you can build for a year and never meet isolation levels or watermarks',
                'No feedback on whether your solution is idiomatic or naive',
              ],
              chooseWhen: 'you already have foundations and need mileage, not map.',
            },
          ]}
          note={<>This curriculum is deliberately the first column with the third column’s spirit bolted on: the projects are real, but the map is drawn for you.</>}
        />
      </Section>

      <Section kicker="hands-on" title="Lab: drive the machine">
        <Lab
          lessonId={ID}
          steps={[
            {
              title: 'Prove the tier switcher rewires content',
              body: (
                <p>
                  Scroll to the first section of this lesson. Read “what is a data pipeline?” at your current
                  tier, then switch to the other two tiers and reread it.
                </p>
              ),
              checkpoint: (
                <>
                  You can say out loud one thing the Layman version taught you that the Student version assumed
                  — and one thing the PhD version added that Student omitted.
                </>
              ),
            },
            {
              title: 'Export your progress',
              body: (
                <p>
                  Home page → “Progress data” → <strong>Export JSON</strong>. Open the downloaded file in VS
                  Code and find this lesson’s lab checks.
                </p>
              ),
              checkpoint: (
                <>
                  You can see keys like <code>"0.1.3:0"</code> in the JSON — your progress is a file you own,
                  not a cloud account you rent.
                </>
              ),
            },
            {
              title: 'Read the contract that governs this curriculum',
              body: (
                <p>
                  In VS Code, open the repo root and read <code>CLAUDE.md</code> — especially “Lesson authoring
                  rules” and “The next lesson workflow.” This is the contract every future lesson obeys.
                </p>
              ),
              checkpoint: (
                <>
                  You can name the three things every lesson must contain (three tiers, a visualization, a lab
                  with checkpoints — plus trade-offs and a quiz).
                </>
              ),
            },
            {
              title: 'Mark Phase 0 lessons done — honestly',
              body: (
                <p>
                  If you truly completed lessons 0.1.1 and 0.1.2 (checkpoints seen, quizzes taken), mark them
                  done, then this one. Watch the home-page map: Phase 0’s node earns its green ring.
                </p>
              ),
              checkpoint: (
                <>
                  The Phase 0 node on the 3D map shows the completion ring, and the header counter incremented.
                  Then say <code>next lesson</code> in Claude Code — Phase 1 begins with Python.
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
              q: 'What does “Authored” vs “Done” mean for a lesson here?',
              options: [
                'Authored lessons are official; Done lessons are drafts',
                'Authored = the content exists; Done = you completed it',
                'They are synonyms',
                'Authored lessons cost money; Done lessons are free',
              ],
              answer: 1,
              explain:
                'The curriculum is generated as you go: Claude flips Authored when it writes a lesson; you flip Done when you finish it. The map shows both.',
            },
            {
              q: 'Why are solutions hidden behind a reveal button?',
              options: [
                'To save screen space',
                'Because retrieval practice — attempting before seeing answers — is what makes learning stick',
                'To prevent copying on a graded exam',
                'A technical limitation of the app',
              ],
              answer: 1,
              explain:
                'Reading answers first produces fluent recognition and zero recall. The struggle is the mechanism, not an obstacle to it.',
            },
            {
              q: 'The portfolio projects are built…',
              options: [
                'inside this app’s code editor',
                'by Claude, while you review',
                'by you, in your own terminal, with Claude coaching via spec and build guide',
                'only after finishing all nine phases',
              ],
              answer: 2,
              explain:
                'One project per phase, built as you finish that phase. Claude gives escalating hints; code it writes for you gets flagged for you to revisit.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: '“Explain what a data engineer does” — asked by a non-technical founder.',
            a: (
              <p>
                This is a real interview moment (and the Layman tier is your training for it). One strong
                shape: “Every team produces data — orders, clicks, invoices — but it’s scattered and messy. I
                build the automated plumbing that collects it, cleans it, and lands it somewhere fast and
                organized, so your analysts see this morning’s numbers instead of last quarter’s guesses, and
                so nothing breaks silently at 2am.” Concrete nouns, a who-it-helps, and a reliability promise —
                no jargon.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Three tiers are lenses, not levels — switching them on the same topic is a study technique.</>,
          <>The loop: read → lab (checkpoints you actually observed) → quiz → mark done.</>,
          <>
            The curriculum is living: <code>next lesson</code> in Claude Code authors exactly one more, per the
            CLAUDE.md contract.
          </>,
          <>Lessons teach; the portfolio (built by you, coached by Claude) is what makes you hireable.</>,
          <>Progress is a local, exportable file you own.</>,
        ]}
      />
    </>
  )
}
