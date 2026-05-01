import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookingCard } from "@/components/booking-card";
import { bookings } from "@/data/bookings";

export default function BookingsRoute() {
  const { colors } = useTheme();
  const router = useRouter();

  const upcoming = bookings.filter(
    (b) => b.status === "upcoming" || b.status === "in-progress"
  );
  const past = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Your Bookings</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Upcoming
          </Text>
          {upcoming.length === 0 ? (
            <Text style={[styles.empty, { color: colors.text }]}>
              No upcoming bookings.
            </Text>
          ) : (
            upcoming.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onPress={() => router.push(`/pros/${b.proId}`)}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Past</Text>
          {past.length === 0 ? (
            <Text style={[styles.empty, { color: colors.text }]}>
              No past bookings.
            </Text>
          ) : (
            past.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onPress={() => router.push(`/pros/${b.proId}`)}
              />
            ))
          )}
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
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  empty: {
    fontSize: 14,
    opacity: 0.6,
    paddingVertical: 8,
  },
});
