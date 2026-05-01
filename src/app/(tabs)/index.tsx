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
  const updateProperty = usePropertiesStore((s) => s.updateProperty);
  const deleteProperty = usePropertiesStore((s) => s.deleteProperty);

  const [editorMode, setEditorMode] = useState<
    | { kind: "closed" }
    | { kind: "adding" }
    | { kind: "editing"; id: string }
  >({ kind: "closed" });
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Home is admin-only. Bounce non-bookers to their primary tab.
  if (identity.role !== "booker") {
    return <Redirect href="/(tabs)/jobs" />;
  }

  const firstName = identity.name.split(" ")[0];

  function reset() {
    setEditorMode({ kind: "closed" });
    setName("");
    setAddress("");
    setNotes("");
  }

  function startAdd() {
    setEditorMode({ kind: "adding" });
    setName("");
    setAddress("");
    setNotes("");
  }

  function startEdit(id: string) {
    const p = properties.find((p) => p.id === id);
    if (!p) return;
    setEditorMode({ kind: "editing", id });
    setName(p.name);
    setAddress(p.address);
    setNotes(p.notes ?? "");
  }

  function notify(title: string, msg: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
  }

  function submit() {
    if (!name.trim()) return notify("Name required", "Give the property a short name.");
    if (!address.trim()) return notify("Address required", "Type the address.");
    if (editorMode.kind === "editing") {
      updateProperty(editorMode.id, {
        name: name.trim(),
        address: address.trim(),
        notes: notes.trim() || undefined,
      });
    } else {
      addProperty({
        name: name.trim(),
        address: address.trim(),
        notes: notes.trim() || undefined,
        ownerId: identity.id,
      });
    }
    reset();
  }

  function confirmDelete(id: string, label: string) {
    const ok = () => deleteProperty(id);
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${label}"?`)) ok();
    } else {
      Alert.alert("Delete property?", `"${label}" will be removed.`, [
        { text: "Keep", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: ok },
      ]);
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
            Hi, {firstName} 👋
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Manage your properties and book a cleaning when you need one.
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
          <Text style={styles.ctaText}>Book a cleaning</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              My properties
            </Text>
            {editorMode.kind === "closed" && (
              <Pressable
                onPress={startAdd}
                style={({ pressed }) => [
                  styles.addBtn,
                  { borderColor: BRAND, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="add" size={16} color={BRAND} />
                <Text style={[styles.addBtnText, { color: BRAND }]}>Add</Text>
              </Pressable>
            )}
          </View>

          {editorMode.kind !== "closed" && (
            <View
              style={[
                styles.addCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.editorTitle, { color: colors.text }]}>
                {editorMode.kind === "editing" ? "Edit property" : "New property"}
              </Text>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Evergreen House"
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
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="742 Evergreen Terrace"
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
                Notes (optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Gate code, parking, pets, etc."
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
                  style={({ pressed }) => [
                    styles.btnGhost,
                    { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.btnGhostText, { color: colors.text }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.btnPrimaryText}>
                    {editorMode.kind === "editing" ? "Save changes" : "Save property"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {properties.length === 0 && editorMode.kind === "closed" ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="home-outline" size={24} color={BRAND} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No properties yet
              </Text>
              <Text style={[styles.emptyBody, { color: colors.text }]}>
                Add a property to start booking cleanings.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {properties.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.propertyCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
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
                      <Text style={styles.bookSmallText}>Book</Text>
                    </Pressable>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={() => startEdit(p.id)}
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
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.benefits, { backgroundColor: BRAND_LIGHT }]}>
          <Text style={[styles.benefitsTitle, { color: BRAND }]}>
            Why CleaningOrg?
          </Text>
          <View style={styles.benefitRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={BRAND} />
            <Text style={styles.benefitText}>Verified, background-checked pros</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="time-outline" size={18} color={BRAND} />
            <Text style={styles.benefitText}>
              Flexible scheduling — daily, weekly, monthly
            </Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkbox-outline" size={18} color={BRAND} />
            <Text style={styles.benefitText}>
              Independent reviewers approve every clean
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
