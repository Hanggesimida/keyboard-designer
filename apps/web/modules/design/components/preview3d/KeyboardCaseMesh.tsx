"use client"

import { useEffect, useMemo } from "react"
import { RoundedBox } from "@react-three/drei"
import { MeshPhysicalMaterial } from "three"
import {
  CASE_CORNER_RADIUS_U,
  CASE_BODY_MATERIAL_ENV_MAP_INTENSITY,
  CASE_BODY_MATERIAL_METALNESS,
  CASE_BODY_MATERIAL_ROUGHNESS,
  CASE_PLATE_MATERIAL_ENV_MAP_INTENSITY,
  CASE_PLATE_MATERIAL_METALNESS,
  CASE_PLATE_MATERIAL_ROUGHNESS,
} from "@/modules/design/lib/preview3d/constants"
import type {
  PreviewCase,
  PreviewCasePart,
} from "@/modules/design/lib/preview3d/types"

/** 壳体不参与拾取，点击穿透到键帽 / pointer missed */
function disableRaycast() {}

interface CaseFinish {
  roughness: number
  metalness: number
  envMapIntensity: number
  grainScale: number
  grainStrength: number
}

const BODY_FINISH: CaseFinish = {
  roughness: CASE_BODY_MATERIAL_ROUGHNESS,
  metalness: CASE_BODY_MATERIAL_METALNESS,
  envMapIntensity: CASE_BODY_MATERIAL_ENV_MAP_INTENSITY,
  grainScale: 42,
  grainStrength: 0.05,
}

const PLATE_FINISH: CaseFinish = {
  roughness: CASE_PLATE_MATERIAL_ROUGHNESS,
  metalness: CASE_PLATE_MATERIAL_METALNESS,
  envMapIntensity: CASE_PLATE_MATERIAL_ENV_MAP_INTENSITY,
  grainScale: 54,
  grainStrength: 0.035,
}

function createAnodizedCaseMaterial(color: string, finish: CaseFinish) {
  const material = new MeshPhysicalMaterial({
    color,
    roughness: finish.roughness,
    metalness: finish.metalness,
    envMapIntensity: finish.envMapIntensity,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
  })

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      /* glsl */ `
varying vec3 vCaseWorldPos;
void main() {
`,
    )
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      /* glsl */ `
#include <project_vertex>
vCaseWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      /* glsl */ `
varying vec3 vCaseWorldPos;
float caseGrainHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 31.32);
  return fract((p.x + p.y) * p.z);
}
void main() {
`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      /* glsl */ `
#include <roughnessmap_fragment>
{
  float caseGrain = caseGrainHash(floor(vCaseWorldPos * ${finish.grainScale.toFixed(1)}));
  roughnessFactor = clamp(
    roughnessFactor + (caseGrain - 0.5) * ${finish.grainStrength.toFixed(3)},
    0.04,
    1.0
  );
}
`,
    )
  }
  material.customProgramCacheKey = () =>
    `case-anodized-v1:${finish.grainScale}:${finish.grainStrength}`
  material.needsUpdate = true
  return material
}

function CasePartMesh({
  part,
  color,
  finish,
}: {
  part: PreviewCasePart
  color: string
  finish: CaseFinish
}) {
  const [w, h, d] = part.size
  const radius = Math.min(CASE_CORNER_RADIUS_U, w / 2, h / 2, d / 2)
  const material = useMemo(
    () => createAnodizedCaseMaterial(color, finish),
    [color, finish],
  )

  useEffect(() => {
    return () => material.dispose()
  }, [material])

  return (
    <RoundedBox
      args={[w, h, d]}
      radius={radius}
      smoothness={6}
      position={part.position}
      material={material}
      castShadow
      receiveShadow
      raycast={disableRaycast}
    />
  )
}

interface KeyboardCaseMeshProps {
  case: PreviewCase
}

export function KeyboardCaseMesh({ case: keyboardCase }: KeyboardCaseMeshProps) {
  return (
    <group>
      <CasePartMesh
        part={keyboardCase.body}
        color={keyboardCase.bodyColor}
        finish={BODY_FINISH}
      />
      <CasePartMesh
        part={keyboardCase.plate}
        color={keyboardCase.plateColor}
        finish={PLATE_FINISH}
      />
    </group>
  )
}
