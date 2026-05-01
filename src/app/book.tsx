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
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { getProfessional, professionals } from "@/data/professionals";
import { getReviewer, reviewers } from "@/data/reviewers";
import { useActiveIdentity } from "@/store/identity";
import { useJobsStore } from "@/store/jobs";
import { usePropertiesForOwner, useProperty } from "@/store/properties";

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
  const params = useLocalSearchParams<{ propertyId?: string; proId?: string }>();
  const identity = useActiveIdentity();
  const bookJob = useJobsStore((s) => s.bookJob);
  const isBooker = identity.role === "booker";

  const myProperties = usePropertiesForOwner(identity.id);
  const preselectedPro = params.proId ? getProfessional(params.proId) : undefined;

  const initialPropertyId = params.propertyId ?? myProperties[0]?.id ?? "";
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId);
  const property = useProperty(propertyId);

  const [dateId, setDateId] = useState<string>(DATE_OPTIONS[0].id);
  const [timeId, setTimeId] = useState<string>(TIME_OPTIONS[0].id);
  const [cleanerId, setCleanerId] = useState<string>(
    preselectedPro?.id ?? professionals[0].id
  );
  const [reviewerId, setReviewerId] = useState<string>(reviewers[0].id);
  const [notes, setNotes] = useState<string>(property?.notes ?? "");

  function pickProperty(id: string) {
    setPropertyId(id);
    // Refresh notes when picking a different property — but don't overwrite
    // anything the user has already typed.
    if (!notes.trim()) {
      const next = myProperties.find((p) => p.id === id);
      if (next?.notes) setNotes(next.notes);
    }
  }

  const handleConfirm = () => {
    if (!isBooker) {
      notify(
        "Switch to admin",
        "Only the property admin can create new bookings. Switch from the Profile tab."
      );
      return;
    }
    if (!property) {
      notify("Property required", "Pick a property to clean.");
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

    const cleaner = getProfessional(cleanerId);
    const reviewer = getReviewer(reviewerId);
    if (!cleaner || !reviewer) {
      notify("Booking failed", "Selected cleaner or reviewer no longer exists.");
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
      date: resolveDate(dateId, timeId),
      notes: notes.trim() || undefined,
    });

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
            No properties yet
          </Text>
          <Text style={[styles.emptyBody, { color: colors.text }]}>
            Add a property from the Home tab before booking a cleaning.
          </Text>
          <Pressable
            onPress={() => router.replace("/")}
            style={({ pressed }) => [
              styles.confirm,
              { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.confirmText}>Go to Home</Text>
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!isBooker && (
          <View style={[styles.roleBanner, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="alert-circle" size={20} color="#92400E" />
            <Text style={styles.roleBannerText}>
              You're viewing as <Text style={{ fontWeight: "700" }}>{identity.name}</Text> ({identity.role}). Only the admin can create bookings — switch from the Profile tab.
            </Text>
          </View>
        )}

        {preselectedPro && (
          <View style={[styles.proBanner, { backgroundColor: BRAND_LIGHT }]}>
            <Ionicons name="person-circle" size={20} color={BRAND} />
            <Text style={styles.proBannerText}>
              Pre-selected:{" "}
              <Text style={{ fontWeight: "700" }}>{preselectedPro.name}</Text>
            </Text>
          </View>
        )}

        <Field label="Property">
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
          </View>
        )}

        <Pressable
          onPress={handleConfirm}
          disabled={!isBooker}
          style={({ pressed }) => [
            styles.confirm,
            {
              backgroundColor: isBooker ? BRAND : colors.border,
              opacity: pressed && isBooker ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.confirmText}>
            {isBooker ? "Confirm Booking" : "Switch to admin to book"}
          </Text>
        </Pressable>
      </ScrollView>
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addressRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  addressInput: { flex: 1 },
  mapBtn: {
    width: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
