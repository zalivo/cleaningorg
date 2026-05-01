import { Linking, Platform } from "react-native";

/**
 * Open the system map application for a free-text address.
 *
 * - iOS: Apple Maps via the `maps://` scheme.
 * - Android: the platform's default map app via the `geo:` intent.
 * - Web: Google Maps in a new tab.
 *
 * On the rare device where the native scheme has no handler (e.g. Android
 * without any maps app installed), we fall back to the Google Maps web URL.
 *
 * Returns a promise that resolves once a handler has been launched, or
 * rejects if no handler accepts the URL. Empty/whitespace addresses are a
 * no-op.
 */
export async function openMapsForAddress(address: string): Promise<void> {
  const trimmed = address.trim();
  if (!trimmed) return;

  const q = encodeURIComponent(trimmed);
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;

  let nativeUrl: string | undefined;
  if (Platform.OS === "ios") {
    nativeUrl = `maps://?q=${q}`;
  } else if (Platform.OS === "android") {
    nativeUrl = `geo:0,0?q=${q}`;
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
