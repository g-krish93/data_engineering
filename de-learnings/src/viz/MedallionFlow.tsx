import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { VizCanvas } from './VizCanvas'

export interface MedallionLayer {
  name: string
  color: string
  /** One-line description shown when the zone is selected. */
  desc: string
  /** Short example of what lands here. */
  example?: string
}

interface MedallionFlowProps {
  layers?: MedallionLayer[]
  caption?: ReactNode
  height?: number
}

const DEFAULT_LAYERS: MedallionLayer[] = [
  { name: 'Bronze', color: '#b45309', desc: 'Raw, as-ingested. An exact copy of the source, append-only — your replayable source of truth.', example: 'raw_trips (every column, every row, untouched)' },
  { name: 'Silver', color: '#94a3b8', desc: 'Cleaned and conformed: types fixed, duplicates removed, keys joined, one row per real entity.', example: 'stg_trips (validated, deduplicated, typed)' },
  { name: 'Gold', color: '#fbbf24', desc: 'Business-level aggregates and marts, shaped for the questions people actually ask.', example: 'revenue_daily (grouped, ready for dashboards)' },
]

const GAP = 4.2
// Each zone gets fewer, more ordered data cubes as quality rises.
const CUBE_COUNTS = [7, 5, 3]

function Zone({
  layer,
  index,
  x,
  y,
  selected,
  onPick,
}: {
  layer: MedallionLayer
  index: number
  x: number
  y: number
  selected: boolean
  onPick: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const slab = useRef<THREE.Mesh>(null)
  const count = CUBE_COUNTS[index] ?? 4
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = y + Math.sin(clock.getElapsedTime() * 1.1 + index) * 0.08
    if (slab.current) {
      const mat = slab.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, selected ? 0.7 : 0.28, 0.15)
    }
  })
  return (
    <group position={[x, 0, 0]}>
      {/* platform */}
      <mesh
        ref={slab}
        position={[0, y - 0.9, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onPick()
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <cylinderGeometry args={[1.7, 1.9, 0.5, 6]} />
        <meshStandardMaterial color={layer.color} emissive={layer.color} emissiveIntensity={0.28} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* data cubes: fewer + tidier as quality rises */}
      <group ref={group} position={[0, y, 0]}>
        {Array.from({ length: count }).map((_, i) => {
          const spread = index === 0 ? 1.1 : index === 1 ? 0.7 : 0.45
          const gx = index === 2 ? (i - (count - 1) / 2) * 0.5 : Math.cos(i * 2.4) * spread
          const gz = index === 2 ? 0 : Math.sin(i * 2.4) * spread
          const gy = index === 0 ? Math.sin(i * 5.1) * 0.35 : 0
          return (
            <mesh key={i} position={[gx, gy, gz]}>
              <boxGeometry args={[0.34, 0.34, 0.34]} />
              <meshStandardMaterial color={layer.color} emissive={layer.color} emissiveIntensity={0.35} roughness={0.35} />
            </mesh>
          )
        })}
      </group>
      <Html position={[0, y + 1.6, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', color: layer.color, whiteSpace: 'nowrap', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
          {layer.name.toUpperCase()}
        </div>
      </Html>
      {selected && (
        <Html position={[0, y - 2.1, 0]} center style={{ pointerEvents: 'none', zIndex: 20 }}>
          <div
            style={{
              width: 210,
              background: 'rgba(8,12,24,0.95)',
              border: `1px solid ${layer.color}`,
              borderRadius: 10,
              padding: '8px 11px',
              fontSize: 11,
              lineHeight: 1.4,
              fontFamily: 'system-ui, sans-serif',
              color: '#e8edf8',
              textAlign: 'center',
            }}
          >
            {layer.desc}
            {layer.example && (
              <div style={{ marginTop: 5, fontFamily: 'Consolas, monospace', fontSize: 9.5, color: layer.color }}>{layer.example}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * The medallion (bronze/silver/gold) refinement pattern: raw data on the left,
 * progressively cleaned and aggregated to the right. Click a zone for its role.
 * Reusable: pass your own `layers`.
 */
export function MedallionFlow({ layers = DEFAULT_LAYERS, caption, height = 420 }: MedallionFlowProps) {
  const [picked, setPicked] = useState<number | null>(null)
  const n = layers.length
  const startX = -((n - 1) * GAP) / 2

  return (
    <VizCanvas
      height={height}
      camera={[0, 1.5, 15]}
      caption={
        caption ?? (
          <>
            <b>Click a zone.</b> The medallion pattern refines data in stages: <b style={{ color: '#b45309' }}>bronze</b> raw,{' '}
            <b style={{ color: '#94a3b8' }}>silver</b> cleaned, <b style={{ color: '#fbbf24' }}>gold</b> business-ready. Each
            layer is rebuilt from the one before, so you can always replay from raw. Fewer, tidier cubes as quality rises.
          </>
        )
      }
    >
      {layers.map((layer, i) => {
        const x = startX + i * GAP
        const y = 0.2 + i * 0.55
        return (
          <group key={layer.name}>
            {i < n - 1 && (
              <Line
                points={[[x + 1.9, y, 0], [x + GAP - 1.9, 0.2 + (i + 1) * 0.55, 0]]}
                color={picked === null || picked === i || picked === i + 1 ? '#64748b' : '#243247'}
                lineWidth={2}
                transparent
                opacity={0.8}
              />
            )}
            <Zone layer={layer} index={i} x={x} y={y} selected={picked === i} onPick={() => setPicked(picked === i ? null : i)} />
          </group>
        )
      })}
    </VizCanvas>
  )
}
