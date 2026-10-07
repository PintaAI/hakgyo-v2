import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request, type RequestOptions } from "node:https";
import { isIP, type LookupFunction } from "node:net";

const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 20_000;

export class RemoteFileError extends Error {}

type Cidr = { bits: number; network: bigint; prefix: number };

function ipv4ToBigInt(address: string) {
  return address
    .split(".")
    .reduce((value, part) => (value << 8n) | BigInt(Number(part)), 0n);
}

function ipv6ToBigInt(address: string) {
  let normalized = address.toLowerCase().split("%")[0]!;
  const ipv4Tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(normalized)?.[1];
  if (ipv4Tail) {
    const value = ipv4ToBigInt(ipv4Tail);
    normalized = normalized.replace(
      ipv4Tail,
      `${(value >> 16n).toString(16)}:${(value & 0xffffn).toString(16)}`,
    );
  }
  const [head = "", tail] = normalized.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? headGroups
      : [
          ...headGroups,
          ...Array<string>(8 - headGroups.length - tailGroups.length).fill("0"),
          ...tailGroups,
        ];
  return groups.reduce(
    (value, group) => (value << 16n) | BigInt(parseInt(group, 16)),
    0n,
  );
}

function cidr(range: string): Cidr {
  const [address = "", prefix = ""] = range.split("/");
  const bits = isIP(address) === 4 ? 32 : 128;
  return {
    bits,
    network: bits === 32 ? ipv4ToBigInt(address) : ipv6ToBigInt(address),
    prefix: Number(prefix),
  };
}

// Loopback, private, link-local, shared, documentation, benchmark, multicast
// and reserved space, plus IPv6 transition ranges that can embed them.
const blockedRanges = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.88.99.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/3",
  "::/128",
  "::1/128",
  "64:ff9b::/96",
  "64:ff9b:1::/48",
  "100::/64",
  "2001::/32",
  "2001:db8::/32",
  "2002::/16",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
].map(cidr);

function inRange(value: bigint, bits: number, range: Cidr) {
  if (range.bits !== bits) return false;
  const shift = BigInt(bits - range.prefix);
  return value >> shift === range.network >> shift;
}

/** Whether an IP address may be fetched: public unicast only. */
export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 0) return false;
  if (family === 4) {
    const value = ipv4ToBigInt(address);
    return !blockedRanges.some((range) => inRange(value, 32, range));
  }
  const value = ipv6ToBigInt(address);
  // IPv4-mapped (::ffff:0:0/96) and IPv4-compatible (::/96) addresses.
  if (value >> 32n === 0xffffn || value >> 32n === 0n) {
    return isPublicAddress(
      [24n, 16n, 8n, 0n].map((shift) => (value >> shift) & 0xffn).join("."),
    );
  }
  return !blockedRanges.some((range) => inRange(value, 128, range));
}

/** Parses a URL the server may fetch: https on the default port, no credentials. */
export function parseRemoteFileUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RemoteFileError("The file URL is not valid");
  }
  if (url.protocol !== "https:") {
    throw new RemoteFileError("The file URL must use https");
  }
  if (url.username || url.password || (url.port && url.port !== "443")) {
    throw new RemoteFileError(
      "The file URL must not contain credentials or a custom port",
    );
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicAddress(host)) {
    throw new RemoteFileError("The file URL must point to a public address");
  }
  return url;
}

/**
 * Resolves like the default lookup but fails the connection when any address
 * is not public, so the checked address is the one the socket connects to.
 */
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const results = addresses;
    if (!results.length || results.some((a) => !isPublicAddress(a.address))) {
      return callback(
        new RemoteFileError("The file URL must point to a public address"),
        "",
        0,
      );
    }
    if (options.all) {
      return (callback as unknown as (e: null, a: LookupAddress[]) => void)(
        null,
        results,
      );
    }
    callback(null, results[0]!.address, results[0]!.family);
  });
};

type RemoteResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Uint8Array;
};

function get(url: URL, maxBytes: number, signal: AbortSignal) {
  const options: RequestOptions = {
    method: "GET",
    headers: {
      accept: "image/*, audio/*;q=0.9, */*;q=0.1",
      "user-agent": "HakgyoFileImport/1.0",
    },
    lookup: publicOnlyLookup,
    signal,
  };
  return new Promise<RemoteResponse>((resolve, reject) => {
    const req = request(url, options, (response) => {
      const status = response.statusCode ?? 0;
      if (status !== 200) {
        response.resume();
        resolve({ status, headers: response.headers, body: new Uint8Array() });
        return;
      }
      const declared = Number(response.headers["content-length"]);
      if (Number.isFinite(declared) && declared > maxBytes) {
        response.destroy();
        reject(new RemoteFileError("The file is too large"));
        return;
      }
      const chunks: Buffer[] = [];
      let received = 0;
      response.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > maxBytes) {
          response.destroy();
          reject(new RemoteFileError("The file is too large"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () =>
        resolve({
          status,
          headers: response.headers,
          body: new Uint8Array(Buffer.concat(chunks)),
        }),
      );
      response.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Downloads a public https file of at most `maxBytes`, following up to three
 * redirects. Every hop is re-validated and only public addresses are dialed.
 */
export async function fetchRemoteFile(value: string, maxBytes: number) {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let url = parseRemoteFileUrl(value);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: RemoteResponse;
    try {
      response = await get(url, maxBytes, signal);
    } catch (error) {
      if (error instanceof RemoteFileError) throw error;
      throw new RemoteFileError(
        signal.aborted
          ? "Downloading the file timed out"
          : "The file could not be downloaded",
      );
    }
    const location = response.headers.location;
    if (
      [301, 302, 303, 307, 308].includes(response.status) &&
      typeof location === "string"
    ) {
      url = parseRemoteFileUrl(new URL(location, url).toString());
      continue;
    }
    if (response.status !== 200) {
      throw new RemoteFileError(
        `The file URL responded with HTTP ${response.status}`,
      );
    }
    const contentType = response.headers["content-type"];
    return {
      url,
      body: response.body,
      contentType:
        typeof contentType === "string"
          ? contentType.split(";")[0]!.trim().toLowerCase()
          : null,
    };
  }
  throw new RemoteFileError("The file URL redirected too many times");
}
