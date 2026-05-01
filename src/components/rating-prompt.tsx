import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { BRAND } from "@/constants/colors";
import { type RaterRole } from "@/data/ratings";
import { useRatingForJob, useRatingsStore } from "@/store/ratings";

interface Props {
  jobId: string;
  raterRole: RaterRole;
  raterIdentityId: string;
  subjectIdentityId: string;
  heading?: string;
}

const STARS: ReadonlyArray<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

export function RatingPrompt({
  jobId,
  raterRole,
  raterIdentityId,
  subjectIdentityId,
  heading,
}: Props) {
  const { colors } = useTheme();
  const existing = useRatingForJob(jobId, raterRole);
  const addRating = useRatingsStore((s) => s.addRating);
  const [score, setScore] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [comment, setComment] = useState("");

  // Once submitted, the prompt becomes a compact confirmation rather than
  // disappearing — gives feedback that the action landed and prevents the
  // user wondering why the prompt vanished.
  if (existing) {
    return (
      <View
        style={[
          styles.confirm,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="checkmark-circle" size={18} color={BRAND} />
        <Text style={[styles.confirmText, { color: colors.text }]}>
          You rated {existing.score} {existing.score === 1 ? "star" : "stars"}.
        </Text>
      </View>
    );
  }

  const canSubmit = score >= 1;

  const submit = () => {
    if (!canSubmit) return;
    addRating({
      jobId,
      raterIdentityId,
      raterRole,
      subjectIdentityId,
      score,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.heading, { color: colors.text }]}>
        {heading ?? "Rate this cleaning"}
      </Text>
      <Text style={[styles.sub, { color: colors.text }]}>
        Tap a star. Ratings are final.
      </Text>
      <View style={styles.stars}>
        {STARS.map((n) => {
          const filled = score >= n;
          return (
            <Pressable
              key={n}
              onPress={() => setScore(n)}
              accessibilityLabel={`${n} ${n === 1 ? "star" : "stars"}`}
              hitSlop={6}
            >
              <Ionicons
                name={filled ? "star" : "star-outline"}
                size={32}
                color={filled ? "#F59E0B" : colors.text}
              />
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Optional comment"
        placeholderTextColor={colors.text + "80"}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
      <Pressable
        onPress={submit}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.submit,
          {
            backgroundColor: BRAND,
            opacity: !canSubmit ? 0.4 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={styles.submitText}>Submit rating</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  heading: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 12, opacity: 0.6 },
  stars: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  submit: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: { color: "white", fontSize: 15, fontWeight: "700" },
  confirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  confirmText: { fontSize: 14, fontWeight: "600" },
});
