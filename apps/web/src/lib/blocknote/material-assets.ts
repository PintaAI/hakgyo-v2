import {
  assetAudioBlockType,
  assetImageBlockType,
  conversationBlockType,
  cultureBlockType,
  lessonPageBlockType,
} from "./block-catalog";
import { getCultureAssetIds } from "./culture-content";

/** Built-in media blocks point at a stored file with `hakgyo-asset:<assetId>`. */
export const assetUrlPrefix = "hakgyo-asset:";

const assetIdBlockTypes = new Set<string>([
  assetAudioBlockType,
  assetImageBlockType,
  conversationBlockType,
  lessonPageBlockType,
]);
const assetUrlBlockTypes = new Set(["audio", "file", "image", "video"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getAssetIdFromUrl(url: unknown) {
  return typeof url === "string" && url.startsWith(assetUrlPrefix)
    ? url.slice(assetUrlPrefix.length) || null
    : null;
}

/**
 * The stored files a BlockNote document shows: custom block asset props,
 * culture section images and `hakgyo-asset:` URLs on built-in media blocks.
 * PDF page images are linked separately by the pdfPages block sync.
 */
export function collectMaterialAssetIds(document: unknown) {
  const assetIds = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value) assetIds.add(value);
  };

  const visit = (block: unknown) => {
    if (!isRecord(block)) return;
    const type = block.type;
    const props = isRecord(block.props) ? block.props : {};
    if (typeof type === "string" && assetIdBlockTypes.has(type)) {
      add(props.assetId);
      if (type === conversationBlockType) add(props.practiceAssetId);
    } else if (type === cultureBlockType) {
      if (typeof props.sections === "string") {
        getCultureAssetIds(props.sections).forEach(add);
      }
    } else if (typeof type === "string" && assetUrlBlockTypes.has(type)) {
      add(getAssetIdFromUrl(props.url));
    }
    if (Array.isArray(block.children)) block.children.forEach(visit);
  };

  if (Array.isArray(document)) document.forEach(visit);
  return assetIds;
}
