import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { Tabs } from "expo-router";
import { BRAND } from "@/constants/colors";
import { useT } from "@/lib/i18n";
import { useActiveIdentity } from "@/store/identity";
import {
  useJobsForBooker,
  useJobsForCleaner,
  useJobsForReviewer,
} from "@/store/jobs";

export default function TabsLayout() {
  const { colors } = useTheme();
  const identity = useActiveIdentity();
  const role = identity.role;
  const t = useT();

  const bookerJobs = useJobsForBooker(identity.id);
  const cleanerJobs = useJobsForCleaner(identity.id);
  const reviewerJobs = useJobsForReviewer(identity.id);

  const jobsLabel =
    role === "booker"
      ? t("tabs.bookings")
      : role === "cleaner"
        ? t("tabs.jobs")
        : t("tabs.review");

  const jobsCount =
    role === "booker"
      ? bookerJobs.length
      : role === "cleaner"
        ? cleanerJobs.length
        : reviewerJobs.length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          href: role === "booker" ? "/" : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: jobsLabel,
          tabBarBadge: jobsCount > 0 ? jobsCount : undefined,
          tabBarBadgeStyle: { backgroundColor: BRAND, color: "white" },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          href: role === "booker" ? null : "/history",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
