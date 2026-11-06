import { styled } from "../../theme";
import { Card } from "../Card";

export const StyledCard = styled(Card)`
  ${({ theme }) => `
    overflow: hidden;

    .gradient-container {
      position: relative;
      height: 100%;
    }
    &:hover {
      box-shadow: ${theme.boxShadow};
      transition: box-shadow ${theme.motionDurationSlow} ease-in-out;

      .cover-footer {
        transform: translateY(0);
      }
    }
  `}
`;
