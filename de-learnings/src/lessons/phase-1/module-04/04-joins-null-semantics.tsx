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

const ID = '1.4.4'

// trips: 10 rows — Pune has no match in cities, one trip has a NULL city.
// cities: 4 rows — Reykjavik has no trips. city_tags: Berlin has TWO tags (duplicate key, on purpose).
const J = `CREATE OR REPLACE TABLE trips AS SELECT * FROM (VALUES
  (1, 'Chennai', DATE '2026-06-01', 5.2), (2, 'Chennai', DATE '2026-06-01', 3.1), (3, 'Chennai', DATE '2026-06-02', 8.4),
  (4, 'Berlin', DATE '2026-06-01', 2.2), (5, 'Berlin', DATE '2026-06-02', 4.9),
  (6, 'Seattle', DATE '2026-06-01', 6.0), (7, 'Seattle', DATE '2026-06-02', 3.3),
  (8, 'Pune', DATE '2026-06-01', 7.5), (9, 'Pune', DATE '2026-06-02', 2.8),
  (10, NULL, DATE '2026-06-02', 4.4)
) AS t(trip_id, city, day, distance_km);
CREATE OR REPLACE TABLE cities AS SELECT * FROM (VALUES
  ('Chennai', 'India', 12.05), ('Berlin', 'Germany', 3.87), ('Seattle', 'USA', 0.75), ('Reykjavik', 'Iceland', 0.14)
) AS t(city, country, population_m);
CREATE OR REPLACE TABLE city_tags AS SELECT * FROM (VALUES
  ('Berlin', 'capital'), ('Berlin', 'eu'), ('Chennai', 'coastal'), ('Seattle', 'coastal')
) AS t(city, tag);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Data lives in more than one table">
        <p>
          Real datasets are split up: a <code>trips</code> table records bike trips, a <code>cities</code> table holds one
          metadata row per city. To ask &quot;how far do people ride, per country?&quot; you <em>join</em> them on a shared key:</p>
        <CodeRunner
          language="sql"
          setup={J}
          code={`SELECT t.trip_id, t.city, t.distance_km, c.country, c.population_m
