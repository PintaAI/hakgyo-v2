import { DynamicBlockNoteEditor } from "~/components/editor";
import {
  conversationBlockDefaults,
  conversationBlockSectionVariants,
  conversationBlockType,
} from "~/lib/blocknote/block-catalog";

export default async function ConversationBlockPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;
  const sectionVariant =
    conversationBlockSectionVariants.find((value) => value === variant) ??
    conversationBlockDefaults.sectionVariant;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <DynamicBlockNoteEditor
        editable={false}
        initialContent={[
          {
            type: conversationBlockType,
            props: { ...conversationBlockDefaults, sectionVariant },
          },
        ]}
        trailingBlock={false}
      />
    </main>
  );
}
