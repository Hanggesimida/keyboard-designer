import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type Column,
  type ColumnDef,
  type ReactTable,
  type Row,
  type RowData,
} from "@tanstack/react-table"

export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowPaginationFeature,
  rowSortingFeature,
  columnFacetingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
})

export type DataTableFeatures = typeof dataTableFeatures
export type DataTableInstance<TData extends RowData> = ReactTable<
  DataTableFeatures,
  TData
>
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>
export type DataTableColumnDef<TData extends RowData, TValue = unknown> =
  ColumnDef<DataTableFeatures, TData, TValue>
export type DataTableColumn<TData extends RowData, TValue = unknown> = Column<
  DataTableFeatures,
  TData,
  TValue
>
