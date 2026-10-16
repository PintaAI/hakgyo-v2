import { describe, expect, test } from "bun:test";

import { isPublicAddress, parseRemoteFileUrl } from "./remote-file";

describe("remote file addresses", () => {
  test("allows public unicast addresses", () => {
    for (const address of [
      "8.8.8.8",
      "104.16.0.1",
      "2606:4700::1111",
      "::ffff:8.8.8.8",
    ]) {
      expect({ address, public: isPublicAddress(address) }).toEqual({
        address,
        public: true,
      });
    }
  });

  test("blocks private, loopback, link-local, reserved and embedded addresses", () => {
    for (const address of [
      "0.0.0.0",
      "10.1.2.3",
      "100.64.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "198.18.0.1",
      "224.0.0.1",
      "255.255.255.255",
      "::",
      "::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "::127.0.0.1",
      "64:ff9b::a00:1",
      "2002:a00:1::",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "ff02::1",
      "not-an-ip",
    ]) {
      expect({ address, public: isPublicAddress(address) }).toEqual({
        address,
        public: false,
      });
    }
  });

  test("accepts only public https URLs without credentials or custom ports", () => {
    expect(parseRemoteFileUrl("https://example.com/a.png").hostname).toBe(
      "example.com",
    );
    for (const url of [
      "http://example.com/a.png",
      "ftp://example.com/a.png",
      "https://user:pass@example.com/a.png",
      "https://example.com:8443/a.png",
      "https://127.0.0.1/a.png",
      "https://[::1]/a.png",
      "https://169.254.169.254/latest/meta-data",
      "not a url",
    ]) {
      expect(() => parseRemoteFileUrl(url)).toThrow();
    }
  });
});
