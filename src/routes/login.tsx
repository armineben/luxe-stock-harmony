import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Fingerprint } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import {
  biometricAvailable,
  platformAuthenticatorAvailable,
  enrollBiometric,
  verifyBiometric,
  getStored,
  clearStored,
} from "@/lib/biometric";

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

  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  useEffect(() => {
    (async () => {
      const ok = biometricAvailable() && (await platformAuthenticatorAvailable());
      setBioSupported(ok);
      setBioEnrolled(!!getStored());
    })();
  }, []);

  async function doSignIn(em: string, pw: string) {
    const { error } = await signIn(em, pw);
    if (error) {
      toast.error(error);
      return false;
    }
    toast.success("Bienvenue");
    navigate({ to: "/dashboard" });
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    if (mode === "signin") {
      const ok = await doSignIn(email, password);
      if (ok && bioSupported && !bioEnrolled) {
        const wants = window.confirm(
          "Activer Face ID / Touch ID pour vous reconnecter rapidement sur cet appareil ?",
        );
        if (wants) {
          try {
            await enrollBiometric(email, password);
            setBioEnrolled(true);
            toast.success("Connexion biométrique activée.");
          } catch (err: any) {
            toast.error(err?.message ?? "Échec de l'enrôlement biométrique.");
          }
        }
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) toast.error(error);
      else {
        toast.success("Compte créé");
        navigate({ to: "/dashboard" });
      }
    }
    setPending(false);
  }

  async function onBiometricLogin() {
    try {
      const { email: em, password: pw } = await verifyBiometric();
      setPending(true);
      const ok = await doSignIn(em, pw);
      setPending(false);
      if (!ok) {
        // Stored credentials no longer valid
        clearStored();
        setBioEnrolled(false);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Vérification biométrique échouée.");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 text-background lg:flex">
        <div className="flex items-center gap-3">
          <Logo size={48} />
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
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={56} />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-accent">Secret's Fashion</p>
              <h1 className="mt-1 font-display text-2xl">L'élégance, orchestrée.</h1>
            </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {mode === "signin" && (
                  <Link
                    to="/forgot-password"
                    className="text-xs text-accent hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                )}
              </div>
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

            {mode === "signin" && bioSupported && bioEnrolled && (
              <>
                <div className="relative my-2 flex items-center">
                  <div className="flex-1 border-t border-border" />
                  <span className="px-3 text-xs uppercase tracking-wider text-muted-foreground">
                    ou
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBiometricLogin}
                  disabled={pending}
                  className="w-full gap-2"
                >
                  <Fingerprint className="h-4 w-4" />
                  Se connecter avec Face ID / Touch ID
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    clearStored();
                    setBioEnrolled(false);
                    toast.success("Connexion biométrique désactivée sur cet appareil.");
                  }}
                  className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Désactiver la biométrie sur cet appareil
                </button>
              </>
            )}

            {mode === "signin" && bioSupported && !bioEnrolled && (
              <p className="text-center text-xs text-muted-foreground">
                <Fingerprint className="mr-1 inline h-3 w-3" />
                Face ID / Touch ID disponible — activez-le après votre prochaine connexion.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
