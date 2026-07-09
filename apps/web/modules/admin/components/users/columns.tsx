"use client"

import { useState } from "react"
import { MoreHorizontal, Shield, ShieldOff, Building2, Loader2 } from "lucide-react"
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
import {
  useUpdateUserRole,
  useUpdateUserAccountType,
} from "@/hooks/queries/admin/useAdminUsers"
import type {
  AdminUserSummary,
  UserRole,
  AccountType,
} from "@/lib/api/admin-users"
import { ApiError } from "@/lib/api/request"

// ─── 角色 / 账号类型展示 ───────────────────────────────────────────────────────

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

function AccountTypeBadge({ accountType }: { accountType: AccountType }) {
  if (accountType === "ENTERPRISE_MAIN") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-blue-400/30 font-normal text-blue-500"
      >
        <Building2 size={11} />
        企业主账号
      </Badge>
    )
  }
  if (accountType === "ENTERPRISE_SUB") {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        企业子账号
      </Badge>
    )
  }
  return (
    <span className="text-xs text-muted-foreground/50">—</span>
  )
}

// ─── 操作菜单 ─────────────────────────────────────────────────────────────────

type PendingAction =
  | { type: "role"; value: UserRole }
  | { type: "accountType"; value: "NORMAL" | "ENTERPRISE_MAIN" }

function UserActionsMenu({
  user,
  onError,
}: {
  user: AdminUserSummary
  onError?: (message: string) => void
}) {
  const currentUserId = useUserStore((s) => s.user?.id)
  const { mutate: updateRole, isPending: isRolePending } = useUpdateUserRole()
  const { mutate: updateAccountType, isPending: isAccountTypePending } =
    useUpdateUserAccountType()
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const isSelf = user.id === currentUserId
  const isPending = isRolePending || isAccountTypePending
  const isSubAccount = user.accountType === "ENTERPRISE_SUB"

  function handleConfirm() {
    if (!pendingAction) return

    const onSettled = {
      onSuccess: () => setPendingAction(null),
      onError: (err: unknown) => {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "操作失败，请重试"
        onError?.(message)
        setPendingAction(null)
      },
    }

    if (pendingAction.type === "role") {
      updateRole({ id: user.id, payload: { role: pendingAction.value } }, onSettled)
    } else {
      updateAccountType(
        { id: user.id, payload: { accountType: pendingAction.value } },
        onSettled,
      )
    }
  }

  function dialogCopy() {
    if (!pendingAction) return { title: "", description: "" }
    if (pendingAction.type === "role") {
      return pendingAction.value === "ADMIN"
        ? {
            title: "设为管理员",
            description: `确认将「${user.email}」设为管理员？对方将可以访问管理后台。`,
          }
        : {
            title: "设为普通用户",
            description: `确认将「${user.email}」降为普通用户？对方将失去管理后台访问权限。`,
          }
    }
    return pendingAction.value === "ENTERPRISE_MAIN"
      ? {
          title: "设为企业主账号",
          description: `确认将「${user.email}」设为企业主账号？对方将可以创建子账号并批量下单（月结免支付）。`,
        }
      : {
          title: "取消企业主账号",
          description: `确认取消「${user.email}」的企业主账号身份？若其名下仍有子账号，操作将被拒绝。`,
        }
  }

  const copy = dialogCopy()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 data-[state=open]:bg-muted"
            disabled={isSelf || isSubAccount || isPending}
          >
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <MoreHorizontal size={15} />
            )}
            <span className="sr-only">打开菜单</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {user.role === "USER" ? (
            <DropdownMenuItem
              onClick={() => setPendingAction({ type: "role", value: "ADMIN" })}
            >
              <Shield size={14} className="text-muted-foreground" />
              设为管理员
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setPendingAction({ type: "role", value: "USER" })}
            >
              <ShieldOff size={14} className="text-muted-foreground" />
              设为普通用户
            </DropdownMenuItem>
          )}
          {user.accountType === "ENTERPRISE_MAIN" ? (
            <DropdownMenuItem
              onClick={() =>
                setPendingAction({ type: "accountType", value: "NORMAL" })
              }
            >
              <Building2 size={14} className="text-muted-foreground" />
              取消企业主账号
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                setPendingAction({ type: "accountType", value: "ENTERPRISE_MAIN" })
              }
            >
              <Building2 size={14} className="text-muted-foreground" />
              设为企业主账号
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
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
      accessorKey: "accountType",
      header: "账号类型",
      filterFn: (row, id, value) => {
        return (value as string[]).includes(row.getValue(id))
      },
      cell: ({ row }) => (
        <AccountTypeBadge accountType={row.getValue("accountType")} />
      ),
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
