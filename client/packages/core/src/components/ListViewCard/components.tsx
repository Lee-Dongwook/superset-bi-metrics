import { Skeleton } from "antd";
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

export const ActionsWrapper = styled.div`
  width: 64px;
  display: flex;
  justify-content: flex-end;
`;

export const Cover = styled.div`
  height: 264px;
  border-bottom: 1px solid ${({ theme }) => theme.colorSplit};
  overflow: hidden;

  .cover-footer {
    transform: translateY(${({ theme }) => theme.sizeUnit * 9}px);
    transition: ${({ theme }) => theme.motionDurationMid} ease-out;
  }
`;

export const TitleContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  flex-direction: column;

  .card-actions {
    margin-left: auto;
    align-self: flex-end;
    padding-left: ${({ theme }) => theme.sizeUnit}px;
    span[role="img"] {
      display: flex;
      align-items: center;
    }
  }

  .titleRow {
    display: flex;
    justify-content: flex-start;
    flex-direction: row;
  }
`;

export const TitleLink = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  & a {
    color: ${({ theme }) => theme.colorText} !important;
  }
`;

export const TitleRight = styled.span`
  ${({ theme }) => `
    position: absolute;
    font-weight: 400;
    bottom: ${theme.sizeUnit * 3}px;
    right: ${theme.sizeUnit * 2}px;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}
`;

export const CoverFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  row-gap: ${({ theme }) => theme.sizeUnit}px;
  position: relative;
  top: -${({ theme }) => theme.sizeUnit * 9}px;
  padding: 0 8px;
`;

export const CoverFooterLeft = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

export const CoverFooterRight = styled.div`
  align-self: flex-end;
  margin-left: auto;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ThinSkeleton = styled(Skeleton)`
  h3 {
    margin: ${({ theme }) => theme.sizeUnit}px 0;
  }

  ul {
    margin-bottom: 0;
  }
`;
