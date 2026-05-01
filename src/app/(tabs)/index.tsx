import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { Redirect, useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { geocodeAddress } from "@/lib/geocode";
import { useT } from "@/lib/i18n";
import { useActiveIdentity } from "@/store/identity";
import { usePropertiesForOwner, usePropertiesStore } from "@/store/properties";

export default function HomeRoute() {
  // ALL hooks must be called before any early return — switching identity
  // would otherwise change the hook count and trigger React's rules-of-hooks
  // crash ("Rendered fewer hooks than expected").
  const { colors } = useTheme();
  const router = useRouter();
  const identity = useActiveIdentity();
  const properties = usePropertiesForOwner(identity.id);
  const addProperty = usePropertiesStore((s) => s.addProperty);
  const deleteProperty = usePropertiesStore((s) => s.deleteProperty);
  const t = useT();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Home is admin-only. Bounce non-bookers to their primary tab.
  if (identity.role !== "booker") {
    return <Redirect href="/(tabs)/jobs" />;
  }

  const firstName = identity.name.split(" ")[0];

  function reset() {
    setAdding(false);
    setName("");
    setAddress("");
    setNotes("");
    setSaving(false);
  }

  function startAdd() {
    setAdding(true);
    setName("");
    setAddress("");
    setNotes("");
  }

  function notify(title: string, msg: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
  }

  async function submit() {
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
    setSaving(true);
    try {
      const coords = await geocodeAddress(trimmedAddress);
      addProperty({
        name: trimmedName,
        address: trimmedAddress,
        notes: trimmedNotes,
        ownerId: identity.id,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      reset();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: string, label: string) {
    const ok = () => deleteProperty(id);
    if (Platform.OS === "web") {
      if (window.confirm(t("property.deletePrompt", { name: label }))) ok();
    } else {
      Alert.alert(
        t("property.deleteAlertTitle"),
        t("property.deleteAlertBody", { name: label }),
        [
          { text: t("property.keep"), style: "cancel" },
          { text: t("property.delete"), style: "destructive", onPress: ok },
        ]
      );
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            {t("home.greeting", { name: firstName })}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {t("home.subtitle")}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/book")}
          disabled={properties.length === 0}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: properties.length === 0 ? colors.border : BRAND,
              opacity: pressed && properties.length > 0 ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="sparkles" size={20} color="white" />
          <Text style={styles.ctaText}>{t("home.bookCta")}</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("home.properties")}
            </Text>
            {!adding && (
              <Pressable
                onPress={startAdd}
                style={({ pressed }) => [
                  styles.addBtn,
                  { borderColor: BRAND, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="add" size={16} color={BRAND} />
                <Text style={[styles.addBtnText, { color: BRAND }]}>
                  {t("home.add")}
                </Text>
              </Pressable>
            )}
          </View>

          {adding && (
            <View
              style={[
                styles.addCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.editorTitle, { color: colors.text }]}>
                {t("property.new")}
              </Text>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {t("property.name")}
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
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
                onChangeText={setAddress}
                placeholder={t("property.addressPlaceholder")}
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
                {t("property.notes")}
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
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
                  onPress={reset}
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
                  onPress={submit}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    {
                      backgroundColor: BRAND,
                      opacity: saving ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.btnPrimaryText}>
                    {saving ? t("property.lookingUp") : t("property.save")}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {properties.length === 0 && !adding ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="home-outline" size={24} color={BRAND} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t("home.emptyTitle")}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.text }]}>
                {t("home.emptyBody")}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {properties.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() =>
                    router.push({
                      pathname: "/properties/[id]",
                      params: { id: p.id },
                    })
                  }
                  accessibilityRole="link"
                  accessibilityLabel={t("property.a11y.open", { name: p.name })}
                  style={({ pressed }) => [
                    styles.propertyCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={[styles.propertyName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    <Text
                      style={[styles.propertyAddress, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {p.address}
                    </Text>
                    {p.notes && (
                      <Text
                        style={[styles.propertyNotes, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {p.notes}
                      </Text>
                    )}
                  </View>
                  <View style={{ gap: 6, alignItems: "flex-end" }}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/book",
                          params: { propertyId: p.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.bookSmall,
                        { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <Text style={styles.bookSmallText}>{t("home.bookSmall")}</Text>
                    </Pressable>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/properties/[id]",
                            params: { id: p.id, edit: "1" },
                          })
                        }
                        accessibilityLabel={t("property.a11y.edit", {
                          name: p.name,
                        })}
                        style={({ pressed }) => [
                          styles.deleteSmall,
                          { opacity: pressed ? 0.5 : 0.7 },
                        ]}
                      >
                        <Ionicons
                          name="create-outline"
                          size={16}
                          color={colors.text}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDelete(p.id, p.name)}
                        accessibilityLabel={t("property.a11y.delete", {
                          name: p.name,
                        })}
                        style={({ pressed }) => [
                          styles.deleteSmall,
                          { opacity: pressed ? 0.5 : 0.7 },
                        ]}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={colors.text}
                        />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.benefits, { backgroundColor: BRAND_LIGHT }]}>
          <Text style={[styles.benefitsTitle, { color: BRAND }]}>
            {t("home.benefits.title")}
          </Text>
          <View style={styles.benefitRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={BRAND} />
            <Text style={styles.benefitText}>{t("home.benefits.verified")}</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="time-outline" size={18} color={BRAND} />
            <Text style={styles.benefitText}>
              {t("home.benefits.flexible")}
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkbox-outline" size={18} color={BRAND} />
            <Text style={styles.benefitText}>
              {t("home.benefits.reviewers")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  header: { gap: 4 },
  greeting: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 14, opacity: 0.7 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaText: { color: "white", fontSize: 16, fontWeight: "700" },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 999,
  },
  addBtnText: { fontSize: 13, fontWeight: "600" },
  addCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  editorTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
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
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnPrimaryText: { color: "white", fontSize: 14, fontWeight: "700" },
  emptyCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyBody: { fontSize: 13, opacity: 0.7, textAlign: "center" },
  propertyCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  propertyName: { fontSize: 15, fontWeight: "700" },
  propertyAddress: { fontSize: 13, opacity: 0.7 },
  propertyNotes: { fontSize: 12, opacity: 0.6 },
  bookSmall: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  bookSmallText: { color: "white", fontSize: 13, fontWeight: "700" },
  deleteSmall: { padding: 4 },
  benefits: {
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  benefitsTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitText: { fontSize: 14, color: "#0B5557", flex: 1 },
});
