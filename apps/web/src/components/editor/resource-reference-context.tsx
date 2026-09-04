"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

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
};

export type EditorResourceLibrary = {
  organizationId: string;
  organizationSlug: string;
};

type ResourceReferenceContextValue = {
  editable: boolean;
  isLoading: boolean;
  organizationSlug?: string;
  learner?: Pick<LearnerReferenceResources, "courseId" | "sourceCourseItemId">;
  vocabularySets: VocabularyReferenceResource[];
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
        vocabularySets: learnerResources?.vocabularySets ?? [],
        assessments: learnerResources?.assessments ?? [],
        refresh: async () => undefined,
      };
    }

    return {
      editable: true,
      isLoading: vocabulary.isPending || assessments.isPending,
      organizationSlug: editorLibrary.organizationSlug,
      vocabularySets:
        vocabulary.data?.map((set) => ({
          id: set.id,
          title: set.title,
          description: set.description,
          entries: set.entries.map((entry) => ({
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
        })) ?? [],
      assessments:
        assessments.data?.map((assessment) => ({
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          status: assessment.status,
          questionCount: assessment._count.questions,
        })) ?? [],
      refresh: async () => {
        await Promise.all([vocabulary.refetch(), assessments.refetch()]);
      },
    };
  }, [assessments, editorLibrary, learnerResources, vocabulary]);

  return (
    <ResourceReferenceContext.Provider value={value}>
      {children}
    </ResourceReferenceContext.Provider>
  );
}

export function useResourceReferences() {
  return useContext(ResourceReferenceContext);
}
