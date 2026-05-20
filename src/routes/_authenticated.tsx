import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Sparkles,
  ShoppingBag,
  Receipt,
  LogOut,
  Users,
  Bell,
  FileBarChart,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const navItems = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, adminOnly: true },
  { to: "/catalogue", label: "Catalogue", icon: Sparkles, adminOnly: false },
  { to: "/stock", label: "Stock", icon: Package, adminOnly: true },
  { to: "/ventes", label: "Ventes", icon: ShoppingBag, adminOnly: true },
  { to: "/depenses", label: "Dépenses", icon: Receipt, adminOnly: true },
  { to: "/rapports", label: "Rapports", icon: FileBarChart, adminOnly: true },
  { to: "/utilisateurs", label: "Utilisateurs", icon: Users, adminOnly: true },
  { to: "/profil", label: "Mon profil", icon: UserCog, adminOnly: false },
] as const;
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const navItems = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, adminOnly: true },
  { to: "/catalogue", label: "Catalogue", icon: Sparkles, adminOnly: false },
  { to: "/stock", label: "Stock", icon: Package, adminOnly: true },
  { to: "/ventes", label: "Ventes", icon: ShoppingBag, adminOnly: true },
  { to: "/depenses", label: "Dépenses", icon: Receipt, adminOnly: true },
  { to: "/rapports", label: "Rapports", icon: FileBarChart, adminOnly: true },
  { to: "/utilisateurs", label: "Utilisateurs", icon: Users, adminOnly: true },
] as const;

function Avatar({ size = "md" }: { size?: "sm" | "md" }) {
  return <Logo size={size === "sm" ? 36 : 44} />;
}

function AuthenticatedLayout() {
  const { user, loading, role, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && role && !isAdmin && pathname !== "/catalogue") {
      navigate({ to: "/catalogue" });
    }
  }, [loading, user, role, isAdmin, pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  const visible = navItems.filter((i) => !i.adminOnly || isAdmin);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <Avatar />
          <p className="font-display text-xl leading-tight text-primary">Secret's Fashion</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {visible.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <span className="mt-1 inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
              {role === "admin" ? "Admin" : "Vendeur"}
            </span>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile + main area */}
      <div className="flex w-full flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <Avatar size="sm" />
            <p className="font-display text-lg text-primary">Secret's Fashion</p>
          </div>
          <button
            aria-label="Notifications"
            className="rounded-full p-2 text-primary hover:bg-secondary"
          >
            <Bell className="h-5 w-5" />
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 lg:hidden">
          {visible.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                  active
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sortir
          </button>
        </nav>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
