"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { PdfBookResource } from "@hakgyo/shared";

import { api } from "~/trpc/react";

export type VocabularyReferenceResource = {
  id: string;
  title: string;
  description: string | null;
  courseItemId?: string | null;
  entries: Array<{
    id: string;
    term: string;
    definition: string;
    examples: unknown;
    audioAsset: { id: string; fileName: string } | null;
    imageAsset: { id: string; fileName: string } | null;
  }>;
};

/** What the resource picker needs; entries are loaded per referenced set. */
export type VocabularyReferenceSummary = {
  id: string;
  title: string;
  description: string | null;
  entryCount: number;
};

export type AssessmentReferenceResource = {
  id: string;
  title: string;
  description: string | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  questionCount: number;
  courseItemId?: string | null;
};

export type LearnerReferenceResources = {
  courseId: string;
  sourceCourseItemId: string;
  vocabularySets: VocabularyReferenceResource[];
  assessments: AssessmentReferenceResource[];
  pdfBooks?: PdfBookResource[];
};

export type EditorResourceLibrary = {
  organizationId: string;
  organizationSlug: string;
};

type ResourceReferenceContextValue = {
  editable: boolean;
  isLoading: boolean;
  /** Set in editor mode, where vocabulary entries are fetched per set. */
  organizationId?: string;
  organizationSlug?: string;
  learner?: Pick<LearnerReferenceResources, "courseId" | "sourceCourseItemId">;
  vocabularySets: VocabularyReferenceSummary[];
  learnerVocabularySets: VocabularyReferenceResource[];
  assessments: AssessmentReferenceResource[];
  refresh: () => Promise<void>;
};

const ResourceReferenceContext =
  createContext<ResourceReferenceContextValue | null>(null);

export function ResourceReferenceProvider({
  children,
  editorLibrary,
  learnerResources,
}: {
  children: ReactNode;
  editorLibrary?: EditorResourceLibrary;
  learnerResources?: LearnerReferenceResources;
}) {
  const utils = api.useUtils();
  const vocabulary = api.content.listVocabularySets.useQuery(
    { organizationId: editorLibrary?.organizationId ?? "" },
    { enabled: Boolean(editorLibrary) },
  );
  const assessments = api.assessment.list.useQuery(
    { organizationId: editorLibrary?.organizationId ?? "" },
    { enabled: Boolean(editorLibrary) },
  );

  const value = useMemo<ResourceReferenceContextValue>(() => {
    if (!editorLibrary) {
      return {
        editable: false,
        isLoading: false,
        learner: learnerResources
          ? {
              courseId: learnerResources.courseId,
              sourceCourseItemId: learnerResources.sourceCourseItemId,
            }
          : undefined,
        vocabularySets:
          learnerResources?.vocabularySets.map((set) => ({
            id: set.id,
            title: set.title,
            description: set.description,
            entryCount: set.entries.length,
          })) ?? [],
        learnerVocabularySets: learnerResources?.vocabularySets ?? [],
        assessments: learnerResources?.assessments ?? [],
        refresh: async () => undefined,
      };
    }

    return {
      editable: true,
      isLoading: vocabulary.isPending || assessments.isPending,
      organizationId: editorLibrary.organizationId,
      organizationSlug: editorLibrary.organizationSlug,
      vocabularySets:
        vocabulary.data?.map((set) => ({
          id: set.id,
          title: set.title,
          description: set.description,
          entryCount: set._count.entries,
        })) ?? [],
      learnerVocabularySets: [],
      assessments:
        assessments.data?.map((assessment) => ({
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          status: assessment.status,
          questionCount: assessment._count.questions,
        })) ?? [],
      refresh: async () => {
        await Promise.all([
          vocabulary.refetch(),
          assessments.refetch(),
          utils.content.getVocabularySet.invalidate({
            organizationId: editorLibrary.organizationId,
          }),
        ]);
      },
    };
  }, [assessments, editorLibrary, learnerResources, utils, vocabulary]);

  return (
    <ResourceReferenceContext.Provider value={value}>
      {children}
    </ResourceReferenceContext.Provider>
  );
}

export function useResourceReferences() {
  return useContext(ResourceReferenceContext);
}

/**
 * Resolves one referenced vocabulary set with its entries: from the learner
 * payload, or (in the editor) through a per-set query.
 */
export function useVocabularyReference(vocabularySetId: string): {
  resource: VocabularyReferenceResource | undefined;
  isLoading: boolean;
} {
  const references = useResourceReferences();
  const organizationId = references?.organizationId;
  const query = api.content.getVocabularySet.useQuery(
    { organizationId: organizationId ?? "", vocabularySetId },
    { enabled: Boolean(organizationId && vocabularySetId) },
  );
  const editorResource = useMemo<VocabularyReferenceResource | undefined>(
    () =>
      query.data
        ? {
            id: query.data.id,
            title: query.data.title,
            description: query.data.description,
            entries: query.data.entries.map((entry) => ({
              id: entry.id,
              term: entry.term,
              definition: entry.definition,
              examples: entry.examples,
              audioAsset: entry.audioAsset
                ? {
                    id: entry.audioAsset.id,
                    fileName: entry.audioAsset.fileName,
                  }
                : null,
              imageAsset: entry.imageAsset
                ? {
                    id: entry.imageAsset.id,
                    fileName: entry.imageAsset.fileName,
                  }
                : null,
            })),
          }
        : undefined,
    [query.data],
  );

  if (!organizationId) {
    return {
      resource: references?.learnerVocabularySets.find(
        (set) => set.id === vocabularySetId,
      ),
      isLoading: references?.isLoading ?? false,
    };
  }
  return {
    resource: editorResource,
    isLoading: Boolean(vocabularySetId) && query.isPending,
  };
}
