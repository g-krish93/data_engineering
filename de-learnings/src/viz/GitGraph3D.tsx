import { useMemo, useState } from 'react'
import { Html, Line } from '@react-three/drei'
import { VizCanvas } from './VizCanvas'

export type GitStep =
  | { kind: 'commit'; branch: string; msg: string; note: string }
  | { kind: 'branch'; name: string; from: string; note: string }
  | { kind: 'merge'; from: string; into: string; msg: string; note: string }

interface GitNode {
  id: number
  x: number
  z: number
  branch: string
  msg: string
  parents: number[]
}

const BRANCH_COLORS: Record<number, string> = {
  0: '#22d3ee',
  1: '#fbbf24',
  2: '#f472b6',
  3: '#34d399',
}

export const DEFAULT_GIT_SCRIPT: GitStep[] = [
  { kind: 'commit', branch: 'main', msg: 'init: scaffold curriculum', note: 'Every repository starts with a first commit — a full snapshot of the project at that moment.' },
  { kind: 'commit', branch: 'main', msg: 'docs: add README', note: 'Each new commit points back at its parent. History is a chain of snapshots, not a pile of diffs.' },
  { kind: 'branch', name: 'lab/duckdb', from: 'main', note: 'A branch is just a movable label pointing at a commit. Creating one copies nothing — it is free.' },
  { kind: 'commit', branch: 'lab/duckdb', msg: 'lab: first DuckDB queries', note: 'Committing on the branch moves its label forward. main has not moved — your experiment is isolated.' },
  { kind: 'commit', branch: 'main', msg: 'fix: README typo', note: 'Meanwhile main can advance too. The two lines of history are now genuinely parallel.' },
  { kind: 'commit', branch: 'lab/duckdb', msg: 'lab: join experiments', note: 'Keep committing on the experiment — small commits with clear messages are cheap insurance.' },
  { kind: 'merge', from: 'lab/duckdb', into: 'main', msg: 'merge: DuckDB lab', note: 'A merge commit has TWO parents. Both histories join, and nothing that was committed is ever lost.' },
]

function buildGraph(script: GitStep[], upTo: number) {
  const nodes: GitNode[] = []
  const branchTip: Record<string, number> = {}
  const branchLane: Record<string, number> = {}
  let nextLane = 0
  let slot = 0
  let head = -1
  let headBranch = 'main'

  for (let i = 0; i < upTo; i++) {
    const step = script[i]
    if (step.kind === 'branch') {
      branchLane[step.name] = ++nextLane
      branchTip[step.name] = branchTip[step.from]
      headBranch = step.name
    } else if (step.kind === 'commit') {
      if (branchLane[step.branch] === undefined) branchLane[step.branch] = step.branch === 'main' ? 0 : ++nextLane
      const parent = branchTip[step.branch]
      const node: GitNode = {
        id: nodes.length,
        x: slot++,
        z: branchLane[step.branch],
        branch: step.branch,
        msg: step.msg,
        parents: parent === undefined ? [] : [parent],
      }
      nodes.push(node)
      branchTip[step.branch] = node.id
      head = node.id
      headBranch = step.branch
    } else {
      const node: GitNode = {
        id: nodes.length,
        x: slot++,
        z: branchLane[step.into] ?? 0,
        branch: step.into,
        msg: step.msg,
        parents: [branchTip[step.into], branchTip[step.from]].filter((p) => p !== undefined),
      }
      nodes.push(node)
      branchTip[step.into] = node.id
      head = node.id
      headBranch = step.into
    }
  }
  return { nodes, branchTip, branchLane, head, headBranch }
}

function pos(n: GitNode, count: number): [number, number, number] {
  const spread = Math.max(count - 1, 1)
  return [n.x * 2.1 - spread, 0, n.z * -2.4 + 1]
}

