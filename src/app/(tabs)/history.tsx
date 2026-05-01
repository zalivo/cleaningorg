import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { JobCard } from "@/components/job-card";
import { useActiveIdentity } from "@/store/identity";
import {
  useHistoryForCleaner,
  useHistoryForReviewer,
} from "@/store/jobs";

export default function HistoryRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const identity = useActiveIdentity();

  const cleanerHistory = useHistoryForCleaner(identity.id);
  const reviewerHistory = useHistoryForReviewer(identity.id);

  const jobs = identity.role === "cleaner" ? cleanerHistory : reviewerHistory;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>History</Text>
        {jobs.length === 0 ? (
          <Text style={[styles.empty, { color: colors.text }]}>
            No completed work yet.
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
