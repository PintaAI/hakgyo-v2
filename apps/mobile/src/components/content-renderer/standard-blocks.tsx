import { ScrollView, Text, View } from "react-native";

import { InlineContent } from "./inline-content";
import { isRecord, stringProp } from "./normalize";
import { ContentAudio, ContentFile, ContentImage } from "./media";
import type { BlockRendererProps, ContentBlockRenderer } from "./types";

function Paragraph({ block }: BlockRendererProps) {
  return (
    <InlineContent
      className="text-base leading-7 text-foreground"
      content={block.content}
    />
  );
}

function Heading({ block }: BlockRendererProps) {
  const level = block.props.level;
  const className =
    level === 1
      ? "text-3xl font-black leading-9 tracking-tight text-foreground"
      : level === 2
        ? "text-2xl font-black leading-8 tracking-tight text-foreground"
        : "text-xl font-bold leading-7 text-foreground";

  return <InlineContent className={className} content={block.content} />;
}

function BulletListItem({ block }: BlockRendererProps) {
  return (
    <View className="flex-row gap-3 pl-1">
      <Text className="pt-0.5 text-base leading-7 text-muted-foreground">
        •
      </Text>
      <InlineContent
        className="min-w-0 flex-1 text-base leading-7 text-foreground"
        content={block.content}
      />
    </View>
  );
}

function NumberedListItem({ block, orderedIndex }: BlockRendererProps) {
  return (
    <View className="flex-row gap-3 pl-1">
      <Text className="min-w-5 pt-0.5 text-sm font-bold leading-7 text-muted-foreground">
        {orderedIndex}.
      </Text>
      <InlineContent
        className="min-w-0 flex-1 text-base leading-7 text-foreground"
        content={block.content}
      />
    </View>
  );
}

function CheckListItem({ block }: BlockRendererProps) {
  const checked = block.props.checked === true;

  return (
    <View className="flex-row gap-3 pl-1">
      <View
        className={`mt-1 size-5 items-center justify-center rounded-md border ${checked ? "border-primary bg-primary" : "border-border"}`}
      >
        {checked ? (
          <Text className="text-xs font-black text-primary-foreground">✓</Text>
        ) : null}
      </View>
      <InlineContent
        className={`min-w-0 flex-1 text-base leading-7 ${checked ? "text-muted-foreground line-through" : "text-foreground"}`}
        content={block.content}
      />
    </View>
  );
}

function Quote({ block }: BlockRendererProps) {
  return (
    <View className="border-l-4 border-primary py-1 pl-4">
      <InlineContent
        className="text-base italic leading-7 text-foreground"
        content={block.content}
      />
    </View>
  );
}

function CodeBlock({ block }: BlockRendererProps) {
  return (
    <ScrollView
      className="rounded-xl border border-border bg-muted/60"
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <InlineContent
        className="p-4 font-mono text-sm leading-6 text-foreground"
        content={block.content}
      />
    </ScrollView>
  );
}

function Divider() {
  return <View className="h-px bg-border" />;
}

function Table({ block }: BlockRendererProps) {
  const table = isRecord(block.content) ? block.content : {};
  const rows = Array.isArray(table.rows) ? table.rows : [];
  const headerRows =
    typeof table.headerRows === "number" ? table.headerRows : 1;
  const headerCols =
    typeof table.headerCols === "number" ? table.headerCols : 0;

  if (!rows.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="min-w-full overflow-hidden rounded-xl border border-border">
        {rows.map((rawRow, rowIndex) => {
          const row = isRecord(rawRow) ? rawRow : {};
          const cells = Array.isArray(row.cells) ? row.cells : [];

          return (
            <View
              className={`flex-row ${rowIndex > 0 ? "border-t border-border" : "bg-muted/60"}`}
              key={rowIndex}
            >
              {cells.map((cell, cellIndex) => {
                const tableCell =
                  isRecord(cell) && cell.type === "tableCell" ? cell : null;
                const colspan =
                  tableCell &&
                  isRecord(tableCell.props) &&
                  typeof tableCell.props.colspan === "number"
                    ? Math.max(1, tableCell.props.colspan)
                    : 1;
                const isHeader =
                  rowIndex < headerRows || cellIndex < headerCols;

                return (
                  <View
                    className={`px-3 py-2.5 ${cellIndex > 0 ? "border-l border-border" : ""} ${isHeader ? "bg-muted/60" : ""}`}
                    key={cellIndex}
                    style={{ width: 160 * colspan }}
                  >
                    <InlineContent
                      className={`text-sm leading-5 text-foreground ${isHeader ? "font-bold" : ""}`}
                      content={tableCell?.content ?? cell}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ImageBlock({ block }: BlockRendererProps) {
  return (
    <ContentImage
      accessibilityLabel={stringProp(block.props, "name", "Lesson image")}
      caption={stringProp(block.props, "caption")}
      source={stringProp(block.props, "url")}
    />
  );
}

function AudioBlock({ block }: BlockRendererProps) {
  return (
    <ContentAudio
      caption={stringProp(block.props, "caption")}
      fileName={stringProp(block.props, "name", "Audio")}
      source={stringProp(block.props, "url")}
    />
  );
}

function FileBlock({ block }: BlockRendererProps) {
  return (
    <ContentFile
      fileName={stringProp(block.props, "name", "Open file")}
      source={stringProp(block.props, "url")}
    />
  );
}

export const standardBlockRenderers: Readonly<
  Record<string, ContentBlockRenderer>
> = {
  paragraph: Paragraph,
  heading: Heading,
  bulletListItem: BulletListItem,
  numberedListItem: NumberedListItem,
  checkListItem: CheckListItem,
  quote: Quote,
  codeBlock: CodeBlock,
  divider: Divider,
  table: Table,
  image: ImageBlock,
  audio: AudioBlock,
  video: FileBlock,
  file: FileBlock,
};