FROM trips t
JOIN cities c ON t.city = c.city
ORDER BY t.trip_id;`}
        />
        <Tiered
          layman={
            <>
              <p>
                Two guest lists: ceremony and dinner. &quot;Who attended both?&quot; means walking the first list and looking
                each name up on the second — matched pairs go in your answer. That is a join; the shared name is the{' '}
                <em>key</em>. Ten trips came in; only seven matched a known city.
              </p>
              <p>
                The interesting arguments start with people on only one list. Keep them, with blanks for the missing half?
                Drop them? Each choice is a different join type — the whole next section.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>JOIN cities c ON t.city = c.city</code> pairs each trips row with every cities row satisfying the ON
                condition. Alias tables (<code>t</code>, <code>c</code>) and qualify columns — with two tables in play, bare
                names get ambiguous fast. The result is a wider row: trip columns plus that city's metadata.
              </p>
              <p>
                Three rows vanished: two Pune trips (no Pune in <code>cities</code>) and trip 10, whose city is NULL — a NULL
                key matches <em>nothing</em>, a fact that matters all lesson. Plain <code>JOIN</code> means INNER: matches only.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A join is a cartesian product filtered by the ON predicate, with equi-joins (key equality) the dominant special
                case. Engines never materialize the product: a <em>hash join</em> builds a table on the smaller side and probes
                with the larger — O(n + m) — while <em>nested loops</em> are the O(n times m) fallback for non-equi predicates.
                Mechanics dissected in 2.2, distributed in 4.3.
              </p>
              <p>
                Because joins are declarative, join <em>order</em> belongs to the optimizer — for k tables the search space is
                enormous, the classic hard problem of query optimization. You state relationships; it picks the tree.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="INNER, LEFT, RIGHT, FULL — who survives">
        <Tiered
          layman={
            <>
              <p>
                Four answers to &quot;what about people on only one list?&quot;. <em>Inner</em>: matched pairs only.{' '}
                <em>Left</em>: everyone from the first list, blanks where the second had nobody. <em>Right</em>: the mirror.{' '}
                <em>Full</em>: everyone from both, blanks wherever a half is missing.
              </p>
              <p>
                &quot;Left&quot; just means the table written first. You usually want &quot;keep all my main records, decorate
                with metadata where it exists&quot; — which is why left join is the daily workhorse.
              </p>
            </>
          }
          student={
            <>
              <p>
                Same query, four keywords, four row counts on our data: <code>INNER JOIN</code> 7 (matches only),{' '}
                <code>LEFT JOIN</code> 10 (all trips; unmatched get NULL country), <code>RIGHT JOIN</code> 8 (7 plus tripless
                Reykjavik), <code>FULL JOIN</code> 11 (everything, padded both ways). Run the query below, swap the keyword,
                re-run until all four counts make sense.
              </p>
              <p>
                Note what LEFT JOIN did to trip 10 and the Pune trips: kept, with <code>country</code> NULL. Those NULLs are{' '}
                <em>manufactured by the join</em> — nothing in either table was NULL. <code>COALESCE(c.country, '(none)')</code>{' '}
                substitutes a default; &quot;LEFT JOIN then keep the NULL rows&quot; becomes the anti-join two sections down.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Outer joins are inner joins unioned with the preserved side's unmatched rows, NULL-padded to shape. This{' '}
                <em>null inflation</em> is a modeling hazard: downstream code sees NULLs meaning &quot;no match existed&quot;,
                indistinguishable from &quot;value unknown&quot; — one more overload on an overloaded marker. COUNT(*) vs
                COUNT(c.country) after a left join quantifies exactly the unmatched rows; that pair appears in every join-audit
                query.
              </p>
              <p>
                RIGHT JOIN is pure syntax — engines rewrite it as a LEFT JOIN with operands swapped, and style guides ban it
                for humans too. FULL joins are rarer and costlier (both sides tracked for matches) but irreplaceable for
                reconciliation: which records exist in system A, B, or both?
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={J}
          code={`-- swap JOIN for: LEFT JOIN, RIGHT JOIN, FULL JOIN. Counts: 7 / 10 / 8 / 11
SELECT t.trip_id, t.city AS trip_city, c.city AS meta_city,
       COALESCE(c.country, '(none)') AS country
FROM trips t
LEFT JOIN cities c ON t.city = c.city
ORDER BY t.trip_id;`}
        />
      </Section>

      <Section kicker="core concepts" title="Duplicate keys multiply rows">
        <p>
          A join pairs each row with <em>every</em> match, not the first. Berlin has two tags in <code>city_tags</code> — so
          every Berlin trip comes back twice, and anything aggregated afterward is silently inflated:</p>
        <CodeRunner
          language="sql"
          setup={J}
          code={`SELECT t.city, COUNT(*) AS rows_after_join, SUM(t.distance_km) AS km
