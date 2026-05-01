import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { EmbeddedMap } from "@/components/embedded-map";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { type JobStatus, formatJobDate } from "@/data/jobs";
import { openMapsForAddress } from "@/lib/maps";
import { useActiveIdentity } from "@/store/identity";
import { useJob, useJobsStore } from "@/store/jobs";

const STATUS_STYLES: Record<JobStatus, { bg: string; fg: string; label: string }> = {
  "ready-to-clean": { bg: BRAND_LIGHT, fg: BRAND, label: "Ready to clean" },
  cleaning: { bg: "#FEF3C7", fg: "#B45309", label: "Cleaning" },
  "ready-for-review": { bg: "#DBEAFE", fg: "#1D4ED8", label: "Ready for review" },
  reviewing: { bg: "#EDE9FE", fg: "#6D28D9", label: "Reviewing" },
  done: { bg: "#E5E7EB", fg: "#374151", label: "Done" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C", label: "Cancelled" },
};

export default function JobDetailRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);
  const identity = useActiveIdentity();
  const cancel = useJobsStore((s) => s.cancel);
  const startCleaning = useJobsStore((s) => s.startCleaning);
  const finishCleaning = useJobsStore((s) => s.finishCleaning);
  const startReview = useJobsStore((s) => s.startReview);
  const approve = useJobsStore((s) => s.approve);
  const decline = useJobsStore((s) => s.decline);

  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  if (!job) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Job not found.</Text>
      </View>
    );
  }

  const jobId = job.id;
  const status = STATUS_STYLES[job.status];
  const isAssignedCleaner =
    identity.role === "cleaner" && identity.id === job.cleanerId;
  const isAssignedReviewer =
    identity.role === "reviewer" && identity.id === job.reviewerId;
  const isOwnerBooker =
    identity.role === "booker" && identity.id === job.bookerId;

  function confirmCancel() {
    const ok = () => {
      cancel(jobId);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm("Cancel this booking?")) ok();
    } else {
      Alert.alert("Cancel booking?", "This cannot be undone.", [
        { text: "Keep", style: "cancel" },
        { text: "Cancel booking", style: "destructive", onPress: ok },
      ]);
    }
  }

  function submitDecline() {
    const reason = declineReason.trim();
    if (!reason) return;
    decline(jobId, reason);
    setDeclineMode(false);
    setDeclineReason("");
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.fg }]}>
          {status.label}
        </Text>
      </View>

      {job.declineCount > 0 && job.declineReason && (
        <View style={styles.declineBanner}>
          <Ionicons name="alert-circle" size={16} color="#B91C1C" />
          <Text style={styles.declineText}>
            Declined {job.declineCount}× — last reason: {job.declineReason}
          </Text>
        </View>
      )}

      <Text style={[styles.title, { color: colors.text }]}>
        {job.propertyName}
      </Text>
      <View
        style={[
          styles.summary,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Row
          icon="location-outline"
          text={job.address}
          onPress={() => openMapsForAddress(job.address)}
          actionIcon="open-outline"
          accessibilityLabel={`Open ${job.address} in maps`}
        />
        <Row icon="calendar-outline" text={formatJobDate(job.date)} />
        <Row icon="person-circle-outline" text={`Cleaner: ${job.cleanerName}`} />
        <Row icon="shield-checkmark-outline" text={`Reviewer: ${job.reviewerName}`} />
        {job.notes && <Row icon="document-text-outline" text={job.notes} />}
      </View>

      <EmbeddedMap address={job.address} height={200} showOpenButton={false} />

      {/* ---- Booker actions ---- */}
      {isOwnerBooker && job.status === "ready-to-clean" && (
        <Pressable
          onPress={confirmCancel}
          style={({ pressed }) => [
            styles.btnDanger,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.btnDangerText}>Cancel booking</Text>
        </Pressable>
      )}

      {/* ---- Cleaner actions ---- */}
      {isAssignedCleaner && job.status === "ready-to-clean" && (
        <Pressable
          onPress={() => startCleaning(jobId)}
          style={({ pressed }) => [
            styles.btnPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>Start cleaning</Text>
        </Pressable>
      )}
      {isAssignedCleaner && job.status === "cleaning" && (
        <Pressable
          onPress={() => {
            finishCleaning(jobId);
            router.back();
          }}
          style={({ pressed }) => [
            styles.btnPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>Mark ready for review</Text>
        </Pressable>
      )}

      {/* ---- Reviewer actions ---- */}
      {isAssignedReviewer && job.status === "ready-for-review" && (
        <Pressable
          onPress={() => startReview(jobId)}
          style={({ pressed }) => [
            styles.btnPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>Start review</Text>
        </Pressable>
      )}
      {isAssignedReviewer && job.status === "reviewing" && !declineMode && (
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => {
              approve(jobId);
              router.back();
            }}
            style={({ pressed }) => [
              styles.btnPrimary,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.btnPrimaryText}>Approve</Text>
          </Pressable>
          <Pressable
            onPress={() => setDeclineMode(true)}
            style={({ pressed }) => [
              styles.btnDanger,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.btnDangerText}>Decline</Text>
          </Pressable>
        </View>
      )}
      {isAssignedReviewer && job.status === "reviewing" && declineMode && (
        <View
          style={[
            styles.declineForm,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.formLabel, { color: colors.text }]}>
            Reason for decline
          </Text>
          <TextInput
            value={declineReason}
            onChangeText={setDeclineReason}
            placeholder="What needs to be redone?"
            placeholderTextColor={colors.text + "80"}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => {
                setDeclineMode(false);
                setDeclineReason("");
              }}
              style={({ pressed }) => [
                styles.btnSecondary,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.text }]}>
                Back
              </Text>
            </Pressable>
            <Pressable
              onPress={submitDecline}
              disabled={!declineReason.trim()}
              style={({ pressed }) => [
                styles.btnDanger,
                {
                  flex: 1,
                  opacity: !declineReason.trim() ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.btnDangerText}>Submit decline</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({
  icon,
  text,
  onPress,
  actionIcon,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      <Ionicons name={icon} size={16} color={colors.text} />
      <Text
        style={[
          styles.rowText,
          { color: onPress ? BRAND : colors.text },
        ]}
      >
        {text}
      </Text>
      {onPress && (
        <Ionicons
          name={actionIcon ?? "chevron-forward"}
          size={14}
          color={BRAND}
        />
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  declineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
  },
  declineText: { fontSize: 13, color: "#B91C1C", flex: 1 },
  title: { fontSize: 24, fontWeight: "700" },
  summary: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { fontSize: 14, flex: 1 },
  btnPrimary: {
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimaryText: { color: "white", fontSize: 16, fontWeight: "700" },
  btnDanger: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDangerText: { color: "white", fontSize: 16, fontWeight: "700" },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnSecondaryText: { fontSize: 15, fontWeight: "600" },
  declineForm: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  formLabel: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 14,
  },
});
