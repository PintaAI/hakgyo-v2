export const calloutBlockType = "callout";
export const assetAudioBlockType = "assetAudio";
export const assetImageBlockType = "assetImage";
export const grammarBlockType = "grammar";
export const lessonPageBlockType = "lessonPage";
export const conversationBlockType = "conversation";
export const cultureBlockType = "culture";
export const vocabularyReferenceBlockType = "vocabularyReference";
export const assessmentReferenceBlockType = "assessmentReference";
export const calloutTones = ["info", "tip", "warning", "success"] as const;
export const grammarBlockThemes = ["amber", "blue", "green", "rose"] as const;
export const lessonPageThemes = ["rose", "ocean", "forest", "sunset"] as const;
export const conversationBlockThemes = [
  "violet",
  "blue",
  "green",
  "rose",
] as const;
export const conversationBlockSectionVariants = [
  "useful-expression",
  "pronunciation",
  "both",
] as const;
export const cultureBlockThemes = ["teal", "rose", "ocean", "amber"] as const;

export const conversationBlockLines = [
  {
    speaker: "다라",
    korean: "아지자 씨, 오늘 친구를 만날 거예요?",
    translation: "Aziza, are you going to meet your friend today?",
  },
  {
    speaker: "아지자",
    korean: "아니요, 친구가 너무 바빠서 못 만나요.",
    translation: "No, my friend is too busy so we can’t meet.",
  },
  {
    speaker: "다라",
    korean: "그럼 뭐 할 거예요?",
    translation: "Then what are you going to do?",
  },
  {
    speaker: "아지자",
    korean: "기숙사에서 책을 읽을 거예요.",
    translation: "I’m going to read a book in the dormitory.",
  },
] as const;

export const conversationBlockQuestions = [
  {
    korean: "아지자 씨는 오늘 친구를 만날 거예요?",
    translation: "Is Aziza going to meet a friend today?",
  },
  {
    korean: "다라 씨는 오늘 뭐 할 거예요?",
    translation: "What is Dara going to do today?",
  },
] as const;

export const speakingPracticeExpressions = [
  { korean: "친구를 만나다", translation: "meet a friend" },
  { korean: "일이 많다", translation: "have a lot of work" },
] as const;

export const speakingPracticeDialogue = [
  { speaker: "가", korean: "주말에 친구를 만났어요?" },
  { speaker: "나", korean: "아니요, 친구를 못 만났어요." },
  { speaker: "가", korean: "왜 못 만났어요?" },
  { speaker: "나", korean: "일이 많아서 못 만났어요." },
] as const;

export const usefulExpressionDialogue = [
  {
    speaker: "가",
    korean: "안녕하세요? 처음 뵙겠습니다.",
    translation: "Hello. It is a pleasure to meet you.",
  },
  {
    speaker: "나",
    korean: "안녕하세요? 잘 부탁드립니다.",
    translation: "Hello. Nice to meet you as well.",
  },
] as const;

export const conversationSpeakingPracticeDefaults = {
  practiceAssetId: "",
  practiceFileName: "",
  practiceContentType: "",
  practicePromptKo: "제시된 표현을 활용하여 대화해 보세요.",
  practicePromptTranslation:
    "Practice speaking using the provided expressions.",
  practiceExpressions: JSON.stringify(speakingPracticeExpressions),
  practiceDialogue: JSON.stringify(speakingPracticeDialogue),
} as const;

export const conversationUsefulExpressionDefaults = {
  usefulExpressionEyebrow: "유용한 표현 · USEFUL EXPRESSION",
  usefulExpressionAudioTrack: "31",
  usefulExpressionPhraseKo: "잘 부탁드립니다.",
  usefulExpressionPhraseTranslation: "Nice to meet you.",
  usefulExpressionDialogue: JSON.stringify(usefulExpressionDialogue),
  usefulExpressionNote:
    "There is no exact equivalent of ‘잘 부탁드립니다’ in English. It is commonly used when meeting someone for the first time and expresses a hope for a good relationship.",
} as const;

export const pronunciationBlockExamples = [
  { korean: "두다", pronunciation: "[투다]" },
  { korean: "다리", pronunciation: "[타리]" },
] as const;

export const conversationPronunciationDefaults = {
  pronunciationEyebrow: "발음 · PRONUNCIATION",
  pronunciationAudioTrack: "89",
  pronunciationSymbol: "ㄷ",
  pronunciationDescriptionKo:
    "‘ㄷ’는 어두의 초성에 올 때는 무성음으로 발음되고 모음 사이에 올 때는 유성음으로 발음됩니다.",
  pronunciationDescriptionTranslation:
    "When ㄷ appears at the beginning of a syllable, it is pronounced as a voiceless sound. Between vowels, it becomes voiced.",
  pronunciationExamples: JSON.stringify(pronunciationBlockExamples),
} as const;

