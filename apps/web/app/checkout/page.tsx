"use client"

import { useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Package } from "lucide-react"
import Link from "next/link"
import { useDesign } from "@/hooks/queries/designs/useDesigns"
import { AddressSelector } from "@/modules/checkout/components/AddressSelector"
import { OrderSummary } from "@/modules/checkout/components/OrderSummary"
import { PaymentConfirmSection } from "@/modules/checkout/components/PaymentConfirmSection"
import { useMyAddresses } from "@/hooks/queries/addresses/useAddresses"

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const designId = searchParams.get("designId")

  const { data: design, isLoading: isDesignLoading, error: designError } = useDesign(designId)
  const { data: addresses } = useMyAddresses()

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [addressRequired, setAddressRequired] = useState(false)
  const addressSectionRef = useRef<HTMLDivElement>(null)

  // 自动选中默认地址（或第一个）
  const resolvedAddressId = (() => {
    if (selectedAddressId) return selectedAddressId
    if (!addresses || addresses.length === 0) return null
    const def = addresses.find((a) => a.isDefault)
    return def?.id ?? addresses[0]?.id ?? null
  })()

  function handleAddressSelect(id: string) {
    setSelectedAddressId(id)
    setAddressRequired(false)
  }

  function handleAddressRequired() {
    setAddressRequired(true)
    addressSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  if (!designId) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Package size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">缺少设计方案参数</p>
          <Link href="/design" className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2">
            返回设计器
          </Link>
        </div>
      </PageShell>
    )
  }

  if (designError) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Package size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">加载设计方案失败</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2"
          >
            返回上一页
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 返回 */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors group cursor-pointer"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          返回设计器
        </button>

        <h1 className="text-xl font-bold text-white/90">确认订单</h1>

        {/* 商品信息 */}
        <section>
          <SectionTitle icon={<Package size={14} />} text="商品信息" />
          {isDesignLoading ? (
            <div className="h-24 rounded-xl border border-white/[0.07] bg-white/[0.02] animate-pulse" />
          ) : design ? (
            <OrderSummary design={design} />
          ) : null}
        </section>

        {/* 收货地址 */}
        <section ref={addressSectionRef}>
          <SectionTitle
            icon={<MapPin size={14} />}
            text="收货地址"
            error={addressRequired ? "请选择或新增收货地址" : undefined}
          />
          <AddressSelector
            selectedId={resolvedAddressId}
            onSelect={handleAddressSelect}
          />
        </section>

        {/* 支付 */}
        <section>
          <SectionTitle icon={<Package size={14} />} text="支付信息" />
          {design && (
            <PaymentConfirmSection
              designId={design.id}
              selectedAddressId={resolvedAddressId}
              onAddressRequired={handleAddressRequired}
            />
          )}
        </section>
      </div>
    </PageShell>
  )
}

// ─── 子组件 ──────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/3 w-[500px] h-[400px] rounded-full opacity-[0.06]"
          style={{
            background: "radial-gradient(ellipse, rgba(120,80,255,0.8) 0%, rgba(60,130,255,0.4) 50%, transparent 75%)",
            filter: "blur(100px)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      <div className="relative px-4 py-8 sm:px-6 md:px-8 lg:px-12">
        {children}
      </div>
    </div>
  )
}

function SectionTitle({
  icon,
  text,
  error,
}: {
  icon: React.ReactNode
  text: string
  error?: string
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-white/40">{icon}</span>
        <h2 className="text-sm font-semibold text-white/70">{text}</h2>
      </div>
      {error && (
        <p className="text-xs text-red-400/80">{error}</p>
      )}
    </div>
  )
}
