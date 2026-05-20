import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, KeyRound, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profil")({
  component: ProfilPage,
});

function ProfilPage() {
  const { user, role } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));
  }, [user]);

  async function saveName() {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Nom mis à jour");
    setSavingName(false);
  }

  async function saveEmail() {
    if (!email) return;
    if (!confirm(`Confirmer le changement d'email vers ${email} ? Vous devrez peut-être vérifier la nouvelle adresse.`))
      return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    if (error) toast.error(error.message);
    else toast.success("Demande envoyée. Vérifiez votre boîte mail.");
    setSavingEmail(false);
  }

  async function savePassword() {
    if (password.length < 8) {
      toast.error("Mot de passe : 8 caractères minimum");
      return;
    }
    if (password !== confirmPwd) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour");
      setPassword("");
      setConfirmPwd("");
    }
    setSavingPwd(false);
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 lg:px-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-accent">Compte</p>
        <h1 className="font-display text-3xl lg:text-4xl">Mon profil</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Rôle actuel :{" "}
          <span className="font-medium text-foreground">
            {role === "admin" ? "Administrateur" : role === "manager" ? "Manager" : "Vendeur"}
          </span>
        </p>
      </div>

      <Section icon={<UserIcon className="h-4 w-4" />} title="Nom affiché">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <button
            onClick={saveName}
            disabled={savingName}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            {savingName && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </Section>

      <Section icon={<Mail className="h-4 w-4" />} title="Adresse email">
        <div className="flex gap-2">
          <input
            type="email"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            onClick={saveEmail}
            disabled={savingEmail || email === user.email}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            {savingEmail && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Changer l'email
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Un email de confirmation sera envoyé à la nouvelle adresse.
        </p>
      </Section>

      <Section icon={<KeyRound className="h-4 w-4" />} title="Mot de passe">
        <div className="grid gap-2">
          <input
            type="password"
            placeholder="Nouveau mot de passe (8+ caractères)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
          />
          <button
            onClick={savePassword}
            disabled={savingPwd || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground hover:bg-accent/90 disabled:opacity-50 sm:w-auto sm:self-end"
          >
            {savingPwd && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Mettre à jour
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
