import { Card as AntdCard } from "antd";
import type { CardProps as AntdCardProps } from "antd/es/card";
import { createStyles } from "antd-style";

export interface CardProps extends AntdCardProps {
  padded?: boolean;
}

const useStyles = createStyles(({ token }, padded?: boolean) => ({
  card: {
    ".ant-card-body": {
      padding: padded ? token.sizeUnit * 4 : token.sizeUnit,
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
