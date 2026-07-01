"use client"

import { Suspense, useRef, useState } from "react"
import { Spinner } from "@workspace/ui/components/spinner"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Package } from "lucide-react"
import { useDesign } from "@/hooks/queries/designs/useDesigns"
import { useOrderQuote } from "@/hooks/queries/pricing/usePricing"
import { AddressSelector } from "@/modules/checkout/components/AddressSelector"
import { OrderSummary } from "@/modules/checkout/components/OrderSummary"
import { PaymentConfirmSection } from "@/modules/checkout/components/PaymentConfirmSection"
import { useMyAddresses } from "@/hooks/queries/addresses/useAddresses"
import { PageHeader } from "@/components/layouts/PageHeader"
import { ProfileSection, ProfileEmptyState } from "@/modules/profile"
import type { DesignSummary } from "@/lib/api/designs"
import type { PriceBreakdownItem } from "@/lib/api/pricing"

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <CheckoutShell>
          <div className="flex h-screen items-center justify-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        </CheckoutShell>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const designId = searchParams.get("designId")

  const { data: design, isLoading: isDesignLoading, error: designError } = useDesign(designId)
  const { data: addresses } = useMyAddresses()
  const { data: quote, isLoading: isQuoteLoading } = useOrderQuote(designId)

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [addressRequired, setAddressRequired] = useState(false)
  const addressSectionRef = useRef<HTMLDivElement>(null)

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
      <CheckoutShell>
        <ProfileEmptyState
          icon={Package}
          title="缺少设计方案参数"
          description="请从设计器选择方案后再进入结账。"
          action={{ label: "返回设计器", href: "/design" }}
        />
      </CheckoutShell>
    )
  }

  if (designError) {
    return (
      <CheckoutShell>
        <ProfileEmptyState
          icon={Package}
          title="加载设计方案失败"
          description="请返回上一页后重试。"
        />
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            返回上一页
          </Button>
        </div>
      </CheckoutShell>
    )
  }

  const summaryProps = {
    design: design as DesignSummary,
    totalAmount: quote?.totalAmount,
    breakdown: quote?.breakdown as PriceBreakdownItem[] | undefined,
    isLoading: isQuoteLoading,
  }

  return (
    <CheckoutShell>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="-ml-2 mb-4 cursor-pointer text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        返回设计器
      </Button>

      <PageHeader
        title="确认订单"
        description="确认商品与收货信息后完成支付"
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <ProfileSection title="商品信息">
            {isDesignLoading ? (
              <Skeleton className="h-24 rounded-xl border border-border" />
            ) : design ? (
              <>
                <div className="lg:hidden">
                  <OrderSummary {...summaryProps} mode="full" />
                </div>
                <div className="hidden lg:block">
                  <OrderSummary {...summaryProps} mode="compact" />
                </div>
              </>
            ) : null}
          </ProfileSection>

          <ProfileSection
            title="收货地址"
            action={
              addressRequired ? (
                <p className="text-xs text-destructive">请选择或新增收货地址</p>
              ) : undefined
            }
            className={addressRequired ? "rounded-xl ring-1 ring-destructive/30" : undefined}
          >
            <div ref={addressSectionRef}>
              <AddressSelector
                selectedId={resolvedAddressId}
                onSelect={handleAddressSelect}
              />
            </div>
          </ProfileSection>

          {design && (
            <div className="lg:hidden">
              <CheckoutSummaryCard
                designId={design.id}
                summaryProps={summaryProps}
                selectedAddressId={resolvedAddressId}
                onAddressRequired={handleAddressRequired}
              />
            </div>
          )}
        </div>

        {design && (
          <aside className="hidden lg:block lg:sticky lg:top-8 lg:self-start">
            <CheckoutSummaryCard
              designId={design.id}
              summaryProps={summaryProps}
              selectedAddressId={resolvedAddressId}
              onAddressRequired={handleAddressRequired}
            />
          </aside>
        )}
      </div>
    </CheckoutShell>
  )
}

interface CheckoutSummaryCardProps {
  designId: string
  summaryProps: {
    design: DesignSummary
    totalAmount: number | undefined
    breakdown: PriceBreakdownItem[] | undefined
    isLoading?: boolean
  }
  selectedAddressId: string | null
  onAddressRequired: () => void
}

function CheckoutSummaryCard({
  designId,
  summaryProps,
  selectedAddressId,
  onAddressRequired,
}: CheckoutSummaryCardProps) {
  return (
    <Card className="ring-border/50">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-semibold text-foreground/80">订单结算</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <OrderSummary {...summaryProps} mode="pricing" />
        <Separator />
        <PaymentConfirmSection
          designId={designId}
          selectedAddressId={selectedAddressId}
          totalAmount={summaryProps.totalAmount}
          onAddressRequired={onAddressRequired}
        />
      </CardContent>
    </Card>
  )
}

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-8 lg:py-10">
        {children}
      </div>
    </div>
  )
}