FROM trips t
JOIN city_tags g ON t.city = g.city
GROUP BY t.city
ORDER BY t.city;`}
        />
        <p>
          Berlin shows 4 rows and 14.2 km — the real numbers are 2 trips, 7.1 km. Nothing errored. This is the most common
          silent data bug in analytics.
        </p>
        <Callout kind="warn" title="The join discipline">
          Before joining, know which side is unique on the key (one row per city? per city-day?). After joining, compare row
          counts to your prediction. An unexplained row-count change is a bug until proven otherwise — count before, count
          after, every time.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="NULL: three-valued logic, IS NULL, COALESCE">
        <Tiered
          layman={
            <>
              <p>
                NULL means &quot;unknown&quot;, and unknowns do not equal each other. Two guests with blank name tags — same
                person? You cannot say, so SQL refuses to say: &quot;does unknown equal unknown?&quot; returns neither yes nor
                no but a third value, UNKNOWN. Filters pass only definite yeses, so unknowns quietly fall out.
              </p>
              <p>
                To ask &quot;is this blank?&quot; there is a dedicated phrasing (<em>IS NULL</em>), and a tool to fill blanks
                with a default (<em>COALESCE</em>). Once you know blanks never match anything, much confusing behavior becomes
                predictable.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>city = NULL</code> is never true — not even where city IS NULL — because any comparison with NULL yields
                UNKNOWN. Test with <code>IS NULL</code> / <code>IS NOT NULL</code>; substitute with{' '}
                <code>COALESCE(x, fallback)</code>. In joins a NULL key matches nothing (trip 10 survives only outer joins); in
                aggregates NULLs are skipped (last lesson); in <code>GROUP BY</code>/<code>DISTINCT</code> NULLs <em>are</em>{' '}
                collected into one group. SQL is deliberately inconsistent across contexts — memorize per context.
              </p>
              <p>
                Run the truth table below and keep it: <code>NULL AND FALSE</code> is FALSE (a definite no wins),{' '}
                <code>NULL OR TRUE</code> is TRUE (a definite yes wins), everything else with NULL stays UNKNOWN.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Three-valued logic is Kleene's K3, adopted so missing data cannot fabricate certainty: if{' '}
                <code>NULL = NULL</code> were true, two sensors with lost readings would be &quot;equal&quot; and joins against
                them would invent matches. UNKNOWN propagates uncertainty <em>soundly</em> — the price is losing the excluded
                middle: <code>p OR NOT p</code> is UNKNOWN for NULL inputs, precisely the 18-vs-20 phenomenon of lesson 1.4.2.
              </p>
              <p>
                Theorists (Date's critiques are the classic reading) have long argued one marker overloads too many meanings —
                unknown, inapplicable, no-match-found. SQL shipped anyway. Practical consequence: know which meaning each NULL
                in <em>your</em> pipeline carries, and normalize with COALESCE at well-chosen boundaries.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          code={`SELECT NULL = NULL      AS null_eq_null,
       NULL <> 5        AS null_ne_5,
       (NULL AND FALSE) AS null_and_false,
       (NULL OR TRUE)   AS null_or_true,
       NULL IS NULL     AS null_is_null;`}
        />
        <CodeRunner
          language="sql"
          setup={J}
          code={`-- change IS NULL to = NULL and watch the row vanish
SELECT trip_id, COALESCE(city, '(unknown)') AS city_label, distance_km
FROM trips
WHERE city IS NULL;`}
        />
      </Section>

      <Section kicker="core concepts" title="The anti-join: rows that DON'T match">
        <p>
          &quot;Which trips have no city metadata?&quot; is an <em>anti-join</em>, and it falls straight out of what you know:
          LEFT JOIN manufactures NULLs exactly where matches failed. Add one WHERE line below so only the 3 unmatched trips
          return:
        </p>
        <CodeRunner
          language="sql"
          setup={J}
          code={`SELECT t.trip_id, t.city, c.city AS matched_city
FROM trips t
LEFT JOIN cities c ON t.city = c.city
ORDER BY t.trip_id;`}
        />
        <RevealSolution label="Reveal solution">
          <CodeBlock
            label="sql"
            code={`SELECT t.trip_id, t.city, c.city AS matched_city
