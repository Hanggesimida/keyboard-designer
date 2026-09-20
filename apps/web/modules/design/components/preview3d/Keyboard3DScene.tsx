"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentRef,
} from "react"
import { useTheme } from "next-themes"
import { useThree } from "@react-three/fiber"
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  useTexture,
} from "@react-three/drei"
import { useLatestRef } from "@/hooks/useLatestRef"
import { useSpacePressed } from "@/modules/design/hooks/useSpacePressed"
import {
  PREVIEW_3D_BG_DARK,
  PREVIEW_3D_BG_LIGHT,
} from "@/modules/design/lib/preview3d/constants"
import { MOUSE, type DirectionalLight } from "three"
import {
  computeCameraFitPose,
  computeCameraTopPose,
  type CameraView,
} from "@/modules/design/lib/preview3d/cameraFit"
import type { PreviewSceneModel } from "@/modules/design/lib/preview3d/types"
import type { Vec3 } from "@/modules/design/lib/preview3d/layoutToWorld"
import type { MaterialSettings } from "@/modules/design/lib/design/materials"
import type {
  LightingEnvironment,
  LightingSettings,
} from "@/modules/design/lib/design/lighting"
import {
  configureWoodGrainTexture,
  WOOD_GRAIN_TEXTURE_PATH,
} from "@/modules/design/lib/preview3d/materialTextures"
import { KeycapDecalProvider } from "./KeycapDecalProvider"
import { KeyboardCaseMesh } from "./KeyboardCaseMesh"
import { KeyboardLightingRig } from "./KeyboardLightingRig"
import { PlaceholderKeycap } from "./PlaceholderKeycap"
import { KeycapMesh } from "./KeycapMesh"

const SHADOW_FLOOR_GAP_U = 0.015
const SHADOW_MARGIN_U = 1
const DARK_STUDIO_BG = "#05070d"

/** 跟随浅色/深色模式设置 WebGL 背景；Three.Color 无法解析 oklch/lab，必须用 hex */
function ThemeSceneBackground({
  environment,
}: {
  environment: LightingEnvironment
}) {
  const { resolvedTheme } = useTheme()
  const invalidate = useThree((s) => s.invalidate)
  const bg =
    environment === "dark"
      ? DARK_STUDIO_BG
      : resolvedTheme === "light"
        ? PREVIEW_3D_BG_LIGHT
        : PREVIEW_3D_BG_DARK

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
  environment,
}: {
  center: Vec3
  extents: { width: number; depth: number }
  floorY: number
  shadowKey: string
  environment: LightingEnvironment
}) {
  const keyLightRef = useRef<DirectionalLight>(null)
  const isDark = environment === "dark"
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
        color={isDark ? "#94a3b8" : "#f8fafc"}
        groundColor={isDark ? "#080b14" : "#525866"}
        intensity={isDark ? 0.14 : 0.42}
      />
      <directionalLight
        ref={keyLightRef}
        position={[center[0] + 2, 14, center[2] + 3]}
        color="#fffaf2"
        intensity={isDark ? 0.52 : 1.35}
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
          intensity={isDark ? 0.75 : 2.8}
          position={[-5, 5, 4]}
          rotation={[-Math.PI / 4, 0, 0]}
          scale={[10, 8, 1]}
        />
        <Lightformer
          form="rect"
          color="#dbeafe"
          intensity={isDark ? 0.38 : 1.15}
          position={[5, 2, 1]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[6, 4, 1]}
        />
        <Lightformer
          form="rect"
          color="#ffffff"
          intensity={isDark ? 0.4 : 1.6}
          position={[0, 4, -6]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[8, 3, 1]}
        />
      </Environment>

      <ContactShadows
        key={shadowKey}
        position={[center[0], floorY, center[2]]}
        scale={shadowScale}
        opacity={0.16}
        blur={2.2}
        far={2.5}
        resolution={1024}
        frames={1}
      />
    </>
  )
}

function BasicLighting({
  environment,
}: {
  environment: LightingEnvironment
}) {
  const isDark = environment === "dark"
  return (
    <>
      <ambientLight intensity={isDark ? 0.14 : 0.55} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={isDark ? 0.45 : 1.1}
      />
      <directionalLight
        position={[-6, 4, -4]}
        intensity={isDark ? 0.12 : 0.35}
      />
    </>
  )
}

