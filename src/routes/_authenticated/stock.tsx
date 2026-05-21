import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Download, Copy, Upload } from "lucide-react";
import { ImportArticlesDialog } from "@/components/ImportArticlesDialog";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, resolveImage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArticleFormDialog } from "@/components/ArticleFormDialog";

export const Route = createFileRoute("/_authenticated/stock")({
  component: StockPage,
});

function StockPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<"reference" | "quantite" | "designation">("reference");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: articles = [] } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.categorie).filter(Boolean))).sort(),
    [articles],
  );

  const filtered = useMemo(() => {
    let r = articles.filter((a) => {
      const s = search.toLowerCase();
      const matchSearch =
        !s ||
        a.reference?.toLowerCase().includes(s) ||
        a.designation?.toLowerCase().includes(s);
      const matchCat = cat === "all" || a.categorie === cat;
      return matchSearch && matchCat;
    });
    r = r.sort((a, b) => {
      if (sort === "quantite") return a.quantite - b.quantite;
      return String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""));
    });
    return r;
  }, [articles, search, cat, sort]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article supprimé");
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateQty = useMutation({
    mutationFn: async ({ id, quantite }: { id: string; quantite: number }) => {
      const { error } = await supabase.from("articles").update({ quantite }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
    onError: (e: any) => toast.error(e.message),
  });

  function exportXlsx() {
    const rows = filtered.map((a) => ({
      Référence: a.reference,
      Désignation: a.designation,
      Catégorie: a.categorie,
      Taille: a.taille,
      Couleur: a.couleur,
      Quantité: a.quantite,
      ...(isAdmin ? { "Prix achat": Number(a.prix_achat) } : {}),
      "Prix vente": Number(a.prix_vente),
      Emplacement: a.emplacement,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, `stock-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Back-office</p>
          <h1 className="mt-2 font-display text-4xl">Gestion du stock</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportXlsx}>
            <Download className="mr-2 h-4 w-4" /> Exporter
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Importer depuis Excel
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
                className="bg-accent text-accent-foreground hover:bg-accent-hover"
              >
                <Plus className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par référence ou désignation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Catégorie" />
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
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reference">Tri : Référence</SelectItem>
            <SelectItem value="designation">Tri : Désignation</SelectItem>
            <SelectItem value="quantite">Tri : Quantité</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Article</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Taille</th>
                <th className="px-4 py-3">Couleur</th>
                <th className="px-4 py-3 text-center">Stock</th>
                {isAdmin && <th className="px-4 py-3 text-right">Achat</th>}
                <th className="px-4 py-3 text-right">Vente</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const img = resolveImage(a.image);
                const low = a.quantite <= 2;
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                          {img && (
                            <img
                              src={img}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                            />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{a.designation}</p>
                          <p className="text-xs text-muted-foreground">{a.reference}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.categorie}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.taille}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.couleur}</td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin ? (
                        <input
                          type="number"
                          min={0}
                          defaultValue={a.quantite}
                          onBlur={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (!isNaN(n) && n !== a.quantite)
                              updateQty.mutate({ id: a.id, quantite: n });
                          }}
                          className={`w-16 rounded-md border bg-background px-2 py-1 text-center text-sm ${
                            low ? "border-accent text-accent font-medium" : "border-border"
                          }`}
                        />
                      ) : (
                        <span className={low ? "text-accent font-medium" : ""}>{a.quantite}</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatCurrency(a.prix_achat)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(a.prix_vente)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              const { id, created_at, updated_at, ...rest } = a;
                              setEditing({
                                ...rest,
                                designation: `${a.designation} (Copie)`,
                                reference: `${a.reference}-COPIE`,
                                quantite: 0,
                              });
                              setOpen(true);
                            }}
                            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Dupliquer"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditing(a);
                              setOpen(true);
                            }}
                            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer "${a.designation}" ?`)) del.mutate(a.id);
                            }}
                            className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun article ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ArticleFormDialog open={open} onOpenChange={setOpen} article={editing} />
      <ImportArticlesDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
