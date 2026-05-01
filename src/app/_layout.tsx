import { Confetti } from "@/components/confetti";
import { DemoIdentityDock } from "@/components/demo-identity-dock";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastContainer } from "@/components/toast";
import { useT } from "@/lib/i18n";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function Layout() {
  const t = useT();
  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="book"
            options={{
              presentation: "modal",
              headerShown: true,
              title: t("book.title"),
            }}
          />
          <Stack.Screen
            name="pros/[id]"
            options={{
              headerShown: true,
              title: "",
              headerBackTitle: t("job.actions.back"),
            }}
          />
          <Stack.Screen
            name="jobs/[id]"
            options={{
              headerShown: true,
              title: t("job.title"),
              headerBackTitle: t("job.actions.back"),
            }}
          />
          <Stack.Screen
            name="properties/[id]"
            options={{
              headerShown: true,
              title: t("property.detailTitle"),
              headerBackTitle: t("job.actions.back"),
            }}
          />
        </Stack>
        <DemoIdentityDock />
        <ToastContainer />
        <Confetti />
      </View>
    </ThemeProvider>
  );
}
