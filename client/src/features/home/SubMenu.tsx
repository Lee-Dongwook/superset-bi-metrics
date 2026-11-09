import { useEffect, useState, type ReactNode } from "react";
import { Link, useInRouterContext } from "react-router-dom";
import { Button, Menu, Row, Typography, type ButtonProps as AntdButtonProps } from "antd";
import { debounce } from "lodash-es";
import { styled, css, useTheme } from "@bi-metrics/core/theme";
import { t } from "@bi-metrics/core/translation";
import { isMobileConsumptionEnabled } from "../../hooks";

const StyledHeader = styled.div<{ backgroundColor?: string }>`
  background-color: ${({ theme, backgroundColor }) =>
    backgroundColor || theme.colorBgContainer};
  align-items: center;
  position: relative;
  padding: ${({ theme }) => theme.sizeUnit * 2}px
    ${({ theme }) => theme.sizeUnit * 4}px;
  margin-bottom: ${({ theme }) => theme.sizeUnit * 4}px;
  .header {
    font-weight: ${({ theme }) => theme.fontWeightStrong};
    margin-right: ${({ theme }) => theme.sizeUnit * 3}px;
    text-align: left;
    font-size: 18px;
    display: inline-block;
    line-height: ${({ theme }) => theme.sizeUnit * 9}px;
  }
  .nav-right {
    display: flex;
    align-items: center;
    float: right;
    position: absolute;
    right: ${({ theme }) => theme.sizeUnit * 4}px;
    ul.ant-menu-root {
      padding: 0px;
    }
    .ant-row {
      align-items: center;
    }
  }
  .nav-right-collapse {
    display: flex;
    align-items: center;
    padding: 14px 0;
    margin-right: 0;
    float: left;
    padding-left: 10px;
  }
  .menu {
    align-items: center;
  }

  .menu > .ant-menu {
    padding-left: ${({ theme }) => theme.sizeUnit * 5}px;
    line-height: ${({ theme }) => theme.sizeUnit * 5}px;
    background: transparent;
    border-bottom: none;

    .ant-menu-item {
      border-radius: ${({ theme }) => theme.borderRadius}px;
      font-size: ${({ theme }) => theme.fontSizeSM}px;
      padding: ${({ theme }) => theme.sizeUnit}px
        ${({ theme }) => theme.sizeUnit * 4}px;
      margin-right: ${({ theme }) => theme.sizeUnit}px;
    }
    .ant-menu-item:hover,
    .ant-menu-item:has(> span > .active) {
      background-color: ${({ theme }) => theme.colorPrimaryBgHover};
      color: ${({ theme }) => theme.colorText};
    }
  }

  .btn-link {
    padding: 10px 0;
  }
  ${({ theme }) =>
    isMobileConsumptionEnabled()
      ? css`
          @media (max-width: ${theme.screenSMMax}px) {
            .header {
              position: relative;
              margin-left: 0;
              flex: 1;
              text-align: center;
            }
            .nav-right,
            .nav-right-collapse {
              display: none !important;
            }
            .menu > .ant-menu {
              padding-left: 0;
              .ant-menu-item {
                padding: ${theme.sizeUnit}px ${theme.sizeUnit * 2}px;
                margin-right: ${theme.sizeUnit / 2}px;
              }
            }
          }
        `
      : css`
          @media (max-width: ${theme.screenSMMax}px) {
            .header,
            .nav-right {
              position: relative;
              margin-left: ${theme.sizeUnit * 2}px;
            }
          }
        `}
`;

type MenuChild = {
  label: string;
  name: string;
  url?: string;
  usesRouter?: boolean;
  onClick?: () => void;
  "data-test"?: string;
  id?: string;
  "aria-controls"?: string;
};

export interface ButtonProps {
  name: ReactNode;
  onClick?: AntdButtonProps["onClick"];
  "data-test"?: string;
  buttonStyle: "primary" | "secondary" | "dashed" | "link" | "tertiary";
  loading?: boolean;
  icon?: ReactNode;
  component?: ReactNode;
}

const BUTTON_TYPE: Record<ButtonProps["buttonStyle"], AntdButtonProps["type"]> =
  {
    primary: "primary",
    secondary: "default",
    dashed: "dashed",
    link: "link",
    tertiary: "text",
  };

export interface SubMenuProps {
  buttons?: Array<ButtonProps>;
  name?: string | ReactNode;
  tabs?: MenuChild[];
  activeChild?: MenuChild["name"];
  /** Use react-router <Link> for tabs that set `usesRouter`. */
  usesRouter?: boolean;
  backgroundColor?: string;
  children?: ReactNode;
}

// ponytail: upstream's dropDownLinks (upload/connect menus) skipped; add with
// the list pages that use them.
export default function SubMenu(props: SubMenuProps) {
  const [menuMode, setMenuMode] = useState<"horizontal" | "inline">(
    "horizontal",
  );
  const [navRightStyle, setNavRightStyle] = useState("nav-right");
  const theme = useTheme();
  const inRouter = useInRouterContext();

  useEffect(() => {
    function handleResize() {
      setMenuMode(
        !isMobileConsumptionEnabled() && window.innerWidth <= theme.screenSMMax
          ? "inline"
          : "horizontal",
      );
      if (props.buttons && props.buttons.length >= 3) {
        setNavRightStyle(
          window.innerWidth >= 795 ? "nav-right" : "nav-right-collapse",
        );
      }
    }
    handleResize();
    const resize = debounce(handleResize, 10);
    window.addEventListener("resize", resize);
    return () => {
      resize.cancel();
      window.removeEventListener("resize", resize);
    };
  }, [props.buttons, theme.screenSMMax]);

  return (
    <StyledHeader backgroundColor={props.backgroundColor}>
      <nav aria-label={t("Page navigation")}>
        <Row className="menu">
          {props.name && <div className="header">{props.name}</div>}
          <Menu
            mode={menuMode}
            disabledOverflow
            role="tablist"
            items={props.tabs?.map((tab) => {
              const active = tab.name === props.activeChild;
              if ((props.usesRouter || inRouter) && tab.usesRouter) {
                return {
                  key: tab.label,
                  label: (
                    <Link
                      to={tab.url || ""}
                      role="tab"
                      id={tab.id || tab.name}
                      data-test={tab["data-test"]}
                      aria-selected={active}
                      aria-controls={tab["aria-controls"] || ""}
                      className={active ? "active" : ""}
                    >
                      {tab.label}
                    </Link>
                  ),
                };
              }
              return {
                key: tab.label,
                label: (
                  <div
                    className={active ? "no-router active" : "no-router"}
                    role="tab"
                    aria-selected={active}
                  >
                    <Typography.Link href={tab.url} onClick={tab.onClick}>
                      {tab.label}
                    </Typography.Link>
                  </div>
                ),
              };
            })}
          />
          <div className={navRightStyle}>
            {props.buttons?.map((btn, i) =>
              btn.component ? (
                <span key={i}>{btn.component}</span>
              ) : (
                <Button
                  key={i}
                  type={BUTTON_TYPE[btn.buttonStyle]}
                  icon={btn.icon}
                  onClick={btn.onClick}
                  data-test={btn["data-test"]}
                  loading={btn.loading ?? false}
                >
                  {btn.name}
                </Button>
              ),
            )}
          </div>
        </Row>
      </nav>
      {props.children}
    </StyledHeader>
  );
}
