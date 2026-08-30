export const calloutBlockType = "callout";
export const assetAudioBlockType = "assetAudio";
export const assetImageBlockType = "assetImage";
export const grammarBlockType = "grammar";
export const lessonPageBlockType = "lessonPage";
export const calloutTones = ["info", "tip", "warning", "success"] as const;
export const grammarBlockThemes = ["amber", "blue", "green", "rose"] as const;
export const lessonPageThemes = ["rose", "ocean", "forest", "sunset"] as const;

export const grammarBlockRuleRows = [
  { condition: "ㅏ, ㅗ", form: "-아요", example: "가다 → 가요" },
  { condition: "그 외 모음", form: "-어요", example: "먹다 → 먹어요" },
  { condition: "-하다", form: "-해요", example: "공부하다 → 공부해요" },
] as const;

export const grammarBlockExamples = [
  { before: "저는 매일 한국어를 ", emphasis: "공부해요", after: "." },
  { before: "민민 씨는 오늘 영화를 ", emphasis: "봐요", after: "." },
  { before: "자야 씨는 지금 책을 ", emphasis: "읽어요", after: "." },
] as const;

export const grammarBlockTextDefaults = {
  number: "01",
  eyebrow: "문법 · GRAMMAR",
  title: "-아요/어요",
  descriptionKo:
    "‘-아요/어요’는 동사나 형용사에 붙어 비격식 상황에서 문장을 끝맺을 때 사용합니다.",
  descriptionTranslation:
    "‘-아요/어요’ is attached to verbs and adjectives to end sentences politely in informal situations.",
  ruleColumnOne: "조건",
  ruleColumnTwo: "형태",
  ruleColumnThree: "예",
  ruleRows: JSON.stringify(grammarBlockRuleRows),
  examplesLabel: "예문 · EXAMPLES",
  examples: JSON.stringify(grammarBlockExamples),
  tipTitle: "확장 · TIP",
  tipKo:
    "‘동작 명사+-하다’ 유형은 의미 변화 없이 ‘동작 명사+을/를 하다’의 형태로도 사용할 수 있습니다.",
  tipTranslation:
    "An action noun with 하다 can also be written as the action noun followed by 을/를 하다 without changing the meaning.",
} as const;

export const grammarBlockDefaults = {
  theme: "amber",
  showTip: true,
  ...grammarBlockTextDefaults,
} as const;

const grammarBlockTextProps = Object.fromEntries(
  Object.entries(grammarBlockTextDefaults).map(([name, defaultValue]) => [
    name,
    { type: "string", default: defaultValue },
  ]),
);

export const lessonPageDefaults = {
  eyebrow: "EPS-TOPIK",
  chapterNumber: "03",
  title: "위치와 장소",
  subtitle: "Locations and Places",
  question: "텔레비전은 어디에 있어요?",
  answer: "거실에 있어요.",
  grammarLabel: "문법 · GRAMMAR",
  grammarTitle: "이/가 있어요, 없어요",
  grammarDescription: "Ada atau tidak ada",
  vocabularyLabel: "어휘 · VOCABULARY",
  vocabularyTitle: "가구와 전자제품",
  vocabularyDescription: "Furniture and electronics",
  cultureLabel: "문화와 정보 · CULTURE",
  cultureTitle: "한국의 도시",
  cultureDescription: "Korea's cities",
  objectivesLabel: "학습 목표 · LEARNING OBJECTIVES",
  objectiveOne:
    "집에 있는 물건에 대해 말할 수 있다.\nCan talk about items at home.",
  objectiveTwo:
    "사람이나 물건이 있는 장소에 대해 말할 수 있다.\nCan talk about where a person or object is.",
} as const;

const lessonPageTextProps = Object.fromEntries(
  Object.entries(lessonPageDefaults).map(([name, defaultValue]) => [
    name,
    { type: "string", default: defaultValue },
  ]),
);

