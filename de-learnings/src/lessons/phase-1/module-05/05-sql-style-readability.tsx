import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { RevealSolution } from '../../../components/RevealSolution'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeBlock } from '../../../components/CodeBlock'
import { CodeRunner } from '../../../components/CodeRunner'

const ID = '1.5.5'

const STYLE_SETUP = `CREATE OR REPLACE TABLE daily_weather AS
SELECT * FROM (VALUES
  ('Austin',  DATE '2024-03-01', 22.1),
  ('Austin',  DATE '2024-03-02', 23.4),
  ('Austin',  DATE '2024-03-03', 25.0),
  ('Boston',  DATE '2024-03-01',  3.2),
  ('Boston',  DATE '2024-03-02',  4.1),
  ('Boston',  DATE '2024-03-03',  2.8),
  ('Chicago', DATE '2024-03-01',  5.5),
  ('Chicago', DATE '2024-03-02',  6.7),
  ('Chicago', DATE '2024-03-03',  4.9)
) t(city, obs_date, temp_c);
CREATE OR REPLACE TABLE stations AS
SELECT * FROM (VALUES
  ('Austin', 'AUS-1'), ('Austin', 'AUS-2'),
  ('Boston', 'BOS-1'),
  ('Chicago', 'CHI-1'), ('Chicago', 'CHI-2')
) t(city, station_id);
CREATE OR REPLACE TABLE alert_cities AS
SELECT * FROM (VALUES ('Boston'), (NULL)) t(city);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Production SQL is read 100x more than written">
        <Tiered
          layman={
            <>
              <p>
                A shopping list scribbled on your hand works fine — you are the only reader, and it dies tonight. A street sign is
                different: thousands of strangers read it for decades, so it gets typeset, sized, standardized. Same words, different
                lifespan, different rules. Handwriting versus typesetting.
              </p>
              <p>
                A scratchpad query is handwriting. A query in a repository is a street sign: teammates, reviewers, and future-you all
                read it long after you forget writing it. Style is not decoration — it makes the sign legible.
              </p>
            </>
          }
          student={
            <>
              <p>
                Production SQL outlives its author’s memory within weeks. Incident reviews, schema changes, and metric disputes all start
                with someone <em>reading</em> queries — read time dominates lifetime cost, and style is the lever on read time.
                Consistency beats taste: when every file looks the same, readers pattern-match instead of re-parsing.
              </p>
              <p>
                This lesson sets your house style — keyword case, commas, aliases, CTE discipline, comments — then drills the
                anti-patterns that cause real production bugs, not just ugliness. The lab makes a linter enforce it all, so the rules
                cost zero willpower.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Style is defect-rate engineering. Code-review studies consistently find defect detection drops as cognitive load rises;
                uniform formatting lowers per-line load, so convention directly buys caught bugs. It also keeps diffs semantic —
                reformat-noise in a diff is review attention burned on nothing.
              </p>
              <p>
                The tooling: linters like sqlfluff parse SQL into an AST and check rules mechanically, moving style from social pressure
                to <GlossaryTerm k="repository">repository</GlossaryTerm> gate (CI, Phase 3). The trade-off is real — dialects fragment,
                formatters lose edge cases, and a rule firing on every file trains people to ignore the linter.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="A house style worth adopting">
        <Tiered
          layman={
            <>
              <p>
                Six rules cover most of it: CAPITAL keywords so structure jumps out; one comma style, never mixed; real nicknames for
                tables (not single letters); one job per named step; comments that explain <em>why</em>, not what; and long decision
                logic split one case per line. None change what the query does — they change how fast a stranger can trust it.
              </p>
              <p>
                The comma debate: trailing commas read naturally; leading commas make lines swappable and missing commas obvious. Teams
                argue this for sport. The actual rule: pick one, write it down, stop arguing.
              </p>
            </>
          }
          student={
            <>
              <p>
                This curriculum’s house style: UPPERCASE keywords, snake_case identifiers, one clause per line; meaningful aliases —
                single letters stop scaling exactly when queries get dangerous, so at three-plus tables spell them out; one concern per
                CTE (lesson 1.5.1); explicit <code>JOIN … ON</code>, never comma joins; comments only for what SQL cannot say —
                “exclude trips under 1 km per finance definition (FIN-482)”, not “filter trips”.
              </p>
              <p>
                Long CASE: one WHEN per line, aligned, ELSE always present, END aliased. A CASE with eight branches is usually a lookup
                table begging to be joined instead.
              </p>
            </>
          }
          phd={
            <>
              <p>
                What the rules share: they minimize the reader’s state machine. Uppercase keywords are syntax highlighting that survives
                plain text; one clause per line makes diffs line-addressable; leading commas make column lists order-independent under
                edit. Each rule trades a keystroke at write time for parse time saved on every future read.
              </p>
              <p>
                Comments deserve theory too: a comment restating code is a cache that silently goes stale on the next edit. A comment
                encoding <em>intent</em> — business definitions, ticket numbers, why the obvious approach failed — cannot go stale the
                same way, because the code cannot express it at all. Lint away the first kind; treasure the second.
              </p>
            </>
          }
        />
        <CodeBlock
          code={`-- Why: finance defines 'warm' against the March baseline (FIN-482).
