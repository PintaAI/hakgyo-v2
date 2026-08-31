"use client";

import dynamic from "next/dynamic";

import type { LearnerBlockNoteDocumentProps } from "./learner-block-note-document";

export const DynamicLearnerBlockNoteDocument =
  dynamic<LearnerBlockNoteDocumentProps>(
    () =>
      import("./learner-block-note-document").then(
        (module) => module.LearnerBlockNoteDocument,
      ),
    { ssr: false },
  );
