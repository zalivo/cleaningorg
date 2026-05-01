import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { Redirect, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProCard } from "@/components/pro-card";
import { ServiceCard } from "@/components/service-card";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { professionals } from "@/data/professionals";
import { services } from "@/data/services";
import { useActiveIdentity } from "@/store/identity";

export default function HomeRoute() {
  const { colors } = useTheme();
  const router = useRouter();
  const identity = useActiveIdentity();

  // Home is booker-only. If a non-booker lands here (e.g. cold reload while
  // their role is active), bounce them to their primary tab.
  if (identity.role !== "booker") {
    return <Redirect href="/(tabs)/jobs" />;
  }

  const firstName = identity.name.split(" ")[0];
  const topPros = [...professionals]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Hi, {firstName} 👋
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Ready for a fresh space?
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/book")}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: BRAND, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="sparkles" size={20} color="white" />
          <Text style={styles.ctaText}>Book a cleaning</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </Pressable>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Services
          </Text>
          <View style={{ gap: 10 }}>
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onPress={() =>
                  router.push({
                    pathname: "/book",
                    params: { serviceId: service.id },
                  })
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Top Professionals
            </Text>
          </View>
          <FlatList
            horizontal
            data={topPros}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 16 }}
            renderItem={({ item }) => (
              <ProCard
                pro={item}
                compact
                onPress={() => router.push(`/pros/${item.id}`)}
              />
            )}
          />
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
            <Ionicons name="card-outline" size={18} color={BRAND} />
            <Text style={styles.benefitText}>Secure payments and digital receipts</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  benefits: {
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: "#0B5557",
    flex: 1,
  },
});
