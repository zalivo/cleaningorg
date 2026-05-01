import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { ProAvatar } from "@/components/pro-avatar";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { formatRatePerHour } from "@/data/jobs";
import { getProfessional } from "@/data/professionals";
import { getService } from "@/data/services";

export default function ProDetailRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pro = getProfessional(id);

  if (!pro) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Professional not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <ProAvatar name={pro.name} color={pro.avatarColor} size={96} />
        <Text style={[styles.name, { color: colors.text }]}>{pro.name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={[styles.rating, { color: colors.text }]}>
            {pro.rating.toFixed(1)}
          </Text>
          <Text style={[styles.jobs, { color: colors.text }]}>
            · {pro.jobsCompleted} jobs
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Experience" value={`${pro.yearsExperience} yrs`} />
        <Stat label="Rate" value={formatRatePerHour(pro.hourlyRate)} />
        <Stat label="Rating" value={pro.rating.toFixed(1)} />
      </View>

      <Section title="About">
        <Text style={[styles.bio, { color: colors.text }]}>{pro.bio}</Text>
      </Section>

      <Section title="Specialties">
        <View style={styles.specialties}>
          {pro.specialties.map((sid) => {
            const s = getService(sid);
            if (!s) return null;
            return (
              <View
                key={sid}
                style={[
                  styles.specialty,
                  { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
                ]}
              >
                <Ionicons name={s.icon} size={14} color={BRAND} />
                <Text style={[styles.specialtyText, { color: BRAND }]}>
                  {s.name}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>

      <Pressable
        onPress={() =>
          router.push({ pathname: "/book", params: { proId: pro.id } })
        }
        style={({ pressed }) => [
          styles.book,
          { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="sparkles" size={18} color="white" />
        <Text style={styles.bookText}>Book with {pro.name.split(" ")[0]}</Text>
      </Pressable>
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
  specialties: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specialty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  specialtyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  book: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  bookText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
