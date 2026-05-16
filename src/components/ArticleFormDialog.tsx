import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/format";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    setForm(article ? { ...empty, ...article } : empty);
  }, [article, open]);

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

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        reference: form.reference,
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
      if (article?.id) {
        const { error } = await supabase.from("articles").update(payload).eq("id", article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("articles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(article ? "Article modifié" : "Article ajouté");
      qc.invalidateQueries({ queryKey: ["articles"] });
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
            {article ? "Modifier l'article" : "Nouvel article"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Référence *">
              <Input value={form.reference} onChange={(e) => set("reference", e.target.value)} required />
            </Field>
            <Field label="Catégorie">
              <Input value={form.categorie} onChange={(e) => set("categorie", e.target.value)} placeholder="Ex. Soutiens-gorge" />
            </Field>
          </div>
          <Field label="Désignation *">
            <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Taille">
              <Input value={form.taille} onChange={(e) => set("taille", e.target.value)} />
            </Field>
            <Field label="Couleur">
              <Input value={form.couleur} onChange={(e) => set("couleur", e.target.value)} />
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
          <Field label="Image (URL ou nom de fichier ex. '1.jpg' depuis public/images)">
            <Input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="1.jpg ou https://..." />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={save.isPending} className="bg-accent text-accent-foreground hover:bg-accent-hover">
              {save.isPending ? "…" : article ? "Enregistrer" : "Ajouter"}
            </Button>
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
