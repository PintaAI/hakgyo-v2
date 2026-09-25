"use client";

import { createContext, useContext } from "react";
import type { PdfBookResource } from "@hakgyo/shared";

/**
 * Where pdfPages blocks get their pages: authors browse the organization's
 * books; learners only receive the pages their lesson references.
 */
export type PdfBookContextValue =
  | { mode: "editor"; organizationId: string }
  | { mode: "learner"; books: PdfBookResource[] };

const PdfBookContext = createContext<PdfBookContextValue | null>(null);

export const PdfBookProvider = PdfBookContext.Provider;

export function usePdfBookContext() {
  return useContext(PdfBookContext);
}
