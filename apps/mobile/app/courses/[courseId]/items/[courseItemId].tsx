import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  NativeContentRenderer,
  useApiAssetResolver,
} from "../../../../src/components/content-renderer";
import { authClient } from "../../../../src/lib/auth-client";
import { api } from "../../../../src/lib/trpc";
import { useAppTheme } from "../../../../src/providers/AppThemeProvider";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function CourseItemScreen() {
  const params = useLocalSearchParams<{
    courseId: string | string[];
    courseItemId: string | string[];
  }>();
  const courseId = firstParam(params.courseId);
  const courseItemId = firstParam(params.courseItemId);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { colors } = useAppTheme();
  const resolveAssetUrl = useApiAssetResolver();
  const utils = api.useUtils();
  const itemQuery = api.learning.getCourseItem.useQuery(
    { courseItemId },
    { enabled: Boolean(session && courseItemId), retry: false },
  );
  const markProgress = api.learning.markContentProgress.useMutation();
  const item = itemQuery.data;
  const material = item?.material;
  const completed = item?.progress[0]?.status === "COMPLETED";

  useEffect(() => {
    if (!isSessionPending && !session && courseId && courseItemId) {
      router.replace({
        pathname: "/auth",
        params: {
          redirectTo: `/courses/${encodeURIComponent(courseId)}/items/${encodeURIComponent(courseItemId)}`,
        },
      });
    }
  }, [courseId, courseItemId, isSessionPending, session]);

  useEffect(() => {
    if (material && item && item.progress.length === 0) {
      markProgress.mutate({ courseItemId, status: "IN_PROGRESS" });
    }
    // Progress creation is idempotent and should run only when the item loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseItemId, item?.id, item?.progress.length, material]);

  async function completeMaterial() {
    try {
      await markProgress.mutateAsync({
        courseItemId,
        status: "COMPLETED",
      });
      await Promise.all([
        utils.learning.getCourseItem.invalidate({ courseItemId }),
        utils.learning.getCourseOutline.invalidate({ courseId }),
        utils.learning.listMyCourses.invalidate(),
      ]);
    } catch {
      // The mutation state renders a retryable error below the action.
    }
  }

  const loading =
    isSessionPending ||
    (!session && Boolean(courseItemId)) ||
    itemQuery.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode:
            Platform.OS === "ios" ? "minimal" : undefined,
          headerShadowVisible: false,
          headerTitle: material?.title ?? "Material",
          headerLargeTitle: false,
          headerStyle: {
            backgroundColor:
              Platform.OS === "ios" ? "transparent" : colors.background,
          },
          headerTintColor: colors.foreground,
          headerTransparent: Platform.OS === "ios",
          scrollEdgeEffects:
            Platform.OS === "ios" ? { top: "soft" } : undefined,
        }}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center gap-3 bg-background">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-sm text-muted-foreground">
            Loading material…
          </Text>
        </View>
      ) : itemQuery.isError || !item || !material ? (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
          <Text className="text-xl font-black text-foreground">
            Material unavailable
          </Text>
          <Text className="text-center text-sm leading-5 text-muted-foreground">
            This activity is unavailable or is not a material lesson.
          </Text>
          <Pressable
            className="rounded-full border border-border px-5 py-3"
            onPress={() => router.back()}
          >
            <Text className="font-bold text-foreground">Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="gap-7 px-5 pb-14 pt-4"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="gap-2 border-b border-border pb-6">
            <Text className="text-xs font-black uppercase tracking-[2px] text-muted-foreground">
              Learning material
            </Text>
            <Text className="text-3xl font-black leading-10 tracking-tight text-foreground">
              {material.title}
            </Text>
            {material.description ? (
              <Text className="text-sm leading-6 text-muted-foreground">
                {material.description}
              </Text>
            ) : null}
          </View>

          <NativeContentRenderer
            content={material.content}
            resolveAssetUrl={resolveAssetUrl}
          />

          <Pressable
            accessibilityRole="button"
            className={`items-center rounded-full px-5 py-4 ${completed ? "bg-muted" : "bg-primary"}`}
            disabled={completed || markProgress.isPending}
            onPress={() => void completeMaterial()}
          >
            <Text
              className={`font-black ${completed ? "text-muted-foreground" : "text-primary-foreground"}`}
            >
              {markProgress.isPending
                ? "Saving…"
                : completed
                  ? "Material completed"
                  : "Mark as completed"}
            </Text>
          </Pressable>
          {markProgress.isError ? (
            <Text className="text-center text-sm text-destructive">
              Progress could not be saved. Please try again.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </>
  );
}
