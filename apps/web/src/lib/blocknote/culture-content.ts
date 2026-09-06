export const cultureSectionPresets = [
  "text",
  "media-one",
  "media-two",
  "split-image-left",
  "split-image-right",
  "split-stack-left",
] as const;

export type CultureSectionPreset = (typeof cultureSectionPresets)[number];

export const cultureImageAspects = ["auto", "square", "4:3", "3:2"] as const;
export const cultureImageFits = ["cover", "contain"] as const;

export type CultureImageAspect = (typeof cultureImageAspects)[number];
export type CultureImageFit = (typeof cultureImageFits)[number];

export type CultureMedia = {
  id: string;
  assetId: string;
  fileName: string;
  contentType: string;
  alt: string;
  caption: string;
  aspect: CultureImageAspect;
  fit: CultureImageFit;
};

export type CultureTextSection = {
  id: string;
  type: "text";
  ko: string;
  en: string;
};

export type CultureMediaSection = {
  id: string;
  type: "media";
  columns: 1 | 2;
  images: CultureMedia[];
};

export type CultureSplitSection = {
  id: string;
  type: "split";
  mediaSide: "left" | "right";
  mediaWidth: "small" | "medium" | "large";
  mediaStack: "row" | "column";
  ko: string;
  en: string;
  images: CultureMedia[];
};

export type CultureSection =
  CultureTextSection | CultureMediaSection | CultureSplitSection;

const defaultTextOne = {
  ko: "한국에는 바닥에 앉아 식사하고 휴식하는 좌식 생활이 있습니다. 가족이 바닥에 함께 앉아 대화하며 자연스럽게 유대감을 나눕니다.",
  en: "In Korea, people often sit on the floor to eat and relax. Families sit together on the floor, talk, and naturally build closeness.",
};

const defaultTextTwo = {
  ko: "이러한 생활은 바닥을 따뜻하게 하는 전통 난방인 '온돌'과 함께 이어져 왔습니다. 오늘날에도 아파트의 따뜻한 바닥에 앉아 TV를 보거나 쉬는 모습을 쉽게 볼 수 있습니다.",
  en: "This lifestyle continued together with 'ondol', the traditional heating that keeps the floor warm. Even today, you can often see people sitting on the warm apartment floor to watch TV or rest.",
};

export function createCultureMedia(id: string): CultureMedia {
  return {
    id,
    assetId: "",
    fileName: "",
    contentType: "",
    alt: "",
    caption: "",
    aspect: "4:3",
    fit: "cover",
  };
}

export function createCultureSection(
  preset: CultureSectionPreset,
  id: string,
): CultureSection {
  if (preset === "text") {
    return { id, type: "text", ko: "", en: "" };
  }

  if (preset === "media-one" || preset === "media-two") {
    const count = preset === "media-two" ? 2 : 1;
    return {
      id,
      type: "media",
      columns: count,
      images: Array.from({ length: count }, (_, index) =>
        createCultureMedia(`${id}-image-${index + 1}`),
      ),
    };
  }

  const stacked = preset === "split-stack-left";
  return {
    id,
    type: "split",
    mediaSide: preset === "split-image-right" ? "right" : "left",
    mediaWidth: "medium",
    mediaStack: stacked ? "column" : "row",
    ko: "",
    en: "",
    images: Array.from({ length: stacked ? 2 : 1 }, (_, index) =>
      createCultureMedia(`${id}-image-${index + 1}`),
    ),
  };
}

export const cultureSectionDefaults: CultureSection[] = [
  {
    id: "culture-introduction",
    type: "text",
    ...defaultTextOne,
  },
  {
    id: "culture-images",
    type: "media",
    columns: 2,
    images: [
      createCultureMedia("culture-image-one"),
      createCultureMedia("culture-image-two"),
    ],
  },
  {
    id: "culture-details",
    type: "text",
    ...defaultTextTwo,
  },
];

export const cultureSectionsDefault = JSON.stringify(cultureSectionDefaults);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function parseMedia(value: unknown, fallbackId: string): CultureMedia | null {
  if (!isRecord(value)) return null;
  const aspect = cultureImageAspects.find((item) => item === value.aspect);
  const fit = cultureImageFits.find((item) => item === value.fit);

  return {
    id: readString(value.id, fallbackId),
    assetId: readString(value.assetId),
    fileName: readString(value.fileName),
    contentType: readString(value.contentType),
    alt: readString(value.alt),
    caption: readString(value.caption),
    aspect: aspect ?? "4:3",
    fit: fit ?? "cover",
  };
}

function parseImages(value: unknown, sectionId: string, count: number) {
  const parsed = Array.isArray(value)
    ? value
        .slice(0, count)
        .map((image, index) =>
          parseMedia(image, `${sectionId}-image-${index + 1}`),
        )
        .filter((image): image is CultureMedia => image !== null)
    : [];

  while (parsed.length < count) {
    parsed.push(createCultureMedia(`${sectionId}-image-${parsed.length + 1}`));
  }
  return parsed;
}

function cloneDefaults() {
  return cultureSectionDefaults.map((section) => ({
    ...section,
    ...(section.type === "media"
      ? { images: section.images.map((image) => ({ ...image })) }
      : {}),
  })) as CultureSection[];
}

export function parseCultureSections(value: string): CultureSection[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return cloneDefaults();

    return parsed
      .slice(0, 20)
      .map((entry, index): CultureSection | null => {
        if (!isRecord(entry)) return null;
        const id = readString(entry.id, `culture-section-${index + 1}`);

        if (entry.type === "text") {
          return {
            id,
            type: "text",
            ko: readString(entry.ko),
            en: readString(entry.en),
          };
        }

        if (entry.type === "media") {
          const columns = entry.columns === 1 ? 1 : 2;
          return {
            id,
            type: "media",
            columns,
            images: parseImages(entry.images, id, columns),
          };
        }

        if (entry.type === "split") {
          const mediaStack = entry.mediaStack === "column" ? "column" : "row";
          const imageCount = mediaStack === "column" ? 2 : 1;
          const mediaWidth = ["small", "medium", "large"].includes(
            readString(entry.mediaWidth),
          )
            ? (entry.mediaWidth as CultureSplitSection["mediaWidth"])
            : "medium";
          return {
            id,
            type: "split",
            mediaSide: entry.mediaSide === "right" ? "right" : "left",
            mediaWidth,
            mediaStack,
            ko: readString(entry.ko),
            en: readString(entry.en),
            images: parseImages(entry.images, id, imageCount),
          };
        }

        return null;
      })
      .filter((section): section is CultureSection => section !== null);
  } catch {
    return cloneDefaults();
  }
}

export function getCultureAssetIds(value: string) {
  return parseCultureSections(value).flatMap((section) =>
    section.type === "text"
      ? []
      : section.images.flatMap((image) =>
          image.assetId ? [image.assetId] : [],
        ),
  );
}
