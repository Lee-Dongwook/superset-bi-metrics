import useEventCallback from "use-event-callback";

type Func<ARGS extends any[], R> = (...args: ARGS) => R;

export default function useEffectEvent<A extends any[], R>(
  fn: Func<A, R>,
): Func<A, R> {
  return useEventCallback(fn);
}
