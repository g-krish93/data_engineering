import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { VizCanvas } from './VizCanvas'

export interface ImageLayer {
  /** Short label, usually the Dockerfile instruction that created the layer. */
  label: string
  /** One-line explanation shown when the layer is selected. */
  detail: string
  /** Approximate on-disk size in MB (drives the slab width so big layers look big). */
  mb: number
}

interface ContainerLayersProps {
  /** Read-only image layers, base (bottom) to top. */
  layers?: ImageLayer[]
  /** Add the thin writable container layer on top (copy-on-write). */
  writable?: boolean
  caption?: ReactNode
}

const DEFAULT_LAYERS: ImageLayer[] = [
  { label: 'FROM python:3.13-slim', detail: 'Base image: a minimal Debian + Python. Shared by every image built FROM it.', mb: 130 },
  { label: 'WORKDIR /app', detail: 'Metadata-only layer — sets the working directory. Nearly zero bytes.', mb: 0 },
  { label: 'COPY requirements.txt .', detail: 'Just the dependency list. Isolated so it only rebuilds when the list changes.', mb: 0 },
  { label: 'RUN pip install -r requirements.txt', detail: 'The heavy layer: installed packages. Cached until requirements.txt changes.', mb: 240 },
  { label: 'COPY . .', detail: 'Your application code. Changes most often, so it sits last to keep the cache above it.', mb: 3 },
]

const LAYER_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#22c55e', '#84cc16', '#eab308']
const PITCH = 0.86

function Slab({
  layer,
  index,
  y,
  color,
  writable,
  selected,
  onPick,
}: {
  layer: ImageLayer
  index: number
  y: number
  color: string
  writable: boolean
  selected: boolean
  onPick: () => void
}) {
  const mesh = useRef<THREE.Mesh>(null)
  // Width scales gently with size so the pip-install layer reads as the fat one.
  const width = 3.1 + Math.min(layer.mb, 260) / 150
  useFrame(() => {
    if (!mesh.current) return
    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, selected ? 0.7 : 0.22, 0.15)
  })
  return (
    <group position={[0, y, 0]}>
      <mesh
        ref={mesh}
        onClick={(e) => {
          e.stopPropagation()
          onPick()
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <boxGeometry args={[width, 0.6, 2.2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.22}
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={writable ? 0.5 : 0.95}
        />
      </mesh>
      <Html position={[width / 2 + 0.25, 0, 0]} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            fontSize: 10.5,
            fontFamily: 'Consolas, monospace',
            color: selected ? '#e8edf8' : 'rgba(200,208,224,0.85)',
            fontWeight: selected ? 700 : 400,
            whiteSpace: 'nowrap',
          }}
        >
          {writable ? 'container layer (R/W)' : layer.label}
          {!writable && layer.mb > 0 && (
            <span style={{ color: 'rgba(148,163,184,0.75)' }}> · {layer.mb} MB</span>
          )}
        </div>
      </Html>
      {selected && (
        <Html position={[0, -0.55 - (index % 2) * 0.02, 1.3]} center style={{ pointerEvents: 'none', zIndex: 20 }}>
          <div
            style={{
              background: 'rgba(8,12,24,0.95)',
              border: `1px solid ${color}`,
              borderRadius: 9,
              padding: '7px 11px',
              fontSize: 10.5,
              lineHeight: 1.35,
              fontFamily: 'system-ui, sans-serif',
              color: '#e8edf8',
              maxWidth: 260,
              textAlign: 'center',
            }}
          >
            {writable ? 'Writable copy-on-write layer. Every running container gets its own; the image below stays read-only and shared.' : layer.detail}
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * A Docker image as a stack of read-only layers, optionally topped by the
 * writable container layer. Click any layer to see what it holds. Reusable:
 * pass your own `layers` (base first) and toggle the `writable` cap.
 */
export function ContainerLayers({ layers = DEFAULT_LAYERS, writable = true, caption }: ContainerLayersProps) {
  const [picked, setPicked] = useState<number | null>(null)
  const n = layers.length
  // Center the stack vertically around the origin.
  const total = (n + (writable ? 1 : 0) - 1) * PITCH
  const baseY = -total / 2

  return (
    <VizCanvas
      height={420}
      camera={[0, 1.5, 12]}
      caption={
        caption ?? (
          <>
            <b>Click a layer.</b> An image is a stack of read-only layers, each created by one Dockerfile
            instruction and content-addressed by hash. The thin translucent cap is the container&apos;s writable
            layer — copy-on-write, one per running container. Rebuild after changing only your code and every
            layer below <code>COPY . .</code> is reused from cache.
          </>
        )
      }
    >
      {layers.map((layer, i) => (
        <Slab
          key={i}
          layer={layer}
          index={i}
          y={baseY + i * PITCH}
          color={LAYER_COLORS[i % LAYER_COLORS.length]}
          writable={false}
          selected={picked === i}
          onPick={() => setPicked(picked === i ? null : i)}
        />
      ))}
      {writable && (
        <Slab
          layer={{ label: 'container layer', detail: '', mb: 0 }}
          index={n}
          y={baseY + n * PITCH}
          color="#f59e0b"
          writable
          selected={picked === n}
          onPick={() => setPicked(picked === n ? null : n)}
        />
      )}
    </VizCanvas>
  )
}
