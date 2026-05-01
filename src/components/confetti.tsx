import { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCelebrateStore } from "@/store/celebrate";

const COLORS = [
  "#F59E0B",
  "#EC4899",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
];
const COUNT = 30;

interface Particle {
  startX: number;
  color: string;
  durationMs: number;
  rotateEnd: number;
}

function makeParticles(width: number): Particle[] {
  return Array.from({ length: COUNT }, () => ({
    startX: Math.random() * width,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    durationMs: 1500 + Math.random() * 700,
    rotateEnd: 360 + Math.random() * 720,
  }));
}

export function Confetti() {
  const active = useCelebrateStore((s) => s.active);
  const dismiss = useCelebrateStore((s) => s.dismiss);
  const { width, height } = Dimensions.get("window");
  const particles = useMemo(() => makeParticles(width), [width, active]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(dismiss, 2200);
    return () => clearTimeout(t);
  }, [active, dismiss]);

  if (!active) return null;
  return (
    <View pointerEvents="none" style={styles.root}>
      {particles.map((p, i) => (
        <ConfettiParticle key={i} {...p} screenHeight={height} />
      ))}
    </View>
  );
}

function ConfettiParticle({
  startX,
  color,
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
          backgroundColor: color,
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
