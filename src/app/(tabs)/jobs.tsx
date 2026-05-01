import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { JobCard } from "@/components/job-card";
import type { Job } from "@/data/jobs";
import { useT } from "@/lib/i18n";
import { useActiveIdentity } from "@/store/identity";
import {
  useJobsForBooker,
  useJobsForCleaner,
  useJobsForReviewer,
} from "@/store/jobs";

export default function JobsRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const identity = useActiveIdentity();
  const t = useT();

  const bookerJobs = useJobsForBooker(identity.id);
  const cleanerJobs = useJobsForCleaner(identity.id);
  const reviewerJobs = useJobsForReviewer(identity.id);

  const jobs: Job[] =
    identity.role === "booker"
      ? bookerJobs
      : identity.role === "cleaner"
        ? cleanerJobs
        : reviewerJobs;

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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        {jobs.length === 0 ? (
          <Text style={[styles.empty, { color: colors.text }]}>
            {emptyCopy}
          </Text>
        ) : (
          jobs.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              onPress={() => router.push(`/jobs/${j.id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  empty: { fontSize: 14, opacity: 0.6, paddingVertical: 8 },
});
