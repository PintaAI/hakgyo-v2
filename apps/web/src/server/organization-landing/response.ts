import { FONT_FILE_ORIGIN, FONT_STYLESHEET_ORIGIN } from "./html";

/**
 * Serves an AI-authored landing document. The CSP `sandbox` directive gives it
 * an opaque origin even when opened directly, so its scripts can never read
 * Hakgyo cookies or call the API as the visitor; it also has no network access.
 */
export function landingDocumentResponse(document: {
  html: string;
  assetOrigins: readonly string[];
}) {
  const assets = [...document.assetOrigins, "data:"].join(" ");
  const csp = [
    "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation",
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    `style-src 'unsafe-inline' ${FONT_STYLESHEET_ORIGIN}`,
    `font-src ${FONT_FILE_ORIGIN} data:`,
    `img-src ${assets}`,
    `media-src ${assets}`,
    "connect-src 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'",
  ].join("; ");
  return new Response(document.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": csp,
      "Cache-Control": "no-store",
    },
  });
}

export function landingNotFoundResponse() {
  return new Response("Landing page not found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
