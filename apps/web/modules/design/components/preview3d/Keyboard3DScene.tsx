"use client"

import { useEffect, useLayoutEffect, useRef, type ComponentRef } from "react"
import { useTheme } from "next-themes"
import { useThree } from "@react-three/fiber"
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
} from "@react-three/drei"
import {
  PREVIEW_3D_BG_DARK,
  PREVIEW_3D_BG_LIGHT,
} from "@/modules/design/lib/preview3d/constants"
import type { DirectionalLight } from "three"
import {
  computeCameraFitPose,
  computeCameraTopPose,
  type CameraView,
} from "@/modules/design/lib/preview3d/cameraFit"
import type { PreviewSceneModel } from "@/modules/design/lib/preview3d/types"
import type { Vec3 } from "@/modules/design/lib/preview3d/layoutToWorld"
import { KeycapDecalProvider } from "./KeycapDecalProvider"
import { KeyboardCaseMesh } from "./KeyboardCaseMesh"
import { PlaceholderKeycap } from "./PlaceholderKeycap"
import { KeycapMesh } from "./KeycapMesh"

const SHADOW_FLOOR_GAP_U = 0.015
const SHADOW_MARGIN_U = 1

/** 跟随浅色/深色模式设置 WebGL 背景；Three.Color 无法解析 oklch/lab，必须用 hex */
function ThemeSceneBackground() {
  const { resolvedTheme } = useTheme()
  const invalidate = useThree((s) => s.invalidate)
  const bg = resolvedTheme === "light" ? PREVIEW_3D_BG_LIGHT : PREVIEW_3D_BG_DARK

  useLayoutEffect(() => {
    invalidate()
  }, [bg, invalidate])

  return <color attach="background" args={[bg]} />
}

/** 无外部贴图的中性日光环境；接触阴影仅生成一帧，避免拖动相机时重复计算 */
function PreviewEnvironment({
  center,
  extents,
  floorY,
  shadowKey,
}: {
  center: Vec3
  extents: { width: number; depth: number }
  floorY: number
  shadowKey: string
}) {
  const keyLightRef = useRef<DirectionalLight>(null)
  const shadowScale = Math.max(extents.width, extents.depth) + SHADOW_MARGIN_U * 2
  const shadowExtent = shadowScale / 2

  useLayoutEffect(() => {
    const light = keyLightRef.current
    if (!light) return
    light.target.position.set(center[0], center[1], center[2])
    light.target.updateMatrixWorld()
  }, [center])

  return (
    <>
      <hemisphereLight
        color="#f8fafc"
        groundColor="#525866"
        intensity={0.32}
      />
      <directionalLight
        ref={keyLightRef}
        position={[center[0] + 6, 10, center[2] + 8]}
        color="#fffaf2"
        intensity={1.35}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-bias={-0.00015}
        shadow-normalBias={0.018}
      />

      <Environment resolution={512} frames={1}>
        <Lightformer
          form="rect"
          color="#fff7ed"
          intensity={2.8}
          position={[-5, 5, 4]}
          rotation={[-Math.PI / 4, 0, 0]}
          scale={[10, 8, 1]}
        />
        <Lightformer
          form="rect"
          color="#dbeafe"
          intensity={1.15}
          position={[5, 2, 1]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[6, 4, 1]}
        />
        <Lightformer
          form="rect"
          color="#ffffff"
          intensity={0.9}
          position={[0, 4, -6]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[8, 3, 1]}
        />
      </Environment>

      <ContactShadows
        key={shadowKey}
        position={[center[0], floorY, center[2]]}
        scale={shadowScale}
        opacity={0.22}
        blur={2.2}
        far={2.5}
        resolution={1024}
        frames={1}
      />
    </>
  )
}

function BasicLighting() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} />
    </>
  )
}

