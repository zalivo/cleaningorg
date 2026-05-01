import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { BRAND } from "@/constants/colors";

interface Props {
  placeholder?: string;
  onSubmit: (input: { text?: string; photoUri?: string }) => void;
}

export function NoteComposer({
  placeholder = "Add a note...",
  onSubmit,
}: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [picking, setPicking] = useState(false);

  const canSubmit = text.trim().length > 0 || !!photoUri;

  async function pickPhoto() {
    if (picking) return;
    setPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        if (Platform.OS !== "web") {
          Alert.alert(
            "Photo access needed",
            "Allow photo library access in Settings to attach a photo."
          );
        }
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.6,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } finally {
      setPicking(false);
    }
  }

  function submit() {
    if (!canSubmit) return;
    onSubmit({ text: text.trim() || undefined, photoUri });
    setText("");
    setPhotoUri(undefined);
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.text + "80"}
        multiline
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
      {photoUri && (
        <View style={styles.previewWrap}>
          <Image source={photoUri} style={styles.preview} contentFit="cover" />
          <Pressable
            onPress={() => setPhotoUri(undefined)}
            hitSlop={8}
            style={styles.previewRemove}
          >
            <Ionicons name="close-circle" size={22} color="#B91C1C" />
          </Pressable>
        </View>
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={pickPhoto}
          disabled={picking}
          style={({ pressed }) => [
            styles.btnSecondary,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons
            name={photoUri ? "image" : "image-outline"}
            size={16}
            color={colors.text}
          />
          <Text style={[styles.btnSecondaryText, { color: colors.text }]}>
            {photoUri ? "Change photo" : "Attach photo"}
          </Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.btnPrimary,
            {
              opacity: !canSubmit ? 0.4 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.btnPrimaryText}>Add note</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    minHeight: 64,
    textAlignVertical: "top",
    fontSize: 14,
  },
  previewWrap: { position: "relative", alignSelf: "flex-start" },
  preview: {
    width: 140,
    height: 105,
    borderRadius: 8,
    backgroundColor: "#0001",
  },
  previewRemove: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 999,
  },
  actions: { flexDirection: "row", gap: 10, alignItems: "center" },
  btnSecondary: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnSecondaryText: { fontSize: 13, fontWeight: "600" },
  btnPrimary: {
    flex: 1,
    backgroundColor: BRAND,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnPrimaryText: { color: "white", fontSize: 14, fontWeight: "700" },
});
