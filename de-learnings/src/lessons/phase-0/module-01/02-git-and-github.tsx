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
import { GitGraph3D } from '../../../viz/GitGraph3D'

const ID = '0.1.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="A time machine for your work">
        <Tiered
          layman={
            <>
              <p>
                Imagine writing a novel with no “undo”, in a single file called <code>final_v2_REAL.docx</code>.
                One bad afternoon can destroy a month of work. Now imagine instead that every evening you put a
                complete photocopy of the manuscript in a labeled envelope — “added the courtroom scene” — and
                filed it. You could reread any day’s version, compare two envelopes, even try a risky rewrite in
                a side drawer without touching the shelf.
              </p>
              <p>
                Git is that filing system, automated. Each envelope is a{' '}
                <GlossaryTerm k="commit">commit</GlossaryTerm>; the drawer for risky experiments is a{' '}
                <GlossaryTerm k="branch">branch</GlossaryTerm>; GitHub is a copy of the whole cabinet kept in
                another building, which doubles as the portfolio shelf that future employers will browse.
              </p>
            </>
          }
          student={
            <>
              <p>
                Git tracks a <GlossaryTerm k="repository">repository</GlossaryTerm> as a chain of{' '}
                <GlossaryTerm k="commit">commits</GlossaryTerm> — each a complete snapshot of the project (not a
                diff), pointing at its parent. Three zones matter day to day: the <strong>working tree</strong>{' '}
                (your files), the <strong>staging area</strong> (what the next commit will contain — chosen with{' '}
                <code>git add</code>), and <strong>history</strong> (what’s been committed). The separation is a
                feature: you can edit five files and commit them as two coherent, well-messaged commits.
              </p>
              <p>
                For a data engineer git is not optional professionalism — it <em>is</em> the deployment
                mechanism. Pipelines ship by merging; CI runs on every push; dbt and Dagster projects are just
                git repos. And for you specifically, a clean commit history is what a hiring manager scrolls
                through when they open your portfolio.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Git is a content-addressed object store plus a pile of pointers. Every object (file blob,
                directory tree, commit) is stored under the hash of its content; a commit object references a
                tree hash and parent commit hash(es), which makes history a{' '}
                <strong>Merkle DAG</strong> — tamper-evident by construction, since changing any byte anywhere
                changes every downstream hash. A branch is nothing but a 41-byte file containing a commit hash;
                that is why branching is O(1) and why “branches are cheap” is not a slogan but an implementation
                fact. Identical content is stored once, so a thousand commits of a large repo cost far less than
                a thousand copies.
              </p>
              <p>
                This model explains behaviors that confuse people: commits never change (you only create new
                ones and move pointers), “deleting” a branch deletes a pointer not the commits, and a merge
                commit is simply a commit with two parents.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="interactive" title="Watch a history grow">
        <p>
          Step through this scripted repo history. Spheres are commits, lanes are branches, the white ring is{' '}
          <code>HEAD</code> (where you are). Hover any commit for its message — and notice the merge commit’s{' '}
          <em>two</em> incoming lines.
        </p>
        <GitGraph3D />
      </Section>

      <Section kicker="mechanics" title="The eight commands that are 90% of daily git">
        <Tiered
          student={
            <>
              <CodeBlock
                label="the daily loop"
                code={`git status          # what changed? (run this constantly)
git add <file>      # stage: choose what the next commit contains
git commit -m "fix: handle empty API pages"
git log --oneline --graph   # read the story so far`}
              />
              <CodeBlock
                label="branching"
                code={`git switch -c lab/duckdb   # create + switch to an experiment branch
# ...commit freely...
git switch main            # back to safety
git merge lab/duckdb       # bring the experiment home`}
              />
              <CodeBlock
                label="talking to GitHub"
                code={`git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main    # first push; afterwards just: git push
git pull                   # fetch + merge what's new on the remote`}
              />
              <p>
                Commit messages: imperative mood, specific, small commits. <code>fix: retry on HTTP 429</code>{' '}
                beats <code>changes</code>. Your future self at 2am during an incident is the audience.
              </p>
            </>
          }
          layman={
            <>
              <p>Daily git is a small loop of four moves:</p>
              <ul>
                <li>
                  <strong>status</strong> — “what did I touch since the last envelope?”
                </li>
                <li>
                  <strong>add</strong> — put chosen changes into the envelope
                </li>
                <li>
                  <strong>commit</strong> — seal it with a label describing the change
                </li>
                <li>
                  <strong>push</strong> — mail a copy of the cabinet to GitHub for safekeeping
                </li>
              </ul>
              <p>
                Branches add one more idea: “work in a side drawer, and <strong>merge</strong> it into the main
                shelf when it’s ready.” The exact commands are in the Student view — you’ll type them all in the
                lab below.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Two habits worth adopting from day one, stated as invariants: (1) <code>main</code> is always in
                a state you would show an employer — experiments live on branches; (2) each commit is a
                minimal, self-describing unit — because <code>git bisect</code>, <code>revert</code>, and code
                review all operate at commit granularity, sloppy commits tax every future operation.
              </p>
              <p>
                On merge vs rebase: a merge commit preserves the true DAG; rebase rewrites commits (new hashes —
                remember, commits are immutable, so “moving” them means re-creating them) to fake a linear
                history. Linear history is easier to read; rewritten history on shared branches breaks
                collaborators. Solo rule of thumb: rebase your own unpushed work if you like tidy history, never
                rewrite anything already pushed.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="One repo or many? (Your portfolio’s first architecture decision)">
        <p>
          This curriculum lives in a single repository holding the learning app and all portfolio projects.
          That was a real decision with real alternatives:
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Monorepo (this repo)',
              strengths: [
                'One clone, one history, one place to search everything',
                'Curriculum and projects evolve together — lessons can link project code',
                'Simpler for a solo learner: no cross-repo coordination',
              ],
              weaknesses: [
                'Repo grows large over a year',
                'A recruiter sees one repo, not eight pinned repos on your profile',
                'CI has to be scoped per-folder or it runs everything on every push',
              ],
              chooseWhen: 'projects are tightly coupled or share tooling — or you’re one person moving fast.',
            },
            {
              name: 'Repo per project',
              strengths: [
                'Each project is a clean, pinnable portfolio artifact with its own README front page',
                'Small clones, focused CI, independent histories',
              ],
              weaknesses: [
                'Eight repos to keep consistent (licenses, CI templates, tooling drift)',
                'Cross-project changes need multiple PRs',
              ],
              chooseWhen: 'projects are independent and the audience (recruiters!) browses them separately.',
            },
          ]}
          note={
            <>
              Our plan gets both: build inside the monorepo, and each portfolio project is written
              self-contained (own README, own compose file) so it can be <em>extracted</em> to a standalone
              repo when it’s polished. This exact tension — monorepo vs polyrepo — reappears at company scale
              in Phase 7.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: your history, on GitHub">
        <Callout kind="warn" title="Account actions are yours">
          Creating the GitHub account, logging in, and clicking “Create repository” are things <em>you</em> do
          in the browser — never hand credentials to anyone (including an AI assistant).
        </Callout>
        <Lab
          lessonId={ID}
          steps={[
            {
              title: 'Introduce yourself to git',
              body: <p>Git stamps every commit with an identity. Set yours once, globally:</p>,
              commands: [
                {
                  ps: 'git config --global user.name "Your Name"\ngit config --global user.email "you@example.com"\ngit config --global init.defaultBranch main',
                },
              ],
              checkpoint: (
                <>
                  <code>git config --global --list</code> shows your name, email, and default branch.
                </>
              ),
            },
            {
              title: 'Make a practice repo and two commits',
              commands: [
                {
                  ps: 'mkdir ~\\git-practice; cd ~\\git-practice\ngit init\n"# Practice" | Out-File README.md -Encoding utf8\ngit add README.md\ngit commit -m "init: add README"\n"line two" | Add-Content README.md\ngit add README.md\ngit commit -m "docs: expand README"',
                  bash: 'mkdir ~/git-practice && cd ~/git-practice\ngit init\necho "# Practice" > README.md\ngit add README.md\ngit commit -m "init: add README"\necho "line two" >> README.md\ngit add README.md\ngit commit -m "docs: expand README"',
                },
              ],
              checkpoint: (
                <>
                  <code>git log --oneline</code> shows exactly two commits with your messages, newest first.
                </>
              ),
            },
            {
              title: 'Branch, commit, merge — reproduce the 3D graph',
              commands: [
                {
                  ps: 'git switch -c lab/experiment\n"experimental idea" | Out-File idea.md -Encoding utf8\ngit add idea.md\ngit commit -m "lab: try an idea"\ngit switch main\ngit merge lab/experiment',
                  bash: 'git switch -c lab/experiment\necho "experimental idea" > idea.md\ngit add idea.md\ngit commit -m "lab: try an idea"\ngit switch main\ngit merge lab/experiment',
                },
              ],
              checkpoint: (
                <>
                  <code>git log --oneline --graph --all</code> draws the branch line joining back into main —
                  the same shape you stepped through in the visualization above.
                </>
              ),
            },
            {
              title: 'Create the GitHub repo for THIS curriculum',
              body: (
                <p>
                  On github.com (create an account if needed): New repository → name it{' '}
                  <code>data-engineering</code> → <strong>no</strong> README/gitignore (the repo already has
                  them) → Create. Then connect and push from the curriculum repo root:
                </p>
              ),
              commands: [
                {
                  ps: 'cd <path-to>\\data_engineering\ngit remote add origin https://github.com/<you>/data-engineering.git\ngit push -u origin main',
                },
              ],
              checkpoint: (
                <>
                  Refreshing the GitHub page shows this repo’s files — README, CLAUDE.md,{' '}
                  <code>de-learnings/</code>, <code>de-portfolio/</code>. Your portfolio is now public and
                  backed up.
                </>
              ),
            },
            {
              title: 'Turn on the website',
              body: (
                <p>
                  This repo ships a workflow that publishes the learning app on every push. On GitHub: Settings
                  → Pages → set <strong>Source</strong> to <strong>GitHub Actions</strong>. Then watch the
                  Actions tab.
                </p>
              ),
              checkpoint: (
                <>
                  The “Deploy learning app” action goes green, and{' '}
                  <code>https://&lt;you&gt;.github.io/data-engineering/</code> serves this very app — your
                  curriculum is now also a public artifact.
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
              q: 'A commit is best described as…',
              options: [
                'a diff of the lines you changed',
                'a complete snapshot of the project pointing at its parent snapshot',
                'a backup of one file',
                'a message describing your changes',
              ],
              answer: 1,
              explain:
                'Git stores snapshots (deduplicated by content hash), not diffs. The message rides along, but the commit IS the snapshot + parent pointer.',
            },
            {
              q: 'Why is creating a branch in git essentially free?',
              options: [
                'Git compresses the copied files heavily',
                'A branch is just a pointer to an existing commit — nothing is copied',
                'GitHub stores branches in the cloud',
                'It is not free — large repos branch slowly',
              ],
              answer: 1,
              explain:
                'A branch is a tiny file containing a commit hash. Creating one writes ~41 bytes, regardless of repo size.',
            },
            {
              q: 'What makes a merge commit special?',
              options: [
                'It has no message',
                'It deletes the merged branch',
                'It has two (or more) parent commits',
                'It rewrites the history of both branches',
              ],
              answer: 2,
              explain:
                'A merge commit joins histories by pointing at both tips. Nothing is rewritten or lost — the DAG just converges.',
            },
            {
              q: 'You committed but did not push, then your laptop dies. Your work is…',
              options: [
                'safe on GitHub',
                'gone with the laptop — commits live locally until pushed',
                'recoverable from the staging area',
                'automatically emailed to you',
              ],
              answer: 1,
              explain:
                'Git is distributed: commits exist only in your local repo until you push. Hence the habit — push at the end of every session.',
            },
            {
              q: 'What belongs in .gitignore for a data project?',
              options: [
                'Source code, so competitors cannot read it',
                'Datasets, virtual environments, secrets (.env), build output',
                'The README',
                'Nothing — git should track everything',
              ],
              answer: 1,
              explain:
                'Track code and config that defines the project; ignore what is large, regenerable, machine-specific, or secret. This repo’s .gitignore is a working example.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What is the difference between git and GitHub?',
            a: (
              <p>
                Git is the distributed version-control tool that runs entirely on your machine; GitHub is a
                hosting service for git repositories that adds collaboration (pull requests, reviews, CI,
                Pages). You could use git forever without GitHub — the reverse is meaningless.
              </p>
            ),
          },
          {
            q: 'What is a merge conflict and how do you resolve one?',
            a: (
              <p>
                When two branches change the same lines, git cannot auto-merge and marks the region with
                conflict markers. You resolve it by editing the file to the intended final state, staging it,
                and committing. Strong answers add prevention: small short-lived branches and frequent merges
                shrink the window for conflicts.
              </p>
            ),
          },
          {
            q: 'Why do teams forbid force-pushing to shared branches?',
            a: (
              <p>
                Force-push replaces published history with rewritten commits (new hashes). Anyone who had
                based work on the old commits is now stranded on a divergent history. Rewriting is fine for
                your own unpushed work; published history is append-only by convention.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Commits are immutable snapshots forming a DAG; branches are cheap movable pointers into it.</>,
          <>
            The staging area lets you shape coherent commits: <code>status → add → commit</code>, constantly.
          </>,
          <>
            <code>main</code> stays presentable; experiments live on branches and merge home.
          </>,
          <>Commits are local until pushed — end every session with a push.</>,
          <>
            Your git history is part of your portfolio now: imperative, specific messages (
            <code>fix: retry on HTTP 429</code>).
          </>,
        ]}
      />
    </>
  )
}
