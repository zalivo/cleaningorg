import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastContainer } from "@/components/toast";
import {
  ensureNotificationPermission,
  installNotificationHandler,
  readPayload,
} from "@/lib/notifications";

export default function Layout() {
  const router = useRouter();

  useEffect(() => {
    installNotificationHandler();
    ensureNotificationPermission();

    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { jobId } = readPayload(response.notification.request.content.data);
        if (jobId) router.push(`/jobs/${jobId}`);
      }
    );
    return () => sub.remove();
  }, [router]);

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
              title: "Book a Cleaning",
            }}
          />
          <Stack.Screen
            name="pros/[id]"
            options={{ headerShown: true, title: "", headerBackTitle: "Back" }}
          />
          <Stack.Screen
            name="jobs/[id]"
            options={{
              headerShown: true,
              title: "Job Details",
              headerBackTitle: "Back",
            }}
          />
        </Stack>
        <ToastContainer />
      </View>
    </ThemeProvider>
  );
}
