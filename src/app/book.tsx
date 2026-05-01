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
} from "react-native";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { getProfessional, professionals } from "@/data/professionals";
import { reviewers } from "@/data/reviewers";
import { type ServiceId, services } from "@/data/services";
import { useActiveIdentity } from "@/store/identity";
import { useJobsStore } from "@/store/jobs";

const DATE_OPTIONS = [
  { id: "tomorrow", label: "Tomorrow", offsetDays: 1 },
  { id: "in-2-days", label: "In 2 days", offsetDays: 2 },
  { id: "weekend", label: "This weekend", offsetDays: 5 },
  { id: "next-week", label: "Next week", offsetDays: 7 },
];

const TIME_OPTIONS = [
  { id: "morning", label: "Morning", hint: "8am – 12pm", hour: 9 },
  { id: "afternoon", label: "Afternoon", hint: "12pm – 5pm", hour: 14 },
  { id: "evening", label: "Evening", hint: "5pm – 9pm", hour: 18 },
];

function resolveDate(dateId: string, timeId: string): string {
  const dOpt = DATE_OPTIONS.find((d) => d.id === dateId) ?? DATE_OPTIONS[0];
  const tOpt = TIME_OPTIONS.find((t) => t.id === timeId) ?? TIME_OPTIONS[0];
  const d = new Date();
  d.setDate(d.getDate() + dOpt.offsetDays);
  d.setHours(tOpt.hour, 0, 0, 0);
  return d.toISOString();
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
  const params = useLocalSearchParams<{ serviceId?: string; proId?: string }>();
  const identity = useActiveIdentity();
  const bookJob = useJobsStore((s) => s.bookJob);

  const initialService = params.serviceId
    ? (params.serviceId as ServiceId)
    : services[0].id;
  const preselectedPro = params.proId ? getProfessional(params.proId) : undefined;

  const [serviceId, setServiceId] = useState<ServiceId>(initialService);
  const [dateId, setDateId] = useState<string>(DATE_OPTIONS[0].id);
  const [timeId, setTimeId] = useState<string>(TIME_OPTIONS[0].id);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [cleanerId, setCleanerId] = useState<string>(
    preselectedPro?.id ?? professionals[0].id
  );
  const [reviewerId, setReviewerId] = useState<string>(reviewers[0].id);

  const service = services.find((s) => s.id === serviceId)!;

  const handleConfirm = () => {
    if (!address.trim()) {
      notify("Address required", "Please enter the address for the cleaning.");
      return;
    }
    if (!cleanerId) {
      notify("Cleaner required", "Please pick a cleaner.");
      return;
    }
    if (!reviewerId) {
      notify("Reviewer required", "Please pick a reviewer.");
      return;
    }
    if (identity.role !== "booker") {
      notify(
        "Switch to booker",
        "Only the booker identity can create new bookings. Switch from the Profile tab."
      );
      return;
    }

    const cleaner = getProfessional(cleanerId);
    const reviewer = reviewers.find((r) => r.id === reviewerId);
    if (!cleaner || !reviewer) {
      notify("Booking failed", "Selected cleaner or reviewer no longer exists.");
      return;
    }

    bookJob({
      serviceId,
      bookerId: identity.id,
      cleanerId: cleaner.id,
      cleanerName: cleaner.name,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      date: resolveDate(dateId, timeId),
      address: address.trim(),
      notes: notes.trim() || undefined,
    });

    router.replace("/(tabs)/jobs");
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      {preselectedPro && (
        <View style={[styles.proBanner, { backgroundColor: BRAND_LIGHT }]}>
          <Ionicons name="person-circle" size={20} color={BRAND} />
          <Text style={styles.proBannerText}>
            Pre-selected:{" "}
            <Text style={{ fontWeight: "700" }}>{preselectedPro.name}</Text>
          </Text>
        </View>
      )}

      <Field label="Service">
        <View style={styles.chipsWrap}>
          {services.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              selected={s.id === serviceId}
              onPress={() => setServiceId(s.id)}
            />
          ))}
        </View>
      </Field>

      <Field label="Date">
        <View style={styles.chipsWrap}>
          {DATE_OPTIONS.map((d) => (
            <Chip
              key={d.id}
              label={d.label}
              selected={d.id === dateId}
              onPress={() => setDateId(d.id)}
            />
          ))}
        </View>
      </Field>

      <Field label="Time">
        <View style={styles.chipsWrap}>
          {TIME_OPTIONS.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              hint={t.hint}
              selected={t.id === timeId}
              onPress={() => setTimeId(t.id)}
            />
          ))}
        </View>
      </Field>

      <Field label="Address">
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main St, Apt 4"
          placeholderTextColor={colors.text + "80"}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />
      </Field>

      <Field label="Cleaner">
        <View style={styles.chipsWrap}>
          {professionals.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              hint={`★ ${p.rating.toFixed(1)}`}
              selected={p.id === cleanerId}
              onPress={() => setCleanerId(p.id)}
            />
          ))}
        </View>
      </Field>

      <Field label="Reviewer">
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

      <Field label="Notes (optional)">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Gate code, parking, pets, etc."
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

      <View
        style={[
          styles.summary,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            {service.name}
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            ${service.price}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            Estimated duration
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {service.durationHours}h
          </Text>
        </View>
        <View
          style={[
            styles.summaryRow,
            styles.summaryTotal,
            { borderTopColor: colors.border },
          ]}
        >
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: BRAND }]}>
            ${service.price}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handleConfirm}
        style={({ pressed }) => [
          styles.confirm,
          { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.confirmText}>Confirm Booking</Text>
      </Pressable>
    </ScrollView>
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
  content: { padding: 16, paddingBottom: 40, gap: 18 },
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
    gap: 10,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14, opacity: 0.8 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  summaryTotal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  totalLabel: { fontSize: 16, fontWeight: "600" },
  totalValue: { fontSize: 18, fontWeight: "700" },
  confirm: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: { color: "white", fontSize: 16, fontWeight: "700" },
});
