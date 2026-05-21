import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Upload, Download, Loader2, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const COLUMNS = [
  "Nom_Produit",
  "Reference",
  "Code_Barres",
  "Prix_TND",
  "Categorie",
  "Tailles",
  "Couleurs",
  "Quantite",
  "Description",
] as const;

type RawRow = Record<string, any>;

interface ParsedRow {
  index: number;
  raw: RawRow;
  payload: {
    reference: string;
    designation: string;
    taille: string | null;
    couleur: string | null;
    quantite: number;
    prix_vente: number;
    prix_achat: number;
    categorie: string | null;
    notes: string | null;
  };
  errors: string[];
}

function validate(row: RawRow, i: number): ParsedRow {
  const errors: string[] = [];
  const nom = String(row.Nom_Produit ?? "").trim();
  const prixRaw = row.Prix_TND;
  const qteRaw = row.Quantite;

  if (!nom) errors.push("Nom_Produit manquant");
  const prix = Number(String(prixRaw ?? "").toString().replace(",", "."));
  if (prixRaw === undefined || prixRaw === "" || isNaN(prix) || prix < 0)
    errors.push("Prix_TND invalide");
  const qte = Number(qteRaw);
  if (qteRaw === undefined || qteRaw === "" || !Number.isInteger(qte) || qte < 0)
    errors.push("Quantite invalide (entier ≥ 0)");

  const ref =
    String(row.Reference ?? "").trim() ||
    `AUTO-${Date.now().toString(36).slice(-5)}-${i}`;

  const tailles = String(row.Tailles ?? "").trim();
  const couleurs = String(row.Couleurs ?? "").trim();
  const cat = String(row.Categorie ?? "").trim();
  const desc = String(row.Description ?? "").trim();
  const code = String(row.Code_Barres ?? "").trim();
  const notes = [code ? `Code-barres: ${code}` : "", desc].filter(Boolean).join("\n") || null;

  return {
    index: i,
    raw: row,
    payload: {
      reference: ref,
      designation: nom,
      taille: tailles || null,
      couleur: couleurs || null,
      quantite: isNaN(qte) ? 0 : qte,
      prix_vente: isNaN(prix) ? 0 : prix,
      prix_achat: 0,
      categorie: cat || null,
      notes,
    },
    errors,
  };
}

export function ImportArticlesDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const valid = useMemo(() => rows?.filter((r) => r.errors.length === 0) ?? [], [rows]);
  const invalid = useMemo(() => rows?.filter((r) => r.errors.length > 0) ?? [], [rows]);

  function reset() {
    setRows(null);
    setFileName("");
    setProgress(0);
    setImporting(false);
  }

  function downloadTemplate() {
    const sample = [
      {
        Nom_Produit: "Ensemble dentelle",
        Reference: "LIN-001",
        Code_Barres: "6190000000001",
        Prix_TND: 89.0,
        Categorie: "Lingerie",
        Tailles: "S,M,L",
        Couleurs: "Noir,Blanc",
        Quantite: 10,
        Description: "Ensemble lingerie en dentelle française",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample, { header: COLUMNS as any });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    XLSX.writeFile(wb, "modele-import-produits.xlsx");
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" });
      if (!json.length) {
        toast.error("Le fichier est vide");
        return;
      }
      setRows(json.map((r, i) => validate(r, i)));
    } catch (e: any) {
      toast.error(`Lecture impossible : ${e.message}`);
    }
  }

  async function confirmImport() {
    if (!valid.length) return;
    setImporting(true);
    setProgress(0);
    const CHUNK = 50;
    let inserted = 0;
    let failed = 0;
    for (let i = 0; i < valid.length; i += CHUNK) {
      const batch = valid.slice(i, i + CHUNK).map((r) => r.payload);
      const { error } = await supabase.from("articles").insert(batch);
      if (error) {
        failed += batch.length;
        console.error(error);
      } else {
        inserted += batch.length;
      }
      setProgress(Math.round(((i + batch.length) / valid.length) * 100));
    }
    setImporting(false);
    qc.invalidateQueries({ queryKey: ["articles"] });
    toast.success(
      `${inserted} produit(s) importé(s) avec succès${
        failed || invalid.length ? `, ${failed + invalid.length} erreur(s)` : ""
      }`,
    );
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Importer depuis Excel
          </DialogTitle>
        </DialogHeader>

        {!rows && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Formats acceptés : .xlsx, .csv
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" /> Télécharger le modèle
                </Button>
                <Button onClick={() => fileRef.current?.click()} className="gap-2 bg-accent text-accent-foreground hover:bg-accent-hover">
                  <Upload className="h-4 w-4" /> Choisir un fichier
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Colonnes attendues :</p>
              <code className="block rounded bg-secondary p-2">
                {COLUMNS.join(" | ")}
              </code>
              <p className="mt-2">
                Champs obligatoires : <b>Nom_Produit</b>, <b>Prix_TND</b>, <b>Quantite</b>. Tailles et Couleurs séparées par des virgules.
              </p>
            </div>
          </div>
        )}

        {rows && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground truncate">{fileName}</span>
              <div className="flex gap-2">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-400">
                  {valid.length} valide(s)
                </span>
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-destructive">
                  {invalid.length} erreur(s)
                </span>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Nom</th>
                    <th className="px-2 py-2">Réf.</th>
                    <th className="px-2 py-2">Cat.</th>
                    <th className="px-2 py-2">Tailles</th>
                    <th className="px-2 py-2">Couleurs</th>
                    <th className="px-2 py-2 text-right">Prix</th>
                    <th className="px-2 py-2 text-right">Qté</th>
                    <th className="px-2 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const ok = r.errors.length === 0;
                    return (
                      <tr
                        key={r.index}
                        className={
                          ok
                            ? "border-t border-border bg-emerald-500/5"
                            : "border-t border-border bg-destructive/5"
                        }
                      >
                        <td className="px-2 py-1.5 text-muted-foreground">{r.index + 2}</td>
                        <td className="px-2 py-1.5">{r.payload.designation || "—"}</td>
                        <td className="px-2 py-1.5">{r.payload.reference}</td>
                        <td className="px-2 py-1.5">{r.payload.categorie ?? "—"}</td>
                        <td className="px-2 py-1.5">{r.payload.taille ?? "—"}</td>
                        <td className="px-2 py-1.5">{r.payload.couleur ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right">
                          {r.payload.prix_vente.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-right">{r.payload.quantite}</td>
                        <td className="px-2 py-1.5">
                          {ok ? (
                            <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                          ) : (
                            <span className="text-destructive">{r.errors.join(", ")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {importing && (
              <div className="space-y-1">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">Import en cours… {progress}%</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Annuler
          </Button>
          {rows && (
            <Button
              onClick={confirmImport}
              disabled={importing || valid.length === 0}
              className="bg-accent text-accent-foreground hover:bg-accent-hover"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Import…
                </>
              ) : (
                `Confirmer l'import (${valid.length})`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
