// Google Maps Geocoding provider — IN_PROGRESS. Used only when GOOGLE_MAPS_API_KEY is set
// AND the local gazetteer found nothing. Never called in the demo.

export interface GeocodeHit {
  lat: number;
  lng: number;
  formattedAddress: string;
  pincode: string | null;
}

type FetchLike = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface GoogleResponse {
  status: string;
  results: {
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: { long_name: string; types: string[] }[];
  }[];
}

export function googleGeocodingEnabled(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.GOOGLE_MAPS_API_KEY);
}

export async function geocodeWithGoogle(address: string, apiKey: string, fetchImpl: FetchLike = fetch): Promise<GeocodeHit | null> {
  const url =
    "https://maps.googleapis.com/maps/api/geocode/json?" +
    new URLSearchParams({ address, key: apiKey, region: "in", components: "country:IN" }).toString();
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error("Google geocoding request failed");
  const data = (await res.json()) as GoogleResponse;
  if (data.status !== "OK" || !data.results.length) return null;
  const top = data.results[0];
  return {
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    formattedAddress: top.formatted_address,
    pincode: top.address_components.find((c) => c.types.includes("postal_code"))?.long_name ?? null,
  };
}
