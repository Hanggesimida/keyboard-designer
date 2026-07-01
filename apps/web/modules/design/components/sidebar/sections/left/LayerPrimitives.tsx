import { ArrowUp, ArrowDown, Eye, EyeOff, Lock, LockOpen, Trash2, Info, CaseSensitive } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

// ─── 层叠序号徽章 ──────────────────────────────────────
export function ZIndexBadge({ index }: { index: number }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-semibold tabular-nums text-muted-foreground/50 bg-muted/30 leading-none select-none">
      {index}
    </span>
  )
}

// ─── 通用操作按钮组 ────────────────────────────────────
export interface LayerControlsProps {
  canMoveUp: boolean
  canMoveDown: boolean
  canRemove: boolean
  isVisible: boolean
  isLocked: boolean
  /** 是否隐藏文字标签（仅键帽设计层使用，画布图片层传 undefined 可隐藏该按钮） */
  labelsHidden?: boolean
  onMoveUp: (e: React.MouseEvent) => void
  onMoveDown: (e: React.MouseEvent) => void
  onToggleVisible: (e: React.MouseEvent) => void
  onToggleLocked: (e: React.MouseEvent) => void
  /** 切换文字显隐的回调，传 undefined 时不渲染该按钮 */
  onToggleLabelsHidden?: (e: React.MouseEvent) => void
  onRemove: (e: React.MouseEvent) => void
}

export function LayerControls({
  canMoveUp,
  canMoveDown,
  canRemove,
  isVisible,
  isLocked,
  labelsHidden,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onToggleLocked,
  onToggleLabelsHidden,
  onRemove,
}: LayerControlsProps) {
  return (
    <span className="flex shrink-0 items-center -space-x-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={!canMoveUp}
        className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
        title="上移一层"
        onClick={onMoveUp}
      >
        <ArrowUp className="size-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={!canMoveDown}
        className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
        title="下移一层"
        onClick={onMoveDown}
      >
        <ArrowDown className="size-3" />
      </Button>
      {onToggleLabelsHidden !== undefined && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn(
            "cursor-pointer",
            labelsHidden
              ? "text-chart-4 hover:text-chart-4/80"
              : "text-muted-foreground hover:text-foreground",
          )}
          title={labelsHidden ? "显示文字" : "隐藏文字"}
          onClick={onToggleLabelsHidden}
        >
          <CaseSensitive className="size-3" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-foreground cursor-pointer"
        title={isVisible ? "隐藏" : "显示"}
        onClick={onToggleVisible}
      >
        {isVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={cn(
          "hover:text-foreground cursor-pointer",
          isLocked ? "text-chart-4" : "text-muted-foreground",
        )}
        title={isLocked ? "解锁" : "锁定"}
        onClick={onToggleLocked}
      >
        {isLocked ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
      </Button>
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive cursor-pointer"
          title="删除"
          onClick={onRemove}
        >
          <Trash2 className="size-3" />
        </Button>
      )}
    </span>
  )
}

// ─── 分组标题行 ────────────────────────────────────────
export function SectionHeader({
  label,
  tooltip,
}: {
  label: string
  tooltip: string
}) {
  return (
    <div className="flex items-center gap-1 px-0.5 pt-1">
      <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider select-none">
        {label}
      </span>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="size-2.5 text-muted-foreground/30 cursor-default" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px] text-[11px]">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export function SectionFooter({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 pb-1">
      <div className="flex-1 border-t border-dashed border-muted-foreground/20" />
      <span className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-wider select-none">
        {label}
      </span>
    </div>
  )
}
