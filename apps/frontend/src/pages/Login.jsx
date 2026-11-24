import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const u = await login(email, password);
      navigate(u.role === "ngo" ? "/ngo" : u.role === "admin" ? "/admin" : "/donor");
    } catch {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-slate-900">Welcome back</h1>
      <p className="text-slate-600 mt-2">Sign in to manage donations and pickups.</p>
      <form onSubmit={submit} className="mt-8 space-y-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-gradient-to-r from-teal-600 to-orange-500 text-white font-semibold py-2.5 shadow"
        >
          Log in
        </button>
        <div className="text-sm text-slate-600 flex justify-between">
          <Link to="/forgot-password" className="text-brand-green font-semibold">
            Forgot password?
          </Link>
          <Link to="/register" className="text-brand-orange font-semibold">
            Create account
          </Link>
        </div>
      </form>
    </div>
  );
}
