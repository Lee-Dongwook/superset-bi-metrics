import { createClient } from "./ClientFactory";

describe("createClient", () => {
  it("builds urls from host, appRoot and endpoint", () => {
    const client = createClient({ host: "example.com/", appRoot: "/bi/" });

    expect(client.getUrl({ endpoint: "/api/v1/chart" })).toBe(
      "https://example.com/bi/api/v1/chart",
    );
    expect(client.getUrl({ endpoint: "/bi/api/v1/chart" })).toBe(
      "https://example.com/bi/api/v1/chart",
    );
    expect(client.getUrl({ url: "http://other/x" })).toBe("http://other/x");
  });

  it("is authenticated only once a csrf token is known", async () => {
    expect(createClient().isAuthenticated()).toBe(false);

    const client = createClient({ csrfToken: "token" });
    expect(client.isAuthenticated()).toBe(true);
    await expect(client.getCSRFToken()).resolves.toBe("token");
  });

  it("rejects requests before a csrf token is available", async () => {
    await expect(createClient().get({ endpoint: "/x" })).rejects.toEqual({
      error: expect.stringContaining("CSRF token"),
    });
  });
});
