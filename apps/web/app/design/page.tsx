import { Suspense } from "react"
import { DesignWorkspaceLayout } from "@/modules/design/components/DesignWorkspaceLayout"

export default function DesignPage() {
  return (
    <Suspense>
      <DesignWorkspaceLayout />
    </Suspense>
  )
}
