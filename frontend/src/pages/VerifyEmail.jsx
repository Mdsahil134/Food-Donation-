import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    if (!token) {
      setStatus("missing");
      return;
    }
    api
      .get("/api/auth/verify-email", { params: { token } })
      .then(() => setStatus("ok"))
      .catch(() => setStatus("fail"));
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {status === "verifying" && <p>Verifying…</p>}
      {status === "ok" && <p className="text-teal-700 font-semibold">Email verified successfully.</p>}
      {status === "fail" && <p className="text-red-600">Verification failed.</p>}
      {status === "missing" && <p className="text-slate-600">No token provided.</p>}
    </div>
  );
}
