function countOpeningTags(html: string, tagPattern: RegExp) {
  return html.match(tagPattern)?.length ?? 0;
}

/**
 * PDF viewers commonly put copied text in a one-cell HTML table. BlockNote
 * correctly preserves that HTML, but the table semantics are accidental. Keep
 * real multi-row and multi-column clipboard tables intact.
 */
export function shouldPasteBlockNoteAsPlainText(
  html: string,
  plainText: string,
) {
  if (!html.trim() || !plainText.trim()) return false;

  return (
    countOpeningTags(html, /<table(?:\s|>)/gi) === 1 &&
    countOpeningTags(html, /<tr(?:\s|>)/gi) === 1 &&
    countOpeningTags(html, /<(?:td|th)(?:\s|>)/gi) === 1
  );
}

type BlockNotePasteContext = {
  event: {
    clipboardData: { getData: (type: string) => string } | null;
  };
  editor: { pasteText: (text: string) => boolean };
  defaultPasteHandler: () => boolean | undefined;
};

export function handleBlockNotePaste({
  event,
  editor,
  defaultPasteHandler,
}: BlockNotePasteContext) {
  const html = event.clipboardData?.getData("text/html") ?? "";
  const plainText = event.clipboardData?.getData("text/plain") ?? "";

  if (shouldPasteBlockNoteAsPlainText(html, plainText)) {
    return editor.pasteText(plainText);
  }

  return defaultPasteHandler();
}