function CommitNode({ node, color, isHead, count }: { node: GitNode; color: string; isHead: boolean; count: number }) {
  const [hover, setHover] = useState(false)
  const p = pos(node, count)
  return (
    <group position={p}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.7 : 0.3} roughness={0.3} />
      </mesh>
      {isHead && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.68, 0.05, 12, 48]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
        </mesh>
      )}
      {(hover || isHead) && (
        <Html position={[0, isHead ? 1.25 : 0.95, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              whiteSpace: 'nowrap',
              fontSize: 11,
              fontFamily: 'Consolas, monospace',
              background: 'rgba(10,14,26,0.92)',
              color: '#e8edf8',
              border: `1px solid ${color}`,
              borderRadius: 8,
              padding: '3px 8px',
            }}
          >
            {isHead && <b style={{ color }}>HEAD </b>}
            {node.msg}
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * A scripted, steppable 3D git graph: commits are spheres, branches are lanes,
 * merges have two parents. Step through the story with the controls below.
 */
export function GitGraph3D({ script = DEFAULT_GIT_SCRIPT, height = 380 }: { script?: GitStep[]; height?: number }) {
  const [stepCount, setStepCount] = useState(1)
  const { nodes, branchTip, branchLane, head, headBranch } = useMemo(
    () => buildGraph(script, stepCount),
    [script, stepCount],
  )
  const count = Math.max(nodes.length, 4)
  const step = script[stepCount - 1]

  const laneColor = (branch: string) => BRANCH_COLORS[(branchLane[branch] ?? 0) % 4]

  return (
    <VizCanvas
      height={height}
      camera={[0, 6, 11]}
      caption={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStepCount((s) => Math.max(1, s - 1))}
              disabled={stepCount <= 1}
              className="rounded-md border border-line px-2.5 py-1 font-medium text-ink transition-colors hover:border-accent disabled:opacity-35"
            >
              ← back
            </button>
            <button
              onClick={() => setStepCount((s) => Math.min(script.length, s + 1))}
              disabled={stepCount >= script.length}
              className="rounded-md bg-accent px-2.5 py-1 font-semibold text-bg transition-opacity disabled:opacity-35"
            >
              next step →
            </button>
          </div>
          <span className="font-mono text-[11px]">
            {stepCount}/{script.length}
          </span>
          <span className="min-w-0 flex-1 text-ink">{step.note}</span>
        </div>
      }
    >
      {/* edges */}
      {nodes.map((n) =>
        n.parents.map((pid) => {
          const parent = nodes[pid]
          return (
            <Line
              key={`${n.id}-${pid}`}
              points={[pos(parent, count), pos(n, count)]}
              color={n.parents.length > 1 && parent.branch !== n.branch ? laneColor(parent.branch) : laneColor(n.branch)}
              lineWidth={2.5}
              transparent
              opacity={0.85}
            />
          )
        }),
      )}
      {/* commits */}
      {nodes.map((n) => (
        <CommitNode key={n.id} node={n} color={laneColor(n.branch)} isHead={n.id === head && n.branch === headBranch} count={count} />
      ))}
      {/* branch labels at tips */}
      {Object.entries(branchTip).map(([branch, tip]) => {
        if (tip === undefined || !nodes[tip]) return null
        const p = pos(nodes[tip], count)
        return (
          <Html key={branch} position={[p[0], -1.1, p[2]]} center style={{ pointerEvents: 'none' }}>
            <div
              style={{
                fontSize: 10.5,
                fontFamily: 'Consolas, monospace',
                fontWeight: 700,
                color: laneColor(branch),
                border: `1px solid ${laneColor(branch)}`,
                borderRadius: 999,
                padding: '1px 8px',
                whiteSpace: 'nowrap',
                background: 'rgba(10,14,26,0.75)',
              }}
            >
              {branch}
            </div>
          </Html>
        )
      })}
      <gridHelper args={[30, 16, '#334155', '#1e293b']} position={[0, -2, 0]} />
    </VizCanvas>
  )
}
