import { redirect } from "next/navigation";
import { currentPrincipal } from "@/server/auth/session";
import { UIThemeToggle } from "@/app/ui-theme-toggle";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await currentPrincipal()) redirect("/queue");
  return <main className="login-shell"><div className="login-theme-switch"><UIThemeToggle /></div><section className="login-intro"><p className="eyebrow">Laboratory operations, kept close</p><h2>A focused workspace for every specimen.</h2><p>Register patients, follow orders, validate results, and release reports—even when the internet is unavailable.</p><div className="intro-stat"><strong>Offline-first</strong><span>Core workflows stay available across your local network.</span></div></section><LoginForm /></main>;
}
