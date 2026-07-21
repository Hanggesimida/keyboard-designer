"use client"

import { Suspense, useCallback, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { CAMERA_FOV_DEG } from "@/modules/design/lib/preview3d/constants"
import { Keyboard3DScene } from "./Keyboard3DScene"
import { Preview3DErrorBoundary } from "./Preview3DErrorBoundary"
import { Preview3DOverlay } from "./Preview3DOverlay"

/** 3D 预览 Canvas；关闭时由父级卸载以停止渲染循环。 */
export function Keycap3DPreview() {
  const [canvasKey, setCanvasKey] = useState(0)
  const [ready, setReady] = useState(false)
  const [cameraResetToken, setCameraResetToken] = useState(0)

  const handleCreated = useCallback(() => {
    setReady(true)
  }, [])

  const handleRetry = useCallback(() => {
    setReady(false)
    setCanvasKey((k) => k + 1)
  }, [])

  const handleResetCamera = useCallback(() => {
    setCameraResetToken((t) => t + 1)
  }, [])

  return (
    <Preview3DErrorBoundary onRetry={handleRetry}>
      <div
        className="relative h-full w-full bg-background"
        style={{
          backgroundImage: "radial-gradient(circle, var(--design-canvas-grid-dot) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <Suspense fallback={null}>
          <Canvas
            key={canvasKey}
            className="h-full w-full touch-none"
            camera={{ fov: CAMERA_FOV_DEG, near: 0.1, far: 200, position: [0, 8, 14] }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 1.5]}
            frameloop="demand"
            shadows={false}
            style={{ background: "transparent" }}
            onCreated={handleCreated}
          >
            <Keyboard3DScene cameraResetToken={cameraResetToken} />
          </Canvas>
        </Suspense>

        <Preview3DOverlay loading={!ready} onResetCamera={handleResetCamera} />
      </div>
    </Preview3DErrorBoundary>
  )
}
