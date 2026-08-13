import { redirect } from "next/navigation";
import { isMaster } from "@/lib/master-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicGameState } from "@/lib/game-state";
import { MasterPanel } from "@/components/master-panel";

export default async function MasterPage() {
  if (!(await isMaster())) {
    redirect("/master/login");
  }

  const admin = createAdminClient();
  const [{ data: pruebas }, initialState] = await Promise.all([
    admin
      .from("pruebas")
      .select("id, orden, tipo, dificultad, enunciado, mecanica, equipo_referido")
      .order("orden"),
    getPublicGameState(),
  ]);

  return (
    <MasterPanel pruebas={pruebas ?? []} initialState={initialState} />
  );
}
