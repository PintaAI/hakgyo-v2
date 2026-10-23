import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import {
  isHangeulHiddenInIndexes,
  isHiddenHangeulDocument,
} from "../lib/hangeul-visibility";
import { SyncDataContext, type SyncLocalData } from "../sync/hooks";
import type { LearnerIndex } from "../sync/types";
import {
  courseBundleDocuments,
  courseOrganizations,
  gameDocuments,
  learnerIndexDocuments,
} from "./documents";
import { prepareDocument, type PreparedDocument } from "./match";

export const searchCorpusQueryKey = ["mobileSync", "search", "corpus"] as const;

type CourseEntry = {
  revision: string;
  organizationId: string | null;
  documents: PreparedDocument[];
};

/**
 * Prepared documents per downloaded course, reused while the bundle revision
 * (and its organization) is unchanged. Bundles are the same for every learner,
 * so the cache does not need to be cleared on sign-out.
 */
const courseCache = new Map<string, CourseEntry>();
let gameCache: PreparedDocument[] | null = null;

async function loadCourseDocuments(
  localData: SyncLocalData,
  courseId: string,
  revision: string,
  organizationId: string | null,
) {
  const cached = courseCache.get(courseId);
  if (
    cached &&
    cached.revision === revision &&
    cached.organizationId === organizationId
  ) {
    return cached.documents;
  }
  const [structure, content] = await Promise.all([
    localData.loadBundleStructure(courseId),
    localData.loadBundleContent(courseId),
  ]);
  if (!structure || !content) return [];
  const documents = courseBundleDocuments({
    courseId,
    organizationId,
    structure: structure.data,
    content: content.data,
  }).map(prepareDocument);
  courseCache.set(courseId, { revision, organizationId, documents });
  return documents;
}

export type SearchCorpus = {
  documents: PreparedDocument[];
  /** Names of the organizations the documents belong to. */
  organizationNames: Record<string, string>;
  courseCount: number;
};

async function loadSearchCorpus(
  localData: SyncLocalData,
): Promise<SearchCorpus> {
  const [scopes, revisions] = await Promise.all([
    localData.listIndexScopes(),
    localData.listBundleRevisions(),
  ]);
  const indexes = (
    await Promise.all(scopes.map((scope) => localData.loadIndex(scope)))
  )
    .filter((record) => record !== null)
    .map((record) => record.index as LearnerIndex);
  const organizations = courseOrganizations(indexes);
  const organizationNames: Record<string, string> = {};
  for (const index of indexes) {
    for (const [id, organization] of Object.entries(index.organizations)) {
      organizationNames[id] = organization.name;
    }
  }

  const live = new Set(revisions.map(({ courseId }) => courseId));
  for (const courseId of courseCache.keys()) {
    if (!live.has(courseId)) courseCache.delete(courseId);
  }

  // Downloaded bundles replace the index's course summaries of the same key.
  const byKey = new Map<string, PreparedDocument>();
  for (const document of learnerIndexDocuments(indexes)) {
    byKey.set(document.key, prepareDocument(document));
  }
  const courseDocuments = await Promise.all(
    revisions.map(({ courseId, revision }) =>
      loadCourseDocuments(
        localData,
        courseId,
        revision,
        organizations.get(courseId) ?? null,
      ),
    ),
  );
  for (const documents of courseDocuments) {
    for (const document of documents)
      byKey.set(document.document.key, document);
  }
  gameCache ??= gameDocuments().map(prepareDocument);
  for (const document of gameCache) byKey.set(document.document.key, document);

  // A mastered Hangeul course and its games leave Cari unless the learner
  // shows them again in Pengaturan; its vocabulary stays findable.
  const hangeulHidden = isHangeulHiddenInIndexes(indexes);
  const documents = [...byKey.values()].filter(
    (document) => !isHiddenHangeulDocument(document.document, hangeulHidden),
  );

  return {
    documents,
    organizationNames,
    courseCount: revisions.length,
  };
}

/**
 * Everything searchable on this device: every stored learner index and every
 * downloaded course bundle, across organizations. Reads SQLite only; call
 * `refetch` when the screen gains focus or a sync finishes.
 */
export function useSearchCorpus() {
  const localData = useContext(SyncDataContext)?.localData ?? null;
  return useQuery({
    queryKey: searchCorpusQueryKey,
    queryFn: () => loadSearchCorpus(localData!),
    enabled: Boolean(localData),
    staleTime: Infinity,
  });
}
