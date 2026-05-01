import { useTheme } from "@react-navigation/native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { BRAND } from "@/constants/colors";
import { openMapsForAddress } from "@/lib/maps";

// react-native-webview is a native module; on web we render an <iframe>
// directly via react-native-web's DOM passthrough, so we avoid importing
// the native module on web at all.
let WebView: React.ComponentType<{
  source: { uri: string };
  style?: ViewStyle;
  startInLoadingState?: boolean;
  // Limit the surface area we depend on; the real type is broader.
}> | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebView = require("react-native-webview").WebView;
}

interface EmbeddedMapProps {
  /**
   * Free-text address to render. Geocoded by Google Maps on the server side.
   * Ignored when both `latitude` and `longitude` are provided.
   */
  address?: string;
  /** Explicit latitude. Pair with `longitude`. */
  latitude?: number;
  /** Explicit longitude. Pair with `latitude`. */
  longitude?: number;
  /** Map zoom level (1–20). Defaults to 15. */
  zoom?: number;
  /** Visual height in points/px. Defaults to 200. */
  height?: number;
  /**
   * Render a small "Open in Maps" button that hands off to the system map
   * app via `openMapsForAddress`. Defaults to true when an `address` is
   * provided. Has no effect when there's nothing to hand off to.
   */
  showOpenButton?: boolean;
  /** Outer container style overrides. */
  style?: ViewStyle;
  /** Optional accessibility label for the map surface. */
  accessibilityLabel?: string;
}

function buildEmbedUrl({
  address,
  latitude,
  longitude,
  zoom,
}: {
  address?: string;
  latitude?: number;
  longitude?: number;
  zoom: number;
}): string | undefined {
  if (typeof latitude === "number" && typeof longitude === "number") {
    return `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`;
  }
  const trimmed = address?.trim();
  if (trimmed) {
    return `https://www.google.com/maps?q=${encodeURIComponent(
      trimmed
    )}&z=${zoom}&output=embed`;
  }
  return undefined;
}

/**
 * Embedded interactive map for an address or coordinate pair.
 *
 * Renders a Google Maps embed (no API key required for read-only embeds)
 * inside a native WebView on iOS/Android and a DOM `<iframe>` on web. The
 * map is interactive (pan/zoom) on all platforms.
 *
 * Usage:
 *   <EmbeddedMap address="742 Evergreen Terrace" />
 *   <EmbeddedMap latitude={37.78} longitude={-122.41} zoom={14} height={260} />
 */
export function EmbeddedMap({
  address,
  latitude,
  longitude,
  zoom = 15,
  height = 200,
  showOpenButton,
  style,
  accessibilityLabel,
}: EmbeddedMapProps) {
  const { colors } = useTheme();
  const url = useMemo(
    () => buildEmbedUrl({ address, latitude, longitude, zoom }),
    [address, latitude, longitude, zoom]
  );
  const shouldShowOpenButton =
    (showOpenButton ?? Boolean(address?.trim())) && Boolean(address?.trim());

  if (!url) {
    return (
      <View
        style={[
          styles.container,
          styles.placeholder,
          { height, borderColor: colors.border, backgroundColor: colors.card },
          style,
        ]}
        accessibilityLabel={accessibilityLabel ?? "Map placeholder"}
      >
        <Text style={[styles.placeholderText, { color: colors.text }]}>
          No location available
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { height, borderColor: colors.border, backgroundColor: colors.card },
        style,
      ]}
      accessibilityLabel={
        accessibilityLabel ??
        (address ? `Map showing ${address}` : "Map")
      }
    >
      {Platform.OS === "web" ? (
        // react-native-web renders View as a div, so a child iframe is fine.
        <iframe
          src={url}
          title={accessibilityLabel ?? "Map"}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ border: 0, width: "100%", height: "100%" }}
        />
      ) : WebView ? (
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          startInLoadingState
        />
      ) : (
        <View style={styles.placeholder}>
          <ActivityIndicator color={BRAND} />
        </View>
      )}

      {shouldShowOpenButton && (
        <Pressable
          onPress={() => address && openMapsForAddress(address)}
          accessibilityRole="button"
          accessibilityLabel="Open in Maps"
          style={({ pressed }) => [
            styles.openBtn,
            {
              backgroundColor: BRAND,
              opacity: pressed ? 0.85 : 0.95,
            },
          ]}
        >
          <Text style={styles.openBtnText}>Open in Maps</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  webview: { flex: 1 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 13, opacity: 0.6 },
  openBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openBtnText: { color: "white", fontSize: 13, fontWeight: "600" },
});
