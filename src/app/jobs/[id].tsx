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
import Animated, { FadeIn } from "react-native-reanimated";
import { EmbeddedMap } from "@/components/embedded-map";
import { NoteComposer } from "@/components/note-composer";
import { NoteRow } from "@/components/note-row";
import { RatingPrompt } from "@/components/rating-prompt";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import {
  type Job,
  type JobStatus,
  formatJobDate,
  formatJobWindow,
  formatPrice,
  isJobLate,
} from "@/data/jobs";
import { type MessageKey, useT } from "@/lib/i18n";
import { openMapsForAddress } from "@/lib/maps";
import { useCelebrateStore } from "@/store/celebrate";
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
  const t = useT();
  const cancel = useJobsStore((s) => s.cancel);
  const startCleaning = useJobsStore((s) => s.startCleaning);
  const finishCleaning = useJobsStore((s) => s.finishCleaning);
  const startReview = useJobsStore((s) => s.startReview);
  const approve = useJobsStore((s) => s.approve);
  const decline = useJobsStore((s) => s.decline);
  const addCleanerNote = useJobsStore((s) => s.addCleanerNote);
  const addReviewerNote = useJobsStore((s) => s.addReviewerNote);

  const [declineMode, setDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  if (!job) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t("job.notFound")}</Text>
      </View>
    );
  }

  // Localized "actual" timing line — null when no actual times stamped yet.
  const actual: string | null =
    job.actualStart && job.actualEnd
      ? t("job.actualLine", {
          window: formatJobWindow(job.actualStart, job.actualEnd),
        })
      : job.actualStart
        ? t("job.started", { when: formatJobDate(job.actualStart) })
        : null;

  const jobId = job.id;
  const status = STATUS_STYLES[job.status];
  const statusLabel = t(`status.${job.status}` as MessageKey);
  const late = isJobLate(job);
  const isAssignedCleaner =
    identity.role === "cleaner" && identity.id === job.cleanerId;
  const isAssignedReviewer =
    identity.role === "reviewer" && identity.id === job.reviewerId;
  const isOwnerBooker =
    identity.role === "booker" && identity.id === job.bookerId;

  const cleanerNotes = job.cleanerNotes ?? [];
  const reviewerNotes = job.reviewerNotes ?? [];
  const showCleanerComposer =
    isAssignedCleaner && job.status === "cleaning";
  const showReviewerComposer =
    isAssignedReviewer && job.status === "reviewing" && !declineMode;

  function confirmCancel() {
    const ok = () => {
      cancel(jobId);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm(t("job.actions.cancelConfirmTitle"))) ok();
    } else {
      Alert.alert(
        t("job.actions.cancelConfirmTitle"),
        t("job.actions.cancelConfirmBody"),
        [
          { text: t("job.actions.keep"), style: "cancel" },
          {
            text: t("job.actions.cancelDestructive"),
            style: "destructive",
            onPress: ok,
          },
        ]
      );
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
      <View style={styles.statusRow}>
        <Animated.View
          key={job.status}
          entering={FadeIn.duration(280)}
          style={[styles.statusPill, { backgroundColor: status.bg }]}
        >
          <Text style={[styles.statusText, { color: status.fg }]}>
            {statusLabel}
          </Text>
        </Animated.View>
        {job.declineCount > 0 &&
          !(job.status === "ready-to-clean" && job.declineReason) && (
            <Text style={styles.recleanedPill}>
              {t("job.cleanedShort", { count: job.declineCount })}
            </Text>
          )}
      </View>

      {job.status === "ready-to-clean" &&
        job.declineCount > 0 &&
        job.declineReason && (
          <View style={styles.declineBanner}>
            <Ionicons name="alert-circle" size={16} color="#B91C1C" />
            <Text style={styles.declineText}>
              {t("job.declinedBanner", {
                count: job.declineCount,
                reason: job.declineReason,
              })}
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
        <Row
          icon="calendar-outline"
          text={t("job.scheduledLine", {
            window: formatJobWindow(job.scheduledStart, job.scheduledEnd),
          })}
        />
        {late && (
          <View style={styles.lateNote}>
            <Ionicons name="time-outline" size={14} color="#92400E" />
            <Text style={styles.lateNoteText}>{t("late")}</Text>
          </View>
        )}
        {actual && <Row icon="time-outline" text={actual} />}
        <Row
          icon="person-circle-outline"
          text={t("job.cleanerLabel", { name: job.cleanerName })}
          onPress={() => router.push(`/pros/${job.cleanerId}`)}
        />
        <Row
          icon="shield-checkmark-outline"
          text={t("job.reviewerLabel", { name: job.reviewerName })}
        />
        <Row
          icon="cash-outline"
          text={t("job.total", { price: formatPrice(job.priceCents) })}
        />
        {job.reviewerFeeCents !== undefined && job.reviewerFeeCents > 0 && (
          <Row
            icon="document-text-outline"
            text={t("job.reviewerFeeLabel", {
              price: formatPrice(job.reviewerFeeCents),
            })}
          />
        )}
        {job.notes && <Row icon="document-text-outline" text={job.notes} />}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {t("job.location")}
        </Text>
        <EmbeddedMap
          address={job.address}
          latitude={job.latitude}
          longitude={job.longitude}
          height={200}
          showOpenButton={false}
        />
      </View>

      {/* ---- Booker actions ---- */}
      {isOwnerBooker && job.status === "ready-to-clean" && (
        <Pressable
          onPress={confirmCancel}
          style={({ pressed }) => [
            styles.btnDanger,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.btnDangerText}>{t("job.actions.cancel")}</Text>
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
          <Text style={styles.btnPrimaryText}>{t("job.actions.startCleaning")}</Text>
        </Pressable>
      )}
      {isAssignedCleaner && job.status === "cleaning" && (() => {
        const hasPhotoEvidence = cleanerNotes.some((n) => !!n.photoUri);
        return (
          <>
            <Pressable
              disabled={!hasPhotoEvidence}
              onPress={() => {
                finishCleaning(jobId);
                useCelebrateStore.getState().trigger("cleanDone");
                router.back();
              }}
              style={({ pressed }) => [
                styles.btnPrimary,
                {
                  opacity: !hasPhotoEvidence ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.btnPrimaryText}>{t("job.actions.finishCleaning")}</Text>
            </Pressable>
            {!hasPhotoEvidence && (
              <Text
                style={{
                  fontSize: 13,
                  opacity: 0.6,
                  textAlign: "center",
                  color: colors.text,
                  marginTop: -4,
                }}
              >
                {t("job.actions.finishCleaningNeedsPhoto")}
              </Text>
            )}
          </>
        );
      })()}

      {/* ---- Reviewer actions ---- */}
      {isAssignedReviewer && job.status === "ready-for-review" && (
        <Pressable
          onPress={() => startReview(jobId)}
          style={({ pressed }) => [
            styles.btnPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.btnPrimaryText}>{t("job.actions.startReview")}</Text>
        </Pressable>
      )}
      {isAssignedReviewer && job.status === "reviewing" && !declineMode && (
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => {
              approve(jobId);
              useCelebrateStore.getState().trigger("approve");
              router.back();
            }}
            style={({ pressed }) => [
              styles.btnPrimary,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.btnPrimaryText}>{t("job.actions.approve")}</Text>
          </Pressable>
          <Pressable
            onPress={() => setDeclineMode(true)}
            style={({ pressed }) => [
              styles.btnDanger,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.btnDangerText}>{t("job.actions.decline")}</Text>
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
            {t("job.actions.declineReasonLabel")}
          </Text>
          <TextInput
            value={declineReason}
            onChangeText={setDeclineReason}
            placeholder={t("job.actions.declineReasonPlaceholder")}
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
                {t("job.actions.back")}
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
              <Text style={styles.btnDangerText}>{t("job.actions.submitDecline")}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ---- Post-job ratings ---- */}
      {job.status === "done" && isOwnerBooker && (
        <RatingPrompt
          jobId={jobId}
          raterRole="booker"
          raterIdentityId={identity.id}
          subjectIdentityId={job.cleanerId}
          heading={`Rate ${job.cleanerName}`}
        />
      )}
      {job.status === "done" && isAssignedReviewer && (
        <RatingPrompt
          jobId={jobId}
          raterRole="reviewer"
          raterIdentityId={identity.id}
          subjectIdentityId={job.cleanerId}
          heading={`Optional: rate ${job.cleanerName}`}
        />
      )}

      {/* ---- Cleaner notes ---- */}
      <View style={styles.notesSection}>
        <Text style={[styles.notesTitle, { color: colors.text }]}>
          {t("job.cleanerNotes")}
        </Text>
        {cleanerNotes.length === 0 ? (
          <Text style={[styles.notesEmpty, { color: colors.text }]}>
            {t("job.cleanerNotesEmpty")}
          </Text>
        ) : (
          cleanerNotes.map((n) => (
            <NoteRow key={n.id} note={n} authorLabel={job.cleanerName} />
          ))
        )}
        {showCleanerComposer && (
          <NoteComposer
            placeholder={t("job.composer.cleanerPlaceholder")}
            onSubmit={(input) => addCleanerNote(jobId, input)}
          />
        )}
      </View>

      {/* ---- Reviewer notes ---- */}
      <View style={styles.notesSection}>
        <Text style={[styles.notesTitle, { color: colors.text }]}>
          {t("job.reviewerNotes")}
        </Text>
        {reviewerNotes.length === 0 ? (
          <Text style={[styles.notesEmpty, { color: colors.text }]}>
            {t("job.reviewerNotesEmpty")}
          </Text>
        ) : (
          reviewerNotes.map((n) => (
            <NoteRow key={n.id} note={n} authorLabel={job.reviewerName} />
          ))
        )}
        {showReviewerComposer && (
          <NoteComposer
            placeholder={t("job.composer.reviewerPlaceholder")}
            onSubmit={(input) => addReviewerNote(jobId, input)}
          />
        )}
      </View>
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
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  recleanedPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E0E7FF",
    color: "#3730A3",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  declineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
  },
  declineText: { fontSize: 13, color: "#B91C1C", flex: 1 },
  lateNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lateNoteText: { fontSize: 12, color: "#92400E", flex: 1 },
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
  notesSection: { gap: 8 },
  notesTitle: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  notesEmpty: { fontSize: 13, opacity: 0.6 },
});
