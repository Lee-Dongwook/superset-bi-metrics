import type { common } from "@bi-metrics/core";

type Listener<T> = (e: T) => unknown;

export interface EventEmitter<T> {
  fire(value: T): void;
  subscribe: common.Event<T>;
}
