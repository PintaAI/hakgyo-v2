import { DynamicBlockNoteEditor } from "~/components/editor";
import {
  conversationBlockDefaults,
  conversationBlockType,
} from "~/lib/blocknote/block-catalog";

export default function ConversationBlockPreviewPage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <DynamicBlockNoteEditor
        editable={false}
        initialContent={[
          {
            type: conversationBlockType,
            props: conversationBlockDefaults,
          },
        ]}
        trailingBlock={false}
      />
    </main>
  );
}
