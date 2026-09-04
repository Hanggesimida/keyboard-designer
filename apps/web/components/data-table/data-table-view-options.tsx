"use client"

import { type RowData } from "@tanstack/react-table"
import { Settings2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { type DataTableInstance } from "./table-features"

interface DataTableViewOptionsProps<TData extends RowData> {
  table: DataTableInstance<TData>
}

export function DataTableViewOptions<TData extends RowData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const t = useTranslations("DataTable")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex" />}>
          <Settings2 />
          {t("view")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>{t("columns")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((col) => typeof col.accessorFn !== "undefined" && col.getCanHide())
          .map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              className="capitalize"
              checked={col.getIsVisible()}
              onCheckedChange={(value) => col.toggleVisibility(!!value)}
            >
              {col.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
