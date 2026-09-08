import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ClipboardList, FlaskConical, History, LogOut, UserRoundPlus, UsersRound } from "lucide-react";
import { currentPrincipal } from "@/server/auth/session";
import { UIThemeToggle } from "@/app/ui-theme-toggle";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await currentPrincipal(); if (!user) redirect("/login");
  return <div className="app-shell">
    <aside className="sidebar"><Link href="/queue" className="side-brand"><span>O</span><div>Optrizo<small>Offline LIS</small></div></Link>
      <nav><Link href="/queue"><ClipboardList />Work queue</Link><Link href="/patients"><UserRoundPlus />Patients</Link><Link href="/orders/new"><FlaskConical />New order</Link><Link href="/analyzers"><Activity />Analyzers</Link><Link href="/audit"><History />Audit trail</Link></nav>
      <div className="side-user"><UsersRound /><div><strong>{user.displayName}</strong><small>{user.roles.map((role) => role.replaceAll("_", " ")).join(", ")}</small></div></div>
      <form action="/api/auth/logout" method="post"><button className="logout-button"><LogOut size={16}/>Sign out</button></form>
    </aside>
    <div className="workspace"><header className="topbar"><div><span className="status-dot"/> Local server online</div><div className="topbar-actions"><span>{new Intl.DateTimeFormat("en-PH", { dateStyle:"medium", timeStyle:"short", timeZone:"Asia/Manila" }).format(new Date())}</span><UIThemeToggle /></div></header>{children}</div>
  </div>;
}
