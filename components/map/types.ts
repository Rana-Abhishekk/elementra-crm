// Shared with server/SSR code — must not import Leaflet
export interface MapBranch {
  code: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  color: string;
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  group: "open" | "won" | "lost" | "ooa";
}

export const PIN_COLOR: Record<MapPin["group"], string> = {
  open: "#2a78d6",
  won: "#008300",
  lost: "#94a3b8",
  ooa: "#e34948",
};
