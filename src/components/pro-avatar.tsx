import { View, Text, StyleSheet } from "react-native";
import { getInitials } from "@/data/professionals";

interface Props {
  name: string;
  color: string;
  size?: number;
}

export function ProAvatar({ name, color, size = 48 }: Props) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "white",
    fontWeight: "700",
  },
});
