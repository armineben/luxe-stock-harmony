import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Trash2, ArchiveRestore } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, resolveImage } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/gestion-catalogue")({
  component: GestionCataloguePage,
});

type Status = "actif" | "archive" | "supprime";

function GestionCataloguePage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status>("actif");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["articles-by-status", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("status", tab)
        .order("designation");
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase
        .from("articles")
        .update({ status, archived: status !== "actif" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(
        v.status === "actif"
          ? "Article restauré"
          : v.status === "archive"
          ? "Article archivé"
          : "Article déplacé dans la corbeille",
      );
      qc.invalidateQueries({ queryKey: ["articles-by-status"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hardDelete = useMutation({
    mutationFn: async (id: string) => {
      const { count, error: cErr } = await supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("article_id", id);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          "Impossible : cet article est lié à des ventes. Conservez-le dans la corbeille pour préserver l'historique.",
        );
      }
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article supprimé définitivement");
      qc.invalidateQueries({ queryKey: ["articles-by-status"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Accès réservé aux administrateurs.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-10">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Back-office</p>
        <h1 className="mt-2 font-display text-4xl">Gestion du catalogue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gérez vos articles actifs, archivés et la corbeille.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <TabsList>
          <TabsTrigger value="actif">Articles actifs</TabsTrigger>
          <TabsTrigger value="archive">Archives</TabsTrigger>
          <TabsTrigger value="supprime">Corbeille</TabsTrigger>
        </TabsList>

        {(["actif", "archive", "supprime"] as Status[]).map((s) => (
          <TabsContent key={s} value={s} className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Article</th>
                      <th className="px-4 py-3">Catégorie</th>
                      <th className="px-4 py-3 text-center">Stock</th>
                      <th className="px-4 py-3 text-right">Prix</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          Chargement…
                        </td>
                      </tr>
                    )}
                    {!isLoading && items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                          {s === "actif"
                            ? "Aucun article actif."
                            : s === "archive"
                            ? "Aucun article archivé."
                            : "La corbeille est vide."}
                        </td>
                      </tr>
                    )}
                    {items.map((a: any) => {
                      const img = resolveImage(a.image);
                      return (
                        <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                                {img && (
                                  <img src={img} alt="" className="h-full w-full object-cover" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{a.designation}</p>
                                <p className="text-xs text-muted-foreground">{a.reference}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{a.categorie}</td>
                          <td className="px-4 py-3 text-center">{a.quantite}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(a.prix_vente)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {s === "archive" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setStatus.mutate({ id: a.id, status: "actif" })}
                                  >
                                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restaurer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm("Déplacer cet article vers la corbeille ?"))
                                        setStatus.mutate({ id: a.id, status: "supprime" });
                                    }}
                                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Corbeille
                                  </Button>
                                </>
                              )}
                              {s === "supprime" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setStatus.mutate({ id: a.id, status: "actif" })}
                                  >
                                    <ArchiveRestore className="mr-1 h-3.5 w-3.5" /> Récupérer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Supprimer DÉFINITIVEMENT "${a.designation}" ? Cette action est irréversible.`,
                                        )
                                      )
                                        hardDelete.mutate(a.id);
                                    }}
                                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer définitivement
                                  </Button>
                                </>
                              )}
                              {s === "actif" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm("Archiver cet article ?"))
                                        setStatus.mutate({ id: a.id, status: "archive" });
                                    }}
                                  >
                                    Archiver
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm("Déplacer cet article vers la corbeille ?"))
                                        setStatus.mutate({ id: a.id, status: "supprime" });
                                    }}
                                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Corbeille
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