export const conversationBlockDefaults = {
  theme: "violet",
  sectionVariant: "pronunciation",
  showTip: true,
  assetId: "",
  fileName: "",
  contentType: "",
  eyebrow: "대화 · CONVERSATION",
  number: "02",
  audioTrack: "90",
  lines: JSON.stringify(conversationBlockLines),
  questionsLabel: "대답해 봐요! · ANSWER ME!",
  questions: JSON.stringify(conversationBlockQuestions),
  tipTitle: "-지 못하다",
  tipBody:
    "‘못’ 대신에 ‘-지 못하다’를 동사 뒤에 붙여 부정의 뜻을 나타낼 수 있어요.",
  tipTranslation:
    "-지 못하다 can be attached to verbs to express negation instead of 못.",
  ...conversationSpeakingPracticeDefaults,
  ...conversationUsefulExpressionDefaults,
  ...conversationPronunciationDefaults,
} as const;

export const cultureChecklistItems = [
  {
    ko: "한국 문화를 이해하고 간단히 설명할 수 있다.",
    en: "Can understand and briefly explain Korean culture.",
  },
  {
    ko: "전통과 현대 생활의 차이를 말할 수 있다.",
    en: "Can talk about differences between traditional and modern life.",
  },
  {
    ko: "사진을 보고 문화 정보를 설명할 수 있다.",
    en: "Can describe cultural information based on photos.",
  },
] as const;

