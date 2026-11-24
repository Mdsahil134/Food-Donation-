import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/api/auth/reset-password", { token, password });
    setMsg("Password updated. You can log in now.");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Reset password</h1>
      <form onSubmit={submit} className="mt-8 space-y-4 bg-white border rounded-2xl p-6 shadow-sm">
        {msg && <p className="text-sm text-teal-800">{msg}</p>}
        <input type="hidden" value={token} readOnly />
        <input
          className="w-full rounded-xl border px-3 py-2"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="w-full rounded-full bg-orange-500 text-white font-semibold py-2">Update password</button>
      </form>
    </div>
  );
}
