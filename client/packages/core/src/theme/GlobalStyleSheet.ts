import { css, Theme } from "@emotion/react";

export const GlobalStyleSheet = ({
  isDark,
  theme,
}: {
  isDark: boolean;
  theme: Theme;
}) => css`
  html {
    color-scheme: ${isDark ? "dark" : "light"};
  }
  html {
    height: 100%;
  }
  body {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: ${theme.colorBgBase};
    color: ${theme.colorText};
    -webkit-font-smoothing: antialiased;
    margin: 0;
    font-family: ${theme.fontFamily};
  }

  a {
    color: ${theme.colorLink};
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  strong,
  th {
    font-weight: ${theme.fontWeightStrong};
  }

  .echarts-tooltip[style*="visibility: hidden"] {
    display: none !important;
  }

  .no-wrap {
    white-space: nowrap;
  }

  .column-config-popover {
    & .ant-input-number {
      width: 100%;
    }
    && .btn-group svg {
      line-height: 0;
      top: 0;
    }
    & .btn-group > .btn {
      padding: 5px 10px 6px;
    }
  }

  #app {
    flex: 1 1 auto;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  [role="button"] {
    cursor: pointer;
  }

  .ant-tag {
    margin-inline-end: ${theme.marginXS}px;
  }

  .ant-color-picker .ant-color-picker-alpha-input {
    display: block;
  }

  .ant-color-picker .ant-color-picker-slider-alpha {
    display: flex;
    margin-top: ${theme.marginXS}px;
  }
  .superset-explore-popover.ant-popover
    .ant-popover-container:has(.ant-popover-title) {
    padding-top: 0;
  }
  .superset-explore-popover.ant-popover .ant-popover-title {
    padding-top: ${theme.paddingXS}px;
    margin-bottom: ${theme.paddingSM}px;
    line-height: 1;
  }
  .superset-explore-popover.ant-popover
    .ant-popover-container:has(.ant-popover-title)
    .ant-tabs-tab {
    padding-top: 0;
  }
`;
