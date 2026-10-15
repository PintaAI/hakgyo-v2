"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MockTRPCProvider } from "~/components/user-doc-previews/mock-trpc";
import {
  docPreviewMessageType,
  type DocPreviewName,
} from "~/components/user-doc-previews/names";
import {
  docPreviews,
  type DocPreview,
} from "~/components/user-doc-previews/registry";

/**
 * Renders one registered preview inside the guide's iframe: the real
 * component with in-memory data. Links do not navigate, and the document
 * height is reported to the guide page so the frame can grow with it.
 */
export function DocPreviewHost({ name }: { name: DocPreviewName }) {
  const preview: DocPreview = docPreviews[name];
  const [playError, setPlayError] = useState<string | null>(null);
  const played = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const blockNavigation = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#")) return;
      event.preventDefault();
      event.stopPropagation();
      toast.info("Tautan tidak dibuka di pratinjau.");
    };
    const blockSubmitToUrl = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (form?.getAttribute("action")) event.preventDefault();
    };
    document.addEventListener("click", blockNavigation, true);
    document.addEventListener("submit", blockSubmitToUrl, true);
    return () => {
      document.removeEventListener("click", blockNavigation, true);
      document.removeEventListener("submit", blockSubmitToUrl, true);
    };
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (window.parent === window || !content) return;
    let last = 0;
    // Measure the preview itself: the document is never shorter than the
    // iframe, so its height would never let the frame shrink.
    const report = () => {
      const height = Math.ceil(content.getBoundingClientRect().height);
      if (height === last) return;
      last = height;
      window.parent.postMessage(
        { type: docPreviewMessageType, height },
        window.location.origin,
      );
    };
    const observer = new ResizeObserver(report);
    observer.observe(content);
    report();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Run once per page load, also under React's development double effects.
    if (!preview.play || played.current) return;
    played.current = true;
    preview.play(document).catch((error: unknown) => {
      setPlayError(error instanceof Error ? error.message : String(error));
    });
  }, [preview]);

  return (
    <MockTRPCProvider backend={preview.backend}>
      <div ref={contentRef}>
        {playError ? (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive m-4 rounded-lg p-3 text-sm"
          >
            Pratinjau perlu diperbarui: {playError}
          </p>
        ) : null}
        <div className={preview.className ?? "p-4 sm:p-6"}>
          {preview.render()}
        </div>
      </div>
    </MockTRPCProvider>
  );
}