WITH march_avg AS (
    SELECT AVG(temp_c) AS avg_temp_c
    FROM daily_weather
)
SELECT
    w.city
    , w.obs_date
    , CASE
        WHEN w.temp_c >= m.avg_temp_c THEN 'warm'
        ELSE 'cold'
      END AS temp_band
FROM daily_weather AS w
CROSS JOIN march_avg AS m
ORDER BY w.city, w.obs_date;`}
          label="House style on one page: keywords up, leading commas, why-comment, CASE one branch per line"
        />
      </Section>

      <Section kicker="core concepts" title="The anti-pattern catalog (these page people)">
        <Tiered
          layman={
            <>
              <p>
                Four harmless-looking habits cause 3 am phone calls: asking for <em>everything</em> (SELECT *) when you need three
                columns; gluing tables without saying how they connect; slapping “remove duplicates” on a result instead of asking where
                duplicates came from; and asking “is it NOT on the list?” when the list contains a blank — SQL answers with silence, not
                an error.
              </p>
              <p>
                The pattern behind all four: they hide a question instead of answering it. The fix is always the same — make the
                intention explicit.
              </p>
            </>
          }
          student={
            <>
              <p>
                <strong>SELECT * in production</strong> couples every consumer to the source’s full column list — name the columns; that
                list is your contract. <strong>Implicit comma joins</strong> turn a forgotten predicate into a silent cross join.{' '}
                <strong>DISTINCT-as-bandaid</strong> hides join fan-out — duplicates were telling you a join key was wrong.{' '}
                <strong>NOT IN over a nullable subquery</strong> returns zero rows the day a NULL appears; use NOT EXISTS.
              </p>
              <p>Run both demos: the first should return two cities and returns none; the second returns five rows where three exist.</p>
            </>
          }
          phd={
            <>
              <p>
                SELECT * also has an engine cost: on <GlossaryTerm k="columnar-storage">columnar storage</GlossaryTerm> (Parquet, DuckDB,
                every warehouse), naming three of fifty columns lets the scan skip most of the bytes — projection pushdown. SELECT *
                defeats it by definition. Phase 2 measures this on Parquet; Phase 3’s dbt-style contracts formalize the column list as a
                tested <GlossaryTerm k="schema">schema</GlossaryTerm>.
              </p>
              <p>
                NOT IN is semantics, not style: <code>x NOT IN (a, NULL)</code> desugars to a conjunction whose last term compares
                against NULL — UNKNOWN — so the predicate can never be TRUE. NOT EXISTS sidesteps NULL comparison entirely. DISTINCT,
                meanwhile, is whole-row dedup (lesson 1.5.4’s UNION cost) paid to mask a cardinality error.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={STYLE_SETUP}
          code={`SELECT DISTINCT w.city
FROM daily_weather AS w
WHERE w.city NOT IN (SELECT a.city FROM alert_cities AS a);`}
          label="0 rows — the NULL poisons NOT IN. Rewrite with WHERE NOT EXISTS (SELECT 1 FROM alert_cities AS a WHERE a.city = w.city): Austin and Chicago appear."
        />
        <CodeRunner
          language="sql"
          setup={STYLE_SETUP}
          code={`SELECT w.city, w.obs_date, w.temp_c
FROM daily_weather AS w
JOIN stations AS s ON s.city = w.city
WHERE w.obs_date = DATE '2024-03-01';`}
          label="5 rows for 3 cities — fan-out from the two-station cities. DISTINCT would hide it; deleting the pointless join fixes it."
        />
      </Section>

      <Section kicker="practice" title="Refactor the horror, stepwise">
        <p>
          This query runs correctly — “days warmer than the March average, and by how much” — and commits five crimes: single-letter
          aliases, one scalar subquery pasted three times, no formatting, an ordinal ORDER BY, zero intent. Refactor it stepwise in the
          runner: CTE the scalar, alias meaningfully, name output columns, ORDER BY a name, format. Re-run after every step.
        </p>
        <CodeRunner
          language="sql"
          setup={STYLE_SETUP}
          code={`select a.city,a.obs_date,a.temp_c,(select avg(temp_c) from daily_weather) av,
