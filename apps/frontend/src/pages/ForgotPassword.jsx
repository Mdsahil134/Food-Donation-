import { useState } from "react";
import { api } from "../api/client.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/api/auth/forgot-password", { email });
    setMsg("If the email exists, reset instructions were sent.");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Forgot password</h1>
      <form onSubmit={submit} className="mt-8 space-y-4 bg-white border rounded-2xl p-6 shadow-sm">
        {msg && <p className="text-sm text-teal-800">{msg}</p>}
        <input
          className="w-full rounded-xl border px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="w-full rounded-full bg-teal-600 text-white font-semibold py-2">Send reset link</button>
      </form>
    </div>
  );
}
