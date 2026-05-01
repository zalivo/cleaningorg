import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
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
import { BRAND } from "@/constants/colors";
import { geocodeAddress } from "@/lib/geocode";
import { useT } from "@/lib/i18n";
import { openMapsForAddress } from "@/lib/maps";
import { useActiveIdentity } from "@/store/identity";
import { useProperty, usePropertiesStore } from "@/store/properties";

export default function PropertyDetailRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; edit?: string }>();
  const identity = useActiveIdentity();
  const property = useProperty(params.id);
  const updateProperty = usePropertiesStore((s) => s.updateProperty);
  const deleteProperty = usePropertiesStore((s) => s.deleteProperty);
  const t = useT();

  // Field state — initialised once from the current property snapshot.
  // Subsequent property mutations don't auto-overwrite typing in progress.
  const [editing, setEditing] = useState(params.edit === "1");
  const [name, setName] = useState(property?.name ?? "");
  const [address, setAddress] = useState(property?.address ?? "");
  const [notes, setNotes] = useState(property?.notes ?? "");
  const [saving, setSaving] = useState(false);
  // Suppresses the "Property not found" branch during the back-animation
  // window after a delete. Without this, the screen briefly repaints as
  // not-found between the store mutation and the actual unmount.
  const [deleting, setDeleting] = useState(false);

  // Property tab is admin-only; mirror the Home tab's role gate.
  if (identity.role !== "booker") {
    return <Redirect href="/(tabs)/jobs" />;
  }

  // Treat "exists but not yours" the same as "not found" — owners and
  // viewers don't bleed across each other in the demo's identity model.
  const ownedByMe = property && property.ownerId === identity.id;
  if (!property || !ownedByMe) {
    if (deleting) {
      // The user just deleted this property; the back animation is still
      // running. Render nothing instead of flashing the not-found view.
      return <View style={{ flex: 1, backgroundColor: colors.background }} />;
    }
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Ionicons name="home-outline" size={28} color={BRAND} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t("property.notFoundTitle")}
        </Text>
        <Text style={[styles.emptyBody, { color: colors.text }]}>
          {t("property.notFoundBody")}
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.backBtnText}>{t("property.backHome")}</Text>
        </Pressable>
      </View>
    );
  }

  function notify(title: string, msg: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
  }

  function startEdit() {
    if (!property) return;
    // Re-sync fields from the current snapshot every time we enter edit
    // mode, so a previously-cancelled draft can't reappear.
    setName(property.name);
    setAddress(property.address);
    setNotes(property.notes ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaving(false);
  }

  async function save() {
    if (!property) return;
    if (!name.trim())
      return notify(
        t("property.alerts.nameRequired"),
        t("property.alerts.nameRequiredBody")
      );
    if (!address.trim())
      return notify(
        t("property.alerts.addressRequired"),
        t("property.alerts.addressRequiredBody")
      );
    if (saving) return; // double-tap guard

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedNotes = notes.trim() || undefined;
    // Only re-geocode when the address actually changed; renaming a
    // property or editing notes shouldn't trigger a network round-trip.
    const addressChanged = property.address !== trimmedAddress;
    setSaving(true);
    try {
      const coords = addressChanged
        ? await geocodeAddress(trimmedAddress)
        : null;
      updateProperty(property.id, {
        name: trimmedName,
        address: trimmedAddress,
        notes: trimmedNotes,
        ...(addressChanged
          ? { latitude: coords?.latitude, longitude: coords?.longitude }
          : {}),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!property) return;
    const id = property.id;
    const propertyName = property.name;
    const ok = () => {
      // Set the `deleting` flag synchronously so the imminent re-render
      // (triggered by deleteProperty) takes the suppressed-render branch
      // up top instead of flashing "Property not found" during the back
      // animation. router.back() is queued; deleteProperty mutates the
      // store in the same React batch.
      setDeleting(true);
      router.back();
      deleteProperty(id);
    };
    if (Platform.OS === "web") {
      if (window.confirm(t("property.deletePrompt", { name: propertyName })))
        ok();
    } else {
      Alert.alert(
        t("property.deleteAlertTitle"),
        t("property.deleteAlertBody", { name: propertyName }),
        [
          { text: t("property.keep"), style: "cancel" },
          { text: t("property.delete"), style: "destructive", onPress: ok },
        ]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>
          {property.name}
        </Text>

        <EmbeddedMap
          address={property.address}
          latitude={property.latitude}
          longitude={property.longitude}
          height={200}
        />

        {!editing ? (
          <ReadView
            address={property.address}
            notes={property.notes}
            onEdit={startEdit}
            onDelete={confirmDelete}
            onOpenMap={() => openMapsForAddress(property.address)}
          />
        ) : (
          <EditView
            name={name}
            address={address}
            notes={notes}
            saving={saving}
            onChangeName={setName}
            onChangeAddress={setAddress}
            onChangeNotes={setNotes}
            onCancel={cancelEdit}
            onSave={save}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------- Read view ----------------

function ReadView({
  address,
  notes,
  onEdit,
  onDelete,
  onOpenMap,
}: {
  address: string;
  notes?: string;
  onEdit: () => void;
  onDelete: () => void;
  onOpenMap: () => void;
}) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <>
      <View
        style={[
          styles.summary,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Pressable
          onPress={onOpenMap}
          accessibilityRole="link"
          accessibilityLabel={t("property.a11y.openInMaps", { address })}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="location-outline" size={16} color={colors.text} />
          <Text style={[styles.rowText, { color: BRAND }]}>{address}</Text>
          <Ionicons name="open-outline" size={14} color={BRAND} />
        </Pressable>
        {notes && (
          <View style={styles.row}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={colors.text}
            />
            <Text style={[styles.rowText, { color: colors.text }]}>
              {notes}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          styles.btnPrimary,
          { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="create-outline" size={18} color="white" />
        <Text style={styles.btnPrimaryText}>{t("property.edit")}</Text>
      </Pressable>

      <Pressable
        onPress={onDelete}
        style={({ pressed }) => [
          styles.btnDanger,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="trash-outline" size={16} color="#B91C1C" />
        <Text style={styles.btnDangerText}>{t("property.deleteButton")}</Text>
      </Pressable>
    </>
  );
}

// ---------------- Edit view ----------------

function EditView({
  name,
  address,
  notes,
  saving,
  onChangeName,
  onChangeAddress,
  onChangeNotes,
  onCancel,
  onSave,
}: {
  name: string;
  address: string;
  notes: string;
  saving: boolean;
  onChangeName: (v: string) => void;
  onChangeAddress: (v: string) => void;
  onChangeNotes: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <View
      style={[
        styles.summary,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {t("property.name")}
      </Text>
      <TextInput
        value={name}
        onChangeText={onChangeName}
        placeholder={t("property.namePlaceholder")}
        placeholderTextColor={colors.text + "80"}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {t("property.address")}
      </Text>
      <TextInput
        value={address}
        onChangeText={onChangeAddress}
        placeholder={t("property.addressPlaceholder")}
        placeholderTextColor={colors.text + "80"}
        autoCapitalize="words"
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        returnKeyType="done"
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {t("property.notes")}
      </Text>
      <TextInput
        value={notes}
        onChangeText={onChangeNotes}
        placeholder={t("property.notesPlaceholder")}
        placeholderTextColor={colors.text + "80"}
        multiline
        style={[
          styles.input,
          styles.multiline,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
      <View style={styles.formButtons}>
        <Pressable
          onPress={onCancel}
          disabled={saving}
          style={({ pressed }) => [
            styles.btnGhost,
            {
              borderColor: colors.border,
              opacity: saving ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.btnGhostText, { color: colors.text }]}>
            {t("property.cancel")}
          </Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.btnPrimary,
            styles.btnPrimaryFlex,
            {
              backgroundColor: BRAND,
              opacity: saving ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.btnPrimaryText}>
            {saving
              ? t("property.lookingUp")
              : t("property.saveChanges")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  summary: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { fontSize: 14, flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 64, textAlignVertical: "top" },
  formButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnGhostText: { fontSize: 14, fontWeight: "600" },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnPrimaryFlex: { flex: 1, paddingVertical: 12, borderRadius: 10 },
  btnPrimaryText: { color: "white", fontSize: 16, fontWeight: "700" },
  btnDanger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#B91C1C",
  },
  btnDangerText: { color: "#B91C1C", fontSize: 16, fontWeight: "700" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 14, opacity: 0.7, textAlign: "center" },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  backBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
