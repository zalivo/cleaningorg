import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Text, StyleSheet, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { JobCard } from "@/components/job-card";
import { type Job, formatWeekLabel, getWeekStart } from "@/data/jobs";
import { useT } from "@/lib/i18n";
import { useActiveIdentity } from "@/store/identity";
import {
  useHistoryForCleaner,
  useHistoryForReviewer,
} from "@/store/jobs";

interface WeekGroup {
  /** Milliseconds since epoch of the week's Monday 00:00 — used as React key. */
  key: number;
  label: string;
  jobs: Job[];
}

function groupByWeek(jobs: Job[]): WeekGroup[] {
  const map = new Map<number, Job[]>();
  for (const job of jobs) {
    const wk = getWeekStart(job.scheduledStart).getTime();
    const arr = map.get(wk) ?? [];
    arr.push(job);
    map.set(wk, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b - a) // newest week first
    .map(([wk, items]) => ({
      key: wk,
      label: formatWeekLabel(new Date(wk)),
      jobs: items, // already sorted desc by scheduledStart from the selector
    }));
}

export default function HistoryRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const identity = useActiveIdentity();
  const t = useT();

  const cleanerHistory = useHistoryForCleaner(identity.id);
  const reviewerHistory = useHistoryForReviewer(identity.id);

  // History tab is hidden for booker (see (tabs)/_layout.tsx href: null);
  // the empty array fallback is just defensive.
  const jobs =
    identity.role === "cleaner"
      ? cleanerHistory
      : identity.role === "reviewer"
        ? reviewerHistory
        : [];

  const groups = useMemo(() => groupByWeek(jobs), [jobs]);

  const emptyCopy =
    identity.role === "cleaner"
      ? t("history.empty.cleaner")
      : identity.role === "reviewer"
        ? t("history.empty.reviewer")
        : t("history.empty.default");

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={[]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{t("history.title")}</Text>
        {groups.length === 0 ? (
          <Text style={[styles.empty, { color: colors.text }]}>
            {emptyCopy}
          </Text>
        ) : (
          groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={[styles.groupLabel, { color: colors.text }]}>
                {group.label}
              </Text>
              {group.jobs.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  onPress={() => router.push(`/jobs/${j.id}`)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  empty: { fontSize: 14, opacity: 0.6, paddingVertical: 8 },
  group: { gap: 10 },
  groupLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    opacity: 0.6,
    letterSpacing: 0.5,
  },
});
