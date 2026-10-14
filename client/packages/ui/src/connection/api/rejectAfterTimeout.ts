export default function rejectAfterTimeout<T>(timeout: number) {
  return new Promise<T>((resolve, reject) => {
    setTimeout(
      () =>
        reject({
          error: "Request timed out",
          statusText: "timeout",
          timeout,
        }),
      timeout,
    );
  });
}
