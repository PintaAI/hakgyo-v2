import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Action, Eyebrow, Spinner } from "../src/components/learning-ui";
import { authClient } from "../src/lib/auth-client";
import {
  findMaterialLink,
  itemMaterialLinks,
  materialLinkPreview,
} from "../src/lib/material-links";
import { openCourseItem } from "../src/lib/navigation";
import { firstParam } from "../src/lib/route-params";
import { api } from "../src/lib/trpc";
import { useCourseItem } from "../src/sync/hooks";

/**
 * Preview of a material link (`hakgyo-material:`), opened from a material.
 * The target comes from the source item's `materialLinks`: composed from the
 * course bundle (a placement in this course, else in a course the learner is
 * enrolled in), else from `learning.getCourseItem` online.
 */
export default function MaterialLinkSheet() {
  const params = useLocalSearchParams<{
    materialId?: string | string[];
    anchor?: string | string[];
    courseId?: string | string[];
    sourceCourseItemId?: string | string[];
  }>();
  const materialId = firstParam(params.materialId);
  const anchor = firstParam(params.anchor) || null;
  const courseId = firstParam(params.courseId);
  const sourceCourseItemId = firstParam(params.sourceCourseItemId);
  const { data: session } = authClient.useSession();
  const source = useCourseItem(courseId || undefined, sourceCourseItemId, {
    enabled: Boolean(session && materialId),
  });
  const localLink =
    source.source === "local"
      ? findMaterialLink(itemMaterialLinks(source.data), materialId, courseId)
      : null;
  // The bundle only knows placements the learner can open offline; the
  // server may still find one (a course outside the downloaded bundles).
  const needsOnline =
    source.source === "local" && !localLink && Boolean(sourceCourseItemId);
  const online = api.learning.getCourseItem.useQuery(
    { courseItemId: sourceCourseItemId },
    { enabled: needsOnline, retry: false },
  );
  const link =
    localLink ??
    findMaterialLink(
      itemMaterialLinks(source.source === "online" ? source.data : online.data),
      materialId,
      courseId,
    );
  const pending = source.isPending || (needsOnline && online.isPending);

  if (pending && !link) {
    return (
      <View className="px-5 pb-8 pt-8">
        <Spinner />
      </View>
    );
  }

  if (!link) {
    return (
      <View className="gap-2 px-5 pb-8 pt-6">
        <Eyebrow tone="primary">Materi terkait</Eyebrow>
        <Text
          accessibilityRole="header"
          className="text-xl font-black leading-7 tracking-tight text-foreground"
        >
          Materi ini belum ada di kelasmu
        </Text>
      </View>
    );
  }

  const preview = materialLinkPreview(link, anchor);

  return (
    <View className="gap-5 px-5 pb-6 pt-6">
      <View className="gap-2">
        <Eyebrow tone="primary">Materi terkait</Eyebrow>
        <Text
          accessibilityRole="header"
          className="text-2xl font-black leading-8 tracking-tight text-foreground"
          numberOfLines={3}
        >
          {preview.title}
        </Text>
        {preview.materialTitle ? (
          <Text
            className="text-sm leading-5 text-muted-foreground"
            numberOfLines={2}
          >
            Bagian dari {preview.materialTitle}
          </Text>
        ) : null}
        {preview.excerpt ? (
          <Text
            className="text-base leading-6 text-muted-foreground"
            numberOfLines={6}
          >
            {preview.excerpt}
          </Text>
        ) : null}
      </View>
      <Action
        trailingIcon="arrow.right"
        onPress={() =>
          openCourseItem(
            {
              courseId: link.courseId,
              courseItemId: link.courseItemId,
              anchor,
            },
            { replace: true },
          )
        }
      >
        Baca lengkap
      </Action>
    </View>
  );
}
