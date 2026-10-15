"use client";

import type { ReactNode } from "react";

import { AssessmentEventManager } from "~/components/assessment-event-manager";
import { WeeklyStreak } from "~/components/learner/weekly-streak";
import { ReviewQueue } from "~/components/review-queue";
import {
  latihanTryoutBackend,
  previewCourseId,
} from "~/components/user-doc-previews/fixtures/latihan-tryout";
import {
  previewOrganizationId,
  reviewPenilaianBackend,
} from "~/components/user-doc-previews/fixtures/review-penilaian";
import { xpStreakBackend } from "~/components/user-doc-previews/fixtures/xp-streak";
import type { MockBackend } from "~/components/user-doc-previews/mock-trpc";
import type { DocPreviewName } from "~/components/user-doc-previews/names";
import { clickButton } from "~/components/user-doc-previews/play";

export type DocPreview = {
  /** What the preview shows, for screen readers and the iframe title. */
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each preview has its own state shape
  backend: MockBackend<any>;
  render: () => ReactNode;
  /** Puts the component into the state the guide describes. */
  play?: (root: Document) => Promise<void>;
  className?: string;
};

export const docPreviews = {
  "latihan-tryout-daftar": {
    title: "Daftar latihan dan tryout sebuah kurikulum",
    backend: latihanTryoutBackend,
    render: () => <AssessmentEventManager courseId={previewCourseId} />,
  },
  "latihan-tryout-buat": {
    title: "Panel Buat latihan / tryout",
    backend: latihanTryoutBackend,
    render: () => <AssessmentEventManager courseId={previewCourseId} />,
    play: async (root) => {
      await clickButton(root, "Buat latihan / tryout");
    },
  },
  "review-penilaian": {
    title: "Daftar jawaban murid yang perlu dinilai",
    backend: reviewPenilaianBackend,
    render: () => <ReviewQueue organizationId={previewOrganizationId} />,
  },
  "xp-streak": {
    title: "Streak mingguan dan XP di halaman Hari ini",
    backend: xpStreakBackend,
    render: () => <WeeklyStreak />,
    className: "mx-auto max-w-xl p-4 sm:p-6",
  },
} satisfies Record<DocPreviewName, DocPreview>;
