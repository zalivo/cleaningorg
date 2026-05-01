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
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import {
  computePriceCents,
  estimatedHours,
  formatJobWindow,
  formatPrice,
  formatRatePerHour,
} from "@/data/jobs";
import {
  type Professional,
  getProfessional,
  professionals,
} from "@/data/professionals";
import { getReviewer, reviewers } from "@/data/reviewers";
import { type MessageKey, useT } from "@/lib/i18n";
import { useCelebrateStore } from "@/store/celebrate";
import { useActiveIdentity } from "@/store/identity";
import { useJobsStore } from "@/store/jobs";
import { usePropertiesForOwner, useProperty } from "@/store/properties";
import { useCleanerAggregateRating } from "@/store/ratings";

const DURATION_OPTIONS = [
  { id: "1h", label: "1 hour", hours: 1 },
  { id: "2h", label: "2 hours", hours: 2 },
  { id: "3h", label: "3 hours", hours: 3 },
  { id: "4h", label: "4 hours", hours: 4 },
  { id: "6h", label: "6 hours", hours: 6 },
];

const DEFAULT_DURATION_ID = "1h";
const TIME_STEP_MINUTES = 15;
const TIME_STEP_SECONDS = TIME_STEP_MINUTES * 60;

const STEPS = [1, 2, 3] as const;
type Step = (typeof STEPS)[number];
const TOTAL_STEPS = STEPS.length;

const STEP_TITLE_KEYS: Record<Step, MessageKey> = {
  1: "book.wizard.stepWhereWhen",
  2: "book.wizard.stepWho",
  3: "book.wizard.stepReview",
};

interface ScheduledWindow {
  startISO: string;
  endISO: string;
}

