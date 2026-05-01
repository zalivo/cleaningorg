import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { ProAvatar } from "@/components/pro-avatar";
import type { Professional } from "@/data/professionals";
import { useCleanerAggregateRating } from "@/store/ratings";

interface Props {
  pro: Professional;
  onPress?: () => void;
  compact?: boolean;
}

export function ProCard({ pro, onPress, compact }: Props) {
  const { colors } = useTheme();
  const agg = useCleanerAggregateRating(pro.id);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          width: compact ? 180 : "100%",
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <ProAvatar name={pro.name} color={pro.avatarColor} size={compact ? 56 : 48} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {pro.name}
        </Text>
        <View style={styles.row}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={[styles.rating, { color: colors.text }]}>
            {agg.avg.toFixed(1)}
          </Text>
          <Text style={[styles.jobs, { color: colors.text }]}>
            ({agg.count})
          </Text>
        </View>
        {!compact && (
          <Text style={[styles.bio, { color: colors.text }]} numberOfLines={2}>
            {pro.bio}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    alignItems: "center",
  },
  body: {
    alignItems: "center",
    gap: 4,
    width: "100%",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 13,
    fontWeight: "600",
  },
  jobs: {
    fontSize: 12,
    opacity: 0.6,
  },
  bio: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 4,
  },
});
