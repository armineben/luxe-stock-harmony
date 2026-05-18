import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setPending(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(mode === "signin" ? "Bienvenue" : "Compte créé");
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 text-background lg:flex">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-accent">Secret's Fashion</p>
        </div>
        <div className="space-y-6">
          <h1 className="font-display text-5xl leading-tight">
            L'élégance,
            <br />
            <span className="italic text-accent">parfaitement orchestrée.</span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-background/70">
            Gérez votre stock, vos ventes et vos collections avec la précision
            d'une maison de couture.
          </p>
        </div>
        <p className="text-xs text-background/40">
          © {new Date().getFullYear()} Secret's Fashion
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-xs uppercase tracking-[0.35em] text-accent">Secret's Fashion</p>
            <h1 className="mt-2 font-display text-3xl">L'élégance, orchestrée.</h1>
          </div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-8">
              <h2 className="font-display text-3xl">Bon retour parmi nous</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Connectez-vous pour accéder à votre boutique.
              </p>
            </TabsContent>
            <TabsContent value="signup" className="mt-8">
              <h2 className="font-display text-3xl">Créer votre compte</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Le premier compte créé est <span className="text-accent">administrateur</span>.
                Les suivants sont <span className="text-accent">vendeurs</span>.
              </p>
            </TabsContent>
          </Tabs>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@boutique.fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-foreground text-background hover:bg-foreground/90"
            >
              {pending ? "Patientez…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
