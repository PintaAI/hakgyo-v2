import { Platform } from "react-native";

import type { NativeAnchor } from "./tours";

export type Rect = { x: number; y: number; width: number; height: number };

type Layout = {
  window: { width: number; height: number };
  insets: { top: number; bottom: number };
  /** The organization switcher in the header, when it is on screen. */
  organization: Rect | null;
};

const ios = Platform.OS === "ios";
const liquidGlass = ios && Number.parseInt(String(Platform.Version), 10) >= 26;

/** Header buttons: 44pt glass circles on iOS, 48dp icon buttons on Android. */
const HEADER_BUTTON = ios ? 44 : 48;
/** Header side margin and the gap the sidebar button leaves before the switcher. */
const HEADER_MARGIN = 16;
const TRAILING_GAP = 8;
const NAV_BAR_HEIGHT = 44;

/**
 * Where native header and tab bar items sit. JavaScript cannot measure them,
 * so these follow the system metrics: the iOS 26 floating tab bar with the
 * detached search button, the classic iOS tab bar, and Android's Material
 * navigation bar. Header items line up with the measured organization
 * switcher when it is on screen. Close, not exact: the spotlight is padded.
 */
export function nativeAnchorRect(anchor: NativeAnchor, layout: Layout): Rect {
  const { window, insets, organization } = layout;
  const headerCenter = organization
    ? organization.y + organization.height / 2
    : insets.top + NAV_BAR_HEIGHT / 2;
  const headerButton = (x: number): Rect => ({
    x,
    y: headerCenter - HEADER_BUTTON / 2,
    width: HEADER_BUTTON,
    height: HEADER_BUTTON,
  });

  switch (anchor) {
    case "native:sidebar":
      return headerButton(
        organization
          ? organization.x - TRAILING_GAP - HEADER_BUTTON
          : HEADER_MARGIN,
      );
    case "native:settings":
      return headerButton(window.width - HEADER_MARGIN - HEADER_BUTTON);
    case "native:header-action": {
      // A text button at the right of the header ("Selesaikan tugas").
      const width = 170;
      return {
        x: window.width - HEADER_MARGIN - width,
        y: headerCenter - HEADER_BUTTON / 2,
        width,
        height: HEADER_BUTTON,
      };
    }
    case "native:toolbar":
      return toolbarRect(layout);
    default:
      return tabRect(anchor, layout);
  }
}

/** A screen's bottom toolbar: floating on iOS 26, a full-width bar otherwise. */
function toolbarRect({ window, insets }: Layout): Rect {
  if (liquidGlass) {
    const height = 52;
    const margin = 16;
    return {
      x: margin,
      y: window.height - Math.max(insets.bottom, 12) - height,
      width: window.width - margin * 2,
      height,
    };
  }
  const height = ios ? 49 : 64;
  return {
    x: 0,
    y: window.height - insets.bottom - height,
    width: window.width,
    height,
  };
}

const TAB_ORDER = ["home", "learn", "assessments", "search"] as const;

function tabRect(anchor: NativeAnchor, { window, insets }: Layout): Rect {
  const tab = anchor.replace("native:tab:", "") as (typeof TAB_ORDER)[number];
  if (liquidGlass) {
    // A floating capsule for the tabs and a detached circle for search.
    const height = 62;
    const margin = 16;
    const y = window.height - Math.max(insets.bottom, 12) - height + 4;
    if (tab === "search") {
      return {
        x: window.width - margin - height,
        y,
        width: height,
        height,
      };
    }
    const capsuleWidth = window.width - margin * 2 - height - 8;
    const itemWidth = capsuleWidth / 3;
    const index = TAB_ORDER.indexOf(tab);
    return { x: margin + itemWidth * index, y, width: itemWidth, height };
  }
  // Classic bar (iOS before 26) and Android's navigation bar: equal items.
  const height = ios ? 49 : 80;
  const itemWidth = window.width / TAB_ORDER.length;
  return {
    x: itemWidth * TAB_ORDER.indexOf(tab),
    y: window.height - insets.bottom - height,
    width: itemWidth,
    height,
  };
}
