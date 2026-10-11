import type {
  UseFiltersInstanceProps,
  UseFiltersOptions,
  UseFiltersState,
  UsePaginationOptions,
  UseSortByColumnProps,
  UseSortByInstanceProps,
  UseSortByOptions,
  UseSortByState,
} from "react-table";

declare module "react-table" {
  export interface TableOptions<D extends object>
    extends
      UseFiltersOptions<D>,
      UsePaginationOptions<D>,
      UseSortByOptions<D> {}

  export interface TableInstance<D extends object>
    extends UseFiltersInstanceProps<D>, UseSortByInstanceProps<D> {}

  export interface TableState<D extends object>
    extends UseFiltersState<D>, UseSortByState<D> {}

  export interface ColumnInstance<
    D extends object,
  > extends UseSortByColumnProps<D> {}
}