function CameraRig({
  center,
  extents,
  templateId,
  cameraView,
  cameraViewToken,
}: {
  center: Vec3
  extents: { width: number; depth: number }
  templateId: string
  cameraView: CameraView
  cameraViewToken: number
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const prevTemplateIdRef = useRef(templateId)
  const prevSizeRef = useRef({ width: size.width, height: size.height })
  const prevViewTokenRef = useRef(cameraViewToken)
  const hasFittedRef = useRef(false)
  const viewRef = useRef<CameraView>("fit")

  useEffect(() => {
    const templateChanged = prevTemplateIdRef.current !== templateId
    const sizeChanged =
      prevSizeRef.current.width !== size.width ||
      prevSizeRef.current.height !== size.height
    const viewRequested = prevViewTokenRef.current !== cameraViewToken
    const firstFit = !hasFittedRef.current

    prevTemplateIdRef.current = templateId
    prevSizeRef.current = { width: size.width, height: size.height }
    prevViewTokenRef.current = cameraViewToken

    if (!firstFit && !templateChanged && !sizeChanged && !viewRequested) return
    hasFittedRef.current = true

    if (firstFit || templateChanged) {
      viewRef.current = "fit"
    } else if (viewRequested) {
      viewRef.current = cameraView
    }

    const aspect = size.width / Math.max(size.height, 1)
    const { position, target } =
      viewRef.current === "top"
        ? computeCameraTopPose(center, extents, aspect)
        : computeCameraFitPose(center, extents, aspect)

    camera.position.set(position[0], position[1], position[2])
    camera.up.set(0, 1, 0)
    camera.lookAt(target[0], target[1], target[2])
    camera.updateProjectionMatrix()

    const controls = controlsRef.current
    if (controls) {
      controls.target.set(target[0], target[1], target[2])
      controls.update()
    }

    invalidate()
  }, [
    camera,
    cameraView,
    cameraViewToken,
    center,
    extents,
    invalidate,
    size.height,
    size.width,
    templateId,
  ])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={40}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2.05}
      target={center}
    />
  )
}

interface Keyboard3DSceneProps {
  sceneModel: PreviewSceneModel
  cameraView?: CameraView
  /** 递增以应用 cameraView（不重置模板） */
  cameraViewToken?: number
  /** 是否渲染托盘壳体 */
  showCase?: boolean
  /** 是否启用环境光与接触阴影 */
  showRealism?: boolean
  /** 单击选中；Shift+单击追加/切换。与 2D 画布一致 */
  onSelectKeycap?: (keyId: string, shiftKey: boolean) => void
}

export function Keyboard3DScene({
  sceneModel,
  cameraView = "fit",
  cameraViewToken = 0,
  showCase = true,
  showRealism = true,
  onSelectKeycap,
}: Keyboard3DSceneProps) {
  const invalidate = useThree((s) => s.invalidate)
  const center = sceneModel.bounds.center
  const [caseWidth, caseHeight, caseDepth] = sceneModel.case.body.size
  const extents = {
    width: caseWidth,
    depth: caseDepth,
  }
  const floorY = showCase
    ? sceneModel.case.body.position[1] -
      caseHeight / 2 -
      SHADOW_FLOOR_GAP_U
    : -SHADOW_FLOOR_GAP_U

  useEffect(() => {
    invalidate()
  }, [invalidate, showCase, showRealism])

  return (
    <>
      <ThemeSceneBackground />
      {showRealism ? (
        <PreviewEnvironment
          center={center}
          extents={extents}
          floorY={floorY}
          shadowKey={`${sceneModel.templateId}:${showCase}`}
        />
      ) : (
        <BasicLighting />
      )}

      <CameraRig
        center={center}
        extents={extents}
        templateId={sceneModel.templateId}
        cameraView={cameraView}
        cameraViewToken={cameraViewToken}
      />

      {showCase ? <KeyboardCaseMesh case={sceneModel.case} /> : null}

      <KeycapDecalProvider
        imageAtlas={sceneModel.imageProjectionAtlas}
        legendAtlas={sceneModel.legendAtlas}
      >
        <group>
          {sceneModel.keys
            .filter((key) => key.visible)
            .map((key) =>
              key.modelPath ? (
                <KeycapMesh
                  key={key.id}
                  previewKey={key}
                  modelPath={key.modelPath}
                  onSelect={
                    onSelectKeycap
                      ? (shiftKey) => onSelectKeycap(key.id, shiftKey)
                      : undefined
                  }
                />
              ) : (
                <PlaceholderKeycap
                  key={key.id}
                  previewKey={key}
                  onSelect={
                    onSelectKeycap
                      ? (shiftKey) => onSelectKeycap(key.id, shiftKey)
                      : undefined
                  }
                />
              ),
            )}
        </group>
      </KeycapDecalProvider>
    </>
  )
}
