import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import {
  Box,
  Boxes,
  ExternalLink,
  FileBox,
  FileJson,
  Film,
  FolderOpen,
  ImageIcon,
  Palette,
  Ruler,
  Type,
} from "lucide-react"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { HomeFooter } from "@/components/layouts/HomeFooter"
import { HomeHeader } from "@/components/layouts/HomeHeader"
import {
  BLENDER_DIRECTORY,
  blenderAssets,
  CASE_GLB_DIRECTORY,
  caseGlbAssets,
  ENDCARD_DIRECTORY,
  endcardAssets,
  FONT_DIRECTORY,
  fontFamilyAssets,
  githubTreeUrl,
  JIG_DIRECTORY,
  jigAssets,
  KEYCAP_GLB_DIRECTORY,
  keycapGlbAssets,
  LAYOUT_DIRECTORY,
  layoutAssets,
  MATERIAL_DIRECTORY,
  materialAssets,
  SITE_IMAGE_DIRECTORY,
  siteImageAssets,
  type RepositoryAsset,
} from "@/modules/assets/catalog"

interface AssetSectionProps {
  title: string
  description: string
  directoryLabel: string
  directoryUrl: string
  fileLabel: string
  icon: ReactNode
  assets: readonly RepositoryAsset[]
  renderMetadata?: (asset: RepositoryAsset) => ReactNode
}

function AssetSection({
  title,
  description,
  directoryLabel,
  directoryUrl,
  fileLabel,
  icon,
  assets,
  renderMetadata,
}: AssetSectionProps) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-3xl items-start gap-3">
          <span className="bg-muted text-muted-foreground mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg">
            {icon}
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <a
          href={directoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          <FolderOpen className="size-4" aria-hidden="true" />
          {directoryLabel}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>
            {fileLabel} · {assets.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <li key={asset.repositoryPath} className="border-b">
                <a
                  href={asset.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-14 items-center justify-between gap-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="group-hover:text-primary block truncate font-mono text-xs font-medium transition-colors">
                      {asset.fileName}
                    </span>
                    {renderMetadata?.(asset)}
                  </span>
                  <ExternalLink
                    className="text-muted-foreground size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}

export async function AssetsPage() {
  const t = await getTranslations("Home.assets")

  return (
    <div className="bg-background text-foreground min-h-screen">
      <HomeHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary text-sm font-medium tracking-wide uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-5 text-balance text-lg leading-relaxed">
            {t("description")}
          </p>
        </div>

        <Card className="mt-10 bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBox className="size-4" aria-hidden="true" />
              {t("noticeTitle")}
            </CardTitle>
            <CardDescription className="leading-relaxed">
              {t("noticeBody")}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="mt-14 space-y-16">
          <AssetSection
            title={t("keycaps.title")}
            description={t("keycaps.description")}
            directoryLabel={t("openDirectory")}
            directoryUrl={githubTreeUrl(KEYCAP_GLB_DIRECTORY)}
            fileLabel={t("files")}
            icon={<Box className="size-5" aria-hidden="true" />}
            assets={keycapGlbAssets}
          />

          <AssetSection
            title={t("cases.title")}
            description={t("cases.description")}
            directoryLabel={t("openDirectory")}
            directoryUrl={githubTreeUrl(CASE_GLB_DIRECTORY)}
            fileLabel={t("files")}
            icon={<Boxes className="size-5" aria-hidden="true" />}
            assets={caseGlbAssets}
            renderMetadata={(asset) => {
              const caseAsset = caseGlbAssets.find(
                (candidate) =>
                  candidate.repositoryPath === asset.repositoryPath,
              )
              return caseAsset ? (
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  {t("cases.templates", {
                    templates: caseAsset.templateIds.join(", "),
                  })}
                </span>
              ) : null
            }}
          />

          <AssetSection
            title={t("blender.title")}
            description={t("blender.description")}
            directoryLabel={t("openDirectory")}
            directoryUrl={githubTreeUrl(BLENDER_DIRECTORY)}
            fileLabel={t("files")}
            icon={<FileBox className="size-5" aria-hidden="true" />}
            assets={blenderAssets}
          />

          <div className="border-t pt-14">
            <h2 className="text-3xl font-semibold tracking-tight">
              {t("supporting.title")}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
              {t("supporting.description")}
            </p>
          </div>

          <AssetSection
            title={t("layouts.title")}
            description={t("layouts.description")}
            directoryLabel={t("openDirectory")}
            directoryUrl={githubTreeUrl(LAYOUT_DIRECTORY)}
            fileLabel={t("files")}
            icon={<FileJson className="size-5" aria-hidden="true" />}
            assets={layoutAssets}
          />

          <AssetSection
            title={t("jig.title")}
            description={t("jig.description")}
            directoryLabel={t("openDirectory")}
            directoryUrl={githubTreeUrl(JIG_DIRECTORY)}
            fileLabel={t("files")}
            icon={<Ruler className="size-5" aria-hidden="true" />}
            assets={jigAssets}
          />

          <AssetSection
            title={t("fonts.title")}
            description={t("fonts.description")}
            directoryLabel={t("openDirectory")}
            directoryUrl={githubTreeUrl(FONT_DIRECTORY)}
            fileLabel={t("fonts.families")}
            icon={<Type className="size-5" aria-hidden="true" />}
            assets={fontFamilyAssets}
          />

          <AssetSection
            title={t("materials.title")}
            description={t("materials.description")}
            directoryLabel={t("openDirectory")}
            directoryUrl={githubTreeUrl(MATERIAL_DIRECTORY)}
            fileLabel={t("files")}
            icon={<Palette className="size-5" aria-hidden="true" />}
            assets={materialAssets}
          />

          <AssetSection
            title={t("siteImages.title")}
            description={t("siteImages.description")}
            directoryLabel={t("openDirectory")}
            directoryUrl={githubTreeUrl(SITE_IMAGE_DIRECTORY)}
            fileLabel={t("files")}
            icon={<ImageIcon className="size-5" aria-hidden="true" />}
            assets={siteImageAssets}
          />

          <AssetSection
            title={t("endcard.title")}
            description={t("endcard.description")}
            directoryLabel={t("openDirectory")}
            directoryUrl={githubTreeUrl(ENDCARD_DIRECTORY)}
            fileLabel={t("files")}
            icon={<Film className="size-5" aria-hidden="true" />}
            assets={endcardAssets}
          />
        </div>
      </main>
      <HomeFooter />
    </div>
  )
}
