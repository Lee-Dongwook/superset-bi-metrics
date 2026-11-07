import { Card as AntdCard } from "antd";
import type { CardProps as AntdCardProps } from "antd/es/card";
import { createStyles } from "antd-style";
import type { BiMetricsTheme } from "../../theme";

interface CardProps extends AntdCardProps {
  padded?: boolean;
}

const useStyles = createStyles(({ theme }, padded?: boolean) => ({
  card: {
    ".ant-card-body": {
      padding: padded ? theme.sizeUnit * 4 : theme.sizeUnit,
    },
  },
}));

const CustomCard = ({ padded, className, ...props }: CardProps) => {
  const { styles, cx } = useStyles(padded);

  return <AntdCard className={cx(styles.card, className)} {...props} />;
};

export const Card = Object.assign(CustomCard, {
  Meta: AntdCard.Meta,
});
