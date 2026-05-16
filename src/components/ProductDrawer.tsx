import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, resolveImage } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProductDrawer({
  article,
  onClose,
}: {
  article: any | null;
  onClose: () => void;
}) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState<number | "">("");

  const sell = useMutation({
    mutationFn: async () => {
      if (!article) return;
      const unit = Number(price || article.prix_vente);
      const total = unit * qty;
      const benefice = (unit - Number(article.prix_achat)) * qty;
      const { error } = await supabase.from("sales").insert({
        article_id: article.id,
        quantite: qty,
        prix_unitaire: unit,
        prix_achat_unitaire: Number(article.prix_achat),
        total,
        benefice,
        vendeur_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vente enregistrée");
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      setQty(1);
      setPrice("");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const open = !!article;
  const img = article ? resolveImage(article.image) : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {article && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">{article.designation}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-secondary">
                {img ? (
                  <img
                    src={img}
                    alt={article.designation}
                    className="h-full w-full object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-5xl text-muted-foreground/40">
                    {article.designation.charAt(0)}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <Row label="Référence" value={article.reference} />
                <Row label="Catégorie" value={article.categorie} />
                <Row label="Taille" value={article.taille} />
                <Row label="Couleur" value={article.couleur} />
                <Row label="Emplacement" value={article.emplacement} />
                <Row label="En stock" value={`${article.quantite} pièces`} />
                {article.notes && (
                  <div className="mt-3 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
                    {article.notes}
                  </div>
                )}
              </div>

              <div className="flex items-end justify-between border-t border-border pt-4">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Prix de vente
                </span>
                <span className="font-display text-3xl text-accent">
                  {formatCurrency(article.prix_vente)}
                </span>
              </div>

              <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Enregistrer une vente
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Quantité</Label>
                    <Input
                      type="number"
                      min={1}
                      max={article.quantite}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Prix unitaire (TND)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={String(article.prix_vente)}
                      value={price}
                      onChange={(e) =>
                        setPrice(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={() => sell.mutate()}
                  disabled={sell.isPending || article.quantite === 0}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent-hover"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  {article.quantite === 0
                    ? "Article épuisé"
                    : `Enregistrer — ${formatCurrency(
                        (Number(price) || article.prix_vente) * qty,
                      )}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-border/50 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
