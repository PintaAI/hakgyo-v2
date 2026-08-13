"use client";

import dynamic from "next/dynamic";

import type { BlockNoteEditorProps } from "./block-note-editor";

export const DynamicBlockNoteEditor = dynamic<BlockNoteEditorProps>(
  () => import("./block-note-editor").then((module) => module.BlockNoteEditor),
  { ssr: false },
);
