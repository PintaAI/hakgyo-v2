import { afterEach, describe, expect, test } from "bun:test";

import {
  cachedAssetUrl,
  preloadAssessmentMedia,
} from "./assessment-media-cache";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

// Without `window.caches` (as here) downloads are kept in memory for the page.
describe("preloadAssessmentMedia", () => {
  test("downloads each asset once and serves the local copy", async () => {
    const fetched: string[] = [];
    globalThis.fetch = (async (url: string) => {
      fetched.push(url);
      return new Response(new Blob(["media"], { type: "audio/mpeg" }));
    }) as unknown as typeof fetch;
    const updates: number[] = [];

    const result = await preloadAssessmentMedia(
      ["audio-a", "image-a", "audio-a"],
      async (assetId) => `https://r2.test/${assetId}?signed`,
      (progress) => updates.push(progress.ready),
    );

    expect(result).toEqual({ total: 2, ready: 2, failed: [] });
    expect(updates.at(-1)).toBe(2);
    expect(fetched.sort()).toEqual([
      "https://r2.test/audio-a?signed",
      "https://r2.test/image-a?signed",
    ]);
    expect(await cachedAssetUrl("audio-a")).toStartWith("blob:");
    expect(await cachedAssetUrl("unknown")).toBeNull();

    // Already downloaded: nothing is fetched again.
    await preloadAssessmentMedia(["audio-a"], async () => "unused");
    expect(fetched).toHaveLength(2);
  });

  test("lookups during a running download wait for the local copy", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    globalThis.fetch = (async () => {
      await gate;
      return new Response(new Blob(["audio"], { type: "audio/mpeg" }));
    }) as unknown as typeof fetch;

    const preload = preloadAssessmentMedia(
      ["slow-audio"],
      async () => "https://r2.test/slow-audio",
    );
    // A media block resolving its URL right after the preload started.
    const lookup = cachedAssetUrl("slow-audio");
    release();

    expect(await lookup).toStartWith("blob:");
    expect((await preload).ready).toBe(1);
  });

  test("reports assets that keep failing instead of throwing", async () => {
    globalThis.fetch = (async () =>
      new Response("nope", { status: 403 })) as unknown as typeof fetch;

    const result = await preloadAssessmentMedia(
      ["broken"],
      async () => "https://r2.test/broken",
    );

    expect(result).toEqual({ total: 1, ready: 0, failed: ["broken"] });
  }, 10_000);
});
