"use client"

import { useEffect, useRef, type ComponentRef } from "react"
import { useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { computeCameraFitPose } from "@/modules/design/lib/preview3d/cameraFit"
import type { PreviewSceneModel } from "@/modules/design/lib/preview3d/types"
import type { Vec3 } from "@/modules/design/lib/preview3d/layoutToWorld"
import { PlaceholderKeycap } from "./PlaceholderKeycap"
import { KeycapMesh } from "./KeycapMesh"

function CameraRig({
  center,
  extents,
  templateId,
  cameraResetToken,
}: {
  center: Vec3
  extents: { width: number; depth: number }
  templateId: string
  cameraResetToken: number
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const prevTemplateIdRef = useRef(templateId)
  const prevSizeRef = useRef({ width: size.width, height: size.height })
  const prevResetTokenRef = useRef(cameraResetToken)
  const hasFittedRef = useRef(false)

  useEffect(() => {
    const templateChanged = prevTemplateIdRef.current !== templateId
    const sizeChanged =
      prevSizeRef.current.width !== size.width ||
      prevSizeRef.current.height !== size.height
    const resetRequested = prevResetTokenRef.current !== cameraResetToken
    const firstFit = !hasFittedRef.current

    prevTemplateIdRef.current = templateId
    prevSizeRef.current = { width: size.width, height: size.height }
    prevResetTokenRef.current = cameraResetToken

    // 首次挂载、模板切换、面板尺寸变化、或复位视角时 fit
    if (!firstFit && !templateChanged && !sizeChanged && !resetRequested) return
    hasFittedRef.current = true

    const aspect = size.width / Math.max(size.height, 1)
    const { position, target } = computeCameraFitPose(center, extents, aspect)

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
    cameraResetToken,
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
  /** 递增以强制复位相机（不重置模板） */
  cameraResetToken?: number
  /** 单击选中；Shift+单击追加/切换。与 2D 画布一致 */
  onSelectKeycap?: (keyId: string, shiftKey: boolean) => void
}

export function Keyboard3DScene({
  sceneModel,
  cameraResetToken = 0,
  onSelectKeycap,
}: Keyboard3DSceneProps) {
  const center = sceneModel.bounds.center
  const extents = {
    width: sceneModel.bounds.width,
    depth: sceneModel.bounds.depth,
  }

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} />

      <CameraRig
        center={center}
        extents={extents}
        templateId={sceneModel.templateId}
        cameraResetToken={cameraResetToken}
      />

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
    </>
  )
}
