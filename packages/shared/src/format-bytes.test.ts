import { expect, test } from "bun:test";

import { downloadedBytes, formatByteSize } from "./format-bytes";

test("formatByteSize uses short Indonesian units", () => {
  expect(formatByteSize(512)).toBe("512 B");
  expect(formatByteSize(850 * 1024)).toBe("850 KB");
  expect(formatByteSize(1.5 * 1024 * 1024)).toBe("1,5 MB");
  expect(formatByteSize(24 * 1024 * 1024)).toBe("24 MB");
});

test("downloadedBytes sums known sizes", () => {
  expect(
    downloadedBytes(
      ["a", "b", "c"],
      new Map([
        ["a", 10],
        ["b", 5],
      ]),
    ),
  ).toBe(15);
});
