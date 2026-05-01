import { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { type CelebrateKind, useCelebrateStore } from "@/store/celebrate";

const COLORS = [
  "#F59E0B",
  "#EC4899",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
];

const EMOJI_PALETTES: Record<Exclude<CelebrateKind, "confetti">, string[]> = {
  booking: ["🎉", "✨", "📅", "🥳"],
  cleanDone: ["🧹", "✨", "🫧", "💫"],
  approve: ["✅", "⭐", "🎊", "🎉"],
};

const COUNT = 30;

interface Particle {
  startX: number;
  /** Either a hex color (rectangle mode) or an emoji string (text mode). */
  symbol: string;
  isEmoji: boolean;
  durationMs: number;
  rotateEnd: number;
}

function makeParticles(width: number, kind: CelebrateKind): Particle[] {
  const isEmoji = kind !== "confetti";
  const palette: string[] = isEmoji ? EMOJI_PALETTES[kind] : COLORS;
  return Array.from({ length: COUNT }, () => ({
    startX: Math.random() * width,
    symbol: palette[Math.floor(Math.random() * palette.length)],
    isEmoji,
    durationMs: 1500 + Math.random() * 700,
    rotateEnd: 360 + Math.random() * 720,
  }));
}

export function Confetti() {
  const active = useCelebrateStore((s) => s.active);
  const triggerCount = useCelebrateStore((s) => s.triggerCount);
  const kind = useCelebrateStore((s) => s.kind);
  const dismiss = useCelebrateStore((s) => s.dismiss);
  const { width, height } = Dimensions.get("window");
  // Recompute particles on each trigger so back-to-back celebrations get
  // fresh randomness, not the same fall pattern.
  const particles = useMemo(
    () => makeParticles(width, kind),
    [width, triggerCount, kind]
  );

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(dismiss, 2200);
    return () => clearTimeout(t);
  }, [active, triggerCount, dismiss]);

  if (!active) return null;
  return (
    // key={triggerCount} forces a full remount of the particle subtree on
    // each new trigger so each particle's onMount animation re-fires.
    <View key={triggerCount} pointerEvents="none" style={styles.root}>
      {particles.map((p, i) => (
        <ConfettiParticle key={i} {...p} screenHeight={height} />
      ))}
    </View>
  );
}

function ConfettiParticle({
  startX,
  symbol,
  isEmoji,
  durationMs,
  rotateEnd,
  screenHeight,
}: Particle & { screenHeight: number }) {
  const y = useSharedValue(-40);
  const rot = useSharedValue(0);

  useEffect(() => {
    y.value = withTiming(screenHeight + 40, {
      duration: durationMs,
      easing: Easing.in(Easing.quad),
    });
    rot.value = withTiming(rotateEnd, {
      duration: durationMs,
      easing: Easing.linear,
    });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }],
  }));

  if (isEmoji) {
    return (
      <Animated.Text
        style={[
          {
            position: "absolute",
            left: startX,
            top: 0,
            fontSize: 26,
          },
          style,
        ]}
      >
        {symbol}
      </Animated.Text>
    );
  }

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: 0,
          width: 10,
          height: 14,
          borderRadius: 2,
          backgroundColor: symbol,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
});
