import {
  BinaryOperator,
  SetOperator,
  UnaryOperator,
} from "@bi-metrics/ui/chart/types/Operator";
import { TimeGranularity } from "@bi-metrics/ui/formats";

interface BaseAdhocFilter {
  clause: "WHERE" | "HAVING";
  timeGrain?: TimeGranularity;
  isExtra?: boolean;
}

interface BaseSimpleAdhocFilter extends BaseAdhocFilter {
  expressionType: "SIMPLE";
  subject: string;
}

export type UnaryAdhocFilter = BaseSimpleAdhocFilter & {
  operator: UnaryOperator;
};

export type BinaryAdhocFilter = BaseSimpleAdhocFilter & {
  operator: BinaryOperator;
  comparator: string;
};

export type SetAdhocFilter = BaseSimpleAdhocFilter & {
  operator: SetOperator;
  comparator: string[];
};

export type SimpleAdhocFilter =
  | UnaryAdhocFilter
  | BinaryAdhocFilter
  | SetAdhocFilter;

export interface FreeFormAdhocFilter extends BaseAdhocFilter {
  expressionType: "SQL";
  sqlExpression: string;
}

export type AdhocFilter = SimpleAdhocFilter | FreeFormAdhocFilter;
