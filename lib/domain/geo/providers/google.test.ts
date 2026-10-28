import { describe, expect, it, vi } from "vitest";
import { geocodeWithGoogle, googleGeocodingEnabled } from "./google";

describe("google geocoding stub", () => {
  it("is off without a key", () => {
    expect(googleGeocodingEnabled({})).toBe(false);
    expect(googleGeocodingEnabled({ GOOGLE_MAPS_API_KEY: "x" })).toBe(true);
  });

  it("maps the first result (mocked fetch, no network)", async () => {
    const fetchImpl = vi.fn(async (url: string) => ({ url,
      ok: true,
      json: async () => ({
        status: "OK",
        results: [
          {
            formatted_address: "Lodha Bellissimo, Mahalaxmi, Mumbai 400011",
            geometry: { location: { lat: 18.98, lng: 72.82 } },
            address_components: [{ long_name: "400011", types: ["postal_code"] }],
          },
        ],
      }),
    }));
    const hit = await geocodeWithGoogle("Lodha Bellissimo", "test-key", fetchImpl);
    expect(hit).toEqual({ lat: 18.98, lng: 72.82, formattedAddress: "Lodha Bellissimo, Mahalaxmi, Mumbai 400011", pincode: "400011" });
    expect(fetchImpl.mock.calls[0]?.[0]).toContain("key=test-key");
  });

  it("returns null for ZERO_RESULTS", async () => {
    const hit = await geocodeWithGoogle("nowhere", "k", async () => ({ ok: true, json: async () => ({ status: "ZERO_RESULTS", results: [] }) }));
    expect(hit).toBeNull();
  });
});
