import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { VizCanvas } from './VizCanvas'

export interface DagNode {
  id: string
  label: string
  /** Column index (0 = leftmost/upstream). Nodes in the same column stack vertically. */
  col: number
  /** Optional second line shown under the label (e.g. the asset's type). */
  sub?: string
  color?: string
}

interface PipelineDAGProps {
  nodes?: DagNode[]
  /** Directed edges as [fromId, toId] — data flows from upstream to downstream. */
  edges?: [string, string][]
  caption?: ReactNode
  height?: number
}

const DEFAULT_NODES: DagNode[] = [
  { id: 'raw_trips', label: 'raw_trips', col: 0, sub: 'source', color: '#fbbf24' },
  { id: 'raw_zones', label: 'raw_zones', col: 0, sub: 'source', color: '#fbbf24' },
  { id: 'stg_trips', label: 'stg_trips', col: 1, sub: 'staging', color: '#22d3ee' },
  { id: 'stg_zones', label: 'stg_zones', col: 1, sub: 'staging', color: '#22d3ee' },
  { id: 'fct_trips', label: 'fct_trips', col: 2, sub: 'mart', color: '#34d399' },
  { id: 'revenue_daily', label: 'revenue_daily', col: 3, sub: 'mart', color: '#a78bfa' },
]

const DEFAULT_EDGES: [string, string][] = [
  ['raw_trips', 'stg_trips'],
  ['raw_zones', 'stg_zones'],
  ['stg_trips', 'fct_trips'],
  ['stg_zones', 'fct_trips'],
  ['fct_trips', 'revenue_daily'],
]

const COL_X = 3.4
const ROW_Y = 1.9

function NodeBox({
  node,
  position,
  state,
  onPick,
}: {
  node: DagNode
  position: [number, number, number]
  state: 'selected' | 'up' | 'down' | 'dim' | 'none'
  onPick: () => void
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const base = node.color ?? '#38bdf8'
  const target = state === 'dim' ? 0.08 : state === 'selected' ? 0.8 : state === 'none' ? 0.25 : 0.55
  useFrame(() => {
    if (!mesh.current) return
    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, 0.15)
    const op = state === 'dim' ? 0.35 : 0.95
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, op, 0.15)
  })
  return (
    <group position={position}>
      <mesh
        ref={mesh}
        onClick={(e) => {
          e.stopPropagation()
          onPick()
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <boxGeometry args={[2.3, 1.05, 0.5]} />
        <meshStandardMaterial color={base} emissive={base} emissiveIntensity={0.25} roughness={0.36} transparent opacity={0.95} />
      </mesh>
      <Html position={[0, 0, 0.3]} center style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', fontFamily: 'Consolas, monospace', whiteSpace: 'nowrap', opacity: state === 'dim' ? 0.4 : 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0b1020' }}>{node.label}</div>
          {node.sub && <div style={{ fontSize: 8.5, color: 'rgba(11,16,32,0.7)', letterSpacing: '0.08em' }}>{node.sub.toUpperCase()}</div>}
        </div>
      </Html>
    </group>
  )
}

/**
 * A pipeline as a directed acyclic graph of assets/models. Click a node to
 * light up its lineage — upstream (amber) and downstream (cyan). Reusable:
 * pass your own `nodes` (with a `col` per stage) and `edges`.
 */
export function PipelineDAG({ nodes = DEFAULT_NODES, edges = DEFAULT_EDGES, caption, height = 420 }: PipelineDAGProps) {
  const [picked, setPicked] = useState<string | null>(null)

  const positions = useMemo(() => {
    const byCol = new Map<number, DagNode[]>()
    nodes.forEach((n) => {
      const arr = byCol.get(n.col) ?? []
      arr.push(n)
      byCol.set(n.col, arr)
    })
    const cols = [...byCol.keys()].sort((a, b) => a - b)
    const midCol = (cols.length - 1) / 2
    const pos = new Map<string, [number, number, number]>()
    byCol.forEach((arr, col) => {
      const mid = (arr.length - 1) / 2
      arr.forEach((n, i) => {
        pos.set(n.id, [(col - midCol) * COL_X, (mid - i) * ROW_Y, 0])
      })
    })
    return pos
  }, [nodes])

  const { up, down } = useMemo(() => {
    const parents = new Map<string, string[]>()
    const children = new Map<string, string[]>()
    edges.forEach(([a, b]) => {
      children.set(a, [...(children.get(a) ?? []), b])
      parents.set(b, [...(parents.get(b) ?? []), a])
    })
    const collect = (start: string, adj: Map<string, string[]>) => {
      const seen = new Set<string>()
      const stack = [...(adj.get(start) ?? [])]
      while (stack.length) {
        const x = stack.pop() as string
        if (seen.has(x)) continue
        seen.add(x)
        stack.push(...(adj.get(x) ?? []))
      }
      return seen
    }
    const up = new Map<string, Set<string>>()
    const down = new Map<string, Set<string>>()
    nodes.forEach((n) => {
      up.set(n.id, collect(n.id, parents))
      down.set(n.id, collect(n.id, children))
    })
    return { up, down }
  }, [nodes, edges])

  const stateOf = (id: string): 'selected' | 'up' | 'down' | 'dim' | 'none' => {
    if (!picked) return 'none'
    if (id === picked) return 'selected'
    if (up.get(picked)?.has(id)) return 'up'
    if (down.get(picked)?.has(id)) return 'down'
    return 'dim'
  }

  const edgeColor = (a: string, b: string) => {
    if (!picked) return '#475569'
    const onUp = (picked === b || up.get(picked)?.has(b)) && (picked === a || up.get(picked)?.has(a))
    const onDown = (picked === a || down.get(picked)?.has(a)) && (picked === b || down.get(picked)?.has(b))
    if (onUp) return '#fbbf24'
    if (onDown) return '#22d3ee'
    return '#243247'
  }

  return (
    <VizCanvas
      height={height}
      camera={[0, 0, 13]}
      caption={
        caption ?? (
          <>
            <b>Click an asset.</b> A pipeline is a directed graph: each node is a table/asset, each arrow a dependency.
            Selecting one lights its <span style={{ color: '#fbbf24' }}>upstream</span> (what it is built from) and{' '}
            <span style={{ color: '#22d3ee' }}>downstream</span> (what breaks if it fails). This lineage is what an
            orchestrator tracks for you.
          </>
        )
      }
    >
      {edges.map(([a, b], i) => {
        const pa = positions.get(a)
        const pb = positions.get(b)
        if (!pa || !pb) return null
        const active = picked && edgeColor(a, b) !== '#243247' && edgeColor(a, b) !== '#475569'
        return (
          <Line
            key={i}
            points={[[pa[0] + 1.15, pa[1], 0], [pb[0] - 1.15, pb[1], 0]]}
            color={edgeColor(a, b)}
            lineWidth={active ? 3 : 1.5}
            transparent
            opacity={!picked || active ? 0.9 : 0.2}
          />
        )
      })}
      {nodes.map((n) => {
        const p = positions.get(n.id) as [number, number, number]
        return <NodeBox key={n.id} node={n} position={p} state={stateOf(n.id)} onPick={() => setPicked(picked === n.id ? null : n.id)} />
      })}
    </VizCanvas>
  )
}
