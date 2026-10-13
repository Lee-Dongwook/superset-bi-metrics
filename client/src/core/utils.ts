import type { common } from "@bi-metrics/core";

export interface EventEmitter<T> {
  fire(value: T): void;
  subscribe: common.Event<T>;
}
