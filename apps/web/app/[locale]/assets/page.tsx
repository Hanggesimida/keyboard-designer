import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { AssetsPage } from "@/modules/assets/components/AssetsPage"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata")

  return {
    title: t("assetsTitle"),
    description: t("assetsDescription"),
  }
}

export default function AssetsRoute() {
  return <AssetsPage />
}
