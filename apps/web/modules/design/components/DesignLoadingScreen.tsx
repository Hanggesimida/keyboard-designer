"use client"

import { useEffect, useState } from "react"

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
      className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        backgroundColor: "#1e1e1e",
        opacity: phase === "complete" ? 0 : 1,
        transition: phase === "complete" ? "opacity 0.55s ease-out" : "none",
      }}
    >
      {/* 品牌标识 */}
      <div className="mb-8 flex flex-col items-center gap-2 select-none">
        <div className="flex items-center gap-2.5">
          {/* 键帽图标 */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="5" width="24" height="18" rx="4" fill="#3c3c3c" />
            <rect x="4" y="7" width="20" height="14" rx="2.5" fill="#4a4a4a" />
            <rect x="6" y="9" width="6" height="5" rx="1.5" fill="#5a5a5a" />
            <rect x="14" y="9" width="8" height="5" rx="1.5" fill="#5a5a5a" />
            <rect x="6" y="16" width="16" height="3" rx="1.5" fill="#5a5a5a" />
          </svg>
          <span className="text-[15px] font-semibold tracking-wide text-white/80">
            Keyboard Designer
          </span>
        </div>
        <span className="text-[11px] text-white/30">正在初始化工作区…</span>
      </div>

      {/* 进度条容器 */}
      <div className="relative w-[200px]">
        {/* 轨道 */}
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
          {/* 填充条 */}
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
              transition: "width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              boxShadow: "0 0 8px rgba(96,165,250,0.5)",
            }}
          />
        </div>
        {/* 百分比 */}
        <div className="mt-2 text-right text-[10px] tabular-nums text-white/20">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  )
}
