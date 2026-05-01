import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { type Job, type JobStatus, formatJobDate } from "@/data/jobs";

interface Props {
  job: Job;
  onPress?: () => void;
}

const STATUS_STYLES: Record<JobStatus, { bg: string; fg: string; label: string }> = {
  "ready-to-clean": { bg: BRAND_LIGHT, fg: BRAND, label: "Ready to clean" },
  cleaning: { bg: "#FEF3C7", fg: "#B45309", label: "Cleaning" },
  "ready-for-review": { bg: "#DBEAFE", fg: "#1D4ED8", label: "Ready for review" },
  reviewing: { bg: "#EDE9FE", fg: "#6D28D9", label: "Reviewing" },
  done: { bg: "#E5E7EB", fg: "#374151", label: "Done" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C", label: "Cancelled" },
};

export function JobCard({ job, onPress }: Props) {
  const { colors } = useTheme();
  const status = STATUS_STYLES[job.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.service, { color: colors.text }]}>
          {job.serviceName}
        </Text>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>
            {status.label}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Ionicons name="person-circle-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]}>
          {job.cleanerName} · reviewer {job.reviewerName}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]}>
          {formatJobDate(job.date)}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
          {job.address}
        </Text>
      </View>
      {job.declineCount > 0 && (
        <View style={[styles.row, styles.declineRow]}>
          <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
          <Text style={styles.declineText} numberOfLines={2}>
            Declined {job.declineCount}× — {job.declineReason}
          </Text>
        </View>
      )}
      <View style={styles.footer}>
        <Text style={[styles.price, { color: BRAND }]}>${job.totalPrice}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  service: { fontSize: 16, fontWeight: "600", flex: 1, paddingRight: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 13, opacity: 0.85, flex: 1 },
  declineRow: { backgroundColor: "#FEE2E2", padding: 6, borderRadius: 6 },
  declineText: { fontSize: 12, color: "#B91C1C", flex: 1 },
  footer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  price: { fontSize: 16, fontWeight: "700" },
});
