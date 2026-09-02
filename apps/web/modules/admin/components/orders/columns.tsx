"use client"

import { type ColumnDef } from "@tanstack/react-table"
import {
  MoreHorizontal,
  ExternalLink,
  FileJson,
  ImageIcon,
  FileCode2,
  Wrench,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Locale } from "date-fns"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { OrderStatusBadge } from "@/modules/orders"
import type { AdminOrderSummary } from "@/lib/api/admin-orders"
import { useRouter } from "@/i18n/navigation"

function OrderActionsMenu({ order }: { order: AdminOrderSummary }) {
  const t = useTranslations("Admin.orders")
  const router = useRouter()

  const handleOpenDesigner = () => {
    window.open(`/design?id=${order.design.id}&orderId=${order.id}&from=admin`, "_blank")
  }

  const handleExportJson = () => {
    try {
      const snapshot = order as unknown as { designSnapshot: unknown }
      if (!snapshot) return
      const blob = new Blob(
        [JSON.stringify(snapshot.designSnapshot ?? {}, null, 2)],
        { type: "application/json" },
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `keyboard-${order.design.id}-snapshot.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }

  const handleAutoExport = (type: "png" | "svg" | "jig") => {
    window.open(`/design?id=${order.design.id}&autoExport=${type}`, "_blank")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 data-[state=open]:bg-muted"
        >
          <MoreHorizontal size={15} />
          <span className="sr-only">{t("openMenu")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 space-y-1">
        <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}`)}>
          <ExternalLink size={14} className="text-muted-foreground" />
          {t("viewDetail")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenDesigner}>
          <ExternalLink size={14} className="text-muted-foreground" />
          {t("openInEditor")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportJson}>
          <FileJson size={14} className="text-muted-foreground" />
          {t("exportJsonSnapshot")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAutoExport("png")}>
          <ImageIcon size={14} className="text-muted-foreground" />
          {t("exportPng")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAutoExport("svg")}>
          <FileCode2 size={14} className="text-muted-foreground" />
          {t("exportSvg")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAutoExport("jig")}>
          <Wrench size={14} className="text-muted-foreground" />
          {t("convertJig")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const cnyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
})

export function createOrderColumns(
  t: (key: string, values?: Record<string, number>) => string,
  dateLocale: Locale,
): ColumnDef<AdminOrderSummary>[] {
  return [
    {
      accessorKey: "orderNo",
      header: t("orderNo"),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground truncate block max-w-[160px]">
          {row.getValue("orderNo")}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "design",
      header: t("designUser"),
      cell: ({ row }) => {
        const order = row.original
        return (
          <div className="min-w-0 pr-4">
            <p className="text-sm text-foreground/80 truncate font-medium">{order.design.name}</p>
            <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{order.user.email}</p>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "quantity",
      header: t("quantity"),
      cell: ({ row }) => (
        <span className="text-sm text-foreground/75">
          {t("setCount", { count: row.getValue("quantity") as number })}
        </span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: t("amount"),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalAmount"))
        return (
          <span className="text-sm font-semibold text-foreground/75">
            {cnyFormatter.format(amount)}
          </span>
        )
      },
    },
    {
      accessorKey: "status",
      header: t("status"),
      filterFn: (row, id, value) => {
        return (value as string[]).includes(row.getValue(id))
      },
      cell: ({ row }) => <OrderStatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "createdAt",
      header: t("placedTime"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground/55">
          {formatDistanceToNow(new Date(row.getValue("createdAt")), {
            addSuffix: true,
            locale: dateLocale,
          })}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div
          className="flex items-center justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <OrderActionsMenu order={row.original} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
