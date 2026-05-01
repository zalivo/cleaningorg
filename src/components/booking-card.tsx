import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import {
  type Booking,
  type BookingStatus,
  formatBookingDate,
} from "@/data/bookings";

interface Props {
  booking: Booking;
  onPress?: () => void;
}

const STATUS_STYLES: Record<BookingStatus, { bg: string; fg: string; label: string }> = {
  upcoming: { bg: BRAND_LIGHT, fg: BRAND, label: "Upcoming" },
  "in-progress": { bg: "#FEF3C7", fg: "#B45309", label: "In progress" },
  completed: { bg: "#E5E7EB", fg: "#374151", label: "Completed" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C", label: "Cancelled" },
};

export function BookingCard({ booking, onPress }: Props) {
  const { colors } = useTheme();
  const status = STATUS_STYLES[booking.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.service, { color: colors.text }]}>
          {booking.serviceName}
        </Text>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>
            {status.label}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Ionicons name="person-circle-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]}>
          {booking.proName}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]}>
          {formatBookingDate(booking.date)}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={16} color={colors.text} />
        <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
          {booking.address}
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.price, { color: BRAND }]}>
          ${booking.totalPrice}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  service: {
    fontSize: 16,
    fontWeight: "600",
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meta: {
    fontSize: 13,
    opacity: 0.85,
    flex: 1,
  },
  footer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
  },
});
