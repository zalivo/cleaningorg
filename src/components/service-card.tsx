import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { BRAND, BRAND_LIGHT } from "@/constants/colors";
import { formatPrice } from "@/data/jobs";
import type { Service } from "@/data/services";

interface Props {
  service: Service;
  onPress?: () => void;
  selected?: boolean;
}

export function ServiceCard({ service, onPress, selected }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? BRAND : colors.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: BRAND_LIGHT }]}>
        <Ionicons name={service.icon} size={22} color={BRAND} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]}>{service.name}</Text>
        <Text style={[styles.desc, { color: colors.text }]} numberOfLines={2}>
          {service.description}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.price, { color: BRAND }]}>
            {formatPrice(service.price * 100)}
          </Text>
          <Text style={[styles.duration, { color: colors.text }]}>
            · {service.durationHours}h
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  desc: {
    fontSize: 13,
    opacity: 0.7,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
  },
  duration: {
    fontSize: 13,
    opacity: 0.7,
  },
});
