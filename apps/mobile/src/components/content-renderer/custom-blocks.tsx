import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { InlineContent } from "./inline-content";
import { assetSource, ContentAudio, ContentImage } from "./media";
import { booleanProp, isRecord, parseJsonArray, stringProp } from "./normalize";
import { useContentRenderer } from "./context";
import type { BlockRendererProps, ContentBlockRenderer } from "./types";

const accentPalettes = {
  teal: "#14b8a6",
  violet: "#7653b6",
  blue: "#3478a8",
  green: "#4f8468",
  rose: "#bc5f7b",
  amber: "#b7791f",
  ocean: "#277da1",
  forest: "#3f7d5a",
  sunset: "#d06b47",
} as const;

function accentFor(theme: string, fallback: keyof typeof accentPalettes) {
  return theme in accentPalettes
    ? accentPalettes[theme as keyof typeof accentPalettes]
    : accentPalettes[fallback];
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-xs font-black uppercase tracking-[1.5px] text-muted-foreground">
      {children}
    </Text>
  );
}

function AccentDot({ accent, label }: { accent: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="size-2 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <SectionLabel>{label}</SectionLabel>
    </View>
  );
}

function CustomAssetAudio({ block }: BlockRendererProps) {
  return (
    <ContentAudio
      caption={stringProp(block.props, "caption")}
      fileName={stringProp(block.props, "fileName", "Audio")}
      source={assetSource(stringProp(block.props, "assetId"))}
    />
  );
}

function CustomAssetImage({ block }: BlockRendererProps) {
  return (
    <ContentImage
      accessibilityLabel={stringProp(block.props, "fileName", "Learning image")}
      caption={stringProp(block.props, "caption")}
      source={assetSource(stringProp(block.props, "assetId"))}
    />
  );
}

function firstExample(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const example = value.find((item) => typeof item === "string");
    return typeof example === "string" ? example : null;
  }
  if (value && typeof value === "object" && "example" in value) {
    const example = (value as { example?: unknown }).example;
    return typeof example === "string" ? example : null;
  }
  return null;
}

