export const calloutBlockType = "callout";
export const calloutTones = ["info", "tip", "warning", "success"] as const;

export const hakgyoBlockCatalog = {
  catalogVersion: 1,
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
  ],
} as const;
