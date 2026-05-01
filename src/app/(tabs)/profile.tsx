import { useTheme } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProAvatar } from "@/components/pro-avatar";
import { BRAND } from "@/constants/colors";
import type { Role } from "@/data/identities";
import { formatPrice } from "@/data/jobs";
import { SUPPORTED_LOCALES, useLocaleStore, useT } from "@/lib/i18n";
import { useActiveIdentity } from "@/store/identity";
import {
  useBookerSpend,
  useCleanerEarnings,
  useCleanerPending,
  useReviewerEarnings,
  useReviewerPending,
} from "@/store/jobs";

export default function ProfileRoute() {
  const { colors } = useTheme();
  const identity = useActiveIdentity();
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const ROLE_LABEL: Record<Role, string> = {
    booker: t("profile.roles.booker"),
    cleaner: t("profile.roles.cleaner"),
    reviewer: t("profile.roles.reviewer"),
  };

  // All three selectors run unconditionally (hooks rules). Each demo
  // identity is bound to a single role, so the off-role selector's `id`
  // filter never matches and that branch's totals are
  // { totalCents: 0, jobCount: 0 } — the React work is small and the
  // alternative (conditional hooks) would be a rules-of-hooks violation.
  const cleanerEarnings = useCleanerEarnings(identity.id);
  const cleanerPending = useCleanerPending(identity.id);
  const reviewerEarnings = useReviewerEarnings(identity.id);
  const reviewerPending = useReviewerPending(identity.id);
  const bookerSpend = useBookerSpend(identity.id);
  const totals =
    identity.role === "cleaner"
      ? { label: t("profile.totals.earnings"), ...cleanerEarnings }
      : identity.role === "reviewer"
        ? { label: t("profile.totals.earnings"), ...reviewerEarnings }
        : identity.role === "booker"
          ? { label: t("profile.totals.spend"), ...bookerSpend }
          : null;

  // Pending only applies to the two paid roles. Booker has no "pending
  // spend" — they're billed when they book, not when the work clears.
  const pending =
    identity.role === "cleaner"
      ? cleanerPending
      : identity.role === "reviewer"
        ? reviewerPending
        : null;

  const totalsSub =
    !totals
      ? ""
      : totals.jobCount === 0
        ? t("profile.totals.noJobs")
        : totals.jobCount === 1
          ? t("profile.totals.acrossOne")
          : t("profile.totals.acrossMany", { count: totals.jobCount });

  const pendingSub =
    pending && pending.jobCount > 0
      ? pending.jobCount === 1
        ? t("profile.totals.pendingOne", {
            price: formatPrice(pending.totalCents),
          })
        : t("profile.totals.pendingMany", {
            price: formatPrice(pending.totalCents),
            count: pending.jobCount,
          })
      : null;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={[]}
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

        {totals && (
          <View
            style={[
              styles.totalsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.totalsLabel, { color: colors.text }]}>
              {totals.label}
            </Text>
            <Text style={[styles.totalsValue, { color: BRAND }]}>
              {formatPrice(totals.totalCents)}
            </Text>
            <Text style={[styles.totalsSub, { color: colors.text }]}>
              {totalsSub}
            </Text>
            {pendingSub && (
              <Text style={[styles.totalsPending, { color: colors.text }]}>
                {pendingSub}
              </Text>
            )}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("profile.sectionLanguage")}
          </Text>
        </View>
        <View style={styles.localeRow}>
          {SUPPORTED_LOCALES.map((opt) => {
            const active = opt.code === locale;
            return (
              <Pressable
                key={opt.code}
                onPress={() => setLocale(opt.code)}
                style={({ pressed }) => [
                  styles.localeChip,
                  {
                    backgroundColor: active ? BRAND : colors.card,
                    borderColor: active ? BRAND : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.localeChipText,
                    { color: active ? "white" : colors.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.version, { color: colors.text }]}>
          {t("profile.version")}
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
  totalsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  totalsLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  totalsValue: { fontSize: 30, fontWeight: "700" },
  totalsSub: { fontSize: 13, opacity: 0.7 },
  totalsPending: { fontSize: 13, opacity: 0.7, fontWeight: "600", marginTop: 2 },
  version: { fontSize: 12, opacity: 0.5, textAlign: "center", marginTop: 8 },
  localeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  localeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  localeChipText: { fontSize: 14, fontWeight: "600" },
});
