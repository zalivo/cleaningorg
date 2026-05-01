import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, StyleSheet, ScrollView, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { JobCard } from "@/components/job-card";
import { WeekView } from "@/components/week-view";
import { BRAND } from "@/constants/colors";
import type { Job } from "@/data/jobs";
import { useT } from "@/lib/i18n";
import { useActiveIdentity } from "@/store/identity";
import {
  useHistoryForBooker,
  useJobsForBooker,
  useJobsForCleaner,
  useJobsForReviewer,
} from "@/store/jobs";

type ViewMode = "list" | "week";

export default function JobsRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const identity = useActiveIdentity();
  const t = useT();

  const bookerJobs = useJobsForBooker(identity.id);
  const bookerHistory = useHistoryForBooker(identity.id);
  const cleanerJobs = useJobsForCleaner(identity.id);
  const reviewerJobs = useJobsForReviewer(identity.id);

  // Cleaner-only toggle. Component state is fine — the issue specifically
  // says no need to persist across sessions, just within the running tab.
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const jobs: Job[] =
    identity.role === "booker"
      ? bookerJobs
      : identity.role === "cleaner"
        ? cleanerJobs
        : reviewerJobs;

  // Bookers don't have a History tab; their completed jobs go inline.
  const completed: Job[] =
    identity.role === "booker" ? bookerHistory : [];

  const title =
    identity.role === "booker"
      ? t("jobs.titles.booker")
      : identity.role === "cleaner"
        ? t("jobs.titles.cleaner")
        : t("jobs.titles.reviewer");

  const emptyCopy =
    identity.role === "booker"
      ? t("jobs.empty.booker")
      : identity.role === "cleaner"
        ? t("jobs.empty.cleaner")
        : t("jobs.empty.reviewer");

  const showWeekToggle = identity.role === "cleaner";
  const showWeek = showWeekToggle && viewMode === "week";

  const renderJob = (j: Job) => (
    <JobCard
      key={j.id}
      job={j}
      onPress={() => router.push(`/jobs/${j.id}`)}
    />
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={[]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {showWeekToggle && (
            <View
              style={[
                styles.toggle,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <ToggleButton
                label={t("jobs.modes.list")}
                active={viewMode === "list"}
                onPress={() => setViewMode("list")}
              />
              <ToggleButton
                label={t("jobs.modes.week")}
                active={viewMode === "week"}
                onPress={() => setViewMode("week")}
              />
            </View>
          )}
        </View>
        {showWeek ? (
          <WeekView
            jobs={jobs}
            onPressJob={(id) => router.push(`/jobs/${id}`)}
          />
        ) : jobs.length === 0 && completed.length === 0 ? (
          <Text style={[styles.empty, { color: colors.text }]}>
            {emptyCopy}
          </Text>
        ) : (
          <>
            {jobs.map(renderJob)}
            {completed.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>
                  {t("jobs.completed")}
                </Text>
                {completed.map(renderJob)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.toggleBtn,
        {
          backgroundColor: active ? BRAND : "transparent",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.toggleBtnText,
          { color: active ? "white" : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: "700", flex: 1 },
  toggle: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleBtnText: { fontSize: 13, fontWeight: "600" },
  empty: { fontSize: 14, opacity: 0.6, paddingVertical: 8 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    opacity: 0.6,
    marginTop: 8,
  },
});
