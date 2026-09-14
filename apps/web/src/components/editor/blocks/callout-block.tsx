"use client";

import {
  CheckCircle2Icon,
  CircleAlertIcon,
  InfoIcon,
  LightbulbIcon,
} from "lucide-react";
import { createReactBlockSpec } from "@blocknote/react";

import { calloutBlockType, calloutTones } from "~/lib/blocknote/block-catalog";

import { CustomBlockToolbar } from "./custom-block-toolbar";

const toneStyles = {
  info: {
    color: "blue",
    icon: InfoIcon,
    label: "Catatan",
  },
  tip: {
    color: "yellow",
    icon: LightbulbIcon,
    label: "Tip belajar",
  },
  warning: {
    color: "red",
    icon: CircleAlertIcon,
    label: "Perhatian",
  },
  success: {
    color: "green",
    icon: CheckCircle2Icon,
    label: "Poin penting",
  },
} as const;

export const calloutBlock = createReactBlockSpec(
  {
    type: calloutBlockType,
    propSchema: {
      tone: {
        default: "info",
        values: [...calloutTones],
      },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef, editor }) => {
      const tone = toneStyles[block.props.tone];
      const Icon = tone.icon;
      const currentToneIndex = calloutTones.indexOf(block.props.tone);
      const nextTone =
        calloutTones[(currentToneIndex + 1) % calloutTones.length];

      return (
        <div className="my-1 w-full" data-custom-block>
          <div className="mb-1 flex justify-end">
            <CustomBlockToolbar
              block={block}
              editable={editor.isEditable}
              onClear={() =>
                editor.updateBlock(block, {
                  content: "",
                })
              }
            />
          </div>
          <div
            className="grid grid-cols-[auto_1fr] gap-x-3 rounded-xl border-l-4 px-4 py-3"
            style={{
              backgroundColor: `var(--bn-colors-highlights-${tone.color}-background)`,
              borderColor: `var(--bn-colors-highlights-${tone.color}-text)`,
              color: `var(--bn-colors-highlights-${tone.color}-text)`,
            }}
          >
            <button
              aria-label="Ubah nada callout"
              className="hover:bg-foreground/5 dark:hover:bg-background/10 mt-0.5 flex h-fit items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-bold tracking-wide uppercase transition"
              contentEditable={false}
              disabled={!editor.isEditable}
              onClick={() =>
                editor.isEditable &&
                editor.updateBlock(block, { props: { tone: nextTone } })
              }
              title="Ubah nada callout"
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" />
              {tone.label}
            </button>
            <div className="min-w-0 leading-7" ref={contentRef} />
          </div>
        </div>
      );
    },
  },
)();
