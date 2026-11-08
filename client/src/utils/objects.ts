import rison from "rison";

export const PAGE_SIZE = 5;

export type Filter = {
  col: string;
  opr: string;
  value: string | number;
};

const getParams = (filters?: Filter[], selectColumns?: string[]) => {
  const params = {
    order_column: "changed_on_delta_humanized",
    order_direction: "desc",
    page: 0,
    page_size: PAGE_SIZE,
    filters,
    select_columns: selectColumns,
  };
  if (!filters) delete params.filters;
  if (!selectColumns) delete params.select_columns;
  return rison.encode(params);
};

export const getEditedObjects = (userId: string | number) => {
  const filters = {
    edited: [
      {
        col: "changed_by",
        opr: "rel_o_m",
        value: `${userId}`,
      },
    ],
  };
  const batch = [
    SupersetClient.get({
      endpoint: `/api/v1/dashboard/?q=${getParams(filters.edited)}`,
    }),
    SupersetClient.get({
      endpoint: `/api/v1/chart/?q=${getParams(filters.edited)}`,
    }),
  ];
  return Promise.all(batch)
    .then(([editedCharts, editedDashboards]) => {
      const res = {
        editedDash: editedDashboards.json?.result.slice(0, 3),
        editedChart: editedCharts.json?.result.slice(0, 3),
      };
      return res;
    })
    .catch((err) => err);
};