FROM trips t
LEFT JOIN cities c ON t.city = c.city
WHERE c.city IS NULL
ORDER BY t.trip_id;`}
          />
          <p>
            Three rows: the two Pune trips and NULL-city trip 10. Filter on the <em>right side's key</em> being NULL — NULL
            exactly when no match existed. This pattern finds orphaned records and failed lookups in every pipeline you will
            ever audit; EXISTS-based phrasings arrive next lesson.
          </p>
        </RevealSolution>
      </Section>

      <Section kicker="trade-offs" title="One big table, or normalized tables plus joins?">
        <p>
          If joins cause this much trouble, why not copy country and population onto every trip row? Sometimes you should —
          your first taste of the <GlossaryTerm k="schema">schema</GlossaryTerm> design debates of Phase 2:</p>
        <Tradeoffs
          options={[
            {
              name: 'Normalized tables + joins',
              strengths: [
                'One fact, one place: updating a city touches one row',
                'No inconsistent copies; smaller storage for wide metadata',
                'Clear ownership boundaries per table',
              ],
              weaknesses: [
                'Every query pays join cost and join-bug risk (duplicates, NULLs)',
                'Analysts must know the key relationships to get correct answers',
              ],
              chooseWhen: 'data changes and correctness of updates matters — the default for source-of-truth systems.',
            },
            {
              name: 'One big denormalized table',
              strengths: [
                'Zero joins: simple, fast reads; analyst-friendly',
                'Columnar engines compress repeated values well anyway',
              ],
              weaknesses: [
                'Updates must touch millions of copies (or drift into inconsistency)',
                'Wide rows tempt subtle double-counting when re-aggregated',
              ],
              chooseWhen: 'read-heavy analytics tables rebuilt by pipeline — common as a final serving layer.',
            },
          ]}
          note={
            <>
              Production warehouses do both: normalized upstream for correctness, denormalized marts downstream for speed —
              your pipelines doing the joining, once, on a schedule. Phase 2 turns this into a discipline (star schemas).
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: join weather to city metadata, find the orphans">
        <Lab
          lessonId={ID}
          intro={
            <p>
              In <code>C:\de-lab\sql-lab</code>, against the 120-row <code>weather.duckdb</code>. You will hand-make a
              metadata CSV that mismatches the weather table on both sides — Reykjavik missing, Oslo extra — then audit the
              joins with exact counts.
            </p>
          }
          steps={[
            {
              title: 'Create cities.csv and load it',
              body: (
                <>
                  <p>Save as <code>data\cities.csv</code> (note: no Reykjavik, and Oslo has no weather):</p>
                  <CodeBlock
                    label="data/cities.csv"
                    code={`city,country,population_m
Chennai,India,12.05
Berlin,Germany,3.87
Seattle,USA,0.75
Oslo,Norway,0.72`}
                  />
                  <p>Load it as a new table alongside weather:</p>
                  <CodeBlock
                    label="load_cities.py"
                    code={`import duckdb

