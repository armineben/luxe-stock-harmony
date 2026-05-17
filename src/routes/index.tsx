import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const isAdmin = data?.some((r) => r.role === "admin");
    throw redirect({ to: isAdmin ? "/dashboard" : "/catalogue" });
  },
});
