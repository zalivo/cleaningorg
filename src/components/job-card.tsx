import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BRAND } from "@/constants/colors";
import {
  type Job,
  formatJobWindow,
  formatPrice,
  isJobLate,
} from "@/data/jobs";
import { type MessageKey, useT } from "@/lib/i18n";
import { STATUS_COLORS } from "@/lib/job-status-colors";

interface Props {
  job: Job;
  onPress?: () => void;
}

export function JobCard({ job, onPress }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const status = STATUS_COLORS[job.status];
  const statusLabel = t(`status.${job.status}` as MessageKey);
  const late = isJobLate(job);

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
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {job.propertyName}
        </Text>
        <View style={styles.headerPills}>
          <View style={[styles.pill, { backgroundColor: status.bg }]}>
            <Text style={[styles.pillText, { color: status.fg }]}>
              {statusLabel}
            </Text>
          </View>
          {job.declineCount > 0 &&
            !(job.status === "ready-to-clean" && job.declineReason) && (
              <View style={styles.rePill}>
                <Text style={styles.rePillText}>
                  {t("job.cleanedShort", { count: job.declineCount })}
                </Text>
              </View>
            )}
        </View>
      </View>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
          {job.address}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="person-circle-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]}>
          {t("card.cleanerAndReviewer", {
            cleaner: job.cleanerName,
            reviewer: job.reviewerName,
          })}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
          {formatJobWindow(job.scheduledStart, job.scheduledEnd)}
        </Text>
        {late && (
          <View
            style={styles.latePill}
            accessibilityLabel="This job is past its scheduled start"
          >
            <Ionicons name="time-outline" size={12} color="#92400E" />
            <Text style={styles.lateText}>{t("late")}</Text>
          </View>
        )}
      </View>
      {job.status === "ready-to-clean" &&
        job.declineCount > 0 &&
        job.declineReason && (
          <View style={[styles.row, styles.declineRow]}>
            <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
            <Text style={styles.declineText} numberOfLines={2}>
              {t("job.declinedShort", {
                count: job.declineCount,
                reason: job.declineReason,
              })}
            </Text>
          </View>
        )}
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: BRAND }]}>
          {formatPrice(job.priceCents)}
        </Text>
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
  title: { fontSize: 16, fontWeight: "600", flex: 1, paddingRight: 8 },
  headerPills: { flexDirection: "row", alignItems: "center", gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "600" },
  rePill: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rePillText: { fontSize: 11, fontWeight: "600", color: "#3730A3" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 13, opacity: 0.85, flex: 1 },
  latePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  lateText: { fontSize: 11, fontWeight: "600", color: "#92400E" },
  declineRow: { backgroundColor: "#FEE2E2", padding: 6, borderRadius: 6 },
  declineText: { fontSize: 12, color: "#B91C1C", flex: 1 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  price: { fontSize: 16, fontWeight: "700" },
});
