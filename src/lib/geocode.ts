/**
 * Best-effort address → coordinates lookup.
 *
 * Uses OpenStreetMap's free Nominatim service so we don't have to manage
 * an API key for a hackathon-grade demo. Returns `null` on any failure
 * (network, timeout, no match, malformed response) — the caller should
 * fall back to address-only display rather than blocking the save.
 *
 * Nominatim's usage policy asks for a descriptive User-Agent and a low
 * QPS; the booking/property forms only fire on save, which keeps us
 * comfortably inside the 1 req/sec ceiling. See
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "CleaningOrg/1.0 (hackathon demo)";

/** Default request timeout; trips the abort signal and resolves to null. */
const DEFAULT_TIMEOUT_MS = 10_000;

export async function geocodeAddress(
  address: string,
  options: { timeoutMs?: number } = {}
): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) return null;

  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(
    query
  )}&format=json&limit=1&addressdetails=0`;

  // Bound the round-trip so a stalled Nominatim can't lock the form's
  // "Looking up address…" state forever. On timeout we fall through to
  // the catch and return null; the caller saves without coords.
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        // The browser ignores attempts to set User-Agent; the native
        // runtime honours it. Either way Nominatim sees a valid UA.
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as Array<{
      lat: string;
      lon: string;
    }>;
    const first = json[0];
    if (!first) return null;
    const latitude = Number.parseFloat(first.lat);
    const longitude = Number.parseFloat(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    // Round to 4 decimal places (~10 m) so persisted demo state isn't
    // littered with 7-decimal noise far below map zoom precision.
    return {
      latitude: round4(latitude),
      longitude: round4(longitude),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
