import type {
  UseFiltersColumnOptions,
  UseFiltersColumnProps,
  UseFiltersInstanceProps,
  UseFiltersOptions,
  UseFiltersState,
  UsePaginationInstanceProps,
  UsePaginationOptions,
  UsePaginationState,
  UseRowSelectInstanceProps,
  UseRowSelectOptions,
  UseRowSelectRowProps,
  UseRowSelectState,
  UseRowStateInstanceProps,
  UseRowStateOptions,
  UseRowStateState,
  UseSortByColumnOptions,
  UseSortByColumnProps,
  UseSortByInstanceProps,
  UseSortByOptions,
  UseSortByState,
} from "react-table";

declare module "react-table" {
  export interface TableOptions<D extends object>
    extends
      UseFiltersOptions<D>,
      UseSortByOptions<D>,
      UsePaginationOptions<D>,
      UseRowStateOptions<D>,
      UseRowSelectOptions<D> {}

  export interface TableInstance<D extends object>
    extends
      UseFiltersInstanceProps<D>,
      UseSortByInstanceProps<D>,
      UsePaginationInstanceProps<D>,
      UseRowStateInstanceProps<D>,
      UseRowSelectInstanceProps<D> {}

  export interface TableState<D extends object>
    extends
      UseFiltersState<D>,
      UseSortByState<D>,
      UsePaginationState<D>,
      UseRowStateState<D>,
      UseRowSelectState<D> {}

  export interface Row<D extends object> extends UseRowSelectRowProps<D> {}

  export interface ColumnInterface<D extends object>
    extends UseFiltersColumnOptions<D>, UseSortByColumnOptions<D> {}

  export interface ColumnInstance<D extends object>
    extends UseFiltersColumnProps<D>, UseSortByColumnProps<D> {}
}