export const cultureBlockDefaults = {
  theme: "teal",
  eyebrow: "문화와 정보 · CULTURE & INFORMATION",
  titleKo: "한국의 온돌과 좌식 생활",
  titleEn: "Ondol and Floor-sitting Life in Korea",
  bodyKo1:
    "한국에는 바닥에 앉아 식사하고 휴식하는 좌식 생활이 있습니다. 가족이 바닥에 함께 앉아 대화하며 자연스럽게 유대감을 나눕니다.",
  bodyEn1:
    "In Korea, people often sit on the floor to eat and relax. Families sit together on the floor, talk, and naturally build closeness.",
  assetId: "",
  fileName: "",
  contentType: "",
  secondAssetId: "",
  secondFileName: "",
  secondContentType: "",
  bodyKo2:
    "이러한 생활은 바닥을 따뜻하게 하는 전통 난방인 '온돌'과 함께 이어져 왔습니다. 오늘날에도 아파트의 따뜻한 바닥에 앉아 TV를 보거나 쉬는 모습을 쉽게 볼 수 있습니다.",
  bodyEn2:
    "This lifestyle continued together with 'ondol', the traditional heating that keeps the floor warm. Even today, you can often see people sitting on the warm apartment floor to watch TV or rest.",
  checklistTitleKo: "확인해요",
  checklistTitleEn: "self assessment",
  checklistItems: JSON.stringify(cultureChecklistItems),
} as const;

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
  catalogVersion: 10,
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
      type: conversationBlockType,
      purpose:
        "Present a bilingual textbook-style conversation with speaker turns, comprehension questions, optional contextual artwork, and a language tip.",
      content: "none",
      props: {
        theme: {
          type: "string",
          enum: conversationBlockThemes,
          default: conversationBlockDefaults.theme,
        },
        sectionVariant: {
          type: "string",
          enum: conversationBlockSectionVariants,
          default: conversationBlockDefaults.sectionVariant,
        },
        showTip: { type: "boolean", default: true },
        assetId: { type: "string", default: "" },
        fileName: { type: "string", default: "" },
        contentType: { type: "string", default: "" },
        eyebrow: { type: "string", default: conversationBlockDefaults.eyebrow },
        number: { type: "string", default: conversationBlockDefaults.number },
        audioTrack: {
          type: "string",
          default: conversationBlockDefaults.audioTrack,
        },
        lines: { type: "string", default: conversationBlockDefaults.lines },
        questionsLabel: {
          type: "string",
          default: conversationBlockDefaults.questionsLabel,
        },
        questions: {
          type: "string",
          default: conversationBlockDefaults.questions,
        },
        tipTitle: {
          type: "string",
          default: conversationBlockDefaults.tipTitle,
        },
        tipBody: {
          type: "string",
          default: conversationBlockDefaults.tipBody,
        },
        tipTranslation: {
          type: "string",
          default: conversationBlockDefaults.tipTranslation,
        },
        practiceAssetId: { type: "string", default: "" },
        practiceFileName: { type: "string", default: "" },
        practiceContentType: { type: "string", default: "" },
        practicePromptKo: {
          type: "string",
          default: conversationBlockDefaults.practicePromptKo,
        },
        practicePromptTranslation: {
          type: "string",
          default: conversationBlockDefaults.practicePromptTranslation,
        },
        practiceExpressions: {
          type: "string",
          default: conversationBlockDefaults.practiceExpressions,
        },
        practiceDialogue: {
          type: "string",
          default: conversationBlockDefaults.practiceDialogue,
        },
        usefulExpressionEyebrow: {
          type: "string",
          default: conversationBlockDefaults.usefulExpressionEyebrow,
        },
        usefulExpressionAudioTrack: {
          type: "string",
          default: conversationBlockDefaults.usefulExpressionAudioTrack,
        },
        usefulExpressionPhraseKo: {
          type: "string",
          default: conversationBlockDefaults.usefulExpressionPhraseKo,
        },
        usefulExpressionPhraseTranslation: {
          type: "string",
          default: conversationBlockDefaults.usefulExpressionPhraseTranslation,
        },
        usefulExpressionDialogue: {
          type: "string",
          default: conversationBlockDefaults.usefulExpressionDialogue,
        },
        usefulExpressionNote: {
          type: "string",
          default: conversationBlockDefaults.usefulExpressionNote,
        },
        pronunciationEyebrow: {
          type: "string",
          default: conversationBlockDefaults.pronunciationEyebrow,
        },
        pronunciationAudioTrack: {
          type: "string",
          default: conversationBlockDefaults.pronunciationAudioTrack,
        },
        pronunciationSymbol: {
          type: "string",
          default: conversationBlockDefaults.pronunciationSymbol,
        },
        pronunciationDescriptionKo: {
          type: "string",
          default: conversationBlockDefaults.pronunciationDescriptionKo,
        },
        pronunciationDescriptionTranslation: {
          type: "string",
          default:
            conversationBlockDefaults.pronunciationDescriptionTranslation,
        },
        pronunciationExamples: {
          type: "string",
          default: conversationBlockDefaults.pronunciationExamples,
        },
      },
      guidance: {
        useWhen: [
          "A lesson introduces a dialogue between two or more speakers.",
          "The dialogue needs bilingual lines and short comprehension checks.",
        ],
        jsonProps: {
          lines:
            "JSON array of { speaker, korean, translation } objects. The editor can add and remove turns.",
          questions:
            "JSON array of { korean, translation } objects. The editor can add and remove questions.",
          practiceExpressions:
            "JSON array of { korean, translation } objects used by the speaking-practice section.",
          practiceDialogue:
            "JSON array of { speaker, korean } objects used by the speaking-practice section.",
          usefulExpressionDialogue:
            "JSON array of { speaker, korean, translation } objects used by the useful-expression panel.",
          pronunciationExamples:
            "JSON array of { korean, pronunciation } objects used by the pronunciation section.",
        },
      },
      example: {
        type: conversationBlockType,
        props: conversationBlockDefaults,
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
    {
      type: cultureBlockType,
      purpose:
        "Present a Korean culture & information article with bilingual paragraphs, optional images, and a self-assessment checklist.",
      content: "none",
      props: {
        theme: {
          type: "string",
          enum: cultureBlockThemes,
          default: cultureBlockDefaults.theme,
        },
        eyebrow: { type: "string", default: cultureBlockDefaults.eyebrow },
        titleKo: { type: "string", default: cultureBlockDefaults.titleKo },
        titleEn: { type: "string", default: cultureBlockDefaults.titleEn },
        bodyKo1: { type: "string", default: cultureBlockDefaults.bodyKo1 },
        bodyEn1: { type: "string", default: cultureBlockDefaults.bodyEn1 },
        assetId: { type: "string", default: "" },
        fileName: { type: "string", default: "" },
        contentType: { type: "string", default: "" },
        secondAssetId: { type: "string", default: "" },
        secondFileName: { type: "string", default: "" },
        secondContentType: { type: "string", default: "" },
        bodyKo2: { type: "string", default: cultureBlockDefaults.bodyKo2 },
        bodyEn2: { type: "string", default: cultureBlockDefaults.bodyEn2 },
        checklistTitleKo: {
          type: "string",
          default: cultureBlockDefaults.checklistTitleKo,
        },
        checklistTitleEn: {
          type: "string",
          default: cultureBlockDefaults.checklistTitleEn,
        },
        checklistItems: {
          type: "string",
          default: cultureBlockDefaults.checklistItems,
        },
      },
      guidance: {
        useWhen: [
          "A lesson needs to explain cultural context or background information.",
          "The material benefits from bilingual explanation and visual examples.",
        ],
        jsonProps: {
          checklistItems:
            "JSON array of { ko, en } objects. The editor can add and remove checklist rows.",
        },
      },
      example: {
        type: cultureBlockType,
        props: cultureBlockDefaults,
        children: [],
      },
    },
    {
      type: vocabularyReferenceBlockType,
      purpose:
        "Embed a live vocabulary set from the organization library and link learners to vocabulary practice.",
      content: "none",
      props: {
        vocabularySetId: { type: "string", default: "" },
      },
      guidance: {
        useWhen: [
          "A lesson should display the current entries from an existing vocabulary set.",
        ],
      },
      example: {
        type: vocabularyReferenceBlockType,
        props: { vocabularySetId: "vocabulary-set-id" },
        children: [],
      },
    },
    {
      type: assessmentReferenceBlockType,
      purpose:
        "Embed a live summary of an existing assessment and let learners launch it.",
      content: "none",
      props: {
        assessmentId: { type: "string", default: "" },
      },
      guidance: {
        useWhen: [
          "A lesson should introduce an assessment that is also attached to the module.",
        ],
      },
      example: {
        type: assessmentReferenceBlockType,
        props: { assessmentId: "assessment-id" },
        children: [],
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
  ],
} as const;
