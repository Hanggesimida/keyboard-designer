"use client"

import { useRouter } from "next/navigation"
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
import { zhCN } from "date-fns/locale"
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

// ─── 操作菜单 ─────────────────────────────────────────────────────────────────

function OrderActionsMenu({ order }: { order: AdminOrderSummary }) {
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
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 space-y-1">
        <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}`)}>
          <ExternalLink size={14} className="text-muted-foreground" />
          查看详情
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenDesigner}>
          <ExternalLink size={14} className="text-muted-foreground" />
          在设计器中打开
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportJson}>
          <FileJson size={14} className="text-muted-foreground" />
          导出 JSON 快照
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAutoExport("png")}>
          <ImageIcon size={14} className="text-muted-foreground" />
          导出 PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAutoExport("svg")}>
          <FileCode2 size={14} className="text-muted-foreground" />
          导出 SVG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAutoExport("jig")}>
          <Wrench size={14} className="text-muted-foreground" />
          转换治具 SVG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── 列定义 ───────────────────────────────────────────────────────────────────

export const columns: ColumnDef<AdminOrderSummary>[] = [
  {
    accessorKey: "orderNo",
    header: "订单号",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground truncate block max-w-[160px]">
        {row.getValue("orderNo")}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "design",
    header: "设计 / 用户",
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
    accessorKey: "totalAmount",
    header: "金额",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"))
      return (
        <span className="text-sm font-semibold text-foreground/75">
          {new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(amount)}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    filterFn: (row, id, value) => {
      return (value as string[]).includes(row.getValue(id))
    },
    cell: ({ row }) => <OrderStatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "createdAt",
    header: "下单时间",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground/55">
        {formatDistanceToNow(new Date(row.getValue("createdAt")), {
          addSuffix: true,
          locale: zhCN,
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
