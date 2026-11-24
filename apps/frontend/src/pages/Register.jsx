import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "donor" });
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await register({ name: form.name, email: form.email, password: form.password, role: form.role });
      setMsg("Account created. Check your email for verification (dev tokens may appear in API response).");
    } catch (err) {
      setMsg(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-slate-900">Join FoodBridge</h1>
      <p className="text-slate-600 mt-2">Create a donor or NGO account.</p>
      <form onSubmit={submit} className="mt-8 space-y-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        {msg && <p className="text-sm text-teal-800 bg-teal-50 border border-teal-100 rounded-lg p-3">{msg}</p>}
        <div>
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password (min 8)</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Role</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="donor">Donor</option>
            <option value="ngo">NGO / Volunteer</option>
          </select>
        </div>
        <button type="submit" className="w-full rounded-full bg-gradient-to-r from-teal-600 to-orange-500 text-white font-semibold py-2.5 shadow">
          Register
        </button>
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="text-brand-green font-semibold" to="/login">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
