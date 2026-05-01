import { useTheme } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
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
import { openMapsForAddress, openMapsForCoords } from "@/lib/maps";

// react-native-webview is a native module; on web we render an <iframe>
// directly via react-native-web's DOM passthrough, so we avoid importing
// the native module on web at all. Pulling the type via `typeof import(...)`
// keeps full prop typing for the native branch.
let WebView:
  | (typeof import("react-native-webview"))["WebView"]
  | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebView = require("react-native-webview").WebView;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 20;
const ZOOM_DEFAULT = 15;

interface EmbeddedMapProps {
  /**
   * Free-text address to render. Geocoded by Google Maps server-side.
   * Ignored when both `latitude` and `longitude` are provided.
   */
  address?: string;
  /** Explicit latitude. Pair with `longitude`. */
  latitude?: number;
  /** Explicit longitude. Pair with `latitude`. */
  longitude?: number;
  /** Map zoom level (1–20). Defaults to 15. Out-of-range values are clamped. */
  zoom?: number;
  /** Visual height in points/px. Defaults to 200. */
  height?: number;
  /**
   * Render a small "Open in Maps" button that hands off to the system map
   * app. Defaults to true when a valid target (address or coords) exists,
   * and is suppressed when no target is available regardless of this prop.
   */
  showOpenButton?: boolean;
  /** Outer container style overrides. */
  style?: ViewStyle;
  /** Optional accessibility label for the map surface. */
  accessibilityLabel?: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

interface MapTarget {
  url: string;
  open: () => void;
  describe: string;
}

/**
 * Build a MapTarget from inputs. `address` must already be trimmed (or
 * undefined) — callers normalize once at the component boundary so the
 * memoization key is the post-trim value.
 */
function resolveTarget({
  address,
  latitude,
  longitude,
  zoom,
}: {
  address?: string;
  latitude?: number;
  longitude?: number;
  zoom: number;
}): MapTarget | undefined {
  if (typeof latitude === "number" && typeof longitude === "number") {
    return {
      url: `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`,
      open: () => {
        void openMapsForCoords(latitude, longitude);
      },
      describe: `${latitude}, ${longitude}`,
    };
  }
  if (address) {
    return {
      url: `https://www.google.com/maps?q=${encodeURIComponent(
        address
      )}&z=${zoom}&output=embed`,
      open: () => {
        void openMapsForAddress(address);
      },
      describe: address,
    };
  }
  return undefined;
}

/**
 * Embedded interactive map for an address or coordinate pair.
 *
 * Renders a Google Maps embed inside a native WebView on iOS/Android and
 * a DOM `<iframe>` on web. The map is interactive (pan/zoom) on all
 * platforms.
 *
 * Note: this uses the unofficial `?output=embed` URL form, which Google
 * tolerates for read-only embeds without an API key. For production usage
 * with predictable terms-of-service guarantees, swap to the official Maps
 * Embed API (https://developers.google.com/maps/documentation/embed) and
 * pass an API key.
 *
 * Usage:
 *   <EmbeddedMap address="742 Evergreen Terrace" />
 *   <EmbeddedMap latitude={37.78} longitude={-122.41} zoom={14} height={260} />
 */
export function EmbeddedMap({
  address,
  latitude,
  longitude,
  zoom = ZOOM_DEFAULT,
  height = 200,
  showOpenButton = true,
  style,
  accessibilityLabel,
}: EmbeddedMapProps) {
  const { colors } = useTheme();
  const trimmedAddress = address?.trim() || undefined;
  const safeZoom = clamp(Math.round(zoom), ZOOM_MIN, ZOOM_MAX);
  const target = useMemo(
    () =>
      resolveTarget({
        address: trimmedAddress,
        latitude,
        longitude,
        zoom: safeZoom,
      }),
    [trimmedAddress, latitude, longitude, safeZoom]
  );

  const [iframeLoaded, setIframeLoaded] = useState(false);
  // Reset the web loading overlay whenever the URL changes (e.g. navigating
  // between job details with different addresses) so the spinner reappears
  // for the new fetch instead of staying stuck on the previous "loaded".
  useEffect(() => {
    setIframeLoaded(false);
  }, [target?.url]);

  if (!target) {
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
        accessibilityLabel ?? `Map showing ${target.describe}`
      }
    >
      {Platform.OS === "web" ? (
        <>
          {/* react-native-web renders View as a div, so a child iframe is fine. */}
          <iframe
            src={target.url}
            title={accessibilityLabel ?? "Map"}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setIframeLoaded(true)}
            style={{ border: 0, width: "100%", height: "100%" }}
          />
          {!iframeLoaded && (
            <View
              style={[
                styles.loadingOverlay,
                { backgroundColor: colors.card },
              ]}
              pointerEvents="none"
            >
              <ActivityIndicator color={BRAND} />
            </View>
          )}
        </>
      ) : WebView ? (
        <WebView
          source={{ uri: target.url }}
          style={styles.webview}
          startInLoadingState
        />
      ) : (
        <View style={styles.placeholder}>
          <ActivityIndicator color={BRAND} />
        </View>
      )}

      {showOpenButton && (
        <Pressable
          onPress={target.open}
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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
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
