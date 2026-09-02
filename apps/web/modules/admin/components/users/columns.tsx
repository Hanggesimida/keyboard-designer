"use client"

import { useState } from "react"
import { MoreHorizontal, Shield, ShieldOff, Building2, Loader2 } from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import type { Locale } from "date-fns"
import { useTranslations } from "next-intl"
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
import { resolveErrorMessage } from "@/lib/api/request"

function RoleBadge({ role }: { role: UserRole }) {
  const t = useTranslations("Admin.users")
  if (role === "ADMIN") {
    return (
      <Badge variant="default" className="font-normal">
        {t("admin")}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="font-normal">
      {t("regular")}
    </Badge>
  )
}

function AccountTypeBadge({ accountType }: { accountType: AccountType }) {
  const t = useTranslations("Admin.users")
  if (accountType === "ENTERPRISE_MAIN") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-blue-400/30 font-normal text-blue-500"
      >
        <Building2 size={11} />
        {t("enterpriseMain")}
      </Badge>
    )
  }
  if (accountType === "ENTERPRISE_SUB") {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        {t("enterpriseSub")}
      </Badge>
    )
  }
  return (
    <span className="text-xs text-muted-foreground/50">—</span>
  )
}

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
  const t = useTranslations("Admin.users")
  const tCommon = useTranslations("Common")
  const tErrors = useTranslations("Errors")
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
        onError?.(resolveErrorMessage(err, t("actionFailed"), tErrors("sessionExpired")))
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
        ? { title: t("makeAdmin"), description: t("confirmMakeAdmin") }
        : { title: t("makeRegular"), description: t("confirmMakeRegular") }
    }
    return pendingAction.value === "ENTERPRISE_MAIN"
      ? { title: t("makeEnterpriseMain"), description: t("confirmMakeMain") }
      : { title: t("unsetEnterpriseMain"), description: t("confirmUnsetMain") }
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
            <span className="sr-only">{t("openMenu")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {user.role === "USER" ? (
            <DropdownMenuItem
              onClick={() => setPendingAction({ type: "role", value: "ADMIN" })}
            >
              <Shield size={14} className="text-muted-foreground" />
              {t("makeAdmin")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setPendingAction({ type: "role", value: "USER" })}
            >
              <ShieldOff size={14} className="text-muted-foreground" />
              {t("makeRegular")}
            </DropdownMenuItem>
          )}
          {user.accountType === "ENTERPRISE_MAIN" ? (
            <DropdownMenuItem
              onClick={() =>
                setPendingAction({ type: "accountType", value: "NORMAL" })
              }
            >
              <Building2 size={14} className="text-muted-foreground" />
              {t("unsetEnterpriseMain")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                setPendingAction({ type: "accountType", value: "ENTERPRISE_MAIN" })
              }
            >
              <Building2 size={14} className="text-muted-foreground" />
              {t("makeEnterpriseMain")}
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
            <AlertDialogCancel disabled={isPending}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault()
                handleConfirm()
              }}
            >
              {isPending ? t("processing") : t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function createUserColumns(
  onError: ((message: string) => void) | undefined,
  t: (key: string, values?: Record<string, number>) => string,
  dateLocale: Locale,
): ColumnDef<AdminUserSummary>[] {
  return [
    {
      accessorKey: "email",
      header: t("email"),
      cell: ({ row }) => (
        <span className="text-sm text-foreground/80 truncate block max-w-[280px]">
          {row.getValue("email")}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "role",
      header: t("role"),
      filterFn: (row, id, value) => {
        return (value as string[]).includes(row.getValue(id))
      },
      cell: ({ row }) => <RoleBadge role={row.getValue("role")} />,
      enableSorting: false,
    },
    {
      accessorKey: "accountType",
      header: t("accountType"),
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
      header: t("registeredAt"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground/55">
          {formatDistanceToNow(new Date(row.getValue("createdAt")), {
            addSuffix: true,
            locale: dateLocale,
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