a.temp_c-(select avg(temp_c) from daily_weather) d
from daily_weather a where a.temp_c>(select avg(temp_c) from daily_weather) order by 5 desc;`}
          label="3 rows, all Austin, top delta 14.14. Keep those rows identical through every refactoring step."
        />
        <RevealSolution label="Reveal the refactored version">
          <CodeBlock
            code={`-- Why: 'warmer than baseline' days for the March ops report.
WITH march_avg AS (
    SELECT AVG(temp_c) AS avg_temp_c
    FROM daily_weather
)
SELECT
    w.city
    , w.obs_date
    , w.temp_c
    , ROUND(w.temp_c - m.avg_temp_c, 1) AS degrees_above_avg
FROM daily_weather AS w
CROSS JOIN march_avg AS m
WHERE w.temp_c > m.avg_temp_c
ORDER BY degrees_above_avg DESC;`}
            label="One definition of the average, named everything, zero ordinals — deltas 14.1 / 12.5 / 11.2"
          />
        </RevealSolution>
      </Section>

      <Section kicker="trade-offs" title="How strict should the rules be?">
        <Tradeoffs
          options={[
            {
              name: 'Strict: linter + formatter in CI',
              strengths: ['Zero style debates in review — the machine already ruled', 'Uniformity scales to any team size'],
              weaknesses: ['Rule noise trains people to ignore the linter', 'Edge cases where formatter output is genuinely worse'],
              chooseWhen: 'shared codebases with several writers — style disputes are pure waste there.',
            },
            {
              name: 'Light touch: formatter + a few rules',
              strengths: ['Catches bug-adjacent patterns without ceremony', 'Easy to adopt mid-project; low resistance'],
              weaknesses: ['Gaps between rules drift into inconsistency', 'Still needs a human to say no in review'],
              chooseWhen: 'small teams and solo projects — this curriculum’s choice, built in the lab.',
            },
            {
              name: 'Convention only, no tooling',
              strengths: ['No setup, no false positives ever', 'Maximum room for judgment'],
              weaknesses: ['Style decays with every deadline', 'Every review re-litigates commas'],
              chooseWhen: 'throwaway analysis that will not be read twice — and be honest about that.',
            },
          ]}
          note={
            <>
              Auto-format vs hand-craft is the same trade one level down: the formatter wins on consistency and diffs; the hand wins the
              occasional artful alignment. Take the formatter; spend the artistry on naming.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: lint sql-lab and write your style guide">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Run sqlfluff — the standard SQL linter — against your <code>sql-lab</code> queries via uvx (no install), fix what it
              finds, and codify six personal rules into <code>STYLE.md</code>.
            </p>
          }
          steps={[
            {
              title: 'Run sqlfluff and configure the dialect',
              body: (
                <>
                  <p>
                    uvx runs a tool in a throwaway environment — nothing added to your project. Create <code>.sqlfluff</code> in the
                    project root so every run knows the dialect:
                  </p>
                  <CodeBlock code={`[sqlfluff]
dialect = duckdb`} label=".sqlfluff" />
                </>
              ),
              commands: [{ ps: 'cd ~\\sql-lab\nuvx sqlfluff --version\ncode .sqlfluff' }],
              checkpoint: (
                <>
                  A version prints (3.x). <code>Get-Content .sqlfluff</code> shows the two config lines.
                </>
              ),
            },
            {
              title: 'Lint your module 1.5 queries',
              body: (
                <p>
                  Lint the CTE and rolling files from earlier lessons. Expect findings — capitalization, aliasing, line length — each
                  with a rule code like LT01 or CP01. Read three and decide whether you agree; an unargued-with linter gets ignored.
                </p>
              ),
              commands: [{ ps: 'uvx sqlfluff lint queries\\ctes_after.sql queries\\rolling.sql' }],
              checkpoint: <>A findings list prints with rule codes and line numbers (or “all passed” if you write eerily clean SQL).</>,
            },
            {
              title: 'Auto-fix, then prove behavior is unchanged',
              body: (
                <p>
                  Let sqlfluff rewrite what it can fix mechanically, then re-run the file — a linter must never change results. (Older
                  sqlfluff versions ask for confirmation; add <code>--force</code> if prompted.)
                </p>
              ),
              commands: [{ ps: 'uvx sqlfluff fix queries\\ctes_after.sql\nuv run python run_sql.py queries\\ctes_after.sql' }],
              checkpoint: <>The query still prints exactly one row: Boston, 32.0 — reformatted, behavior-identical.</>,
            },
            {
              title: 'Write your 6-rule style guide',
              body: (
                <>
                  <p>
                    Create <code>STYLE.md</code> in sql-lab with six numbered rules you commit to. Start from this template; rules 2 and
                    6 are yours to edit:
                  </p>
                  <CodeBlock
                    code={`# My SQL style
