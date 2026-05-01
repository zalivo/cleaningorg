/**
 * Best-effort address → coordinates lookup.
 *
 * Uses OpenStreetMap's free Nominatim service so we don't have to manage
 * an API key for a hackathon-grade demo. Returns `null` on any failure
 * (network, no match, malformed response) — the caller should fall back
 * to address-only display in that case rather than blocking the save.
 *
 * Nominatim's usage policy asks for a descriptive User-Agent and a low
 * QPS; the booking form only fires on save, which keeps us comfortably
 * inside the 1 req/sec ceiling. See https://operations.osmfoundation.org/policies/nominatim/
 */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "CleaningOrg/1.0 (hackathon demo)";

export async function geocodeAddress(
  address: string,
  options: { signal?: AbortSignal } = {}
): Promise<GeocodeResult | null> {
  const query = address.trim();
  if (!query) return null;

  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(
    query
  )}&format=json&limit=1&addressdetails=0`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        // The browser ignores attempts to set User-Agent; the native
        // runtime honours it. Either way Nominatim sees a valid UA.
        "User-Agent": USER_AGENT,
      },
      signal: options.signal,
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
    // Round to 4 decimal places (~10 m) so persisted demo data isn't
    // littered with 7-decimal noise that's well below map zoom precision.
    return {
      latitude: round4(latitude),
      longitude: round4(longitude),
    };
  } catch {
    return null;
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
