import { useMobileAssetResolver } from "../../providers/MobileSyncProvider";
import type { AssetUrlResolver } from "./types";

export function useApiAssetResolver(): AssetUrlResolver {
  return useMobileAssetResolver();
}
