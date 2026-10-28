"use client";

import "leaflet/dist/leaflet.css";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { PIN_COLOR, type MapBranch, type MapPin } from "./types";


export default function LeadMap({ branches, pins, probe, center }: { branches: MapBranch[]; pins: MapPin[]; probe: { lat: number; lng: number; label: string } | null; center: [number, number] }) {
  return (
    <MapContainer center={center} zoom={10} scrollWheelZoom className="h-full w-full" key={center.join(",")}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {branches.map((b) => (
        <Circle key={`r-${b.code}`} center={[b.lat, b.lng]} radius={b.radiusKm * 1000} pathOptions={{ color: b.color, weight: 2, fillOpacity: 0.05, dashArray: "6 6" }} />
      ))}
      {pins.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={5} pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: PIN_COLOR[p.group], fillOpacity: 0.9 }}>
          <Tooltip>{p.label}</Tooltip>
        </CircleMarker>
      ))}
      {branches.map((b) => (
        <CircleMarker key={b.code} center={[b.lat, b.lng]} radius={10} pathOptions={{ color: "#ffffff", weight: 2, fillColor: b.color, fillOpacity: 1 }}>
          <Tooltip permanent direction="top" offset={[0, -10]}>
            {b.name}
          </Tooltip>
        </CircleMarker>
      ))}
      {probe && (
        <CircleMarker center={[probe.lat, probe.lng]} radius={9} pathOptions={{ color: "#0b1f3a", weight: 3, fillColor: "#c9a227", fillOpacity: 1 }}>
          <Tooltip permanent direction="right" offset={[10, 0]}>
            {probe.label}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
