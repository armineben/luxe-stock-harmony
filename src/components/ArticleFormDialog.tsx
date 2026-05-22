import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/format";
import { presetFor } from "@/lib/category-presets";
import { analyzeProductImage } from "@/lib/vision.functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  article: any | null;
}

const empty = {
  reference: "",
  designation: "",
  taille: "",
  couleur: "",
  quantite: 0,
  prix_achat: 0,
  prix_vente: 0,
  categorie: "",
  emplacement: "",
  image: "",
  notes: "",
};

export function ArticleFormDialog({ open, onOpenChange, article }: Props) {
  const [form, setForm] = useState<any>(empty);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeProductImage);

  const isEdit = !!article?.id;

  useEffect(() => {
    setForm(article ? { ...empty, ...article } : empty);
  }, [article, open]);

  const preset = presetFor(form.categorie);

  // Auto-prefill taille/couleur defaults on new product when category changes
  useEffect(() => {
    if (isEdit) return;
    if (!preset) return;
    setForm((f: any) => ({
      ...f,
      taille: f.taille || preset.tailles[0] || "",
      couleur: f.couleur || preset.couleurs[0] || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categorie]);

  async function handleFileUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez choisir une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      set("image", data.publicUrl);
      toast.success("Photo ajoutée");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAutoDetect() {
    const url = resolveImage(form.image);
    if (!url || !/^https?:/.test(url)) {
      toast.error("Ajoutez d'abord une photo (uploadée)");
      return;
    }
    setAnalyzing(true);
    try {
      const r: any = await analyze({ data: { imageUrl: url } });
      setForm((f: any) => ({
        ...f,
        designation: f.designation || r.name || "",
        categorie: f.categorie || r.category || "",
        couleur: f.couleur || (Array.isArray(r.colors) ? r.colors[0] : "") || "",
        prix_vente: Number(f.prix_vente) > 0 ? f.prix_vente : Number(r.suggestedPrice) || 0,
        notes: f.notes || r.description || "",
      }));
      toast.success("Détection IA terminée — vérifiez et ajustez");
    } catch (e: any) {
      toast.error(e.message || "Échec de la détection");
    } finally {
      setAnalyzing(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const autoRef =
        form.reference?.trim() ||
        `REF-AUTO-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const payload = {
        reference: autoRef,
        designation: form.designation,
        taille: form.taille || null,
        couleur: form.couleur || null,
        quantite: Number(form.quantite) || 0,
        prix_achat: Number(form.prix_achat) || 0,
        prix_vente: Number(form.prix_vente) || 0,
        categorie: form.categorie || null,
        emplacement: form.emplacement || null,
        image: form.image || null,
        notes: form.notes || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("articles").update(payload).eq("id", article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("articles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Article modifié" : "Article ajouté");
      qc.invalidateQueries({ queryKey: ["articles"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: "archive" | "supprime") => {
      const { error } = await supabase
        .from("articles")
        .update({ status, archived: true })
        .eq("id", article.id);
      if (error) throw error;
    },
    onSuccess: (_d, status) => {
      toast.success(status === "archive" ? "Article archivé" : "Déplacé dans la corbeille");
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["articles-by-status"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  function set<K extends keyof typeof empty>(k: K, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? "Modifier l'article" : "Nouvel article"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Référence">
              <Input
                value={form.reference}
                onChange={(e) => set("reference", e.target.value)}
                placeholder="Auto-générée si vide"
              />
            </Field>
            <Field label="Catégorie">
              <Input
                value={form.categorie}
                onChange={(e) => set("categorie", e.target.value)}
                placeholder="Lingerie, Pyjama, Robe, Soutien-gorge…"
                list="categorie-suggestions"
              />
              <datalist id="categorie-suggestions">
                <option value="Lingerie" />
                <option value="Pyjama" />
                <option value="Robe" />
                <option value="Soutien-gorge" />
              </datalist>
            </Field>
          </div>
          <Field label="Désignation *">
            <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Taille">
              <Input value={form.taille} onChange={(e) => set("taille", e.target.value)} />
              {preset && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {preset.tailles.map((t) => (
                    <Chip key={t} active={form.taille === t} onClick={() => set("taille", t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Couleur">
              <Input value={form.couleur} onChange={(e) => set("couleur", e.target.value)} />
              {preset && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {preset.couleurs.map((c) => (
                    <Chip key={c} active={form.couleur === c} onClick={() => set("couleur", c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Quantité">
              <Input type="number" min={0} value={form.quantite} onChange={(e) => set("quantite", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prix d'achat (TND)">
              <Input type="number" min={0} step="0.01" value={form.prix_achat} onChange={(e) => set("prix_achat", e.target.value)} />
            </Field>
            <Field label="Prix de vente (TND) *">
              <Input type="number" min={0} step="0.01" value={form.prix_vente} onChange={(e) => set("prix_vente", e.target.value)} required />
            </Field>
          </div>
          <Field label="Emplacement">
            <Input value={form.emplacement} onChange={(e) => set("emplacement", e.target.value)} placeholder="Ex. Rayon A1" />
          </Field>
          <Field label="Photo de l'article">
            <div className="space-y-3">
              {form.image && (
                <div className="relative inline-block">
                  <img
                    src={resolveImage(form.image) ?? ""}
                    alt="Aperçu"
                    className="h-32 w-32 rounded-lg border border-border object-cover"
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                  />
                  <button
                    type="button"
                    onClick={() => set("image", "")}
                    className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background shadow-md hover:bg-destructive"
                    aria-label="Retirer l'image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? "Envoi…" : "Choisir depuis ma galerie"}
                </Button>
                <Input
                  value={form.image}
                  onChange={(e) => set("image", e.target.value)}
                  placeholder="…ou URL / nom de fichier"
                  className="flex-1"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoDetect}
                disabled={analyzing || !form.image}
                className="gap-2"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-accent" />
                )}
                {analyzing ? "Analyse IA en cours…" : "Détection auto depuis la photo"}
              </Button>
            </div>
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          <DialogFooter className="gap-2 sm:justify-between">
            {isEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Archiver "${form.designation}" ?`)) setStatus.mutate("archive");
                  }}
                  disabled={setStatus.isPending}
                >
                  Archiver
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Mettre "${form.designation}" à la corbeille ?`))
                      setStatus.mutate("supprime");
                  }}
                  disabled={setStatus.isPending}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Mettre à la corbeille
                </Button>
              </div>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={save.isPending} className="bg-accent text-accent-foreground hover:bg-accent-hover">
                {save.isPending ? "…" : isEdit ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-background text-muted-foreground hover:border-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
