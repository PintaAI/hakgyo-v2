import {
  assessmentReferenceBlockType,
  vocabularyReferenceBlockType,
} from "./block-catalog";

type JsonBlock = Record<string, unknown>;

export type MaterialReferenceIds = {
  assessmentIds: string[];
  vocabularySetIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function referenceId(block: JsonBlock, prop: string) {
  if (!isRecord(block.props)) return null;
  const value = block.props[prop];
  return typeof value === "string" && value.trim() ? value : null;
}

export function collectMaterialReferenceIds(
  document: unknown,
): MaterialReferenceIds {
  const assessmentIds = new Set<string>();
  const vocabularySetIds = new Set<string>();

  const visit = (value: unknown) => {
    if (!isRecord(value)) return;
    if (value.type === assessmentReferenceBlockType) {
      const id = referenceId(value, "assessmentId");
      if (id) assessmentIds.add(id);
    }
    if (value.type === vocabularyReferenceBlockType) {
      const id = referenceId(value, "vocabularySetId");
      if (id) vocabularySetIds.add(id);
    }
    if (Array.isArray(value.children)) value.children.forEach(visit);
  };

  if (Array.isArray(document)) document.forEach(visit);

  return {
    assessmentIds: [...assessmentIds],
    vocabularySetIds: [...vocabularySetIds],
  };
}

export function removeInvalidMaterialReferences(
  document: unknown,
  valid: {
    assessmentIds: ReadonlySet<string>;
    vocabularySetIds: ReadonlySet<string>;
  },
): JsonBlock[] {
  if (!Array.isArray(document)) return [];

  const clean = (value: unknown): JsonBlock | null => {
    if (!isRecord(value)) return null;

    if (value.type === assessmentReferenceBlockType) {
      const id = referenceId(value, "assessmentId");
      if (!id || !valid.assessmentIds.has(id)) return null;
    }
    if (value.type === vocabularyReferenceBlockType) {
      const id = referenceId(value, "vocabularySetId");
      if (!id || !valid.vocabularySetIds.has(id)) return null;
    }

    if (!Array.isArray(value.children)) return value;
    return {
      ...value,
      children: value.children
        .map(clean)
        .filter((block): block is JsonBlock => block !== null),
    };
  };

  return document
    .map(clean)
    .filter((block): block is JsonBlock => block !== null);
}