export const hakgyoBlockCatalog = {
  catalogVersion: 4,
  editor: "BlockNote",
  format: {
    description:
      "Use BlockNote editor.document JSON, not Tiptap or raw ProseMirror JSON. The root value is an array of blocks.",
    blockShape: {
      type: "string",
      props: "object",
      content: "string | InlineContent[] | TableContent",
      children: "Block[]",
    },
    notes: [
      "Block IDs may be omitted when creating new material content.",
      "Use only built-in BlockNote blocks or custom blocks listed in this catalog.",
      "Simple text content may be supplied as a string and BlockNote will normalize it.",
    ],
  },
  builtInBlocks: [
    { type: "paragraph", purpose: "Regular explanatory text." },
    { type: "heading", purpose: "A section heading; set props.level to 1-3." },
    { type: "bulletListItem", purpose: "An unordered list item." },
    { type: "numberedListItem", purpose: "An ordered list item." },
    { type: "checkListItem", purpose: "A checklist item." },
    { type: "quote", purpose: "A quotation or emphasized excerpt." },
    { type: "codeBlock", purpose: "Source code or other preformatted text." },
    { type: "table", purpose: "Tabular content using BlockNote TableContent." },
    { type: "image", purpose: "An image block referencing an available URL." },
    { type: "video", purpose: "A video block referencing an available URL." },
    { type: "audio", purpose: "An audio block referencing an available URL." },
    { type: "file", purpose: "A downloadable file reference." },
  ],
  customBlocks: [
    {
      type: assetAudioBlockType,
      purpose: "Play a securely stored audio asset inside learning content.",
      content: "none",
      props: {
        assetId: { type: "string", default: "" },
        fileName: { type: "string", default: "" },
        contentType: { type: "string", default: "" },
        caption: { type: "string", default: "" },
      },
    },
    {
      type: assetImageBlockType,
      purpose: "Display a securely stored image asset inside learning content.",
      content: "none",
      props: {
        assetId: { type: "string", default: "" },
        fileName: { type: "string", default: "" },
        contentType: { type: "string", default: "" },
        caption: { type: "string", default: "" },
      },
    },
    {
      type: calloutBlockType,
      purpose:
        "Highlight a key idea, study tip, warning, or positive takeaway inside a lesson.",
      content: "inline",
      props: {
        tone: {
          type: "string",
          enum: calloutTones,
          default: "info",
        },
      },
      guidance: {
        useWhen: [
          "A concept deserves extra emphasis.",
          "The learner should remember a practical tip or warning.",
          "A short success criterion or takeaway helps comprehension.",
        ],
        avoidWhen: [
          "The text is an ordinary paragraph.",
          "The content requires a heading or a multi-item list.",
        ],
      },
      example: {
        type: calloutBlockType,
        props: { tone: "tip" },
        content: "Remember: the denominator represents the total equal parts.",
        children: [],
      },
    },
    {
      type: lessonPageBlockType,
      purpose:
        "Create a reusable visual lesson opener with a chapter header, hero image, dialogue, three learning-focus cards, and learning objectives.",
      content: "none",
      props: {
        theme: {
          type: "string",
          enum: lessonPageThemes,
          default: "rose",
        },
        assetId: { type: "string", default: "" },
        fileName: { type: "string", default: "" },
        contentType: { type: "string", default: "" },
        ...lessonPageTextProps,
      },
      guidance: {
        useWhen: [
          "A lesson needs a strong, repeatable opening page.",
          "The author wants to combine a contextual image, sample dialogue, lesson focus, and objectives.",
        ],
        avoidWhen: [
          "Only a short heading or paragraph is needed.",
          "The image should stand alone without lesson metadata.",
        ],
      },
      example: {
        type: lessonPageBlockType,
        props: {
          theme: "rose",
          ...lessonPageDefaults,
        },
        children: [],
      },
    },
    {
      type: grammarBlockType,
      purpose:
        "Teach one grammar point with bilingual explanations, a configurable rule table, examples, and an optional tip panel.",
      content: "none",
      props: {
        theme: {
          type: "string",
          enum: grammarBlockThemes,
          default: grammarBlockDefaults.theme,
        },
        showTip: { type: "boolean", default: true },
        ...grammarBlockTextProps,
      },
      guidance: {
        useWhen: [
          "A grammar form needs a focused explanation and conjugation or usage rules.",
          "Learners benefit from bilingual guidance, structured examples, or an extra usage tip.",
        ],
        jsonProps: {
          ruleRows:
            "JSON array of { condition, form, example } objects. The editor can add and remove rows.",
          examples:
            "JSON array of { before, emphasis, after } objects. The emphasis segment receives the accent color.",
        },
      },
      example: {
        type: grammarBlockType,
        props: grammarBlockDefaults,
        children: [],
      },
    },
  ],
} as const;
