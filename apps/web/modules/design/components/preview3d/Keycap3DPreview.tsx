"use client"

import { Suspense, useCallback, useMemo, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { useShallow } from "zustand/react/shallow"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { getLayoutData } from "@/modules/design/data/layouts"
import { CAMERA_FOV_DEG } from "@/modules/design/lib/preview3d/constants"
import { buildPreviewSceneModel } from "@/modules/design/lib/preview3d/buildPreviewSceneModel"
import type { PreviewDesignStateInput } from "@/modules/design/lib/preview3d/types"
import { Keyboard3DScene } from "./Keyboard3DScene"
import { Preview3DErrorBoundary } from "./Preview3DErrorBoundary"
import { Preview3DOverlay } from "./Preview3DOverlay"

/** 空白处点击：位移超过此值视为拖拽旋转，不清除选中 */
const MISS_CLICK_DELTA_PX = 5

/** 3D 预览 Canvas；关闭时由父级卸载以停止渲染循环。 */
export function Keycap3DPreview() {
  const [canvasKey, setCanvasKey] = useState(0)
  const [ready, setReady] = useState(false)
  const [cameraResetToken, setCameraResetToken] = useState(0)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  const storeSlice = useDesignUIStore(
    useShallow((s) => ({
      templateId: s.templateId,
      globalKeycapStyle: s.globalKeycapStyle,
      layers: s.layers,
      activeLayerId: s.activeLayerId,
      layerKeycapOverrides: s.layerKeycapOverrides,
      selectedKeycapIds: s.selectedKeycapIds,
      canvasElements: s.canvasElements,
      assetMap: s.assetMap,
      liveDragOverrides: s.liveDragOverrides,
    })),
  )

  const setSelectedKeycapIds = useDesignUIStore((s) => s.setSelectedKeycapIds)
  const toggleKeycapSelection = useDesignUIStore((s) => s.toggleKeycapSelection)
  const clearSelection = useDesignUIStore((s) => s.clearSelection)

  const sceneModel = useMemo(() => {
    const designSnapshot: PreviewDesignStateInput = {
      templateId: storeSlice.templateId,
      globalKeycapStyle: {
        color: storeSlice.globalKeycapStyle.color,
        labelColor: storeSlice.globalKeycapStyle.labelColor,
        borderColor: storeSlice.globalKeycapStyle.borderColor,
        borderHidden: storeSlice.globalKeycapStyle.borderHidden,
      },
      layers: storeSlice.layers.map((l) => ({
        id: l.id,
        visible: l.visible,
        opacity: l.opacity,
        labelsHidden: l.labelsHidden,
      })),
      activeLayerId: storeSlice.activeLayerId,
      layerKeycapOverrides: storeSlice.layerKeycapOverrides,
      selectedKeycapIds: storeSlice.selectedKeycapIds,
      canvasElements: storeSlice.canvasElements.filter(
        (el): el is Extract<typeof el, { type: "image" }> => el.type === "image",
      ),
      assetMap: storeSlice.assetMap,
      liveDragOverrides: storeSlice.liveDragOverrides,
    }
    return buildPreviewSceneModel(
      getLayoutData(designSnapshot.templateId),
      designSnapshot,
    )
  }, [storeSlice])

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

  const handleSelectKeycap = useCallback(
    (keyId: string, shiftKey: boolean) => {
      if (shiftKey) {
        toggleKeycapSelection(keyId)
      } else {
        setSelectedKeycapIds([keyId])
      }
    },
    [setSelectedKeycapIds, toggleKeycapSelection],
  )

  const handlePointerMissed = useCallback(
    (event: MouseEvent) => {
      const down = pointerDownRef.current
      pointerDownRef.current = null
      if (!down) return
      const dx = event.clientX - down.x
      const dy = event.clientY - down.y
      if (dx * dx + dy * dy > MISS_CLICK_DELTA_PX * MISS_CLICK_DELTA_PX) return
      clearSelection()
    },
    [clearSelection],
  )

  return (
    <Preview3DErrorBoundary onRetry={handleRetry}>
      <div
        className="relative h-full w-full"
        style={{
          backgroundColor: "rgb(63, 63, 63)",
          backgroundImage:
            "radial-gradient(circle, var(--design-canvas-grid-dot) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onPointerDownCapture={(e) => {
          if (e.button !== 0) return
          pointerDownRef.current = { x: e.clientX, y: e.clientY }
        }}
      >
        <Suspense fallback={null}>
          <Canvas
            key={canvasKey}
            className="h-full w-full touch-none"
            camera={{
              fov: CAMERA_FOV_DEG,
              near: 0.1,
              far: 200,
              position: [0, 8, 14],
            }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 1.5]}
            frameloop="demand"
            shadows={false}
            style={{ background: "transparent" }}
            onCreated={handleCreated}
            onPointerMissed={handlePointerMissed}
          >
            <Keyboard3DScene
              sceneModel={sceneModel}
              cameraResetToken={cameraResetToken}
              onSelectKeycap={handleSelectKeycap}
            />
          </Canvas>
        </Suspense>

        <Preview3DOverlay
          loading={!ready}
          onResetCamera={handleResetCamera}
          missingModels={sceneModel.missingModels}
        />
      </div>
    </Preview3DErrorBoundary>
  )
}
