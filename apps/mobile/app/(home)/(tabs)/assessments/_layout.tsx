import { Stack } from "expo-router";

import { useTabStackScreenOptions } from "../../../../src/navigation/tab-stack-options";

export default function AssessmentsTabLayout() {
  const screenOptions = useTabStackScreenOptions();

  return <Stack screenOptions={screenOptions} />;
}
