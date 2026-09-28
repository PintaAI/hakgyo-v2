import { getUrlPathname } from "~/lib/url";

/**
 * Keys for images the app uploads to R2 itself (profile images, organization
 * logos, landing images, course thumbnails). A key is `<prefix><uuid>-<size>.<ext>`
 * so the signed size and content type can be recovered from the key alone.
 */

const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type ManagedImageContentType = keyof typeof extensions;

const contentTypesByExtension = Object.fromEntries(
  Object.entries(extensions).map(([contentType, extension]) => [
    extension,
    contentType,
  ]),
) as Record<string, ManagedImageContentType>;

const fileNamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(\d+)\.([a-z]+)$/;

export function getPublicR2Url(key: string) {
  const base =
    process.env.CLOUDFLARE_R2_PUBLIC_URL ??
    "https://pub-3fd0ad0a99684361b69ca3270ed168c8.r2.dev";
  return `${base.replace(/\/$/, "")}/${key}`;
}

export function defineManagedImage<T extends ManagedImageContentType>(options: {
  contentTypes: readonly T[];
  maxSize: number;
}) {
  const allowed = new Set<ManagedImageContentType>(options.contentTypes);

  function parseKey(key: string, prefix: string) {
    if (!key.startsWith(prefix)) return null;

    const fileName = key.slice(prefix.length);
    const match = fileNamePattern.exec(fileName);
    const size = Number(match?.[1]);
    const contentType = match?.[2]
      ? contentTypesByExtension[match[2]]
      : undefined;
    if (
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > options.maxSize ||
      !contentType ||
      !allowed.has(contentType)
    ) {
      return null;
    }

    return { contentType: contentType as T, fileName, size };
  }

  return {
    createKey(
      prefix: string,
      fileSize: number,
      contentType: T,
      objectId: string = crypto.randomUUID(),
    ) {
      return `${prefix}${objectId}-${fileSize}.${extensions[contentType]}`;
    },

    parseKey,

    /** The R2 key behind `url` if it is an image this app uploaded under `prefix`. */
    getManagedKey(url: string | null | undefined, prefix: string) {
      if (!url) return null;
      const pathname = getUrlPathname(url);
      if (!pathname?.startsWith(`/${prefix}`)) return null;

      const key = pathname.slice(1);
      return parseKey(key, prefix) ? key : null;
    },
  };
}
