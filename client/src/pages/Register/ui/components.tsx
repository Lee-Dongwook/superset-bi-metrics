import { styled, css } from "@bi-metrics/core";
import { Card } from "@bi-metrics/core/components";

export const StyledCard = styled(Card)`
  ${({ theme }) => css`
    width: 50%;
    margin-top: ${theme.marginXL}px;
    background: ${theme.colorBgBase};
    .ant-form-item-label label {
      color: ${theme.colorPrimary};
    }
  `}
`;

export const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 6 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 24 },
  },
};