con = duckdb.connect("weather.duckdb")
con.sql("CREATE OR REPLACE TABLE city_meta AS SELECT * FROM read_csv_auto('data/cities.csv')")
con.sql("SELECT COUNT(*) AS n FROM city_meta").show()`}
                  />
                </>
              ),
              commands: [{ ps: 'cd C:\\de-lab\\sql-lab\nuv run python load_cities.py' }],
              checkpoint: <><code>n</code> = <strong>4</strong>. The database now holds two tables.</>,
            },
            {
              title: 'Inner join: how many weather rows have metadata?',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT COUNT(*) AS n
FROM weather w JOIN city_meta m ON w.city = m.city;`} />
                </RevealSolution>
              ),
              checkpoint: <><code>n</code> = <strong>90</strong> — three matched cities times 30 days. Predicted it first? That is the join discipline.</>,
            },
            {
              title: 'Left join: keep all weather, count the manufactured NULLs',
              body: (
                <RevealSolution label="Reveal solution">
                  <CodeBlock label="sql" code={`SELECT COUNT(*) AS total, COUNT(*) - COUNT(m.country) AS unmatched
FROM weather w LEFT JOIN city_meta m ON w.city = m.city;`} />
                </RevealSolution>
              ),
              checkpoint: <>total = <strong>120</strong>, unmatched = <strong>30</strong> — the COUNT(*) minus COUNT(col) trick, now auditing a join.</>,
            },
            {
              title: 'Anti-joins in both directions: find the orphans',
              body: (
                <>
                  <p>Which city has weather but no metadata? And which metadata city has no weather?</p>
                  <RevealSolution label="Reveal solution">
                    <CodeBlock label="sql" code={`SELECT DISTINCT w.city
FROM weather w LEFT JOIN city_meta m ON w.city = m.city
WHERE m.city IS NULL;
-- then the reverse direction:
SELECT m.city
FROM city_meta m LEFT JOIN weather w ON m.city = w.city
WHERE w.city IS NULL;`} />
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  Direction one: <strong>Reykjavik</strong> (30 rows without the DISTINCT — worth seeing). Direction two:{' '}
                  <strong>Oslo</strong>. This pair is a complete referential audit between any two tables, and it goes straight
                  into project P1's quality checks.
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
              q: 'trips has 10 rows (2 match nothing, 1 has a NULL key). trips LEFT JOIN cities returns...',
              options: ['7 rows', '10 rows', '8 rows', '13 rows'],
              answer: 1,
              explain: 'LEFT JOIN preserves every left row: matched ones gain metadata, the 3 unmatched (including the NULL key, which matches nothing) get NULL-padded columns. INNER would return 7.',
            },
            {
              q: 'After joining trips to a tags table where Berlin has two tags, SUM(distance_km) for Berlin doubled. Why?',
              options: [
                'SUM always double-counts after joins',
                'each Berlin trip matched both tag rows, so every trip appears twice in the join result',
                'the tags table had NULL keys',
                'DuckDB caches previous results',
              ],
              answer: 1,
              explain: 'A join pairs each row with every match. Duplicate keys on the far side multiply rows, silently inflating downstream aggregates. Know which side is unique; count before and after.',
            },
            {
              q: "WHERE city = NULL returns zero rows even though a NULL city exists because...",
              options: [
                'the parser silently drops the condition',
                'any comparison with NULL yields UNKNOWN, and WHERE only passes TRUE — use IS NULL',
                'NULL rows are stored in a separate table',
                '= only works on numbers',
              ],
              answer: 1,
              explain: 'NULL means unknown, and unknown = unknown is still unknown. IS NULL is the dedicated test; COALESCE substitutes defaults. Three-valued logic in one sentence.',
            },
            {
              q: 'The anti-join pattern for "left rows with no match" is...',
              options: [
                'INNER JOIN ... WHERE right.key IS NULL',
                'LEFT JOIN ... WHERE right.key IS NULL',
                'FULL JOIN ... WHERE left.key IS NULL',
                'LEFT JOIN ... WHERE left.key IS NULL',
              ],
              answer: 1,
              explain: 'LEFT JOIN manufactures NULLs in the right side exactly where matches failed; filtering on the right key IS NULL keeps precisely those. An INNER join has no unmatched rows to find.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'A revenue number doubled after someone "just added a join". What happened and how do you prevent it?',
            a: (
              <p>
                The joined table almost certainly has duplicate values in the join key — each fact row matched multiple rows
                and the aggregate counted it multiple times. Prevention: know the grain of both tables, verify key uniqueness
                before joining (COUNT(*) vs COUNT(DISTINCT key)), and compare pre- and post-join row counts. Strong candidates
                name this unprompted; it is the most common silent bug in analytics.
              </p>
            ),
          },
          {
            q: 'How do NULLs interact with joins?',
            a: (
              <p>
                Twice over. Going in: a NULL join key matches nothing — such rows vanish from inner joins and survive only on
                an outer join's preserved side. Coming out: outer joins manufacture NULLs for unmatched rows, so a NULL in the
                result can mean &quot;source value unknown&quot; or &quot;no match existed&quot; — COUNT(*) minus
                COUNT(right_col) counts the latter, COALESCE labels them explicitly.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A join pairs rows by key. INNER keeps matches only; LEFT/RIGHT/FULL preserve one or both sides, padding with NULLs (7/10/8/11 on our seed data).</>,
          <>Duplicate join keys multiply rows and silently inflate aggregates — know each table's grain, count before and after.</>,
          <>NULL never equals anything, including NULL: comparisons yield UNKNOWN, WHERE passes only TRUE. Use IS NULL and COALESCE.</>,
          <>NULLs are inconsistent by context: skipped by aggregates, no-match in join keys, grouped together by GROUP BY/DISTINCT.</>,
          <>Anti-join = LEFT JOIN plus WHERE right.key IS NULL — run it in both directions for a full referential audit.</>,
          <>Normalized-plus-joins vs one-big-table is a real trade-off; warehouses typically normalize upstream and denormalize downstream.</>,
        ]}
      />
    </>
  )
}
