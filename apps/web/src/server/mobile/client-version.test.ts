import { describe, expect, test } from "bun:test";
import { CLIENT_HEADER, formatClientHeader } from "@hakgyo/shared/mobile-sync";

import {
  mobileClientVersionFromHeaders,
  recordMobileClientVersionInBackground,
} from "./client-version";

function headers(value: string) {
  return new Headers({ [CLIENT_HEADER]: value });
}

describe("mobileClientVersionFromHeaders", () => {
  test("reads the build a native client announces", () => {
    expect(
      mobileClientVersionFromHeaders(
        headers(
          formatClientHeader({
            protocol: 2,
            runtime: "1.0.0",
            update: "0199f0c8-0000-7000-8000-000000000000",
            platform: "ios",
          }),
        ),
      ),
    ).toEqual({
      platform: "ios",
      protocol: 2,
      runtime: "1.0.0",
      updateId: "0199f0c8-0000-7000-8000-000000000000",
    });
    expect(
      mobileClientVersionFromHeaders(headers("protocol=2;platform=android")),
    ).toEqual({
      platform: "android",
      protocol: 2,
      runtime: null,
      updateId: null,
    });
  });

  test("ignores requests that are not from a known native client", () => {
    expect(mobileClientVersionFromHeaders(null)).toBeNull();
    expect(mobileClientVersionFromHeaders(new Headers())).toBeNull();
    expect(
      mobileClientVersionFromHeaders(headers("protocol=2;runtime=1.0.0")),
    ).toBeNull();
    expect(
      mobileClientVersionFromHeaders(headers("protocol=2;platform=web")),
    ).toBeNull();
    expect(
      mobileClientVersionFromHeaders(headers("protocol=x;platform=ios")),
    ).toBeNull();
  });

  test("caps client-controlled fields", () => {
    const client = mobileClientVersionFromHeaders(
      headers(`protocol=2;platform=ios;runtime=${"9".repeat(500)}`),
    );
    expect(client?.runtime).toHaveLength(64);
  });
});

describe("recordMobileClientVersionInBackground", () => {
  test("writes inline outside a request and never throws", async () => {
    const calls: unknown[] = [];
    const db = {
      $executeRaw: (...args: unknown[]) => {
        calls.push(args);
        return Promise.reject(new Error("database down"));
      },
    } as never;
    const error = console.error;
    console.error = () => undefined;
    try {
      await recordMobileClientVersionInBackground(
        db,
        "user-1",
        headers("protocol=2;platform=android;runtime=1.0.0"),
      );
    } finally {
      console.error = error;
    }
    expect(calls).toHaveLength(1);
  });

  test("skips requests without a native client header", async () => {
    let called = false;
    const db = {
      $executeRaw: () => {
        called = true;
        return Promise.resolve(0);
      },
    } as never;
    await recordMobileClientVersionInBackground(db, "user-1", new Headers());
    expect(called).toBe(false);
  });
});
