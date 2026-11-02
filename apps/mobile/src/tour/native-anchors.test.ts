import { describe, expect, mock, test } from "bun:test";

const platform = { OS: "ios", Version: "26.0" };
mock.module("react-native", () => ({ Platform: platform }));

const window = { width: 390, height: 844 };
const insets = { top: 47, bottom: 34 };

async function load(os: "ios" | "android", version: string) {
  platform.OS = os;
  platform.Version = version;
  // Fresh module per platform: it reads Platform once at load.
  return import(`./native-anchors?${os}-${version}`) as Promise<
    typeof import("./native-anchors")
  >;
}

describe("nativeAnchorRect", () => {
  test("lines the header buttons up with the measured organization switcher", async () => {
    const { nativeAnchorRect } = await load("ios", "26.0");
    const organization = { x: 76, y: 51, width: 120, height: 36 };
    const layout = { window, insets, organization };

    const sidebar = nativeAnchorRect("native:sidebar", layout);
    // Right before the switcher, vertically centered on it.
    expect(sidebar.x + sidebar.width).toBe(organization.x - 8);
    expect(sidebar.y + sidebar.height / 2).toBe(69);

    const settings = nativeAnchorRect("native:settings", layout);
    expect(settings.x + settings.width).toBe(window.width - 16);
    expect(settings.y).toBe(sidebar.y);
  });

  test("falls back to the navigation bar without a switcher on screen", async () => {
    const { nativeAnchorRect } = await load("ios", "26.0");
    const sidebar = nativeAnchorRect("native:sidebar", {
      window,
      insets,
      organization: null,
    });
    expect(sidebar.x).toBe(16);
    expect(sidebar.y + sidebar.height / 2).toBe(insets.top + 22);
  });

  test("splits the iOS 26 capsule into three tabs and detaches search", async () => {
    const { nativeAnchorRect } = await load("ios", "26.0");
    const layout = { window, insets, organization: null };
    const learn = nativeAnchorRect("native:tab:learn", layout);
    const practice = nativeAnchorRect("native:tab:assessments", layout);
    const search = nativeAnchorRect("native:tab:search", layout);

    expect(practice.x).toBeCloseTo(learn.x + learn.width);
    expect(search.x + search.width).toBe(window.width - 16);
    expect(search.width).toBe(search.height);
    // Above the home indicator, inside the screen.
    expect(search.y + search.height).toBeLessThanOrEqual(window.height);
    expect(search.y).toBeGreaterThan(window.height - 120);
  });

  test("spreads four equal tabs on the classic bar and on Android", async () => {
    for (const [os, version, height] of [
      ["ios", "18.5", 49],
      ["android", "35", 80],
    ] as const) {
      const { nativeAnchorRect } = await load(os, version);
      const layout = { window, insets, organization: null };
      const search = nativeAnchorRect("native:tab:search", layout);
      expect(search.width).toBeCloseTo(window.width / 4);
      expect(search.x).toBeCloseTo((window.width / 4) * 3);
      expect(search.height).toBe(height);
      expect(search.y).toBe(window.height - insets.bottom - height);
    }
  });
});
