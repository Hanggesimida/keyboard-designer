"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Keyboard, PackageCheck, Pencil } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useTeamDesigns } from "@/hooks/queries/enterprise/useEnterprise"
import { ProfileEmptyState } from "@/modules/profile"
import type { DesignStatus } from "@/lib/api/designs"
import { DesignStatusBadge } from "./DesignStatusBadge"
import { BatchOrderDialog } from "./BatchOrderDialog"

const ORDERABLE_STATUSES: DesignStatus[] = ["SUBMITTED", "ORDERED"]

const STATUS_TABS: { value: DesignStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "全部" },
  { value: "DRAFT", label: "草稿" },
  { value: "SUBMITTED", label: "已提交" },
  { value: "ORDERED", label: "已下单" },
]

export function TeamDesignsTable() {
  const router = useRouter()
  const [statusTab, setStatusTab] = useState<DesignStatus | "ALL">("ALL")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchOpen, setBatchOpen] = useState(false)

  const { data: designs, isLoading } = useTeamDesigns(
    statusTab === "ALL" ? undefined : { status: statusTab },
  )

  const selectableDesigns = useMemo(
    () =>
      (designs ?? []).filter((d) =>
        ORDERABLE_STATUSES.includes(d.status),
      ),
    [designs],
  )

  const selectedDesigns = useMemo(
    () => selectableDesigns.filter((d) => selected.has(d.id)),
    [selectableDesigns, selected],
  )

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === selectableDesigns.length
        ? new Set()
        : new Set(selectableDesigns.map((d) => d.id)),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={statusTab} onValueChange={(v) => setStatusTab(v as DesignStatus | "ALL")}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_TABS.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedDesigns.length > 0 && (
          <Button size="sm" className="cursor-pointer" onClick={() => setBatchOpen(true)}>
            <PackageCheck size={14} />
            {selectedDesigns.length === 1
              ? "下单"
              : `批量下单（已选 ${selectedDesigns.length}）`}
          </Button>
        )}
      </div>

      {isLoading ? (
        <TeamDesignsSkeleton />
      ) : !designs || designs.length === 0 ? (
        <ProfileEmptyState
          icon={Keyboard}
          title="暂无团队设计"
          description="设计师提交设计后将出现在这里，等待你审核并下单。"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  {selectableDesigns.length > 0 && (
                    <Checkbox
                      checked={
                        selected.size === selectableDesigns.length && selected.size > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  )}
                </th>
                <th className="px-2 py-2.5 text-left font-medium">设计</th>
                <th className="px-4 py-2.5 text-left font-medium">设计师</th>
                <th className="px-4 py-2.5 text-left font-medium">状态</th>
                <th className="px-4 py-2.5 text-left font-medium">更新时间</th>
                <th className="px-4 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {designs.map((design) => (
                <tr key={design.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    {ORDERABLE_STATUSES.includes(design.status) && (
                      <Checkbox
                        checked={selected.has(design.id)}
                        onCheckedChange={() => toggleSelect(design.id)}
                      />
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-11 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted/30">
                        {design.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={design.previewUrl}
                            alt={design.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Keyboard size={12} className="text-muted-foreground/40" />
                        )}
                      </div>
                      <span className="truncate text-sm font-medium text-foreground/85">
                        {design.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/80">
                    {design.user.email}
                  </td>
                  <td className="px-4 py-3">
                    <DesignStatusBadge status={design.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/55">
                    {formatDistanceToNow(new Date(design.updatedAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/design?id=${design.id}&from=enterprise`)}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={13} />
                      查看/编辑
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BatchOrderDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        designs={selectedDesigns}
        onCompleted={() => setSelected(new Set())}
      />
    </div>
  )
}

function TeamDesignsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl border border-border" />
      ))}
    </div>
  )
}
