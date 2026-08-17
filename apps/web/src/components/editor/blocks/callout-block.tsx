"use client";

import {
  CheckCircle2Icon,
  CircleAlertIcon,
  InfoIcon,
  LightbulbIcon,
} from "lucide-react";
import { createReactBlockSpec } from "@blocknote/react";

import { calloutBlockType, calloutTones } from "~/lib/blocknote/block-catalog";

const toneStyles = {
  info: {
    className:
      "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100",
    icon: InfoIcon,
    label: "Catatan",
  },
  tip: {
    className:
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100",
    icon: LightbulbIcon,
    label: "Tip belajar",
  },
  warning: {
    className:
      "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-100",
    icon: CircleAlertIcon,
    label: "Perhatian",
  },
  success: {
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100",
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
        <div
          className={`my-1 grid grid-cols-[auto_1fr] gap-x-3 rounded-xl border-l-4 px-4 py-3 ${tone.className}`}
        >
          <button
            aria-label="Ubah nada callout"
            className="mt-0.5 flex h-fit items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-bold tracking-wide uppercase transition hover:bg-black/5 dark:hover:bg-white/10"
            contentEditable={false}
            onClick={() =>
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
      );
    },
  },
)();
