import { ThemeProvider } from "@/components/theme-provider";
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <ThemeProvider>
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
          options={{ headerShown: true, title: "" }}
        />
      </Stack>
    </ThemeProvider>
  );
}
