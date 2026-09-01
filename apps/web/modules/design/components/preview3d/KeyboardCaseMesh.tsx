"use client"

import { RoundedBox } from "@react-three/drei"
import {
  CASE_CORNER_RADIUS_U,
  CASE_MATERIAL_METALNESS,
  CASE_MATERIAL_ROUGHNESS,
} from "@/modules/design/lib/preview3d/constants"
import type {
  PreviewCase,
  PreviewCasePart,
} from "@/modules/design/lib/preview3d/types"

/** 壳体不参与拾取，点击穿透到键帽 / pointer missed */
function disableRaycast() {}

function CasePartMesh({
  part,
  color,
}: {
  part: PreviewCasePart
  color: string
}) {
  const [w, h, d] = part.size
  const radius = Math.min(CASE_CORNER_RADIUS_U, w / 2, h / 2, d / 2)

  return (
    <RoundedBox
      args={[w, h, d]}
      radius={radius}
      smoothness={4}
      position={part.position}
      raycast={disableRaycast}
    >
      <meshStandardMaterial
        color={color}
        roughness={CASE_MATERIAL_ROUGHNESS}
        metalness={CASE_MATERIAL_METALNESS}
      />
    </RoundedBox>
  )
}

interface KeyboardCaseMeshProps {
  case: PreviewCase
}

export function KeyboardCaseMesh({ case: keyboardCase }: KeyboardCaseMeshProps) {
  return (
    <group>
      <CasePartMesh part={keyboardCase.body} color={keyboardCase.bodyColor} />
      <CasePartMesh part={keyboardCase.plate} color={keyboardCase.plateColor} />
    </group>
  )
}
