import { BackgroundDecor, type BackgroundVariant } from "./BackgroundDecor"
import { DashboardSidebar } from "./DashboardSidebar"
import { DashboardMobileHeader } from "./DashboardMobileHeader"
import type { NavGroup } from "../types"

interface DashboardLayoutProps {
  children: React.ReactNode
  navGroups: NavGroup[]
  /** 侧边栏顶部区域（用户信息 / 后台标题等） */
  sidebarHeader: React.ReactNode
  /** 侧边栏底部附加内容，插在"返回首页"之前 */
  sidebarFooterExtras?: React.ReactNode
  /** 移动端抽屉内顶部区域 */
  drawerHeader?: React.ReactNode
  backgroundVariant?: BackgroundVariant
  /** 右侧内容区标题 */
  title?: string
  /** 右侧内容区描述 */
  description?: string
  /** 标题行右侧操作区 */
  headerAction?: React.ReactNode
}

export function DashboardLayout({
  children,
  navGroups,
  sidebarHeader,
  sidebarFooterExtras,
  drawerHeader,
  backgroundVariant = "profile",
  title,
  description,
  headerAction,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <BackgroundDecor variant={backgroundVariant} />

      <DashboardMobileHeader navGroups={navGroups} drawerHeader={drawerHeader} />

      <div className="relative flex min-h-screen">
        <div className="hidden md:block w-56 lg:w-60 shrink-0 sticky top-0 h-screen overflow-visible">
          <DashboardSidebar
            navGroups={navGroups}
            header={sidebarHeader}
            footerExtras={sidebarFooterExtras}
          />
        </div>

        <main className="flex-1 min-w-0 px-4 pb-24 pt-3 sm:px-6 md:px-8 md:pt-10 lg:px-12 xl:px-16 max-w-[1200px] mx-auto">
          {(title || description || headerAction) && (
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-xl font-bold tracking-tight text-white/90">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1 text-sm text-white/40">{description}</p>
                )}
              </div>
              {headerAction && <div className="shrink-0 mt-0.5">{headerAction}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
