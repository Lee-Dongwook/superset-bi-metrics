import { useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { BiMetricsClient } from "@bi-metrics/core";
import { DeleteModal, ListViewCard } from "@bi-metrics/core/components";
import { styled } from "@bi-metrics/core/theme";
import { t } from "@bi-metrics/core/translation";
import KebabMenuButton, { type MenuItem } from "../../components/KebabMenuButton";
import withToasts from "../../components/Toast/withToast";
import { TableTab } from "../../constants";
import { useListViewResource } from "../../hooks";
import { CardContainer, LoadingCards } from "../../pages/Home/ui";
import type { SavedQueryObject, User } from "../../types";
import {
  createErrorHandler,
  ensureAppRoot,
  getFilterValues,
  navigateTo,
  PAGE_SIZE,
  shortenSQL,
} from "../../utils";
import EmptyState from "./EmptyState";
import SubMenu from "./SubMenu";
import { WelcomeTable } from "./types";

export interface SavedQueriesProps {
  user: User;
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  mine: SavedQueryObject[];
  showThumbnails: boolean;
  featureFlag: boolean;
}

const CardStyles = styled.div`
  cursor: pointer;
  a {
    text-decoration: none;
  }
  .ant-card-cover {
    border-bottom: 1px solid ${({ theme }) => theme.colorBorder};
    & > div {
      height: 171px;
    }
  }
`;

// ponytail: plain <pre> instead of upstream's syntax highlighter; swap in a
// highlighter if colored SQL previews matter.
const QueryPreview = styled.pre`
  ${({ theme }) => `
    height: ${theme.sizeUnit * 40}px;
    margin: 0;
    padding: ${theme.sizeUnit * 2}px;
    overflow: hidden;
    color: ${theme.colorText};
    background: ${theme.colorBgLayout};
    font-size: ${theme.fontSizeSM}px;
    word-break: break-all;
    white-space: pre-wrap;
  `}
`;

const fetchConfig = (tab: TableTab, user: User) => ({
  pageIndex: 0,
  pageSize: PAGE_SIZE,
  sortBy: [{ id: "changed_on_delta_humanized", desc: true }],
  filters: getFilterValues(tab, WelcomeTable.SavedQueries, user),
});

function SavedQueries({
  user,
  addDangerToast,
  addSuccessToast,
  mine,
  showThumbnails,
  featureFlag,
}: SavedQueriesProps) {
  const {
    state: { loading, resourceCollection: queries },
    hasPerm,
    fetchData,
    refreshData,
  } = useListViewResource<SavedQueryObject>(
    "saved_query",
    t("query"),
    addDangerToast,
    true,
    mine,
    [],
    false,
  );
  const [activeTab, setActiveTab] = useState(TableTab.Mine);
  const [queryToDelete, setQueryToDelete] = useState<SavedQueryObject | null>(
    null,
  );
  const navigate = useNavigate();
  const openQuery = (query: SavedQueryObject) =>
    navigate(`/sqllab?savedQueryId=${query.id}`);

  const handleQueryDelete = ({ id, label }: SavedQueryObject) =>
    BiMetricsClient.delete({ endpoint: `/api/v1/saved_query/${id}` }).then(
      () => {
        refreshData(fetchConfig(TableTab.Created, user));
        addSuccessToast(t("Deleted: %s", label));
      },
      createErrorHandler((errMsg) =>
        addDangerToast(t("There was an issue deleting %s: %s", label, errMsg)),
      ),
    );

  const copyQueryLink = (id: number) =>
    navigator.clipboard
      .writeText(
        `${window.location.origin}${ensureAppRoot(`/sqllab?savedQueryId=${id}`)}`,
      )
      .then(
        () => addSuccessToast(t("Link Copied!")),
        () => addDangerToast(t("Sorry, your browser does not support copying.")),
      );

  const menuItems = (query: SavedQueryObject): MenuItem[] => [
    ...(hasPerm("can_edit")
      ? [
          {
            key: "edit",
            label: (
              <Link to={`/sqllab?savedQueryId=${query.id}`}>{t("Edit")}</Link>
            ),
          },
        ]
      : []),
    {
      key: "share-query",
      icon: <UploadOutlined />,
      label: t("Share"),
      onClick: () => copyQueryLink(query.id),
    },
    ...(hasPerm("can_delete")
      ? [
          {
            key: "delete-query",
            label: t("Delete"),
            onClick: () => setQueryToDelete(query),
          },
        ]
      : []),
  ];

  const renderCover = (q: SavedQueryObject) => {
    if (q.sql?.length && showThumbnails && featureFlag) {
      return <QueryPreview>{shortenSQL(q.sql, 25)}</QueryPreview>;
    }
    return showThumbnails && !q.sql?.length ? false : <></>;
  };

  if (loading) return <LoadingCards cover={showThumbnails} />;
  return (
    <>
      {queryToDelete && (
        <DeleteModal
          open
          title={t("Delete Query?")}
          description={t("This action will permanently delete the saved query.")}
          onConfirm={() => {
            handleQueryDelete(queryToDelete);
            setQueryToDelete(null);
          }}
          onHide={() => setQueryToDelete(null)}
        />
      )}
      <SubMenu
        activeChild={activeTab}
        backgroundColor="transparent"
        tabs={[
          {
            name: TableTab.Mine,
            label: t("Mine"),
            onClick: () =>
              fetchData(fetchConfig(TableTab.Mine, user)).then(() =>
                setActiveTab(TableTab.Mine),
              ),
          },
        ]}
        buttons={[
          {
            icon: <PlusOutlined />,
            name: t("SQL Query"),
            buttonStyle: "secondary",
            onClick: () => navigate("/sqllab?new=true"),
          },
          {
            name: t("View All »"),
            buttonStyle: "link",
            onClick: () => navigateTo({ url: "/savedqueryview/list" }),
          },
        ]}
      />
      {queries.length > 0 ? (
        <CardContainer showThumbnails={showThumbnails}>
          {queries.map((q) => (
            <CardStyles
              key={q.id}
              // role="button" because the card contains another button (kebab)
              role="button"
              tabIndex={0}
              aria-label={q.label}
              onClick={() => openQuery(q)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openQuery(q);
                }
              }}
            >
              <ListViewCard
                imgURL=""
                title={q.label}
                description={t("Modified %s", q.changed_on_delta_humanized)}
                cover={renderCover(q)}
                actions={
                  <ListViewCard.Actions
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <KebabMenuButton
                      menuItems={menuItems(q)}
                      dataTest="saved-query-card-menu"
                    />
                  </ListViewCard.Actions>
                }
              />
            </CardStyles>
          ))}
        </CardContainer>
      ) : (
        <EmptyState tableName={WelcomeTable.SavedQueries} tab={activeTab} />
      )}
    </>
  );
}

export default withToasts(SavedQueries);
