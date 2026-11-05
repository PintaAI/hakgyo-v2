import { describe, expect, test } from "bun:test";

import {
  type Fingerprint,
  nativeDifferences,
  stripBunStoreHashes,
} from "./native-fingerprint";

const OLD_IMAGE =
  "../../node_modules/.bun/expo-image@57.0.5+e580465744f14a6c/node_modules/expo-image/ios";
const NEW_IMAGE =
  "../../node_modules/.bun/expo-image@57.0.5+ef67d21525dac52a/node_modules/expo-image/ios";

function fingerprint(
  imageDir: string,
  overrides: Partial<Record<string, string>> = {},
): Fingerprint {
  return {
    hash: imageDir,
    sources: [
      { type: "dir", filePath: imageDir, hash: overrides.dirHash ?? "aaa" },
      {
        type: "contents",
        id: "expoAutolinkingConfig:ios",
        contents:
          overrides.autolinking ??
          JSON.stringify({
            modules: [{ packageName: "expo-image", podspecDir: imageDir }],
          }),
      },
      {
        type: "contents",
        id: "expoConfig",
        contents: overrides.config ?? '{"name":"Hakgyo"}',
      },
    ],
  };
}

describe("stripBunStoreHashes", () => {
  test("drops the peer hash and keeps name and version", () => {
    expect(stripBunStoreHashes(NEW_IMAGE)).toBe(
      "../../node_modules/.bun/expo-image@57.0.5/node_modules/expo-image/ios",
    );
    expect(
      stripBunStoreHashes(
        "node_modules/.bun/@expo+ui@57.0.25+ef67d21525dac52a/node_modules/@expo/ui",
      ),
    ).toBe("node_modules/.bun/@expo+ui@57.0.25/node_modules/@expo/ui");
  });
});

describe("nativeDifferences", () => {
  test("ignores moved bun store folders", () => {
    expect(
      nativeDifferences(fingerprint(OLD_IMAGE), fingerprint(NEW_IMAGE)),
    ).toEqual([]);
  });

  test("reports a module version change", () => {
    const upgraded = NEW_IMAGE.replace("57.0.5", "57.0.6");
    expect(
      nativeDifferences(fingerprint(OLD_IMAGE), fingerprint(upgraded)),
    ).toEqual([
      "contents:expoAutolinkingConfig:ios",
      "dir:../../node_modules/.bun/expo-image@57.0.5/node_modules/expo-image/ios",
      "dir:../../node_modules/.bun/expo-image@57.0.6/node_modules/expo-image/ios",
    ]);
  });

  test("reports changed native sources and config", () => {
    expect(
      nativeDifferences(
        fingerprint(OLD_IMAGE),
        fingerprint(NEW_IMAGE, {
          dirHash: "bbb",
          config: '{"name":"Hakgyo 2"}',
        }),
      ),
    ).toEqual([
      "contents:expoConfig",
      "dir:../../node_modules/.bun/expo-image@57.0.5/node_modules/expo-image/ios",
    ]);
  });
});
