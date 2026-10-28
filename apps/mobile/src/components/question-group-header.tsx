import { View } from "react-native";

import {
  NativeContentRenderer,
  type AssetUrlResolver,
  type ContentBlockRenderer,
} from "./content-renderer";
import { Eyebrow } from "./learning-ui";

/**
 * A group's shared part above each of its questions (docs/eps-topik-simulation.md section 4.5):
 * which questions it covers, its instructions and its stimulus (a passage, picture or audio).
 * Mirrors the web `QuestionGroupHeader`.
 */
export function QuestionGroupHeader({
  instructions,
  stimulus,
  first,
  last,
  renderers,
  resolveAssetUrl,
}: {
  instructions: unknown;
  stimulus: unknown;
  /** Display indexes of the group's first and last question. */
  first: number;
  last: number;
  /** Hides inline audio under a controlled player. */
  renderers?: Readonly<Record<string, ContentBlockRenderer>>;
  resolveAssetUrl: AssetUrlResolver;
}) {
  return (
    <View className="gap-2 border-b border-border pb-4">
      <Eyebrow size="xs">
        {first === last ? `Soal ${first + 1}` : `Soal ${first + 1}–${last + 1}`}
      </Eyebrow>
      {instructions ? (
        <NativeContentRenderer
          content={instructions}
          renderers={renderers}
          resolveAssetUrl={resolveAssetUrl}
        />
      ) : null}
      {stimulus ? (
        <NativeContentRenderer
          content={stimulus}
          renderers={renderers}
          resolveAssetUrl={resolveAssetUrl}
        />
      ) : null}
    </View>
  );
}
