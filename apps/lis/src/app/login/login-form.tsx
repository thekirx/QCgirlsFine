"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function LoginForm() {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(formData: FormData) {
    setBusy(true); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(formData)) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error ?? "Unable to sign in."); setBusy(false); return; }
    router.push("/queue"); router.refresh();
  }
  return <form action={submit} className="login-card">
    <div className="brand-mark"><ShieldCheck size={22} /> O</div><p className="eyebrow">Optrizo Offline LIS</p><h1>Welcome back</h1>
    <p className="muted">Sign in to continue laboratory operations on this local network.</p>
    <label>Username<input name="username" autoComplete="username" defaultValue="admin" required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" defaultValue="Admin123!Quest" required /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<ArrowRight size={17} /></button>
    <p className="local-note"><span className="status-dot" /> Local system ready · Internet not required</p>
  </form>;
}