function defaultStart(): Date {
  // Tomorrow at 09:00 — preserves the previous default of "Tomorrow / Morning".
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function durationHours(durationId: string): number {
  return (
    DURATION_OPTIONS.find((d) => d.id === durationId) ??
    DURATION_OPTIONS.find((d) => d.id === DEFAULT_DURATION_ID) ??
    DURATION_OPTIONS[0]
  ).hours;
}

function resolveWindow(start: Date, durationId: string): ScheduledWindow {
  const end = new Date(start);
  end.setHours(end.getHours() + durationHours(durationId));
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

/** Format a Date as "YYYY-MM-DDTHH:MM" in local time for `<input type="datetime-local">`. */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatHours(h: number): string {
  if (Number.isInteger(h)) return `${h} hr`;
  return `${h.toFixed(1)} hr`;
}

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function BookRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ propertyId?: string; proId?: string }>();
  const identity = useActiveIdentity();
  const bookJob = useJobsStore((s) => s.bookJob);
  const isBooker = identity.role === "booker";
  const t = useT();

  const myProperties = usePropertiesForOwner(identity.id);
  const preselectedPro = params.proId ? getProfessional(params.proId) : undefined;

  const initialPropertyId = params.propertyId ?? myProperties[0]?.id ?? "";
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId);
  const property = useProperty(propertyId);

  const [scheduledStart, setScheduledStart] = useState<Date>(defaultStart);
  const [iosPicker, setIosPicker] = useState<"date" | "time" | null>(null);
  const [durationId, setDurationId] = useState<string>(DEFAULT_DURATION_ID);
  const [cleanerId, setCleanerId] = useState<string>(
    preselectedPro?.id ?? professionals[0].id
  );
  const [reviewerId, setReviewerId] = useState<string>(reviewers[0].id);
  const [notes, setNotes] = useState<string>(property?.notes ?? "");
  const [step, setStep] = useState<Step>(1);

  // `now` used for both the picker's minimumDate and the runtime past-time
  // guard at submit. Recomputed every render so a long-open form catches
  // drift past the hour.
  const now = new Date();
  const scheduledWindow = resolveWindow(scheduledStart, durationId);
  const cleaner = getProfessional(cleanerId);
  const reviewer = getReviewer(reviewerId);
  const cleanerPayCents = cleaner
    ? computePriceCents(
        cleaner.hourlyRate,
        scheduledWindow.startISO,
        scheduledWindow.endISO,
      )
    : 0;
  const reviewerFeeCents = reviewer?.feeCents ?? 0;
  const priceCents = cleanerPayCents + reviewerFeeCents;
  const hours = estimatedHours(scheduledWindow.startISO, scheduledWindow.endISO);

  /**
   * Apply a picker's resulting Date to `scheduledStart`. `mode === "date"`
   * keeps the existing time-of-day; `mode === "time"` keeps the existing
   * date. Picking a full datetime (web) replaces both at once.
   */
  function applyPicked(mode: "date" | "time" | "datetime", picked: Date) {
    setScheduledStart((prev) => {
      const next = new Date(prev);
      if (mode === "date") {
        next.setFullYear(
          picked.getFullYear(),
          picked.getMonth(),
          picked.getDate()
        );
      } else if (mode === "time") {
        next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      } else {
        next.setFullYear(
          picked.getFullYear(),
          picked.getMonth(),
          picked.getDate()
        );
        next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      }
      return next;
    });
  }

  function openPicker(mode: "date" | "time") {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: scheduledStart,
        mode,
        is24Hour: true,
        minimumDate: mode === "date" ? now : undefined,
        minuteInterval: mode === "time" ? TIME_STEP_MINUTES : undefined,
        onChange: (_event, picked) => {
          if (picked) applyPicked(mode, picked);
        },
      });
    } else if (Platform.OS === "ios") {
      // Toggle the inline picker. Picking writes through onChange; the
      // field's display always reflects the current scheduledStart.
      setIosPicker((cur) => (cur === mode ? null : mode));
    }
    // Web is handled by the <input type="datetime-local"> element directly.
  }

  function pickProperty(id: string) {
    setPropertyId(id);
    // Seed notes from the picked property — but never clobber what the user
    // has already typed.
    if (!notes.trim()) {
      const next = myProperties.find((p) => p.id === id);
      if (next?.notes) setNotes(next.notes);
    }
  }

  const goNext = () =>
    setStep((s) => Math.min(TOTAL_STEPS, s + 1) as Step);
  const goBack = () => setStep((s) => Math.max(1, s - 1) as Step);

  const handleConfirm = () => {
    if (!isBooker) {
      notify(t("book.alerts.notBookerTitle"), t("book.alerts.notBookerBody"));
      return;
    }
    if (!property) {
      notify(t("book.alerts.propertyRequired"), t("book.alerts.propertyBody"));
      setStep(1);
      return;
    }
    if (scheduledStart.getTime() < Date.now()) {
      // Native time pickers can't enforce "now or later" the way
      // `minimumDate` enforces "today or later" — a user can pick today's
      // morning when it's already past noon. Catch it here.
      notify(t("book.alerts.pastTimeTitle"), t("book.alerts.pastTimeBody"));
      setStep(1);
      return;
    }
    if (!cleanerId) {
      notify(t("book.alerts.cleanerRequired"), t("book.alerts.cleanerBody"));
      setStep(2);
      return;
    }
    if (!reviewerId) {
      notify(t("book.alerts.reviewerRequired"), t("book.alerts.reviewerBody"));
      setStep(2);
      return;
    }
    if (!cleaner || !reviewer) {
      notify(
        t("book.alerts.bookingFailedTitle"),
        t("book.alerts.bookingFailedBody")
      );
      return;
    }

    bookJob({
      propertyId: property.id,
      propertyName: property.name,
      address: property.address,
      latitude: property.latitude,
      longitude: property.longitude,
      bookerId: identity.id,
      cleanerId: cleaner.id,
      cleanerName: cleaner.name,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      scheduledStart: scheduledWindow.startISO,
      scheduledEnd: scheduledWindow.endISO,
      priceCents,
      reviewerFeeCents,
      notes: notes.trim() || undefined,
    });

    useCelebrateStore.getState().trigger("booking");
    router.replace("/(tabs)/jobs");
  };

  if (isBooker && myProperties.length === 0) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.empty,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="home-outline" size={28} color={BRAND} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t("book.emptyTitle")}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.text }]}>
            {t("book.emptyBody")}
          </Text>
          <Pressable
            onPress={() => router.replace("/")}
            style={({ pressed }) => [
              styles.confirm,
              { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.confirmText}>{t("book.goHome")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { borderColor: colors.border }]}>
        {!isBooker && (
          <View style={[styles.roleBanner, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="alert-circle" size={20} color="#92400E" />
            <Text style={styles.roleBannerText}>
              {t("book.roleBanner", {
                name: identity.name,
                role: identity.role,
              })}
            </Text>
          </View>
        )}

        <View style={styles.progressBar}>
          {STEPS.map((s) => (
            <View
              key={s}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: s <= step ? BRAND : colors.border,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.stepCount, { color: colors.text }]}>
          {t("book.wizard.stepCount", { current: step, total: TOTAL_STEPS })}
        </Text>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {t(STEP_TITLE_KEYS[step])}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            <Field label={t("book.property")}>
              <View style={styles.chipsWrap}>
                {myProperties.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    hint={p.address}
                    selected={p.id === propertyId}
                    onPress={() => pickProperty(p.id)}
                  />
                ))}
              </View>
            </Field>

            {Platform.OS === "web" ? (
              <Field label={t("book.when")}>
                {/* react-native-web renders View/Pressable as DOM, so a
                    native `datetime-local` input slots in cleanly. The
                    browser owns the popup UI; we just write to
                    scheduledStart on change. */}
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(scheduledStart)}
                  min={toDatetimeLocal(now)}
                  step={TIME_STEP_SECONDS}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const parsed = new Date(v);
                    if (!Number.isNaN(parsed.getTime())) {
                      applyPicked("datetime", parsed);
                    }
                  }}
                  style={{
                    border: `${StyleSheet.hairlineWidth}px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 15,
                    fontFamily: "inherit",
                    backgroundColor: colors.card,
                    color: colors.text,
                    colorScheme: "light dark",
                  }}
                />
              </Field>
            ) : (
              <>
                <Field label={t("book.date")}>
                  <PickerTrigger
                    value={scheduledStart.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    icon="calendar-outline"
                    expanded={iosPicker === "date"}
                    onPress={() => openPicker("date")}
                  />
                  {iosPicker === "date" && Platform.OS === "ios" && (
                    <DateTimePicker
                      value={scheduledStart}
                      mode="date"
                      display="inline"
                      minimumDate={now}
                      onChange={(_event, picked) => {
                        if (picked) applyPicked("date", picked);
                      }}
                    />
                  )}
                </Field>

                <Field label={t("book.time")}>
                  <PickerTrigger
                    value={scheduledStart.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    icon="time-outline"
                    expanded={iosPicker === "time"}
                    onPress={() => openPicker("time")}
                  />
                  {iosPicker === "time" && Platform.OS === "ios" && (
                    <DateTimePicker
                      value={scheduledStart}
                      mode="time"
                      display="spinner"
                      minuteInterval={TIME_STEP_MINUTES}
                      onChange={(_event, picked) => {
                        if (picked) applyPicked("time", picked);
                      }}
                    />
                  )}
                </Field>
              </>
            )}

            <Field label={t("book.duration")}>
              <View style={styles.chipsWrap}>
                {DURATION_OPTIONS.map((d) => (
                  <Chip
                    key={d.id}
                    label={d.label}
                    selected={d.id === durationId}
                    onPress={() => setDurationId(d.id)}
                  />
                ))}
              </View>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            {preselectedPro && (
              <View style={[styles.proBanner, { backgroundColor: BRAND_LIGHT }]}>
                <Ionicons name="person-circle" size={20} color={BRAND} />
                <Text style={styles.proBannerText}>
                  {t("book.preselected", { name: preselectedPro.name })}
                </Text>
              </View>
            )}
            <Field label={t("book.cleaner")}>
              <View style={styles.chipsWrap}>
                {professionals.map((p) => (
                  <CleanerChip
                    key={p.id}
                    pro={p}
                    selected={p.id === cleanerId}
                    onPress={() => setCleanerId(p.id)}
                  />
                ))}
              </View>
            </Field>

            <Field label={t("book.reviewer")}>
              <View style={styles.chipsWrap}>
                {reviewers.map((r) => (
                  <Chip
                    key={r.id}
                    label={r.name}
                    hint={`★ ${r.rating.toFixed(1)}`}
                    selected={r.id === reviewerId}
                    onPress={() => setReviewerId(r.id)}
                  />
                ))}
              </View>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={[styles.stepHelp, { color: colors.text }]}>
              {t("book.wizard.reviewHelp")}
            </Text>
            <Field label={t("book.notes")}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t("property.notesPlaceholder")}
                placeholderTextColor={colors.text + "80"}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.multiline,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </Field>

            {property && (
              <View
                style={[
                  styles.summary,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  {property.name}
                </Text>
                <Text style={[styles.summaryAddress, { color: colors.text }]}>
                  {property.address}
                </Text>
                <Text style={[styles.summaryWindow, { color: BRAND }]}>
                  {formatJobWindow(
                    scheduledWindow.startISO,
                    scheduledWindow.endISO
                  )}
                </Text>
                <Text style={[styles.summaryAssigned, { color: colors.text }]}>
                  {t("job.cleanerLabel", { name: cleaner?.name ?? "—" })}
                </Text>
                <Text style={[styles.summaryAssigned, { color: colors.text }]}>
                  {t("job.reviewerLabel", { name: reviewer?.name ?? "—" })}
                </Text>
                {cleaner && (
                  <View style={styles.summaryBreakdownGroup}>
                    <View style={styles.summaryPriceRow}>
                      <Text
                        style={[styles.summaryBreakdown, { color: colors.text }]}
                      >
                        {`${formatRatePerHour(cleaner.hourlyRate)} · ${formatHours(hours)}`}
                      </Text>
                      <Text
                        style={[styles.summaryBreakdown, { color: colors.text }]}
                      >
                        {formatPrice(cleanerPayCents)}
                      </Text>
                    </View>
                    {reviewer && (
                      <View style={styles.summaryPriceRow}>
                        <Text
                          style={[
                            styles.summaryBreakdown,
                            { color: colors.text },
                          ]}
                        >
                          {t("book.reviewer")}
                        </Text>
                        <Text
                          style={[
                            styles.summaryBreakdown,
                            { color: colors.text },
                          ]}
                        >
                          {formatPrice(reviewerFeeCents)}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.summaryPriceRow,
                        styles.summaryTotalRow,
                        { borderTopColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.summaryBreakdown,
                          { color: colors.text, fontWeight: "700" },
                        ]}
                      >
                        {t("job.totalLabel")}
                      </Text>
                      <Text style={[styles.summaryPriceTotal, { color: BRAND }]}>
                        {formatPrice(priceCents)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        {step > 1 ? (
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [
              styles.footerBtn,
              styles.footerBtnSecondary,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
            <Text style={[styles.footerBtnText, { color: colors.text }]}>
              {t("book.wizard.back")}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.footerSpacer} />
        )}

        {step < TOTAL_STEPS ? (
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.footerBtn,
              styles.footerBtnPrimary,
              { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.footerBtnText, { color: "white" }]}>
              {t("book.wizard.next")}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="white" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleConfirm}
            disabled={!isBooker}
            style={({ pressed }) => [
              styles.footerBtn,
              styles.footerBtnPrimary,
              {
                backgroundColor: isBooker ? BRAND : colors.border,
                opacity: pressed && isBooker ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.footerBtnText, { color: "white" }]}>
              {isBooker ? t("book.confirm") : t("book.switchToBook")}
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      {children}
    </View>
  );
}

function PickerTrigger({
  value,
  icon,
  expanded,
  onPress,
}: {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  expanded: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pickerTrigger,
        {
          backgroundColor: colors.card,
          borderColor: expanded ? BRAND : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={BRAND} />
      <Text style={[styles.pickerTriggerText, { color: colors.text }]}>
        {value}
      </Text>
      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={16}
        color={colors.text}
      />
    </Pressable>
  );
}

function CleanerChip({
  pro,
  selected,
  onPress,
}: {
  pro: Professional;
  selected: boolean;
  onPress: () => void;
}) {
  const agg = useCleanerAggregateRating(pro.id);
  return (
    <Chip
      label={pro.name}
      hint={`★ ${agg.avg.toFixed(1)}`}
      selected={selected}
      onPress={onPress}
    />
  );
}

function Chip({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? BRAND : colors.card,
          borderColor: selected ? BRAND : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? "white" : colors.text },
        ]}
      >
        {label}
      </Text>
      {hint && (
        <Text
          style={[
            styles.chipHint,
            { color: selected ? "rgba(255,255,255,0.85)" : colors.text },
          ]}
        >
          {hint}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  progressBar: { flexDirection: "row", gap: 4 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepCount: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  stepTitle: { fontSize: 22, fontWeight: "700" },
  stepHelp: { fontSize: 14, opacity: 0.7, lineHeight: 20 },
  content: { padding: 16, paddingBottom: 32, gap: 18 },
  roleBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  roleBannerText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  proBannerText: { fontSize: 14, color: "#0B5557" },
  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 14, fontWeight: "600" },
  chipHint: { fontSize: 11, marginTop: 2, opacity: 0.85 },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerTriggerText: { flex: 1, fontSize: 15, fontWeight: "600" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  summary: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
  },
  summaryTitle: { fontSize: 16, fontWeight: "700" },
  summaryAddress: { fontSize: 14, opacity: 0.75 },
  summaryWindow: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  summaryAssigned: { fontSize: 13, opacity: 0.8 },
  summaryBreakdownGroup: { gap: 4, marginTop: 4 },
  summaryPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  summaryTotalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    marginTop: 2,
  },
  summaryBreakdown: { fontSize: 13, opacity: 0.75 },
  summaryPriceTotal: { fontSize: 22, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerSpacer: { flex: 0.4 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  footerBtnSecondary: {
    flex: 0.4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerBtnPrimary: { flex: 0.6 },
  footerBtnText: { fontSize: 15, fontWeight: "700" },
  confirm: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: { color: "white", fontSize: 16, fontWeight: "700" },
  empty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 14, opacity: 0.7, textAlign: "center" },
});
