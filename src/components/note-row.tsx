import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import { View, Text, StyleSheet } from "react-native";
import { type Note, formatJobDate } from "@/data/jobs";

interface Props {
  note: Note;
  authorLabel: string;
}

export function NoteRow({ note, authorLabel }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.author, { color: colors.text }]}>{authorLabel}</Text>
        <Text style={[styles.timestamp, { color: colors.text }]}>
          {formatJobDate(note.createdAt)}
        </Text>
      </View>
      {note.text && (
        <Text style={[styles.text, { color: colors.text }]}>{note.text}</Text>
      )}
      {note.photoUri && (
        <Image
          source={note.photoUri}
          style={styles.photo}
          contentFit="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: { fontSize: 12, fontWeight: "700" },
  timestamp: { fontSize: 11, opacity: 0.6 },
  text: { fontSize: 14, lineHeight: 20 },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 8,
    backgroundColor: "#0001",
  },
});
