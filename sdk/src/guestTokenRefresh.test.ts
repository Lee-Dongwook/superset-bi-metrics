import {
  REFRESH_TIMING_BUFFER_MS,
  getGuestTokenRefreshTiming,
  MIN_REFRESH_WAIT_MS,
  DEFAULT_TOKEN_EXP_MS,
  DEFAULT_TOKEN_REFRESH_RETRY_MS,
} from "./guestTokenRefresh";
import { afterAll, beforeAll, it, expect, describe, vi } from "vitest";

describe("guest token refresh", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2022-03-03 01:00"));
    vi.spyOn(globalThis, "setTimeout");
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  function makeFakeJWT(claims: any) {
    const tokenifiedClaims = Buffer.from(JSON.stringify(claims)).toString(
      "base64",
    );
    return `abc.${tokenifiedClaims}.xyz`;
  }

  it("schedules refresh with an epoch exp", () => {
    const ttl = 1300;
    const exp = Date.now() / 1000 + ttl;
    const fakeToken = makeFakeJWT({ exp });

    const timing = getGuestTokenRefreshTiming(fakeToken);

    expect(timing).toBeGreaterThan(MIN_REFRESH_WAIT_MS);
    expect(timing).toBe(ttl * 1000 - REFRESH_TIMING_BUFFER_MS);
  });

  it("schedules refresh with an epoch exp containing a decimal", () => {
    const ttl = 1300.123;
    const exp = Date.now() / 1000 + ttl;
    const fakeToken = makeFakeJWT({ exp });

    const timing = getGuestTokenRefreshTiming(fakeToken);

    expect(timing).toBeGreaterThan(MIN_REFRESH_WAIT_MS);
    expect(timing).toBe(ttl * 1000 - REFRESH_TIMING_BUFFER_MS);
  });

  it("schedules refresh with iso exp", () => {
    const exp = new Date("2022-03-03 01:09").toISOString();
    const fakeToken = makeFakeJWT({ exp });

    const timing = getGuestTokenRefreshTiming(fakeToken);
    const expectedTiming = 1000 * 60 * 9 - REFRESH_TIMING_BUFFER_MS;

    expect(timing).toBeGreaterThan(MIN_REFRESH_WAIT_MS);
    expect(timing).toBe(expectedTiming);
  });

  it("avoids refresh spam", () => {
    const fakeToken = makeFakeJWT({ exp: Date.now() / 1000 });

    const timing = getGuestTokenRefreshTiming(fakeToken);

    expect(timing).toBe(MIN_REFRESH_WAIT_MS - REFRESH_TIMING_BUFFER_MS);
  });

  it("uses a default when it cannot parse the date", () => {
    const fakeToken = makeFakeJWT({ exp: "invalid date" });

    const timing = getGuestTokenRefreshTiming(fakeToken);

    expect(timing).toBeGreaterThan(MIN_REFRESH_WAIT_MS);
    expect(timing).toBe(DEFAULT_TOKEN_EXP_MS - REFRESH_TIMING_BUFFER_MS);
  });

  it("falls back to default timing for a completely malformed token", () => {
    const timing = getGuestTokenRefreshTiming("not-a-jwt");

    expect(timing).toBe(DEFAULT_TOKEN_EXP_MS - REFRESH_TIMING_BUFFER_MS);
  });

  it("falls back to default timing for an empty string token", () => {
    const timing = getGuestTokenRefreshTiming("");

    expect(timing).toBe(DEFAULT_TOKEN_EXP_MS - REFRESH_TIMING_BUFFER_MS);
  });

  it("falls back to default timing for a token with invalid base64 payload", () => {
    const timing = getGuestTokenRefreshTiming(
      "header.!!!invalid-base64!!!.signature",
    );

    expect(timing).toBe(DEFAULT_TOKEN_EXP_MS - REFRESH_TIMING_BUFFER_MS);
  });

  it("exposes a positive retry delay for failed token refreshes", () => {
    expect(DEFAULT_TOKEN_REFRESH_RETRY_MS).toBe(10000);
    expect(DEFAULT_TOKEN_REFRESH_RETRY_MS).toBeGreaterThan(0);
  });
});
