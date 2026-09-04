// ─── 主组件 ───────────────────────────────────────────────────────────────────
export { DataTable } from "./data-table"

// ─── 子组件 ───────────────────────────────────────────────────────────────────
export { DataTableCore } from "./data-table-core"
export { DataTablePagination } from "./data-table-pagination"
export { DataTableFacetedFilter } from "./data-table-faceted-filter"
export { DataTableViewOptions } from "./data-table-view-options"

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useDataTable } from "./hooks/use-data-table"
export { useServerDataTable } from "./hooks/use-server-data-table"

// ─── 类型 ─────────────────────────────────────────────────────────────────────
export type { FacetedFilterOption } from "./data-table-faceted-filter"
export type {
  DataTableColumn,
  DataTableColumnDef,
  DataTableFeatures,
  DataTableInstance,
  DataTableRow,
} from "./table-features"
