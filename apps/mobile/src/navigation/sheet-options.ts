import { Platform } from "react-native";
import type { NativeStackNavigationOptions } from "expo-router";

type SheetDetents = "fitToContents" | number[];

const SHEET_CORNER_RADIUS = 28;

/**
 * Stack screen options for a `formSheet` route, so every sheet shares the same
 * corner radius, elevation and Android behaviour.
 *
 * - `detents`: one value for both platforms, or one per platform.
 * - `grabber`: show the drag handle (default true).
 * - `expandsWhenScrolledToEdge`: scrolling to the top edge grows the sheet.
 * - `transparentHeader`: the sheet has a native title header. On iOS it floats
 *   transparently over the content; on Android it is opaque.
 * - `systemCornerRadius`: on iOS keep the system corner radius, which suits
 *   content that is drawn to follow the native sheet material.
 */
export function formSheetOptions({
  detents,
  grabber = true,
  expandsWhenScrolledToEdge = false,
  transparentHeader = false,
  systemCornerRadius = false,
}: {
  detents: SheetDetents | { ios: SheetDetents; android: SheetDetents };
  grabber?: boolean;
  expandsWhenScrolledToEdge?: boolean;
  transparentHeader?: boolean;
  systemCornerRadius?: boolean;
}): NativeStackNavigationOptions {
  const ios = Platform.OS === "ios";
  const resolved =
    typeof detents === "object" && !Array.isArray(detents)
      ? detents[ios ? "ios" : "android"]
      : detents;
  const fitsContents = resolved === "fitToContents";

  return {
    presentation: "formSheet",
    sheetAllowedDetents: resolved,
    sheetGrabberVisible: grabber,
    sheetExpandsWhenScrolledToEdge: expandsWhenScrolledToEdge,
    ...(transparentHeader
      ? { headerLargeTitle: false, headerTransparent: ios }
      : null),
    ...(ios
      ? systemCornerRadius
        ? null
        : { sheetCornerRadius: SHEET_CORNER_RADIUS }
      : {
          sheetInitialDetentIndex: 0,
          sheetCornerRadius: SHEET_CORNER_RADIUS,
          sheetElevation: 24,
          sheetLargestUndimmedDetentIndex: "none",
          ...(fitsContents || transparentHeader
            ? { sheetShouldOverflowTopInset: false }
            : null),
          ...(fitsContents ? { sheetResizeAnimationEnabled: true } : null),
        }),
  };
}
