import { styled } from "@bi-metrics/core/theme";
import { mq, loadingCardCount } from "../../../utils";
import { isMobileConsumptionEnabled } from "../../../hooks";

interface LoadingProps {
  cover?: boolean;
}

export const WelcomeContainer = styled.div`
  background: ${({ theme }) => theme.colorBgLayout};
  .ant-row.menu {
    margin-top: -15px;

    &:after {
      content: "";
      display: block;
      margin: 0px ${({ theme }) => theme.sizeUnit * 6}px;
      position: relative;
      width: 100%;

      ${mq[1]} {
        margin-top: 5px;
        margin: 0px 2px;
      }
    }

    button {
      padding: 3px 21px;
    }
  }

  .ant-card-meta-description {
    marign-top: ${({ theme }) => theme.sizeUnit}px;
  }

  .ant-card.ant-card-bordered {
    border: 1px solid ${({ theme }) => theme.colorBorder};
  }

  .loading-cards {
    margin-top: ${({ theme }) => theme.sizeUnit * 8}px;

    .ant-card-cover > div {
      height: 168px;
    }
  }
`;

export const WelcomeNav = styled.div`
  ${({ theme }) => `
    .switch {
      display: flex;
      flex-direction: row;
      margin: ${theme.sizeUnit * 4}px;
      span {
        display: block;
        margin: ${theme.sizeUnit}px;
        line-height: ${theme.sizeUnit * 3.5}px;
      }
    }
  `}
`;

export const CardContainer = styled.div<{
  showThumbnails?: boolean | undefined;
}>`
  ${({ showThumbnails, theme }) => `
    overflow: hidden;
    display: grid;
    justify-content: start;
    grid-gap: ${theme.sizeUnit * 12}px ${theme.sizeUnit * 4}px;
    grid-template-columns: repeat(auto-fit, 300px);
    max-height: ${showThumbnails ? "314" : "148"}px;
    margin-top: ${theme.sizeUnit * -6}px;
    padding: ${
      showThumbnails
        ? `${theme.sizeUnit * 8 + 3}px ${theme.sizeUnit * 20}px`
        : `${theme.sizeUnit * 8 + 1}px ${theme.sizeUnit * 20}px`
    };

    /* Full-width cards on mobile (consumption mode) */
    ${
      isMobileConsumptionEnabled()
        ? `@media (max-width: ${theme.screenSMMax}px) {
      grid-template-columns: 1fr;
      padding-left: ${theme.sizeUnit * 4}px;
      padding-right: ${theme.sizeUnit * 4}px;
    }`
        : ""
    }
  `}
`;

export const LoadingCards = ({ cover }: LoadingProps) => (
  <CardContainer showThumbnails={cover} className="loading-cards">
    {Array.from({ length: loadingCardCount }, (_, index) => (
      <ListViewCard
        key={index}
        cover={cover ? false : <></>}
        description=""
        loading
      />
    ))}
  </CardContainer>
);
