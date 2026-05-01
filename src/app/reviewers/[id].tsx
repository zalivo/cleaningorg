import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ProAvatar } from "@/components/pro-avatar";
import { formatPrice } from "@/data/jobs";
import { getReviewer } from "@/data/reviewers";

export default function ReviewerDetailRoute() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewer = getReviewer(id);

  if (!reviewer) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Reviewer not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <ProAvatar name={reviewer.name} color={reviewer.avatarColor} size={96} />
        <Text style={[styles.name, { color: colors.text }]}>
          {reviewer.name}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={[styles.rating, { color: colors.text }]}>
            {reviewer.rating.toFixed(1)}
          </Text>
          <Text style={[styles.jobs, { color: colors.text }]}>
            · {reviewer.reviewsCompleted} reviews
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Reviews" value={String(reviewer.reviewsCompleted)} />
        <Stat label="Fee" value={formatPrice(reviewer.feeCents)} />
        <Stat label="Rating" value={reviewer.rating.toFixed(1)} />
      </View>

      <Section title="About">
        <Text style={[styles.bio, { color: colors.text }]}>{reviewer.bio}</Text>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
  },
  jobs: {
    fontSize: 13,
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  stat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.85,
  },
});
