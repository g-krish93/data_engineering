import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { VizCanvas } from './VizCanvas'

const ROWS = 8
const COLS = 4
const COL_META = [
  { name: 'id', color: '#22d3ee' },
  { name: 'city', color: '#fbbf24' },
  { name: 'amount', color: '#34d399' },
  { name: 'ts', color: '#a78bfa' },
]

type Layout = 'row' | 'column'
type Query = 'none' | 'point' | 'agg'

const POINT_ROW = 5 // WHERE id = 105
const AGG_COL = 2 // AVG(amount)

/** Disk strip position for logical cell (r,c) under a layout. */
function diskPos(r: number, c: number, layout: Layout): [number, number, number] {
  const i = layout === 'row' ? r * COLS + c : c * ROWS + r
  return [(i % 16) * 0.78 - 5.85, i < 16 ? 1.0 : -1.0, 0]
}

/** Is this cell's PAGE touched by the query? (page = row in row layout, column in columnar) */
function touched(r: number, c: number, layout: Layout, query: Query): boolean {
  if (query === 'none') return false
  if (query === 'point') return layout === 'row' ? r === POINT_ROW : true
  return layout === 'row' ? true : c === AGG_COL
}

/** Is this cell's VALUE actually needed by the query? */
function needed(r: number, c: number, query: Query): boolean {
  if (query === 'none') return false
  if (query === 'point') return r === POINT_ROW
  return c === AGG_COL
}

function Cell({ r, c, layout, query }: { r: number; c: number; layout: Layout; query: Query }) {
  const mesh = useRef<THREE.Mesh>(null)
  const target = new THREE.Vector3(...diskPos(r, c, layout))

  useFrame(() => {
    if (!mesh.current) return
    mesh.current.position.lerp(target, 0.09)
    const mat = mesh.current.material as THREE.MeshStandardMaterial
    const isNeeded = needed(r, c, query)
    const isTouched = touched(r, c, layout, query)
    const wasted = isTouched && !isNeeded
    const goal = isNeeded ? 0.95 : wasted ? 0.5 : query === 'none' ? 0.2 : 0.05
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, goal, 0.12)
    mat.emissive.set(wasted ? '#f87171' : COL_META[c].color)
    const s = isNeeded ? 1.12 : 1
    mesh.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12)
  })

  return (
    <mesh ref={mesh} position={diskPos(r, c, layout)}>
      <boxGeometry args={[0.66, 0.66, 0.66]} />
      <meshStandardMaterial color={COL_META[c].color} emissive={COL_META[c].color} emissiveIntensity={0.2} roughness={0.4} />
    </mesh>
  )
}

function costs(layout: Layout, query: Query) {
  if (query === 'none') return null
  let pages: number
  if (query === 'point') pages = layout === 'row' ? 1 : COLS
  else pages = layout === 'row' ? ROWS : 1
  const pageSize = layout === 'row' ? COLS : ROWS
  const neededVals = query === 'point' ? COLS : ROWS
  return { pages, blocks: pages * pageSize, neededVals }
}

const btn = (active: boolean) =>
  `rounded-md border px-2.5 py-1 font-medium transition-colors ${
    active ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink'
  }`

/**
 * The same logical table laid out on disk row-wise vs column-wise, and what a
 * point lookup vs an aggregate actually has to read (whole pages, not values).
 */
export function RowVsColumn3D() {
  const [layout, setLayout] = useState<Layout>('row')
  const [query, setQuery] = useState<Query>('none')
  const cost = costs(layout, query)

  const cells: { r: number; c: number }[] = []
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ r, c })

  return (
    <VizCanvas
      height={380}
      camera={[0, 2, 11.5]}
      caption={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em]">layout</span>
          <button className={btn(layout === 'row')} onClick={() => setLayout('row')}>
            row store
          </button>
          <button className={btn(layout === 'column')} onClick={() => setLayout('column')}>
            column store
          </button>
          <span className="ml-2 text-[11px] uppercase tracking-[0.12em]">query</span>
          <button className={btn(query === 'point')} onClick={() => setQuery(query === 'point' ? 'none' : 'point')}>
            SELECT * WHERE id=105
          </button>
          <button className={btn(query === 'agg')} onClick={() => setQuery(query === 'agg' ? 'none' : 'agg')}>
            SELECT AVG(amount)
          </button>
          {cost && (
            <span className="w-full pt-1 font-mono text-[11px] text-ink">
              reads {cost.pages} page{cost.pages > 1 ? 's' : ''} = {cost.blocks} blocks to get{' '}
              {cost.neededVals} values —{' '}
              <span className={cost.blocks > cost.neededVals * 2 ? 'text-bad' : 'text-good'}>
                {cost.blocks > cost.neededVals * 2 ? `${cost.blocks - cost.neededVals} blocks of wasted I/O (red)` : 'barely any waste'}
              </span>
            </span>
          )}
        </div>
      }
    >
      {cells.map(({ r, c }) => (
        <Cell key={`${r}-${c}`} r={r} c={c} layout={layout} query={query} />
      ))}
      {COL_META.map((m, i) => (
        <Html key={m.name} position={[i * 2.1 - 3.2, 2.6, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: 10, fontFamily: 'Consolas, monospace', color: m.color, whiteSpace: 'nowrap' }}>
            ■ {m.name}
          </div>
        </Html>
      ))}
      <Html position={[-7.6, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.85)', fontFamily: 'Consolas, monospace', writingMode: 'vertical-rl' }}>
          the disk, as a strip of blocks →
        </div>
      </Html>
      <gridHelper args={[26, 14, '#334155', '#1e293b']} position={[0, -2.6, 0]} />
    </VizCanvas>
  )
}
