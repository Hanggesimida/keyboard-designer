import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { DesignWorkspaceLayout } from "@/modules/design/components/DesignWorkspaceLayout"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata")
  return {
    title: {
      absolute: t("designTitle"),
    },
  }
}

export default function DesignPage() {
  return (
    <Suspense>
      <DesignWorkspaceLayout />
    </Suspense>
  )
}
