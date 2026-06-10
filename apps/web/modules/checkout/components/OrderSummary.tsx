"use client"

import { Keyboard } from "lucide-react"
import type { DesignSummary } from "@/lib/api/designs"

// 开发阶段固定价格
export const FIXED_PRICE = 999.00

interface OrderSummaryProps {
  design: DesignSummary
}

export function OrderSummary({ design }: OrderSummaryProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {/* 设计预览图 */}
        <div className="w-24 h-16 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center overflow-hidden shrink-0">
          {design.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={design.previewUrl}
              alt={design.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Keyboard size={20} className="text-white/20" />
          )}
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/85 truncate">{design.name}</p>
          <p className="mt-0.5 text-xs text-white/35">定制键帽 · 1 套</p>
        </div>

        {/* 价格 */}
        <div className="text-right shrink-0">
          <p className="text-base font-semibold text-white/90">
            ¥{FIXED_PRICE.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 合计 */}
      <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-white/35">商品合计</span>
        <span className="text-sm font-semibold text-white/80">¥{FIXED_PRICE.toFixed(2)}</span>
      </div>
    </div>
  )
}
