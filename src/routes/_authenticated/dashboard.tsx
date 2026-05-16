import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  ShoppingBag,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const COLORS = ["#c17b5c", "#4a7c59", "#8a6e8f", "#b89968", "#9a5c40", "#6b635a"];

function DashboardPage() {
  const { isAdmin } = useAuth();

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, articles(designation, categorie)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*");
      if (error) return [];
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const ca = sales.reduce((s, r) => s + Number(r.total), 0);
  const totalExp = expenses.reduce((s, r) => s + Number(r.montant), 0);
  const beneficeBrut = sales.reduce((s, r) => s + Number(r.benefice ?? 0), 0);
  const beneficeNet = beneficeBrut - totalExp;
  const pieces = sales.reduce((s, r) => s + Number(r.quantite), 0);
  const lowStock = articles.filter((a) => a.quantite <= 2);

  // Daily sales last 14 days
  const dayMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  sales.forEach((s) => {
    const d = new Date(s.created_at).toISOString().slice(0, 10);
    if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) ?? 0) + Number(s.total));
  });
  const lineData = Array.from(dayMap.entries()).map(([d, v]) => ({
    day: d.slice(5),
    total: v,
  }));

  // By category
  const catMap = new Map<string, number>();
  sales.forEach((s: any) => {
    const c = s.articles?.categorie ?? "Autre";
    catMap.set(c, (catMap.get(c) ?? 0) + Number(s.total));
  });
  const pieData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Tableau de bord</p>
          <h1 className="mt-2 font-display text-4xl">Vue d'ensemble</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Wallet className="h-4 w-4" />}
          label="Chiffre d'affaires"
          value={formatCurrency(ca)}
        />
        <MetricCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Pièces vendues"
          value={String(pieces)}
        />
        {isAdmin && (
          <>
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Bénéfice net"
              value={formatCurrency(beneficeNet)}
              accent
            />
            <MetricCard
              icon={<Receipt className="h-4 w-4" />}
              label="Dépenses"
              value={formatCurrency(totalExp)}
            />
          </>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h3 className="font-display text-xl">Ventes des 14 derniers jours</h3>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" stroke="#6b635a" fontSize={11} />
                <YAxis stroke="#6b635a" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e8e4df",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#c17b5c"
                  strokeWidth={2.5}
                  dot={{ fill: "#c17b5c", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl">Par catégorie</h3>
          {pieData.length === 0 ? (
            <p className="mt-12 text-center text-sm text-muted-foreground">
              Aucune vente encore enregistrée.
            </p>
          ) : (
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent" />
          <h3 className="font-display text-xl">Alertes stock bas</h3>
          <span className="text-xs text-muted-foreground">(≤ 2 pièces)</span>
        </div>
        {lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tout va bien — aucun article critique.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lowStock.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border-strong bg-accent-soft/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{a.designation}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.reference} • {a.taille} • {a.couleur}
                  </p>
                </div>
                <span className="text-lg font-display text-accent">{a.quantite}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={accent ? "text-accent" : ""}>{icon}</span>
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p
        className={`mt-3 font-display text-3xl ${accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
