import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, ShieldCheck, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  component: UtilisateursPage,
});

type Row = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "admin" | "vendeur";
};

function UtilisateursPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, email, display_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, "admin" | "vendeur">();
    (roles ?? []).forEach((r: any) => {
      // si admin prioritaire
      if (r.role === "admin" || !roleMap.has(r.user_id)) {
        roleMap.set(r.user_id, r.role);
      }
    });
    const list: Row[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      role: roleMap.get(p.id) ?? "vendeur",
    }));
    list.sort((a, b) => (a.role === b.role ? (a.email ?? "").localeCompare(b.email ?? "") : a.role === "admin" ? -1 : 1));
    setRows(list);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function setRole(userId: string, newRole: "admin" | "vendeur") {
    setSavingId(userId);
    // Supprimer les rôles existants puis insérer le nouveau
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) {
      toast.error(del.error.message);
      setSavingId(null);
      return;
    }
    const ins = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (ins.error) {
      toast.error(ins.error.message);
    } else {
      toast.success(`Rôle mis à jour : ${newRole}`);
      await load();
    }
    setSavingId(null);
  }

  if (!isAdmin) {
    return <div className="p-8 text-sm text-muted-foreground">Accès réservé aux administrateurs.</div>;
  }

  const admins = rows.filter((r) => r.role === "admin");
  const vendeurs = rows.filter((r) => r.role === "vendeur");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 lg:px-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-accent">Accès</p>
        <h1 className="font-display text-3xl lg:text-4xl">Gestion des utilisateurs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Définissez 2 administrateurs (accès complet) et jusqu'à 3 vendeurs (catalogue uniquement).
          Les nouveaux comptes s'inscrivent via la page de connexion, puis vous leur attribuez leur rôle ici.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">Quota recommandé :</strong> {admins.length}/2 admins ·{" "}
          {vendeurs.length}/3 vendeurs.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôle actuel</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const isSelf = r.id === currentUser?.id;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.display_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${
                          r.role === "admin"
                            ? "bg-accent-soft text-accent"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {r.role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                        {r.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">Vous-même</span>
                      ) : savingId === r.id ? (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                      ) : r.role === "admin" ? (
                        <button
                          onClick={() => setRole(r.id, "vendeur")}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                        >
                          Passer en vendeur
                        </button>
                      ) : (
                        <button
                          onClick={() => setRole(r.id, "admin")}
                          disabled={admins.length >= 2}
                          className="rounded-lg bg-accent px-3 py-1.5 text-xs text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
                        >
                          Promouvoir admin
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Aucun utilisateur. Demandez à vos collaborateurs de créer un compte sur la page de connexion.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
