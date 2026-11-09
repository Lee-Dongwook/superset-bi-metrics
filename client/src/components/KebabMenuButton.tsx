import { MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps } from "antd";
import { t } from "@bi-metrics/core/translation";

export type MenuItem = NonNullable<MenuProps["items"]>[number];

interface KebabMenuButtonProps {
  menuItems: MenuItem[];
  dataTest?: string;
}

export default function KebabMenuButton({
  menuItems,
  dataTest,
}: KebabMenuButtonProps) {
  if (!menuItems.length) return null;
  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
      <Button
        type="text"
        size="small"
        icon={<MoreOutlined />}
        aria-label={t("More options")}
        data-test={dataTest}
      />
    </Dropdown>
  );
}
