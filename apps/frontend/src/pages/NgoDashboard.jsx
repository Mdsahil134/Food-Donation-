import { useEffect, useState } from "react";
import { api } from "../api/client.js";

function MapPreview({ lat, lng }) {
  if (lat == null || lng == null) return <p className="text-xs text-slate-500">No coordinates for map preview.</p>;
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const src = key
    ? `https://www.google.com/maps/embed/v1/place?key=${key}&q=${lat},${lng}&zoom=14`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.02}%2C${Number(lat) - 0.02}%2C${Number(lng) + 0.02}%2C${Number(lat) + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <iframe title="map" className="w-full h-48 rounded-xl border" loading="lazy" src={src} referrerPolicy="no-referrer-when-downgrade" />
  );
}

export default function NgoDashboard() {
  const [lat, setLat] = useState("12.9716");
  const [lng, setLng] = useState("77.5946");
  const [radius, setRadius] = useState("50");
  const [foodType, setFoodType] = useState("");
  const [list, setList] = useState([]);
  const [tracking, setTracking] = useState({});
  const [ngoLoc, setNgoLoc] = useState({ lat: "12.9716", lng: "77.5946" });

  const load = () => {
    api
      .get("/api/donations/nearby", { params: { lat, lng, radiusKm: radius, foodType: foodType || undefined } })
      .then((r) => setList(r.data))
      .catch(() => api.get("/api/donations/open").then((r) => setList(r.data)));
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (id) => {
    await api.post(`/api/donations/${id}/accept`);
    load();
  };

  const complete = async (id) => {
    await api.post(`/api/donations/${id}/complete`);
    load();
  };

  const loadTracking = async (donationId) => {
    const { data } = await api.get(`/api/tracking/sessions/by-donation/${donationId}`);
    setTracking((t) => ({ ...t, [donationId]: data }));
  };

  const pushLocation = async (donationId) => {
    const info = tracking[donationId];
    if (!info?.session?.id) return;
    await api.post(`/api/tracking/sessions/${info.session.id}/location`, {
      lat: Number(ngoLoc.lat),
      lng: Number(ngoLoc.lng),
    });
    loadTracking(donationId);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">NGO operations</h1>
        <p className="text-slate-600">Discover nearby listings, accept rescues, and stream pickup coordinates.</p>
      </div>
      <div className="rounded-2xl border bg-white p-4 shadow-sm grid md:grid-cols-4 gap-3">
        <input className="rounded-xl border px-3 py-2" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Lat" />
        <input className="rounded-xl border px-3 py-2" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Lng" />
        <input className="rounded-xl border px-3 py-2" value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="Radius km" />
        <input className="rounded-xl border px-3 py-2" value={foodType} onChange={(e) => setFoodType(e.target.value)} placeholder="Food type filter" />
        <button className="md:col-span-4 rounded-full bg-teal-600 text-white font-semibold py-2" type="button" onClick={load}>
          Refresh nearby
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {list.map((d) => (
          <div key={d.id} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-semibold text-lg">{d.food_name}</p>
                <p className="text-xs text-slate-500">
                  {d.quantity} • {d.food_type} • {d.status}
                  {d.distanceKm != null && <span> • {d.distanceKm.toFixed(1)} km away</span>}
                </p>
                <p className="text-sm text-slate-600 mt-2">{d.pickup_address}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 h-fit">{d.status}</span>
            </div>
            <MapPreview lat={d.lat} lng={d.lng} />
            <div className="flex flex-wrap gap-2">
              {d.status === "open" && (
                <button className="rounded-full bg-orange-500 text-white px-4 py-1.5 text-sm font-semibold" type="button" onClick={() => accept(d.id)}>
                  Accept
                </button>
              )}
              {d.status === "accepted" && (
                <button className="rounded-full bg-teal-700 text-white px-4 py-1.5 text-sm font-semibold" type="button" onClick={() => complete(d.id)}>
                  Mark complete
                </button>
              )}
              <button className="rounded-full border px-4 py-1.5 text-sm" type="button" onClick={() => loadTracking(d.id)}>
                Load tracking
              </button>
            </div>
            {tracking[d.id] && (
              <div className="text-sm border-t pt-3 space-y-2">
                <p>
                  Distance to pickup:{" "}
                  <span className="font-semibold">
                    {tracking[d.id].distanceToPickupKm != null ? `${tracking[d.id].distanceToPickupKm.toFixed(2)} km` : "n/a"}
                  </span>
                </p>
                <div className="flex gap-2">
                  <input className="border rounded-lg px-2 py-1 w-24" value={ngoLoc.lat} onChange={(e) => setNgoLoc({ ...ngoLoc, lat: e.target.value })} />
                  <input className="border rounded-lg px-2 py-1 w-24" value={ngoLoc.lng} onChange={(e) => setNgoLoc({ ...ngoLoc, lng: e.target.value })} />
                  <button className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full" type="button" onClick={() => pushLocation(d.id)}>
                    Ping location
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {list.length === 0 && <p className="text-slate-500">No donations in range. Try widening radius or use open listings fallback.</p>}
    </div>
  );
}
