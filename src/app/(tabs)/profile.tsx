import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProAvatar } from "@/components/pro-avatar";
import { BRAND } from "@/constants/colors";

interface Row {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
}

const ACCOUNT_ROWS: Row[] = [
  { icon: "location-outline", label: "Saved addresses", value: "1 saved" },
  { icon: "card-outline", label: "Payment methods", value: "Visa •• 4242" },
  { icon: "notifications-outline", label: "Notifications" },
];

const SUPPORT_ROWS: Row[] = [
  { icon: "help-circle-outline", label: "Help & Support" },
  { icon: "document-text-outline", label: "Terms & Privacy" },
  { icon: "log-out-outline", label: "Sign out" },
];

export default function ProfileRoute() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ProAvatar name="John Smith" color={BRAND} size={88} />
          <Text style={[styles.name, { color: colors.text }]}>John Smith</Text>
          <Text style={[styles.email, { color: colors.text }]}>
            john@example.com
          </Text>
        </View>

        <Section title="Account" rows={ACCOUNT_ROWS} />
        <Section title="Support" rows={SUPPORT_ROWS} />

        <Text style={[styles.version, { color: colors.text }]}>
          CleaningOrg · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {rows.map((row, idx) => (
          <Pressable
            key={row.label}
            style={({ pressed }) => [
              styles.row,
              idx < rows.length - 1 && {
                borderBottomColor: colors.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name={row.icon} size={20} color={colors.text} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {row.label}
            </Text>
            {row.value ? (
              <Text style={[styles.rowValue, { color: colors.text }]}>
                {row.value}
              </Text>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 8,
  },
  email: {
    fontSize: 14,
    opacity: 0.7,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    opacity: 0.6,
  },
  version: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: "center",
    marginTop: 12,
  },
});
