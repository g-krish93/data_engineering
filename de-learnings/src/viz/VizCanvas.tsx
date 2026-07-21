import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

interface VizCanvasProps {
  children: ReactNode
  height?: number
  camera?: [number, number, number]
  caption?: ReactNode
  autoRotate?: boolean
  fov?: number
  /** Wheel-zoom steals page scroll on tall canvases — off unless a scene really needs it. */
  zoomable?: boolean
}

/**
 * Shared shell for every 3D visualization: card chrome, lights, orbit controls.
 * Drag to orbit, scroll to zoom.
 */
export function VizCanvas({
  children,
  height = 400,
  camera = [0, 4, 13],
  caption,
  autoRotate = false,
  fov = 45,
  zoomable = false,
}: VizCanvasProps) {
  return (
    <div className="card my-4 overflow-hidden">
      <div style={{ height }} className="relative touch-none">
        <Canvas camera={{ position: camera, fov }} dpr={[1, 2]}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[6, 10, 6]} intensity={1.2} />
          <directionalLight position={[-6, -4, -6]} intensity={0.3} />
          <Suspense fallback={null}>{children}</Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={zoomable}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            minDistance={4}
            maxDistance={30}
          />
        </Canvas>
        <span className="pointer-events-none absolute right-3 top-2 text-[10px] uppercase tracking-[0.14em] text-muted/70">
          drag to orbit · hover
        </span>
      </div>
      {caption && (
        <div className="border-t border-line px-4 py-2 text-xs leading-5 text-muted">{caption}</div>
      )}
    </div>
  )
}
