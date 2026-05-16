import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, resolveImage } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductDrawer } from "@/components/ProductDrawer";

export const Route = createFileRoute("/_authenticated/catalogue")({
  component: CataloguePage,
});

function CataloguePage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);

  const { data: articles = [] } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("designation");
      if (error) throw error;
      return data ?? [];
    },
  });

  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.categorie).filter(Boolean))).sort(),
    [articles],
  );

  const filtered = articles.filter((a) => {
    const s = search.toLowerCase();
    const okSearch =
      !s ||
      a.reference?.toLowerCase().includes(s) ||
      a.designation?.toLowerCase().includes(s);
    const okCat = cat === "all" || a.categorie === cat;
    return okSearch && okCat;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-10">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Front-office</p>
        <h1 className="mt-2 font-display text-4xl">Le catalogue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Présentez vos pièces à vos clientes et enregistrez la vente en un geste.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une pièce…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c!}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((a) => {
          const img = resolveImage(a.image);
          const out = a.quantite === 0;
          return (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="group overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:border-accent hover:shadow-lg"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
                {img ? (
                  <img
                    src={img}
                    alt={a.designation}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = "none";
                      t.parentElement!.classList.add("flex", "items-center", "justify-center");
                      t.insertAdjacentHTML(
                        "afterend",
                        `<span class="font-display text-3xl text-muted-foreground/40">${a.designation.charAt(0)}</span>`,
                      );
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-3xl text-muted-foreground/40">
                    {a.designation.charAt(0)}
                  </div>
                )}
                {out && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Épuisé
                    </span>
                  </div>
                )}
                {!out && a.quantite <= 2 && (
                  <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-1 text-[10px] uppercase tracking-wider text-accent-foreground">
                    Stock bas
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-accent">
                  {a.categorie}
                </p>
                <h3 className="mt-1 font-display text-lg leading-tight">{a.designation}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.reference} · {a.taille} · {a.couleur}
                </p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="font-display text-xl">{formatCurrency(a.prix_vente)}</span>
                  <span className="text-xs text-muted-foreground">{a.quantite} dispo</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <ProductDrawer article={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
