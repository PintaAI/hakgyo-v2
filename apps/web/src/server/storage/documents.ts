/** Organization files live under the uploader's prefix as `<uuid>-<size><ext>`. */
export const getDocumentPrefix = (userId: string) =>
  `documents/${encodeURIComponent(userId)}/`;

export function createDocumentKey(
  userId: string,
  size: number,
  extension: string,
) {
  return `${getDocumentPrefix(userId)}${crypto.randomUUID()}-${size}${extension}`;
}
