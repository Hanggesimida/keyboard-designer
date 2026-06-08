import { ProfileSidebar } from "./ProfileSidebar"
import { ProfileMobileHeader } from "./ProfileMobileHeader"

interface ProfileLayoutProps {
  children: React.ReactNode
  /** 右侧内容区的标题 */
  title?: string
  /** 右侧内容区的描述 */
  description?: string
}

export function ProfileLayout({
  children,
  title,
  description,
}: ProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[400px] rounded-full opacity-[0.07]"
          style={{
            background:
              "radial-gradient(ellipse, rgba(120,80,255,0.8) 0%, rgba(60,130,255,0.4) 50%, transparent 75%)",
            filter: "blur(100px)",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full opacity-[0.05]"
          style={{
            background:
              "radial-gradient(circle, rgba(52,211,153,0.7) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        {/* 细网格 */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* 移动端顶部导航栏 */}
      <ProfileMobileHeader />

      {/* 主体：sidebar + 内容 */}
      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <div className="hidden md:block w-56 lg:w-60 shrink-0 sticky top-0 h-screen overflow-hidden">
          <ProfileSidebar />
        </div>

        {/* 内容区 */}
        <main className="flex-1 min-w-0 px-4 pb-24 pt-3 sm:px-6 md:px-8 md:pt-10 lg:px-12 xl:px-16 max-w-[1200px] mx-auto">
          {(title || description) && (
            <div className="mb-8">
              {title && (
                <h1 className="text-xl font-bold tracking-tight text-white/90">
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-1 text-sm text-white/40">{description}</p>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
