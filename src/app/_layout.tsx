import { ThemeProvider } from "@/components/theme-provider";
import { ToastContainer } from "@/components/toast";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function Layout() {
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
          <Stack.Screen
            name="properties/[id]"
            options={{
              headerShown: true,
              title: "Property",
              headerBackTitle: "Back",
            }}
          />
        </Stack>
        <ToastContainer />
      </View>
    </ThemeProvider>
  );
}
