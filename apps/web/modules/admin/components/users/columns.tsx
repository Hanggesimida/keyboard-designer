"use client"

import { useState } from "react"
import { MoreHorizontal, Shield, ShieldOff, Loader2 } from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { useUserStore } from "@/store/userStore"
import { useUpdateUserRole } from "@/hooks/queries/admin/useAdminUsers"
import type { AdminUserSummary, UserRole } from "@/lib/api/admin-users"
import { ApiError } from "@/lib/api/request"

// ─── 角色展示 ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "ADMIN") {
    return (
      <Badge variant="default" className="font-normal">
        管理员
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="font-normal">
      普通用户
    </Badge>
  )
}

// ─── 操作菜单 ─────────────────────────────────────────────────────────────────

function UserActionsMenu({
  user,
  onError,
}: {
  user: AdminUserSummary
  onError?: (message: string) => void
}) {
  const currentUserId = useUserStore((s) => s.user?.id)
  const { mutate: updateRole, isPending } = useUpdateUserRole()
  const [confirmRole, setConfirmRole] = useState<UserRole | null>(null)

  const isSelf = user.id === currentUserId

  function handleConfirm() {
    if (!confirmRole) return
    updateRole(
      { id: user.id, payload: { role: confirmRole } },
      {
        onSuccess: () => setConfirmRole(null),
        onError: (err) => {
          const message =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "更新角色失败，请重试"
          onError?.(message)
          setConfirmRole(null)
        },
      },
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 data-[state=open]:bg-muted"
            disabled={isSelf || isPending}
          >
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <MoreHorizontal size={15} />
            )}
            <span className="sr-only">打开菜单</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {user.role === "USER" ? (
            <DropdownMenuItem onClick={() => setConfirmRole("ADMIN")}>
              <Shield size={14} className="text-muted-foreground" />
              设为管理员
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setConfirmRole("USER")}>
              <ShieldOff size={14} className="text-muted-foreground" />
              设为普通用户
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmRole !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRole(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRole === "ADMIN" ? "设为管理员" : "设为普通用户"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRole === "ADMIN"
                ? `确认将「${user.email}」设为管理员？对方将可以访问管理后台。`
                : `确认将「${user.email}」降为普通用户？对方将失去管理后台访问权限。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault()
                handleConfirm()
              }}
            >
              {isPending ? "处理中…" : "确认"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── 列定义 ───────────────────────────────────────────────────────────────────

export function createUserColumns(
  onError?: (message: string) => void,
): ColumnDef<AdminUserSummary>[] {
  return [
    {
      accessorKey: "email",
      header: "邮箱",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80 truncate block max-w-[280px]">
          {row.getValue("email")}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "role",
      header: "角色",
      filterFn: (row, id, value) => {
        return (value as string[]).includes(row.getValue(id))
      },
      cell: ({ row }) => <RoleBadge role={row.getValue("role")} />,
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: "注册时间",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground/55">
          {formatDistanceToNow(new Date(row.getValue("createdAt")), {
            addSuffix: true,
            locale: zhCN,
          })}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <UserActionsMenu user={row.original} onError={onError} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
