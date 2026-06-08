"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Save, Cloud, CloudOff } from "lucide-react"
import { Spinner } from "@workspace/ui/components/spinner"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { useCreateDesign, useUpdateDesign } from "@/hooks/queries/designs/useDesigns"
import { useUserStore } from "@/store/userStore"
import type { DesignData } from "@/lib/api/designs"
import type { ExportCanvasElement } from "@/modules/design/lib/design/exportArtboard"

/** 从 store 当前状态提取可持久化的设计数据（内联 src，自包含） */
function extractDesignData(): DesignData {
  const {
    templateId,
    layers,
    artboardBackground,
    fontFamily,
    fontWeight,
    fontStyle,
    globalKeycapStyle,
    layerKeycapOverrides,
    canvasElements,
    assetMap,
  } = useDesignUIStore.getState()

  const exportElements: ExportCanvasElement[] = canvasElements.map((el) => {
    const { assetId, ...rest } = el
    return { ...rest, src: assetMap[assetId] ?? "" }
  })

  return {
    version: 1,
    templateId,
    layers,
    artboardBackground,
    fontFamily,
    fontWeight,
    fontStyle,
    globalKeycapStyle,
    layerKeycapOverrides,
    canvasElements: exportElements,
  }
}

export function SaveDesignButton() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const designId = searchParams.get("id")

  const accessToken = useUserStore((s) => s.accessToken)
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { mutate: createDesign, isPending: isCreating } = useCreateDesign()
  const { mutate: updateDesign, isPending: isUpdating } = useUpdateDesign()

  const isSaving = isCreating || isUpdating

  function handleSaveClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!accessToken) return
    if (designId) {
      handleUpdate()
    } else {
      setNameInput("")
      setNameDialogOpen(true)
    }
  }

  function handleUpdate() {
    if (!designId) return
    updateDesign(
      { id: designId, payload: { data: extractDesignData() } },
      {
        onSuccess: () => {
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 2000)
        },
      },
    )
  }

  function handleCreate() {
    const trimmedName = nameInput.trim()
    if (!trimmedName) return

    createDesign(
      { name: trimmedName, data: extractDesignData() },
      {
        onSuccess: (design) => {
          setNameDialogOpen(false)
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 2000)
          // 将设计 ID 写入 URL，后续保存直接走更新逻辑
          const params = new URLSearchParams(searchParams.toString())
          params.set("id", design.id)
          router.replace(`/design?${params.toString()}`)
        },
      },
    )
  }

  if (!accessToken) {
    return (
      <button
        type="button"
        title="请先登录后再保存设计"
        disabled
        className="flex cursor-not-allowed items-center justify-center gap-1 rounded px-1 py-0.5 text-white/20"
      >
        <CloudOff className="size-3.5" />
        <span className="text-[11px] leading-none">保存</span>
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        title={designId ? "保存设计 (Ctrl+S)" : "另存为新设计"}
        disabled={isSaving}
        onClick={handleSaveClick}
        className="flex cursor-pointer items-center justify-center gap-1 rounded px-1 py-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 text-white/40 hover:bg-white/10 hover:text-emerald-400/80"
      >
        {isSaving ? (
          <Spinner className="size-3.5" />
        ) : saveSuccess ? (
          <Cloud className="size-3.5 text-emerald-400" />
        ) : (
          <Save className="size-3.5" />
        )}
        <span className="text-[11px] leading-none">
          {saveSuccess ? "已保存" : "保存"}
        </span>
      </button>

      {/* 命名弹窗（首次保存） */}
      <Dialog
        open={nameDialogOpen}
        onOpenChange={(open) => !isSaving && setNameDialogOpen(open)}
      >
        <DialogContent showCloseButton={false} onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>保存设计方案</DialogTitle>
            <DialogDescription>
              请为此键盘设计方案起一个名称，便于后续查找。
            </DialogDescription>
          </DialogHeader>

          <div className="px-1 py-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
              }}
              placeholder="例如：无题键盘方案 1"
              maxLength={100}
              autoFocus
              className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-0 transition-colors"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => setNameDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              disabled={!nameInput.trim() || isSaving}
              onClick={(e) => {
                e.preventDefault()
                handleCreate()
              }}
            >
              {isSaving ? "保存中..." : "确认保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
