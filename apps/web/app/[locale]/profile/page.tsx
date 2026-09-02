"use client"

import { Keyboard, Plus, Pencil } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { enUS, zhCN } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"
import {
  ProfileSection,
  ProfileStatCard,
  ProfileEmptyState,
} from "@/modules/profile"
import { useMyDesigns } from "@/hooks/queries/designs/useDesigns"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@/components/layouts/PageHeader"
import { Link, useRouter } from "@/i18n/navigation"

export default function ProfilePage() {
  const t = useTranslations("Profile.home")
  const locale = useLocale()
  const dateLocale = locale === "zh" ? zhCN : enUS
  const router = useRouter()
  const { data: designs, isLoading: isDesignsLoading } = useMyDesigns()
  const designCount = designs?.length ?? 0
  const recentDesigns = designs?.slice(0, 3) ?? []

  return (
    <div className="space-y-8">
        <PageHeader title={t("title")} description={t("subtitle")} />

        {/* 统计数据 */}
        <ProfileSection title={t("stats")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ProfileStatCard
              label={t("designs")}
              value={isDesignsLoading ? "—" : designCount}
              icon={Keyboard}
              hint={designCount === 0 ? t("noDesigns") : t("planCount", { count: designCount })}
            />
          </div>
        </ProfileSection>

        {/* 最近设计 */}
        <ProfileSection
          title={t("recent")}
          description={t("recentHint")}
          action={
            <Button asChild size="sm" className="cursor-pointer">
              <Link href="/design">
                <Plus />
                {t("newDesign")}
              </Link>
            </Button>
          }
        >
          {isDesignsLoading ? (
            <RecentDesignsSkeleton />
          ) : recentDesigns.length === 0 ? (
            <ProfileEmptyState
              icon={Keyboard}
              title={t("empty")}
              description={t("emptyHint")}
              action={{ label: t("start"), href: "/design" }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentDesigns.map((design) => (
                <div
                  key={design.id}
                  className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-full aspect-video rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center overflow-hidden">
                    {design.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={design.previewUrl}
                        alt={design.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Keyboard size={24} className="text-muted-foreground/35" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/80 truncate">{design.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/55">
                      {formatDistanceToNow(new Date(design.updatedAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                      {" "}
                      {t("updated")}
                    </p>
                  </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/design?id=${design.id}`)}
                    className="cursor-pointer"
                  >
                    <Pencil />
                    {t("edit")}
                  </Button>
                </div>
                </div>
              ))}
            </div>
          )}
        </ProfileSection>
    </div>
  )
}

function RecentDesignsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/30"
        >
          <div className="w-full aspect-video rounded-lg bg-muted/40 animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted/40 animate-pulse" />
        </div>
      ))}
    </div>
  )
}
