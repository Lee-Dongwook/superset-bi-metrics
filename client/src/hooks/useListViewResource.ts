import { useCallback, useEffect, useRef, useState } from "react";
import rison from "rison";
import { BiMetricsClient } from "@bi-metrics/core";
import { t } from "@bi-metrics/core/translation";
import { createErrorHandler } from "../utils/objects";
import type { FetchDataConfig, FilterValue } from "../types";

interface ListViewResourceState<D> {
  loading: boolean;
  collection: D[];
  count: number;
  permissions: string[];
  bulkSelectEnabled: boolean;
}

// ponytail: upstream also live-patches rows over the realtime socket; add
// when list pages need it.
export function useListViewResource<D extends object = any>(
  resource: string,
  resourceLabel: string,
  handleErrorMsg: (errorMsg: string) => void,
  infoEnable = true,
  defaultCollectionValue: D[] = [],
  baseFilters?: FilterValue[], // must be memoized
  initialLoadingState = true,
) {
  const [state, setState] = useState<ListViewResourceState<D>>({
    count: 0,
    collection: defaultCollectionValue,
    loading: initialLoadingState,
    permissions: [],
    bulkSelectEnabled: false,
  });

  const updateState = useCallback(
    (update: Partial<ListViewResourceState<D>>) =>
      setState((current) => ({ ...current, ...update })),
    [],
  );

  const handleErrorMsgRef = useRef(handleErrorMsg);
  useEffect(() => {
    handleErrorMsgRef.current = handleErrorMsg;
  });

  useEffect(() => {
    if (!infoEnable) return;
    BiMetricsClient.get({
      endpoint: `/api/v1/${resource}/_info?q=${rison.encode({
        keys: ["permissions"],
      })}`,
    }).then(
      ({ json = {} }) => updateState({ permissions: json.permissions }),
      createErrorHandler((errMsg) =>
        handleErrorMsgRef.current(
          t(
            "An error occurred while fetching %s info: %s",
            resourceLabel,
            errMsg,
          ),
        ),
      ),
    );
  }, [infoEnable, resource, resourceLabel, updateState]);

  const hasPerm = useCallback(
    (perm: string) => state.permissions.includes(perm),
    [state.permissions],
  );

  const lastConfigRef = useRef<FetchDataConfig | null>(null);
  const latestRequestIdRef = useRef(0);

  const fetchData = useCallback(
    ({ pageIndex, pageSize, sortBy, filters }: FetchDataConfig) => {
      const requestId = ++latestRequestIdRef.current;
      const isLatest = () => latestRequestIdRef.current === requestId;
      lastConfigRef.current = { pageIndex, pageSize, sortBy, filters };
      updateState({ loading: true });

      const filterExps = (baseFilters || [])
        .concat(filters)
        .filter(({ value }) => value !== "" && value != null)
        .map(({ id, operator: opr, value }) => ({ col: id, opr, value }));

      const queryParams = rison.encode_uri({
        order_column: sortBy[0].id,
        order_direction: sortBy[0].desc ? "desc" : "asc",
        page: pageIndex,
        page_size: pageSize,
        ...(filterExps.length ? { filters: filterExps } : {}),
      });

      return BiMetricsClient.get({
        endpoint: `/api/v1/${resource}/?q=${queryParams}`,
      })
        .then(
          ({ json = {} }) => {
            if (isLatest()) {
              updateState({ collection: json.result, count: json.count });
            }
          },
          createErrorHandler((errMsg) => {
            if (isLatest()) {
              handleErrorMsgRef.current(
                t(
                  "An error occurred while fetching %ss: %s",
                  resourceLabel,
                  errMsg,
                ),
              );
            }
          }),
        )
        .finally(() => {
          if (isLatest()) updateState({ loading: false });
        });
    },
    [baseFilters, resource, resourceLabel, updateState],
  );

  const refreshData = useCallback(
    (provideConfig?: FetchDataConfig | null) => {
      const config = lastConfigRef.current ?? provideConfig;
      return config ? fetchData(config) : null;
    },
    [fetchData],
  );

  return {
    state: {
      loading: state.loading,
      resourceCount: state.count,
      resourceCollection: state.collection,
      bulkSelectEnabled: state.bulkSelectEnabled,
    },
    setResourceCollection: (collection: D[]) => updateState({ collection }),
    hasPerm,
    fetchData,
    toggleBulkSelect: () =>
      updateState({ bulkSelectEnabled: !state.bulkSelectEnabled }),
    refreshData,
  };
}
