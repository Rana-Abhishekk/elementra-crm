"use client";

import "leaflet/dist/leaflet.css";
import { Circle, CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

function ClickToSet({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))) });
  return null;
}

/** Small Leaflet map: click to set a branch's pin; the dashed circle shows the service radius. */
export default function PinPicker({ lat, lng, radiusKm, onPick }: { lat: number | null; lng: number | null; radiusKm: number; onPick: (lat: number, lng: number) => void }) {
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : [19.076, 72.8777];
  return (
    <MapContainer center={center} zoom={lat != null ? 11 : 9} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickToSet onPick={onPick} />
      {lat != null && lng != null && (
        <>
          <Circle center={[lat, lng]} radius={radiusKm * 1000} pathOptions={{ color: "#17234a", weight: 2, fillOpacity: 0.05, dashArray: "6 6" }} />
          <CircleMarker center={[lat, lng]} radius={9} pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#7b3f9e", fillOpacity: 1 }} />
        </>
      )}
    </MapContainer>
  );
}
