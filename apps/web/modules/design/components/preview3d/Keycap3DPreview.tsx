"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, type RootState } from "@react-three/fiber"
import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  SRGBColorSpace,
} from "three"
import { useShallow } from "zustand/react/shallow"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { getLayoutData } from "@/modules/design/data/layouts"
import { CAMERA_FOV_DEG } from "@/modules/design/lib/preview3d/constants"
import { buildPreviewSceneModel } from "@/modules/design/lib/preview3d/buildPreviewSceneModel"
import { exportPreview3dPng } from "@/modules/design/lib/preview3d/exportPreviewPng"
import type { CameraView } from "@/modules/design/lib/preview3d/cameraFit"
import type { PreviewDesignStateInput } from "@/modules/design/lib/preview3d/types"
import { Keyboard3DScene } from "./Keyboard3DScene"
import { Preview3DErrorBoundary } from "./Preview3DErrorBoundary"
import { Preview3DOverlay } from "./Preview3DOverlay"

/** 空白处点击：位移超过此值视为拖拽旋转，不清除选中 */
const MISS_CLICK_DELTA_PX = 5

/** R3F 内：场景提交后揭开遮罩；挂起/卸载时盖回。fallback 勿渲染 DOM。 */
function SceneReady({
  onPending,
  onReady,
}: {
  onPending: () => void
  onReady?: () => void
}) {
  useEffect(() => {
    onReady?.()
    return onPending
  }, [onPending, onReady])
  return null
}

/** 3D 预览 Canvas；关闭时由父级卸载以停止渲染循环。 */
export function Keycap3DPreview() {
  const [canvasKey, setCanvasKey] = useState(0)
  const [ready, setReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [cameraView, setCameraView] = useState<CameraView>("fit")
  const [cameraViewToken, setCameraViewToken] = useState(0)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)
  const threeRef = useRef<RootState | null>(null)

  const storeSlice = useDesignUIStore(
    useShallow((s) => ({
      templateId: s.templateId,
      fontFamily: s.fontFamily,
      fontWeight: s.fontWeight,
      fontStyle: s.fontStyle,
      artboardBackground: s.artboardBackground,
      globalKeycapStyle: s.globalKeycapStyle,
      layers: s.layers,
      activeLayerId: s.activeLayerId,
      layerKeycapOverrides: s.layerKeycapOverrides,
      selectedKeycapIds: s.selectedKeycapIds,
      pressedKeyIds: s.pressedKeyIds,
      canvasElements: s.canvasElements,
      assetMap: s.assetMap,
      liveDragOverrides: s.liveDragOverrides,
    })),
  )

  const setSelectedKeycapIds = useDesignUIStore((s) => s.setSelectedKeycapIds)
  const toggleKeycapSelection = useDesignUIStore((s) => s.toggleKeycapSelection)
  const clearSelection = useDesignUIStore((s) => s.clearSelection)
  const show3dCase = useDesignUIStore((s) => s.show3dCase)
  const toggleShow3dCase = useDesignUIStore((s) => s.toggleShow3dCase)
  const show3dRealism = useDesignUIStore((s) => s.show3dRealism)
  const toggleShow3dRealism = useDesignUIStore((s) => s.toggleShow3dRealism)

  const sceneModel = useMemo(() => {
    const designSnapshot: PreviewDesignStateInput = {
      templateId: storeSlice.templateId,
      fontFamily: storeSlice.fontFamily,
      fontWeight: storeSlice.fontWeight,
      fontStyle: storeSlice.fontStyle,
      artboardBackground: storeSlice.artboardBackground,
      globalKeycapStyle: {
        color: storeSlice.globalKeycapStyle.color,
        labelColor: storeSlice.globalKeycapStyle.labelColor,
        borderColor: storeSlice.globalKeycapStyle.borderColor,
        borderHidden: storeSlice.globalKeycapStyle.borderHidden,
        fontSize: storeSlice.globalKeycapStyle.fontSize,
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
      pressedKeyIds: storeSlice.pressedKeyIds,
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

  const markPending = useCallback(() => setReady(false), [])
  const markReady = useCallback(() => setReady(true), [])

  const handleCreated = useCallback((state: RootState) => {
    state.gl.outputColorSpace = SRGBColorSpace
    state.gl.toneMapping = ACESFilmicToneMapping
    state.gl.toneMappingExposure = 1.05
    state.gl.shadowMap.enabled = true
    state.gl.shadowMap.type = PCFShadowMap
    threeRef.current = state
  }, [])

  const handleExportPng = useCallback(async () => {
    const state = threeRef.current
    if (!state || exporting) return
    setExporting(true)
    try {
      await exportPreview3dPng(state, storeSlice.templateId)
    } catch (err) {
      console.error("[preview3d] 导出 PNG 失败:", err)
    } finally {
      setExporting(false)
    }
  }, [exporting, storeSlice.templateId])

  const handleRetry = useCallback(() => {
    threeRef.current = null
    setReady(false)
    setCanvasKey((k) => k + 1)
  }, [])

  const applyCameraView = useCallback((view: CameraView) => {
    setCameraView(view)
    setCameraViewToken((t) => t + 1)
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
          backgroundColor: "var(--design-preview3d-bg)",
          backgroundImage:
            "radial-gradient(circle, var(--design-canvas-grid-dot) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onPointerDownCapture={(e) => {
          if (e.button !== 0) return
          pointerDownRef.current = { x: e.clientX, y: e.clientY }
        }}
      >
        <Canvas
          key={canvasKey}
          className="h-full w-full touch-none"
          camera={{
            fov: CAMERA_FOV_DEG,
            near: 0.1,
            far: 200,
            position: [0, 8, 14],
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          dpr={[1, 1.5]}
          frameloop="demand"
          shadows="percentage"
          style={{ background: "transparent" }}
          onCreated={handleCreated}
          onPointerMissed={handlePointerMissed}
        >
          <Suspense fallback={<SceneReady onPending={markPending} />}>
            <Keyboard3DScene
              sceneModel={sceneModel}
              cameraView={cameraView}
              cameraViewToken={cameraViewToken}
              showCase={show3dCase}
              showRealism={show3dRealism}
              onSelectKeycap={handleSelectKeycap}
            />
            <SceneReady onPending={markPending} onReady={markReady} />
          </Suspense>
        </Canvas>

        <Preview3DOverlay
          loading={!ready}
          exporting={exporting}
          onResetCamera={() => applyCameraView("fit")}
          onTopView={() => applyCameraView("top")}
          onExportPng={handleExportPng}
          showCase={show3dCase}
          onToggleCase={toggleShow3dCase}
          showRealism={show3dRealism}
          onToggleRealism={toggleShow3dRealism}
          missingModels={sceneModel.missingModels}
        />
      </div>
    </Preview3DErrorBoundary>
  )
}
