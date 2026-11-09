import { useCallback, useEffect, useState } from "react";
import rison from "rison";
import { BiMetricsClient } from "@bi-metrics/core";
import { t } from "@bi-metrics/core/translation";
import { createErrorHandler } from "../utils/objects";
import type { FavoriteStatus } from "../types";

export function useFavoriteStatus(
  type: "chart" | "dashboard" | "tag",
  ids: Array<string | number>,
  handleErrorMsg: (message: string) => void,
) {
  const [favoriteStatus, setFavoriteStatus] = useState<FavoriteStatus>({});

  const updateFavoriteStatus = useCallback(
    (update: FavoriteStatus) =>
      setFavoriteStatus((current) => ({ ...current, ...update })),
    [],
  );

  useEffect(() => {
    if (!ids.length) return;
    BiMetricsClient.get({
      endpoint: `/api/v1/${type}/favorite_status/?q=${rison.encode(ids)}`,
    }).then(
      ({ json }) => {
        const result = json.result as { id: number; value: boolean }[];
        updateFavoriteStatus(
          Object.fromEntries(result.map(({ id, value }) => [id, value])),
        );
      },
      createErrorHandler((errMsg) =>
        handleErrorMsg(
          t("There was an error fetching the favorite status: %s", errMsg),
        ),
      ),
    );
  }, [ids, type, handleErrorMsg, updateFavoriteStatus]);

  const saveFaveStar = useCallback(
    (id: number, isStarred: boolean) => {
      const endpoint = `/api/v1/${type}/${id}/favorites/`;
      const apiCall = isStarred
        ? BiMetricsClient.delete({ endpoint })
        : BiMetricsClient.post({ endpoint });

      apiCall.then(
        () => updateFavoriteStatus({ [id]: !isStarred }),
        createErrorHandler((errMsg) =>
          handleErrorMsg(
            t("There was an error saving the favorite status: %s", errMsg),
          ),
        ),
      );
    },
    [handleErrorMsg, type, updateFavoriteStatus],
  );

  return [saveFaveStar, favoriteStatus] as const;
}