function CameraRig({
  center,
  extents,
  templateId,
  cameraView,
  cameraViewToken,
  isSpacePressed,
}: {
  center: Vec3
  extents: { width: number; depth: number }
  templateId: string
  cameraView: CameraView
  cameraViewToken: number
  isSpacePressed: boolean
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
    const { position, target, up } =
      viewRef.current === "top"
        ? computeCameraTopPose(center, extents, aspect)
        : computeCameraFitPose(center, extents, aspect)

    camera.position.set(position[0], position[1], position[2])
    camera.up.set(up[0], up[1], up[2])
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
      maxPolarAngle={Math.PI}
      target={center}
      mouseButtons={{
        LEFT: isSpacePressed ? MOUSE.PAN : MOUSE.ROTATE,
        MIDDLE: MOUSE.PAN,
        RIGHT: MOUSE.PAN,
      }}
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
  caseMaterial: MaterialSettings
  keycapMaterial: MaterialSettings
  lightingSettings: LightingSettings
  /** 单击选中；Shift+单击追加/切换。与 2D 画布一致 */
  onSelectKeycap?: (keyId: string, shiftKey: boolean) => void
  /** 双击进入单键帽编辑模态。与 2D 画布一致 */
  onEnterKeycapEdit?: (keyId: string) => void
}

export function Keyboard3DScene({
  sceneModel,
  cameraView = "fit",
  cameraViewToken = 0,
  showCase = true,
  showRealism = true,
  caseMaterial,
  keycapMaterial,
  lightingSettings,
  onSelectKeycap,
  onEnterKeycapEdit,
}: Keyboard3DSceneProps) {
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const woodTexture = useTexture(WOOD_GRAIN_TEXTURE_PATH)
  const woodMap = useMemo(
    () =>
      configureWoodGrainTexture(
        woodTexture,
        gl.capabilities.getMaxAnisotropy(),
      ),
    [gl, woodTexture],
  )
  const isSpacePressed = useSpacePressed()
  const isSpacePressedRef = useLatestRef(isSpacePressed)
  const handleSelectKeycap = useCallback(
    (keyId: string, shiftKey: boolean) => {
      if (isSpacePressedRef.current) return
      onSelectKeycap?.(keyId, shiftKey)
    },
    [isSpacePressedRef, onSelectKeycap],
  )
  const handleEnterKeycapEdit = useCallback(
    (keyId: string) => {
      if (isSpacePressedRef.current) return
      onEnterKeycapEdit?.(keyId)
    },
    [isSpacePressedRef, onEnterKeycapEdit],
  )
  const visibleCase = showCase ? sceneModel.case : null
  const minX = visibleCase
    ? Math.min(sceneModel.bounds.min[0], visibleCase.bounds.min[0])
    : sceneModel.bounds.min[0]
  const maxX = visibleCase
    ? Math.max(sceneModel.bounds.max[0], visibleCase.bounds.max[0])
    : sceneModel.bounds.max[0]
  const minZ = visibleCase
    ? Math.min(sceneModel.bounds.min[2], visibleCase.bounds.min[2])
    : sceneModel.bounds.min[2]
  const maxZ = visibleCase
    ? Math.max(sceneModel.bounds.max[2], visibleCase.bounds.max[2])
    : sceneModel.bounds.max[2]
  const center: Vec3 = [
    (minX + maxX) / 2,
    sceneModel.bounds.center[1],
    (minZ + maxZ) / 2,
  ]
  const extents = {
    width: maxX - minX,
    depth: maxZ - minZ,
  }
  const floorY = visibleCase
    ? visibleCase.bounds.min[1] - SHADOW_FLOOR_GAP_U
    : -SHADOW_FLOOR_GAP_U

  useEffect(() => {
    invalidate()
  }, [invalidate, lightingSettings, showCase, showRealism])

  return (
    <>
      <ThemeSceneBackground environment={lightingSettings.environment} />
      {showRealism ? (
        <PreviewEnvironment
          center={center}
          extents={extents}
          floorY={floorY}
          shadowKey={`${sceneModel.templateId}:${showCase}`}
          environment={lightingSettings.environment}
        />
      ) : (
        <BasicLighting environment={lightingSettings.environment} />
      )}

      <KeyboardLightingRig
        settings={lightingSettings}
        keys={sceneModel.keys}
        center={center}
        extents={extents}
        floorY={floorY}
      />

      <CameraRig
        center={center}
        extents={extents}
        templateId={sceneModel.templateId}
        cameraView={cameraView}
        cameraViewToken={cameraViewToken}
        isSpacePressed={isSpacePressed}
      />

      {visibleCase ? (
        <KeyboardCaseMesh
          case={visibleCase}
          materialSettings={caseMaterial}
          woodMap={woodMap}
          reflective={showRealism}
        />
      ) : null}

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
                  materialSettings={keycapMaterial}
                  woodMap={woodMap}
                  onSelect={
                    onSelectKeycap
                      ? (shiftKey) => handleSelectKeycap(key.id, shiftKey)
                      : undefined
                  }
                  onEnterEdit={
                    onEnterKeycapEdit
                      ? () => handleEnterKeycapEdit(key.id)
                      : undefined
                  }
                />
              ) : (
                <PlaceholderKeycap
                  key={key.id}
                  previewKey={key}
                  onSelect={
                    onSelectKeycap
                      ? (shiftKey) => handleSelectKeycap(key.id, shiftKey)
                      : undefined
                  }
                  onEnterEdit={
                    onEnterKeycapEdit
                      ? () => handleEnterKeycapEdit(key.id)
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

useTexture.preload(WOOD_GRAIN_TEXTURE_PATH)
