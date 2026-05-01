import { Linking, Platform } from "react-native";

/**
 * Open the system map application for an arbitrary search query (free-text
 * address, place name, "lat,lon", etc.).
 *
 * - iOS: Apple Maps via the `maps://` scheme.
 * - Android: the platform's default map app via the `geo:` intent.
 * - Web: Google Maps in a new tab.
 *
 * On the rare device where the native scheme has no handler (e.g. Android
 * without any maps app installed), we fall back to the Google Maps web URL.
 */
async function openMapsForQuery(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;

  const encoded = encodeURIComponent(trimmed);
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  let nativeUrl: string | undefined;
  if (Platform.OS === "ios") {
    nativeUrl = `maps://?q=${encoded}`;
  } else if (Platform.OS === "android") {
    nativeUrl = `geo:0,0?q=${encoded}`;
  }

  if (nativeUrl) {
    try {
      const supported = await Linking.canOpenURL(nativeUrl);
      if (supported) {
        await Linking.openURL(nativeUrl);
        return;
      }
    } catch {
      // fall through to web fallback
    }
  }

  await Linking.openURL(webUrl);
}

/**
 * Open the system map application for a free-text address. No-op for empty
 * or whitespace-only input.
 */
export function openMapsForAddress(address: string): Promise<void> {
  return openMapsForQuery(address);
}

/**
 * Open the system map application for a coordinate pair. Coordinates are
 * passed as "lat,lon" — every native maps URL scheme accepts this form.
 */
export function openMapsForCoords(
  latitude: number,
  longitude: number
): Promise<void> {
  return openMapsForQuery(`${latitude},${longitude}`);
}