1. Keywords UPPERCASE, identifiers snake_case.
2. Leading commas in SELECT lists.
3. Aliases are meaningful words; single letters only in one-table queries.
4. One concern per CTE, named as a noun describing its rows.
5. Comments say WHY (definitions, tickets), never what the SQL already says.
6. Never SELECT * outside scratch work; the column list is the contract.`}
                    label="STYLE.md"
                  />
                </>
              ),
              commands: [{ ps: 'code STYLE.md\nGet-Content STYLE.md' }],
              checkpoint: (
                <><code>Get-Content STYLE.md</code> prints six numbered rules — yours. Every query from module 1.6 onward follows them.</>
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
              q: 'WHERE city NOT IN (SELECT city FROM alerts) returns zero rows unexpectedly. Most likely cause?',
              options: [
                'The alerts table is empty',
                'The subquery returned a NULL, making the NOT IN predicate never TRUE',
                'NOT IN requires an index',
                'DuckDB does not support subqueries in WHERE',
              ],
              answer: 1,
              explain:
                'One NULL turns the comparison chain UNKNOWN — three-valued logic. An empty subquery would return all rows, not none. Use NOT EXISTS, which never compares through NULL.',
            },
            {
              q: 'A query returns duplicates after adding a join, so the team adds SELECT DISTINCT. What actually happened?',
              options: [
                'DISTINCT fixed the root cause',
                'The join fans out one-to-many, and DISTINCT now hides that cardinality bug at extra cost',
                'The table has corrupt data',
                'DISTINCT is required after any join',
              ],
              answer: 1,
              explain:
                'Fan-out means the join key or the join itself is wrong. DISTINCT pays a whole-row dedup to mask it — and any aggregates computed before it are already inflated.',
            },
            {
              q: 'Why is SELECT * particularly costly on columnar engines?',
              options: [
                'It locks the table',
                'It defeats projection pushdown — the scan reads every column’s bytes instead of only the named ones',
                'The * wildcard parses slowly',
                'It is not costly; only row stores care',
              ],
              answer: 1,
              explain:
                'Columnar formats let a query read only named columns. SELECT * forces all of them — and couples consumers to the full schema, so adds and renames break things downstream.',
            },
            {
              q: 'Which comment earns its place in production SQL?',
              options: [
                '-- select city and temperature',
                '-- group by city',
                '-- exclude trips under 1 km: finance definition per FIN-482, 2024-02',
                '-- end of query',
              ],
              answer: 2,
              explain:
                'The others restate the SQL and silently go stale. The third records intent the code cannot express — a business definition and its source — exactly what a future reader needs.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What SQL anti-patterns do you watch for in code review?',
            a: (
              <p>
                SELECT * in anything downstream-facing (contract and column-pruning cost), DISTINCT papering over join fan-out (find
                the cardinality bug), NOT IN against nullable subqueries (returns zero rows — use NOT EXISTS), implicit comma joins,
                and unnamed magic numbers. Naming two with the <em>reason</em> they bite beats listing ten.
              </p>
            ),
          },
          {
            q: 'Does SQL formatting really matter in a data team?',
            a: (
              <p>
                Yes, as economics: production SQL is read far more than written, so read time dominates cost and consistency is the
                cheapest read-time optimization. Mention tooling — sqlfluff in CI ends style debates and keeps diffs semantic — and
                concede the limit: over-strict rules get ignored, so configure for bug-adjacent patterns first.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Style is maintenance economics: SQL is read 100x more than written, so optimize for the reader — consistently.</>,
          <>House rules: UPPERCASE keywords, one clause per line, meaningful aliases, one concern per CTE, comments that say why.</>,
          <>The catalog that pages people: SELECT * contracts, comma joins, DISTINCT bandaids, NOT IN with NULLs. Make intent explicit.</>,
          <>Refactors — style or structure — must be behavior-preserving: same rows before and after, every step.</>,
          <>Let sqlfluff enforce the rules so willpower is not the mechanism; your six rules live in STYLE.md from now on.</>,
        ]}
      />
    </>
  )
}
