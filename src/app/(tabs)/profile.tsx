import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProAvatar } from "@/components/pro-avatar";
import { BRAND } from "@/constants/colors";
import { identities, type Role } from "@/data/identities";
import { useActiveIdentity, useIdentityStore } from "@/store/identity";
import { useJobsStore } from "@/store/jobs";

const ROLE_LABEL: Record<Role, string> = {
  booker: "Booker",
  cleaner: "Cleaner",
  reviewer: "Reviewer",
};

export default function ProfileRoute() {
  const { colors } = useTheme();
  const identity = useActiveIdentity();
  const setActive = useIdentityStore((s) => s.setActiveIdentity);
  const reset = useJobsStore((s) => s.resetDemo);

  function confirmReset() {
    const ok = () => reset();
    if (Platform.OS === "web") {
      if (window.confirm("Reset demo data?")) ok();
    } else {
      Alert.alert(
        "Reset demo data?",
        "All current jobs will be replaced with the seed data.",
        [
          { text: "Keep", style: "cancel" },
          { text: "Reset", style: "destructive", onPress: ok },
        ]
      );
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ProAvatar name={identity.name} color={identity.avatarColor} size={88} />
          <Text style={[styles.name, { color: colors.text }]}>
            {identity.name}
          </Text>
          <Text style={[styles.email, { color: colors.text }]}>
            {identity.email}
          </Text>
          <View style={[styles.rolePill, { borderColor: BRAND }]}>
            <Text style={[styles.roleText, { color: BRAND }]}>
              {ROLE_LABEL[identity.role]}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Demo identity
          </Text>
          <Text style={[styles.sectionHint, { color: colors.text }]}>
            Tap to switch between booker, cleaner, and reviewer views.
          </Text>
        </View>
        <View style={styles.identityList}>
          {identities.map((i) => {
            const active = i.id === identity.id;
            return (
              <Pressable
                key={i.id}
                onPress={() => setActive(i.id)}
                style={({ pressed }) => [
                  styles.identityCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: active ? BRAND : colors.border,
                    borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <ProAvatar name={i.name} color={i.avatarColor} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.identityName, { color: colors.text }]}>
                    {i.name}
                  </Text>
                  <Text style={[styles.identityRole, { color: colors.text }]}>
                    {ROLE_LABEL[i.role]} · {i.email}
                  </Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={22} color={BRAND} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={confirmReset}
          style={({ pressed }) => [
            styles.reset,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.text} />
          <Text style={[styles.resetText, { color: colors.text }]}>
            Reset demo data
          </Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.text }]}>
          CleaningOrg · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  header: { alignItems: "center", gap: 6, paddingVertical: 16 },
  name: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  email: { fontSize: 14, opacity: 0.7 },
  rolePill: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeader: { gap: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  sectionHint: { fontSize: 13, opacity: 0.65 },
  identityList: { gap: 10 },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  identityName: { fontSize: 15, fontWeight: "600" },
  identityRole: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  reset: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  resetText: { fontSize: 15, fontWeight: "600" },
  version: { fontSize: 12, opacity: 0.5, textAlign: "center", marginTop: 8 },
});
