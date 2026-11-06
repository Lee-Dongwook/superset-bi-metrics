import { BiMetricsTheme } from "../../theme";
import { Card as AntdCard } from "antd";
import type { CardProps as AntdCardProps } from "antd/es/card";

interface CardProps extends AntdCardProps {
  padded?: boolean;
}

const CustomCard = ({ padded, ...props }: CardProps) => (
  <AntdCard
    {...props}
    css={(theme: BiMetricsTheme) => ({
      ".ant-card-body": {
        padding: padded ? theme.sizeUnit * 4 : theme.sizeUnit,
      },
    })}
  />
);

export const Card = Object.assign(CustomCard, {
  Meta: AntdCard.Meta,
});
