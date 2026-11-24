import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

function ExpiryCountdown({ iso }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return <span className="text-red-600 font-semibold">Expired</span>;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <span className="font-mono text-sm text-orange-700">
      {h}h {m}m {s}s
    </span>
  );
}

export default function DonorDashboard() {
  const [items, setItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [form, setForm] = useState({
    foodName: "",
    quantity: "",
    foodType: "veg",
    expiryAt: "",
    pickupAddress: "",
    contactPhone: "",
    lat: "",
    lng: "",
  });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.get("/api/donations/mine").then((r) => setItems(r.data));
    api.get("/api/notifications/").then((r) => setNotifications(r.data));
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const open = items.filter((d) => d.status === "open").length;
    const done = items.filter((d) => d.status === "completed").length;
    return { open, done, total: items.length };
  }, [items]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("image", file);
    try {
      await api.post("/api/donations/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg("Donation created");
      setForm({ ...form, foodName: "", quantity: "", pickupAddress: "", expiryAt: "" });
      setFile(null);
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Donor workspace</h1>
          <p className="text-slate-600">List surplus food, monitor expiry, and track NGO pickups.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Active listings", value: stats.open },
            { label: "Completed", value: stats.done },
            { label: "All time", value: stats.total },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-500">{c.label}</p>
              <p className="text-3xl font-bold text-brand-green">{c.value}</p>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="font-semibold text-lg">New donation</h2>
          {msg && <p className="text-sm text-teal-800">{msg}</p>}
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="Food name"
              value={form.foodName}
              onChange={(e) => setForm({ ...form, foodName: e.target.value })}
              required
            />
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
            <select
              className="rounded-xl border px-3 py-2"
              value={form.foodType}
              onChange={(e) => setForm({ ...form, foodType: e.target.value })}
            >
              <option value="veg">Vegetarian</option>
              <option value="nonveg">Non-veg</option>
              <option value="vegan">Vegan</option>
              <option value="packaged">Packaged</option>
            </select>
            <input
              className="rounded-xl border px-3 py-2"
              type="datetime-local"
              value={form.expiryAt}
              onChange={(e) => setForm({ ...form, expiryAt: e.target.value })}
              required
            />
            <input
              className="rounded-xl border px-3 py-2 md:col-span-2"
              placeholder="Pickup address"
              value={form.pickupAddress}
              onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
              required
            />
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="Contact phone"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="Latitude (optional)"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
            />
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="Longitude (optional)"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
            />
            <input className="rounded-xl border px-3 py-2" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0])} />
          </div>
          <button className="rounded-full bg-gradient-to-r from-teal-600 to-orange-500 text-white px-6 py-2 font-semibold shadow">
            Publish donation
          </button>
        </form>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Your donations</h2>
          <div className="space-y-3">
            {items.map((d) => (
              <div key={d.id} className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{d.food_name}</p>
                  <p className="text-xs text-slate-500">
                    {d.quantity} • {d.food_type} • {d.status}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Expires: {new Date(d.expiry_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Time left</p>
                  <ExpiryCountdown iso={d.expiry_at} />
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-slate-500 text-sm">No donations yet.</p>}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="font-semibold mb-2">Notifications</h3>
          <div className="space-y-2 max-h-[480px] overflow-auto text-sm">
            {notifications.map((n) => (
              <div key={n.id} className="border rounded-lg p-2">
                <p className="font-semibold">{n.title}</p>
                <p className="text-slate-600">{n.body}</p>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-slate-500">No notifications.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
