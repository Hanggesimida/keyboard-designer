"use client"

import { useEffect, useMemo } from "react"
import { useGLTF } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import {
  type Color,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three"
import {
  CASE_BODY_MATERIAL_NAME,
  CASE_EDGE_MATERIAL_NAME,
  CASE_MODEL_PATHS,
} from "@/modules/design/lib/preview3d/caseModelContract"
import {
  getCaseMaterialPreset,
  type CaseMaterialPresetId,
} from "@/modules/design/lib/preview3d/caseMaterialPresets"
import {
  createCaseGradientTexture,
  installCasePaintShader,
  type CasePaintUniforms,
} from "@/modules/design/lib/preview3d/casePaintMaterial"
import type { PreviewCase } from "@/modules/design/lib/preview3d/types"

/** 壳体不参与拾取，点击穿透到键帽 / pointer missed */
function disableRaycast() {}

interface MaterialState {
  material: Material
  baseColor?: Color
  metalness?: number
  roughness?: number
  envMapIntensity?: number
  paintUniforms?: CasePaintUniforms
}

interface PreparedCaseScene {
  object: Object3D
  materials: MaterialState[]
}

function isMesh(object: Object3D): object is Mesh {
  return "isMesh" in object && object.isMesh === true
}

function isStandardMaterial(
  material: Material,
): material is MeshStandardMaterial {
  return "isMeshStandardMaterial" in material &&
    material.isMeshStandardMaterial === true
}

function prepareCaseScene(source: Object3D): PreparedCaseScene {
  const object = source.clone(true)
  const materialClones = new Map<Material, Material>()
  const materials: MaterialState[] = []

  const cloneMaterial = (sourceMaterial: Material): Material => {
    const cached = materialClones.get(sourceMaterial)
    if (cached) return cached

    const material = sourceMaterial.clone()
    materialClones.set(sourceMaterial, material)
    if (isStandardMaterial(material)) {
      const isCaseSurface =
        material.name === CASE_BODY_MATERIAL_NAME ||
        material.name === CASE_EDGE_MATERIAL_NAME
      materials.push({
        material,
        baseColor: material.color.clone(),
        metalness: material.metalness,
        roughness: material.roughness,
        envMapIntensity: material.envMapIntensity,
        paintUniforms: isCaseSurface
          ? installCasePaintShader(material)
          : undefined,
      })
    } else {
      materials.push({ material })
    }
    return material
  }

  object.traverse((child) => {
    if (!isMesh(child)) return
    child.castShadow = true
    child.receiveShadow = true
    child.raycast = disableRaycast
    child.material = Array.isArray(child.material)
      ? child.material.map(cloneMaterial)
      : cloneMaterial(child.material)
  })

  return { object, materials }
}

interface KeyboardCaseMeshProps {
  case: PreviewCase
  materialPreset: CaseMaterialPresetId
  /** 是否使用金属度、环境反射与清漆高光 */
  reflective?: boolean
}

export function KeyboardCaseMesh({
  case: keyboardCase,
  materialPreset,
  reflective = true,
}: KeyboardCaseMeshProps) {
  const { scene } = useGLTF(keyboardCase.modelPath)
  const invalidate = useThree((state) => state.invalidate)
  const prepared = useMemo(() => prepareCaseScene(scene), [scene])
  const gradientTexture = useMemo(
    () =>
      keyboardCase.bodyPaint.kind === "linear-gradient"
        ? createCaseGradientTexture(keyboardCase.bodyPaint.gradient)
        : null,
    [keyboardCase.bodyPaint],
  )

  useEffect(() => {
    const preset = getCaseMaterialPreset(materialPreset)
    const projection = keyboardCase.paintProjection
    const useGradient =
      keyboardCase.bodyPaint.kind === "linear-gradient" &&
      projection !== null &&
      gradientTexture !== null

    for (const state of prepared.materials) {
      if (!isStandardMaterial(state.material)) continue
      const material = state.material

      if (state.baseColor) material.color.copy(state.baseColor)
      const isBody = material.name === CASE_BODY_MATERIAL_NAME
      const isEdge = material.name === CASE_EDGE_MATERIAL_NAME
      if (isBody || isEdge) {
        material.color.set(
          useGradient
            ? "#ffffff"
            : keyboardCase.bodyPaint.kind === "solid"
              ? keyboardCase.bodyPaint.color
              : keyboardCase.bodyPaint.gradient.stops[0]?.color ?? "#2a2d32",
        )
        if (state.paintUniforms) {
          state.paintUniforms.enabled.value = useGradient ? 1 : 0
          state.paintUniforms.gradientMap.value = gradientTexture
          if (projection) {
            state.paintUniforms.start.value.set(...projection.start)
            state.paintUniforms.end.value.set(...projection.end)
          }
        }
      }

      const isCaseSurface = isBody || isEdge
      if (!reflective) {
        material.metalness = 0
        material.roughness = 0.9
        material.envMapIntensity = 0
      } else if (isCaseSurface) {
        material.metalness = preset.metalness
        material.roughness = preset.roughness
        material.envMapIntensity = preset.envMapIntensity
      } else {
        material.metalness = state.metalness ?? 0
        material.roughness = state.roughness ?? 1
        material.envMapIntensity = state.envMapIntensity ?? 1
      }
    }
    invalidate()
  }, [
    invalidate,
    gradientTexture,
    keyboardCase.bodyPaint,
    keyboardCase.paintProjection,
    materialPreset,
    prepared,
    reflective,
  ])

  useEffect(
    () => () => {
      gradientTexture?.dispose()
    },
    [gradientTexture],
  )

  useEffect(() => {
    return () => {
      for (const { material } of prepared.materials) material.dispose()
    }
  }, [prepared])

  return (
    <primitive
      object={prepared.object}
      position={keyboardCase.position}
      scale={keyboardCase.scale}
      dispose={null}
    />
  )
}

for (const path of CASE_MODEL_PATHS) {
  useGLTF.preload(path)
}
