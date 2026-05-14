import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);

  const load = async () => {
    const [u, s] = await Promise.all([api.get("/api/auth/users"), api.get("/api/donations/admin/stats")]);
    setUsers(u.data);
    setStats(s.data);
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (id, role) => {
    await api.patch(`/api/auth/users/${id}/role`, { role });
    load();
  };

  const removeDonation = async (id) => {
    await api.delete(`/api/donations/${id}`);
    load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin control room</h1>
        <p className="text-slate-600">User governance, fraud removal hooks, and platform analytics.</p>
      </div>
      {stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(stats.summary).map(([k, v]) => (
            <div key={k} className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-500">{k.replace(/_/g, " ")}</p>
              <p className="text-3xl font-bold text-brand-green">{v}</p>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-2xl border bg-white p-4 shadow-sm overflow-auto">
        <h2 className="font-semibold mb-3">Users</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2">{u.email}</td>
                <td>{u.name}</td>
                <td>{u.role}</td>
                <td>{u.email_verified ? "yes" : "no"}</td>
                <td className="space-x-2">
                  {["donor", "ngo", "admin"].map((r) => (
                    <button key={r} type="button" className="text-xs underline text-brand-orange" onClick={() => changeRole(u.id, r)}>
                      {r}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stats && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Donations per day (14d)</h2>
          <div className="flex items-end gap-2 h-40">
            {stats.donationsPerDay.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-teal-500 rounded-t" style={{ height: `${Math.min(100, d.c * 10)}%` }} title={`${d.c}`} />
                <span className="text-[10px] text-slate-500 rotate-45 origin-top-left">{new Date(d.day).getDate()}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Remove suspicious donations (demo): paste UUID from donor view if exposed, or use API directly.
          </p>
          <input
            className="mt-2 border rounded-lg px-3 py-2 w-full"
            placeholder="Donation UUID to delete"
            onKeyDown={(e) => {
              if (e.key === "Enter") removeDonation(e.currentTarget.value);
            }}
          />
        </div>
      )}
    </div>
  );
}
