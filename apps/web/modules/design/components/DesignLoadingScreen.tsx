"use client"

import { useEffect, useState } from "react"
import { Progress } from "@workspace/ui/components/progress"
import { cn } from "@workspace/ui/lib/utils"

/**
 * 设计页面初始加载进度条。
 * 模拟三阶段进度：脚本解析 → 组件初始化 → DOM 就绪，最终淡出消失。
 */
export function DesignLoadingScreen() {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<"loading" | "complete" | "gone">("loading")

  useEffect(() => {
    // 阶段一：0 → 35%，快速推进（模拟脚本解析）
    const t1 = setTimeout(() => setProgress(35), 80)
    // 阶段二：35 → 70%，中速（模拟组件初始化）
    const t2 = setTimeout(() => setProgress(70), 300)
    // 阶段三：70 → 92%，稍慢（等待 DOM 完成）
    const t3 = setTimeout(() => setProgress(92), 600)

    // DOM 就绪后完成进度并开始淡出
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        setProgress(100)
        setTimeout(() => setPhase("complete"), 300)
        setTimeout(() => setPhase("gone"), 900)
      }, 800)
    })

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (phase === "gone") return null

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center bg-background",
        phase === "complete" && "opacity-0 transition-opacity duration-[550ms] ease-out",
      )}
    >
      {/* 品牌标识 */}
      <div className="mb-8 flex flex-col items-center gap-2 select-none">
        <div className="flex items-center gap-2.5">
          {/* 键帽图标 */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="5" width="24" height="18" rx="4" fill="var(--design-keycap-fill)" />
            <rect x="4" y="7" width="20" height="14" rx="2.5" fill="var(--design-keycap-fill)" />
            <rect x="6" y="9" width="6" height="5" rx="1.5" fill="var(--muted-foreground)" opacity="0.5" />
            <rect x="14" y="9" width="8" height="5" rx="1.5" fill="var(--muted-foreground)" opacity="0.5" />
            <rect x="6" y="16" width="16" height="3" rx="1.5" fill="var(--muted-foreground)" opacity="0.5" />
          </svg>
          <span className="text-[15px] font-semibold tracking-wide text-foreground/80">
            Keyboard Designer
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">正在初始化工作区…</span>
      </div>

      {/* 进度条容器 */}
      <div className="relative w-[200px]">
        <Progress value={progress} className="h-[3px]" />
        <div className="mt-2 text-right text-[10px] tabular-nums text-muted-foreground/60">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  )
}