function VocabularyReference({ block }: BlockRendererProps) {
  const { onOpenResource, resourceReferences } = useContentRenderer();
  const [query, setQuery] = useState("");
  const vocabularySetId = stringProp(block.props, "vocabularySetId");
  const resource = resourceReferences?.vocabularySets.find(
    (set) => set.id === vocabularySetId,
  );
  const entries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return resource?.entries ?? [];
    return (resource?.entries ?? []).filter((entry) =>
      `${entry.term} ${entry.definition}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, resource]);

  if (!resource) {
    return (
      <View className="rounded-xl border border-dashed border-border p-5">
        <Text className="text-sm text-muted-foreground">
          Vocabulary set unavailable.
        </Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-card">
      <View className="gap-2 border-b border-border bg-muted/40 p-5">
        <Text className="text-xs font-black uppercase tracking-[1.5px] text-primary">
          Vocabulary
        </Text>
        <Text className="text-2xl font-black text-foreground">
          {resource.title}
        </Text>
        {resource.description ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {resource.description}
          </Text>
        ) : null}
        <Text className="text-xs font-bold text-muted-foreground">
          {resource.entries.length} words
        </Text>
      </View>
      <View className="gap-3 p-4">
        {resource.entries.length > 8 ? (
          <TextInput
            accessibilityLabel="Search vocabulary"
            className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
            onChangeText={setQuery}
            placeholder="Search words or meanings…"
            placeholderTextColor="#737373"
            value={query}
          />
        ) : null}
        {entries.map((entry) => (
          <View
            className="gap-3 rounded-xl border border-border p-4"
            key={entry.id}
          >
            {entry.imageAsset ? (
              <ContentImage
                accessibilityLabel={entry.term}
                source={assetSource(entry.imageAsset.id)}
              />
            ) : null}
            <View className="gap-1">
              <Text className="text-lg font-black text-foreground">
                {entry.term}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {entry.definition}
              </Text>
              {firstExample(entry.examples) ? (
                <Text className="mt-1 text-sm italic leading-5 text-foreground">
                  “{firstExample(entry.examples)}”
                </Text>
              ) : null}
            </View>
            {entry.audioAsset ? (
              <ContentAudio
                fileName={entry.audioAsset.fileName}
                source={assetSource(entry.audioAsset.id)}
              />
            ) : null}
          </View>
        ))}
        {!entries.length ? (
          <Text className="py-5 text-center text-sm text-muted-foreground">
            {resource.entries.length
              ? "No matching vocabulary."
              : "This set has no vocabulary yet."}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          className="items-center rounded-full bg-primary px-5 py-4"
          onPress={() =>
            onOpenResource?.("vocabulary", resource.id, resource.courseItemId)
          }
        >
          <Text className="font-black text-primary-foreground">
            Hafalkan kosakata →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AssessmentReference({ block }: BlockRendererProps) {
  const { onOpenResource, resourceReferences } = useContentRenderer();
  const assessmentId = stringProp(block.props, "assessmentId");
  const resource = resourceReferences?.assessments.find(
    (assessment) => assessment.id === assessmentId,
  );

  if (!resource) {
    return (
      <View className="rounded-xl border border-dashed border-border p-5">
        <Text className="text-sm text-muted-foreground">
          Assessment unavailable.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4 rounded-xl border border-border bg-card p-5">
      <View className="size-12 items-center justify-center rounded-xl bg-primary/10">
        <Text className="text-xl font-black text-primary">A</Text>
      </View>
      <View className="gap-1">
        <Text className="text-xs font-black uppercase tracking-[1.5px] text-muted-foreground">
          Assessment · {resource.questionCount} questions
        </Text>
        <Text className="text-xl font-black text-foreground">
          {resource.title}
        </Text>
        {resource.description ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {resource.description}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        className={`items-center rounded-full px-5 py-4 ${resource.courseItemId ? "bg-primary" : "bg-muted"}`}
        disabled={!resource.courseItemId}
        onPress={() =>
          onOpenResource?.("assessment", resource.id, resource.courseItemId)
        }
      >
        <Text
          className={`font-black ${resource.courseItemId ? "text-primary-foreground" : "text-muted-foreground"}`}
        >
          {resource.courseItemId ? "Start assessment →" : "Not available"}
        </Text>
      </Pressable>
    </View>
  );
}

const calloutTones = {
  info: { accent: "#0284c7", label: "Note" },
  tip: { accent: "#d97706", label: "Study tip" },
  warning: { accent: "#e11d48", label: "Attention" },
  success: { accent: "#059669", label: "Key point" },
} as const;

function Callout({ block }: BlockRendererProps) {
  const { colors } = useContentRenderer();
  const toneName = stringProp(block.props, "tone", "info");
  const tone =
    calloutTones[toneName as keyof typeof calloutTones] ?? calloutTones.info;

  return (
    <View
      className="gap-2 rounded-xl border-l-4 p-4"
      style={{ backgroundColor: colors.muted, borderLeftColor: tone.accent }}
    >
      <Text className="text-xs font-black uppercase tracking-[1.5px] text-foreground">
        {tone.label}
      </Text>
      <InlineContent
        className="text-sm leading-6 text-foreground"
        content={block.content}
      />
    </View>
  );
}

function LessonPage({ block }: BlockRendererProps) {
  const accent = accentFor(stringProp(block.props, "theme"), "rose");
  const assetId = stringProp(block.props, "assetId");
  const focusCards = [
    {
      label: stringProp(block.props, "grammarLabel"),
      title: stringProp(block.props, "grammarTitle"),
      description: stringProp(block.props, "grammarDescription"),
    },
    {
      label: stringProp(block.props, "vocabularyLabel"),
      title: stringProp(block.props, "vocabularyTitle"),
      description: stringProp(block.props, "vocabularyDescription"),
    },
    {
      label: stringProp(block.props, "cultureLabel"),
      title: stringProp(block.props, "cultureTitle"),
      description: stringProp(block.props, "cultureDescription"),
    },
  ];

  return (
    <View className="gap-6">
      <View className="gap-4 border-b border-border pb-6">
        <View className="flex-row items-center gap-4">
          <View
            className="size-16 items-center justify-center rounded-xl"
            style={{ backgroundColor: accent }}
          >
            <Text className="text-2xl font-black text-white">
              {stringProp(block.props, "chapterNumber")}
            </Text>
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <SectionLabel>{stringProp(block.props, "eyebrow")}</SectionLabel>
            <Text className="text-3xl font-black leading-9 tracking-tight text-foreground">
              {stringProp(block.props, "title")}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {stringProp(block.props, "subtitle")}
            </Text>
          </View>
        </View>
        {assetId ? (
          <ContentImage
            accessibilityLabel={stringProp(
              block.props,
              "fileName",
              "Lesson context",
            )}
            source={assetSource(assetId)}
          />
        ) : null}
      </View>

      <View className="gap-3">
        <View className="rounded-xl bg-muted/60 p-4">
          <SectionLabel>Example question</SectionLabel>
          <Text className="mt-2 text-base font-bold leading-6 text-foreground">
            {stringProp(block.props, "question")}
          </Text>
        </View>
        <View
          className="rounded-xl border-l-4 bg-muted/60 p-4"
          style={{ borderLeftColor: accent }}
        >
          <SectionLabel>Example answer</SectionLabel>
          <Text className="mt-2 text-base leading-6 text-foreground">
            {stringProp(block.props, "answer")}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <SectionLabel>Lesson focus</SectionLabel>
        {focusCards.map((card, index) => (
          <View className="rounded-xl bg-muted/50 p-4" key={index}>
            <AccentDot accent={accent} label={card.label} />
            <Text className="mt-3 text-base font-black text-foreground">
              {card.title}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">
              {card.description}
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-3 rounded-xl bg-muted/35 p-4">
        <AccentDot
          accent={accent}
          label={stringProp(block.props, "objectivesLabel")}
        />
        {["objectiveOne", "objectiveTwo"].map((name, index) => (
          <View className="flex-row gap-3" key={name}>
            <Text className="font-black" style={{ color: accent }}>
              {String(index + 1).padStart(2, "0")}
            </Text>
            <Text className="min-w-0 flex-1 text-sm leading-6 text-foreground">
              {stringProp(block.props, name)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Grammar({ block }: BlockRendererProps) {
  const accent = accentFor(stringProp(block.props, "theme"), "amber");
  const rules = parseJsonArray(block.props.ruleRows, (row) => ({
    condition: typeof row.condition === "string" ? row.condition : "",
    form: typeof row.form === "string" ? row.form : "",
    example: typeof row.example === "string" ? row.example : "",
  }));
  const examples = parseJsonArray(block.props.examples, (example) => ({
    before: typeof example.before === "string" ? example.before : "",
    emphasis: typeof example.emphasis === "string" ? example.emphasis : "",
    after: typeof example.after === "string" ? example.after : "",
  }));

  return (
    <View className="gap-6">
      <View className="gap-3 border-b border-border pb-5">
        <View className="flex-row items-center justify-between gap-3">
          <AccentDot
            accent={accent}
            label={stringProp(block.props, "eyebrow")}
          />
          <Text className="text-2xl font-black" style={{ color: accent }}>
            {stringProp(block.props, "number")}
          </Text>
        </View>
        <Text className="text-3xl font-black leading-9 tracking-tight text-foreground">
          {stringProp(block.props, "title")}
        </Text>
        <Text className="text-base leading-7 text-foreground">
          {stringProp(block.props, "descriptionKo")}
        </Text>
        <Text className="text-sm leading-6 text-muted-foreground">
          {stringProp(block.props, "descriptionTranslation")}
        </Text>
      </View>

      {rules.length ? (
        <View className="gap-2">
          <SectionLabel>Grammar rules</SectionLabel>
          {rules.map((rule, index) => (
            <View className="rounded-xl border border-border p-4" key={index}>
              <View className="flex-row gap-3">
                <Text className="w-20 text-sm text-muted-foreground">
                  {stringProp(block.props, "ruleColumnOne", "Condition")}
                </Text>
                <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
                  {rule.condition}
                </Text>
              </View>
              <View className="mt-2 flex-row gap-3">
                <Text className="w-20 text-sm text-muted-foreground">
                  {stringProp(block.props, "ruleColumnTwo", "Form")}
                </Text>
                <Text
                  className="min-w-0 flex-1 text-sm font-black"
                  style={{ color: accent }}
                >
                  {rule.form}
                </Text>
              </View>
              <View className="mt-2 flex-row gap-3">
                <Text className="w-20 text-sm text-muted-foreground">
                  {stringProp(block.props, "ruleColumnThree", "Example")}
                </Text>
                <Text className="min-w-0 flex-1 text-sm text-foreground">
                  {rule.example}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View className="gap-2">
        <SectionLabel>{stringProp(block.props, "examplesLabel")}</SectionLabel>
        {examples.map((example, index) => (
          <View
            className="flex-row gap-3 rounded-xl bg-muted/45 p-4"
            key={index}
          >
            <Text className="text-sm font-black text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </Text>
            <Text className="min-w-0 flex-1 text-base leading-6 text-foreground">
              {example.before}
              <Text className="font-black" style={{ color: accent }}>
                {example.emphasis}
              </Text>
              {example.after}
            </Text>
          </View>
        ))}
      </View>

      {booleanProp(block.props, "showTip", true) ? (
        <View className="gap-2 rounded-xl bg-muted p-4">
          <AccentDot
            accent={accent}
            label={stringProp(block.props, "tipTitle", "Tip")}
          />
          <Text className="text-sm leading-6 text-foreground">
            {stringProp(block.props, "tipKo")}
          </Text>
          <Text className="text-xs leading-5 text-muted-foreground">
            {stringProp(block.props, "tipTranslation")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type MobileCultureMedia = {
  id: string;
  assetId: string;
  fileName: string;
  alt: string;
  caption: string;
  aspect: "auto" | "square" | "4:3" | "3:2";
  fit: "cover" | "contain";
};

type MobileCultureSection =
  | { id: string; type: "text"; ko: string; en: string }
  | {
      id: string;
      type: "media";
      columns: 1 | 2;
      images: MobileCultureMedia[];
    }
  | {
      id: string;
      type: "split";
      mediaSide: "left" | "right";
      mediaStack: "row" | "column";
      ko: string;
      en: string;
      images: MobileCultureMedia[];
    };

function recordString(value: Record<string, unknown>, name: string) {
  return typeof value[name] === "string" ? value[name] : "";
}

function parseCultureMedia(
  value: unknown,
  fallbackId: string,
): MobileCultureMedia | null {
  if (!isRecord(value)) return null;
  const aspect = recordString(value, "aspect");
  const fit = recordString(value, "fit");

  return {
    id: recordString(value, "id") || fallbackId,
    assetId: recordString(value, "assetId"),
    fileName: recordString(value, "fileName"),
    alt: recordString(value, "alt"),
    caption: recordString(value, "caption"),
    aspect:
      aspect === "auto" ||
      aspect === "square" ||
      aspect === "3:2" ||
      aspect === "4:3"
        ? aspect
        : "4:3",
    fit: fit === "contain" ? "contain" : "cover",
  };
}

function parseCultureImages(value: unknown, sectionId: string) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 2)
    .map((image, index) =>
      parseCultureMedia(image, `${sectionId}-image-${index + 1}`),
    )
    .filter((image): image is MobileCultureMedia => image !== null)
    .filter((image) => image.assetId);
}

function parseCultureSections(value: unknown): MobileCultureSection[] {
  if (typeof value !== "string") return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .slice(0, 20)
      .map((section, index): MobileCultureSection | null => {
        if (!isRecord(section)) return null;
        const id = recordString(section, "id") || `culture-${index + 1}`;
        const ko = recordString(section, "ko");
        const en = recordString(section, "en");

        if (section.type === "text") return { id, type: "text", ko, en };
        if (section.type === "media") {
          return {
            id,
            type: "media",
            columns: section.columns === 1 ? 1 : 2,
            images: parseCultureImages(section.images, id),
          };
        }
        if (section.type === "split") {
          return {
            id,
            type: "split",
            mediaSide: section.mediaSide === "right" ? "right" : "left",
            mediaStack: section.mediaStack === "column" ? "column" : "row",
            ko,
            en,
            images: parseCultureImages(section.images, id),
          };
        }
        return null;
      })
      .filter((section): section is MobileCultureSection => section !== null)
      .filter((section) =>
        section.type === "media"
          ? section.images.length > 0
          : Boolean(section.ko || section.en) ||
            (section.type === "split" && section.images.length > 0),
      );
  } catch {
    return [];
  }
}

function CultureText({ en, ko }: { en: string; ko: string }) {
  if (!ko && !en) return null;
  return (
    <View className="min-w-0 gap-3">
      {ko ? (
        <Text className="text-base font-medium leading-7 text-foreground">
          {ko}
        </Text>
      ) : null}
      {en ? (
        <Text className="text-sm leading-6 text-muted-foreground">{en}</Text>
      ) : null}
    </View>
  );
}

function CultureMediaGroup({
  images,
  row,
}: {
  images: MobileCultureMedia[];
  row: boolean;
}) {
  if (!images.length) return null;
  return (
    <View className={row && images.length > 1 ? "flex-row gap-3" : "gap-3"}>
      {images.map((image) => (
        <View
          className={row && images.length > 1 ? "min-w-0 flex-1" : ""}
          key={image.id}
        >
          <ContentImage
            accessibilityLabel={image.alt || image.fileName || "Culture image"}
            aspect={image.aspect}
            caption={image.caption}
            fit={image.fit}
            source={assetSource(image.assetId)}
          />
        </View>
      ))}
    </View>
  );
}

function CultureSection({ section }: { section: MobileCultureSection }) {
  if (section.type === "text") {
    return <CultureText en={section.en} ko={section.ko} />;
  }
  if (section.type === "media") {
    return (
      <CultureMediaGroup images={section.images} row={section.columns === 2} />
    );
  }

  const media = (
    <CultureMediaGroup
      images={section.images}
      row={section.mediaStack === "row"}
    />
  );
  const text = <CultureText en={section.en} ko={section.ko} />;
  return (
    <View className="gap-5">
      {section.mediaSide === "left" ? media : text}
      {section.mediaSide === "left" ? text : media}
    </View>
  );
}

function Culture({ block }: BlockRendererProps) {
  const accent = accentFor(stringProp(block.props, "theme"), "teal");
  const sections = parseCultureSections(block.props.sections);
  const checklist = parseJsonArray(block.props.checklistItems, (item) => ({
    ko: typeof item.ko === "string" ? item.ko : "",
    en: typeof item.en === "string" ? item.en : "",
  }));
  const showBanner = booleanProp(block.props, "showBanner", true);
  const showChecklist = booleanProp(block.props, "showChecklist", true);
  const centered =
    stringProp(block.props, "headerAlignment", "center") === "center";
  const compact =
    stringProp(block.props, "spacing", "comfortable") === "compact";
  const card = stringProp(block.props, "surface", "card") === "card";

  return (
    <View className="gap-5">
      {showBanner ? (
        <View className="flex-row overflow-hidden rounded-xl">
          <View className="w-12 items-center justify-center bg-foreground px-2 py-3">
            <Text className="text-lg font-black text-background">▦</Text>
          </View>
          <View
            className="min-w-0 flex-1 justify-center px-4 py-3"
            style={{ backgroundColor: accent }}
          >
            <Text className="text-sm font-black tracking-wide text-white">
              {stringProp(block.props, "eyebrow")}
            </Text>
          </View>
        </View>
      ) : null}

      <View
        className={`${card ? "rounded-3xl bg-muted/45 p-5" : ""} ${compact ? "gap-4" : "gap-7"}`}
      >
        <View className={`gap-2 ${centered ? "items-center" : ""}`}>
          {!showBanner ? (
            <AccentDot
              accent={accent}
              label={stringProp(block.props, "eyebrow")}
            />
          ) : null}
          <Text
            className={`text-3xl font-black leading-9 tracking-tight text-foreground ${centered ? "text-center" : ""}`}
          >
            {stringProp(block.props, "titleKo")}
          </Text>
          <Text
            className={`text-sm font-bold leading-5 ${centered ? "text-center" : ""}`}
            style={{ color: accent }}
          >
            {stringProp(block.props, "titleEn")}
          </Text>
        </View>

        {sections.map((section) => (
          <CultureSection key={section.id} section={section} />
        ))}
      </View>

      {showChecklist ? (
        <View className="gap-4 rounded-2xl border border-border p-4">
          <View className="flex-row items-center gap-3">
            <View
              className="size-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: accent }}
            >
              <Text className="font-black text-white">✓</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-black text-foreground">
                {stringProp(block.props, "checklistTitleKo")}
              </Text>
              <Text className="text-xs uppercase tracking-[1.5px] text-muted-foreground">
                {stringProp(block.props, "checklistTitleEn")}
              </Text>
            </View>
          </View>
          {checklist.length ? (
            <View className="overflow-hidden rounded-xl border border-border">
              {checklist.map((item, index) => (
                <View
                  className={`flex-row gap-3 p-4 ${index > 0 ? "border-t border-border" : ""}`}
                  key={index}
                >
                  <View
                    className="mt-2 size-2 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-sm leading-6 text-foreground">
                      {item.ko}
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      {item.en}
                    </Text>
                  </View>
                  <View className="mt-1 size-5 rounded-md border border-border" />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Conversation({ block }: BlockRendererProps) {
  const accent = accentFor(stringProp(block.props, "theme"), "violet");
  const sectionVariant = stringProp(
    block.props,
    "sectionVariant",
    "pronunciation",
  );
  const showUsefulExpression =
    sectionVariant === "useful-expression" || sectionVariant === "both";
  const showPronunciation =
    sectionVariant === "pronunciation" || sectionVariant === "both";
  const lines = parseJsonArray(block.props.lines, (line) => ({
    speaker: typeof line.speaker === "string" ? line.speaker : "",
    korean: typeof line.korean === "string" ? line.korean : "",
    translation: typeof line.translation === "string" ? line.translation : "",
  }));
  const questions = parseJsonArray(block.props.questions, (question) => ({
    korean: typeof question.korean === "string" ? question.korean : "",
    translation:
      typeof question.translation === "string" ? question.translation : "",
  }));
  const expressions = parseJsonArray(
    block.props.practiceExpressions,
    (expression) => ({
      korean: typeof expression.korean === "string" ? expression.korean : "",
      translation:
        typeof expression.translation === "string"
          ? expression.translation
          : "",
    }),
  );
  const practiceDialogue = parseJsonArray(
    block.props.practiceDialogue,
    (line) => ({
      speaker: typeof line.speaker === "string" ? line.speaker : "",
      korean: typeof line.korean === "string" ? line.korean : "",
    }),
  );
  const usefulExpressionDialogue = parseJsonArray(
    block.props.usefulExpressionDialogue,
    (line) => ({
      speaker: typeof line.speaker === "string" ? line.speaker : "",
      korean: typeof line.korean === "string" ? line.korean : "",
      translation: typeof line.translation === "string" ? line.translation : "",
    }),
  );
  const pronunciationExamples = parseJsonArray(
    block.props.pronunciationExamples,
    (example) => ({
      korean: typeof example.korean === "string" ? example.korean : "",
      pronunciation:
        typeof example.pronunciation === "string" ? example.pronunciation : "",
    }),
  );
  const contextAssetId = stringProp(block.props, "assetId");
  const practiceAssetId = stringProp(block.props, "practiceAssetId");

  return (
    <View className="gap-6">
      <View className="flex-row items-center gap-3 border-b border-border pb-4">
        <View
          className="size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: accent }}
        >
          <Text className="text-lg font-black text-white">☵</Text>
        </View>
        <View className="min-w-0 flex-1">
          <SectionLabel>{stringProp(block.props, "eyebrow")}</SectionLabel>
          <Text className="mt-1 text-xs text-muted-foreground">
            Audio {stringProp(block.props, "audioTrack")}
          </Text>
        </View>
        <Text className="text-3xl font-black text-foreground">
          {stringProp(block.props, "number")}
        </Text>
      </View>

      {contextAssetId ? (
        <ContentImage
          accessibilityLabel={stringProp(
            block.props,
            "fileName",
            "Conversation context",
          )}
          source={assetSource(contextAssetId)}
        />
      ) : null}

      <View className="gap-4">
        {lines.map((line, index) => (
          <View className="flex-row gap-3" key={index}>
            <Text className="w-16 font-black text-foreground">
              {line.speaker}
            </Text>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-base font-bold leading-6 text-foreground">
                {line.korean}
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                {line.translation}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View
        className="gap-3 rounded-xl border p-4"
        style={{ borderColor: accent }}
      >
        <SectionLabel>{stringProp(block.props, "questionsLabel")}</SectionLabel>
        {questions.map((question, index) => (
          <View className="flex-row gap-3" key={index}>
            <View
              className="size-6 items-center justify-center rounded-md"
              style={{ backgroundColor: accent }}
            >
              <Text className="text-xs font-black text-white">{index + 1}</Text>
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-bold leading-5 text-foreground">
                {question.korean}
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                {question.translation}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {booleanProp(block.props, "showTip", true) ? (
        <View className="gap-2 rounded-xl bg-muted p-4">
          <AccentDot
            accent={accent}
            label={stringProp(block.props, "tipTitle", "Tip")}
          />
          <Text className="text-sm leading-6 text-foreground">
            {stringProp(block.props, "tipBody")}
          </Text>
          <Text className="text-xs leading-5 text-muted-foreground">
            {stringProp(block.props, "tipTranslation")}
          </Text>
        </View>
      ) : null}

      <View className="gap-4 border-t border-border pt-6">
        <AccentDot accent={accent} label="Speaking practice" />
        <View>
          <Text className="text-base font-bold leading-6 text-foreground">
            {stringProp(block.props, "practicePromptKo")}
          </Text>
          <Text className="mt-1 text-xs leading-5 text-muted-foreground">
            {stringProp(block.props, "practicePromptTranslation")}
          </Text>
        </View>
        {practiceAssetId ? (
          <ContentImage
            accessibilityLabel={stringProp(
              block.props,
              "practiceFileName",
              "Speaking practice",
            )}
            source={assetSource(practiceAssetId)}
          />
        ) : null}
        <View className="gap-3 rounded-xl bg-muted/55 p-4">
          <SectionLabel>Provided expressions</SectionLabel>
          {expressions.map((expression, index) => (
            <View key={index}>
              <Text className="text-sm font-bold text-foreground">
                {expression.korean}
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                {expression.translation}
              </Text>
            </View>
          ))}
        </View>
        <View className="gap-3 rounded-xl border border-border p-4">
          {practiceDialogue.map((line, index) => (
            <View className="flex-row gap-3" key={index}>
              <Text className="w-6 font-black text-foreground">
                {line.speaker}
              </Text>
              <Text className="min-w-0 flex-1 text-sm leading-6 text-foreground">
                {line.korean}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {showUsefulExpression ? (
        <View className="overflow-hidden rounded-xl bg-muted/55">
          <View
            className="flex-row items-center justify-between gap-3 p-4"
            style={{ backgroundColor: accent }}
          >
            <Text className="min-w-0 flex-1 text-xs font-black uppercase tracking-[1.5px] text-white">
              {stringProp(block.props, "usefulExpressionEyebrow")}
            </Text>
            <Text className="text-xs font-bold text-white">
              Audio {stringProp(block.props, "usefulExpressionAudioTrack")}
            </Text>
          </View>
          <View className="gap-4 p-4">
            <View className="items-center rounded-xl bg-background p-5">
              <Text className="text-center text-xl font-black leading-7 text-foreground">
                {stringProp(block.props, "usefulExpressionPhraseKo")}
              </Text>
              <View className="my-3 h-px w-full bg-border" />
              <Text className="text-center text-sm font-bold text-muted-foreground">
                {stringProp(block.props, "usefulExpressionPhraseTranslation")}
              </Text>
            </View>
            <View className="gap-3 rounded-xl bg-background p-4">
              {usefulExpressionDialogue.map((line, index) => (
                <View className="flex-row gap-3" key={index}>
                  <Text className="w-6 font-black text-foreground">
                    {line.speaker}
                  </Text>
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-sm font-bold leading-6 text-foreground">
                      {line.korean}
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      {line.translation}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Text className="text-xs leading-5 text-muted-foreground">
              {stringProp(block.props, "usefulExpressionNote")}
            </Text>
          </View>
        </View>
      ) : null}

      {showPronunciation ? (
        <View className="overflow-hidden rounded-xl bg-muted/55">
          <View
            className="flex-row items-center justify-between gap-3 p-4"
            style={{ backgroundColor: accent }}
          >
            <Text className="min-w-0 flex-1 text-xs font-black uppercase tracking-[1.5px] text-white">
              {stringProp(block.props, "pronunciationEyebrow")}
            </Text>
            <Text className="text-xs font-bold text-white">
              Audio {stringProp(block.props, "pronunciationAudioTrack")}
            </Text>
          </View>
          <View className="gap-4 p-4">
            <View className="size-24 self-center items-center justify-center rounded-full bg-background">
              <Text className="text-5xl font-black text-foreground">
                {stringProp(block.props, "pronunciationSymbol")}
              </Text>
            </View>
            <Text className="text-sm leading-6 text-foreground">
              {stringProp(block.props, "pronunciationDescriptionKo")}
            </Text>
            <Text className="text-xs leading-5 text-muted-foreground">
              {stringProp(block.props, "pronunciationDescriptionTranslation")}
            </Text>
            <View className="overflow-hidden rounded-xl bg-background">
              {pronunciationExamples.map((example, index) => (
                <View
                  className={`flex-row items-center gap-3 px-4 py-3 ${index > 0 ? "border-t border-border" : ""}`}
                  key={index}
                >
                  <Text className="text-xs text-muted-foreground">
                    {index + 1}
                  </Text>
                  <Text className="min-w-0 flex-1 text-sm text-foreground">
                    {example.korean}
                  </Text>
                  <Text className="text-sm font-black text-foreground">
                    {example.pronunciation}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export const customBlockRenderers: Readonly<
  Record<string, ContentBlockRenderer>
> = {
  assetAudio: CustomAssetAudio,
  assetImage: CustomAssetImage,
  callout: Callout,
  lessonPage: LessonPage,
  grammar: Grammar,
  conversation: Conversation,
  culture: Culture,
  vocabularyReference: VocabularyReference,
  assessmentReference: AssessmentReference,
};
