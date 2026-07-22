import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { VizCanvas } from './VizCanvas'

export interface DimSpec {
  name: string
  color: string
  fields: string[]
  fk: string
}

interface StarSchema3DProps {
  fact?: string
  measures?: string[]
  dims?: DimSpec[]
  caption?: React.ReactNode
}

const DEFAULT_DIMS: DimSpec[] = [
  { name: 'dim_date', color: '#fbbf24', fk: 'date_key', fields: ['date_key', 'date', 'month', 'quarter', 'is_weekend'] },
  { name: 'dim_location', color: '#34d399', fk: 'location_key', fields: ['location_key', 'zone', 'borough'] },
  { name: 'dim_vendor', color: '#f472b6', fk: 'vendor_key', fields: ['vendor_key', 'vendor_name'] },
  { name: 'dim_payment', color: '#a78bfa', fk: 'payment_key', fields: ['payment_key', 'method'] },
]

function DimNode({
  spec,
  position,
  active,
  onPick,
}: {
  spec: DimSpec
  position: [number, number, number]
  active: boolean
  onPick: () => void
}) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.2 + position[0]) * 0.15
    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, active ? 0.75 : 0.25, 0.15)
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
        <boxGeometry args={[2.1, 1.1, 0.5]} />
        <meshStandardMaterial color={spec.color} emissive={spec.color} emissiveIntensity={0.25} roughness={0.35} transparent opacity={0.92} />
      </mesh>
      <Html position={[0, 1.05, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Consolas, monospace', color: spec.color, whiteSpace: 'nowrap' }}>
          {spec.name}
        </div>
      </Html>
      {active && (
        <Html position={[0, -1.15, 0]} center style={{ pointerEvents: 'none', zIndex: 20 }}>
          <div
            style={{
              background: 'rgba(8,12,24,0.94)',
              border: `1px solid ${spec.color}`,
              borderRadius: 10,
              padding: '7px 10px',
              fontSize: 10.5,
              fontFamily: 'Consolas, monospace',
              color: '#e8edf8',
              whiteSpace: 'nowrap',
            }}
          >
            {spec.fields.map((f) => (
              <div key={f} style={{ color: f === spec.fk ? spec.color : undefined, fontWeight: f === spec.fk ? 700 : 400 }}>
                {f === spec.fk ? `${f} (PK)` : f}
              </div>
            ))}
          </div>
        </Html>
      )}
    </group>
  )
}

function FactCore({ onClear }: { onClear: () => void }) {
  const factMesh = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (factMesh.current) factMesh.current.rotation.y = clock.getElapsedTime() * 0.25
  })
  return (
    <mesh ref={factMesh} onClick={onClear}>
      <cylinderGeometry args={[1.35, 1.35, 1.7, 8]} />
      <meshStandardMaterial color="#0e7490" emissive="#22d3ee" emissiveIntensity={0.45} roughness={0.3} />
    </mesh>
  )
}

/** A star schema in space: fact table center, dimensions orbiting. Click a dimension to see its join. */
export function StarSchema3D({
  fact = 'fact_trips',
  measures = ['fare_amount', 'tip_amount', 'trip_distance'],
  dims = DEFAULT_DIMS,
  caption,
}: StarSchema3DProps) {
  const [picked, setPicked] = useState<number | null>(null)

  const positions: [number, number, number][] = dims.map((_, i) => {
    const a = (i / dims.length) * Math.PI * 2 + Math.PI / 4
    return [Math.cos(a) * 5.2, Math.sin(a) * 2.9, Math.sin(a * 2) * 0.8]
  })

  return (
    <VizCanvas
      height={400}
      camera={[0, 1, 11]}
      caption={
        caption ?? (
          <>
            <b>Click a dimension table.</b> The fact table holds skinny rows: foreign keys + numeric
            measures ({measures.join(', ')}). Dimensions hold the descriptive context — that separation
            is the whole trick: facts stay narrow and huge, dimensions stay wide and small.
          </>
        )
      }
    >
      {/* fact table */}
      <group>
        <FactCore onClear={() => setPicked(null)} />
        <Html position={[0, 1.55, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'Consolas, monospace', color: '#22d3ee', whiteSpace: 'nowrap' }}>
            {fact}
          </div>
        </Html>
        <Html position={[0, -1.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: 9.5, fontFamily: 'Consolas, monospace', color: 'rgba(148,163,184,0.9)', textAlign: 'center' }}>
            {dims.map((d) => d.fk).join(' · ')}
            <br />
            {measures.join(' · ')}
          </div>
        </Html>
      </group>

      {dims.map((d, i) => (
        <group key={d.name}>
          <Line
            points={[[0, 0, 0], positions[i]]}
            color={picked === i ? d.color : '#475569'}
            lineWidth={picked === i ? 3 : 1.5}
            transparent
            opacity={picked === null || picked === i ? 0.9 : 0.25}
          />
          {picked === i && (
            <Html
              position={[positions[i][0] / 2, positions[i][1] / 2 + 0.4, positions[i][2] / 2]}
              center
              style={{ pointerEvents: 'none' }}
            >
              <div style={{ fontSize: 10, fontFamily: 'Consolas, monospace', color: d.color, background: 'rgba(8,12,24,0.9)', padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                JOIN ON {fact}.{d.fk} = {d.name}.{d.fk}
              </div>
            </Html>
          )}
          <DimNode spec={d} position={positions[i]} active={picked === i} onPick={() => setPicked(picked === i ? null : i)} />
        </group>
      ))}
    </VizCanvas>
  )
}
