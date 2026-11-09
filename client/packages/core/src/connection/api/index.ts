import callApi from "./call";
import parseResponse from "./parse";
import { CallApi, ClientTimeout, ParseMethod } from "../types";

function rejectAfterTimeout<T>(timeout: number) {
  return new Promise<T>((_, reject) => {
    setTimeout(
      () =>
        // eslint-disable-next-line prefer-promise-reject-errors
        reject({ error: "Request timed out", statusText: "timeout", timeout }),
      timeout,
    );
  });
}

export default async function callApiAndParseWithTimeout<
  T extends ParseMethod = "json",
>({
  timeout,
  parseMethod,
  ...rest
}: { timeout?: ClientTimeout; parseMethod?: T } & CallApi) {
  const apiPromise = callApi(rest);
  const racedPromise =
    typeof timeout === "number" && timeout > 0
      ? Promise.race([apiPromise, rejectAfterTimeout<Response>(timeout)])
      : apiPromise;
  return parseResponse(racedPromise, parseMethod);
}
