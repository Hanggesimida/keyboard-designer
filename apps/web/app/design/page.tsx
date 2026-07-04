import type { Metadata } from "next"
import { Suspense } from "react"
import { DesignWorkspaceLayout } from "@/modules/design/components/DesignWorkspaceLayout"

export const metadata: Metadata = {
  title: "键盘设计器",
}

export default function DesignPage() {
  return (
    <Suspense>
      <DesignWorkspaceLayout />
    </Suspense>
  )
}
