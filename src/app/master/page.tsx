import { redirect } from "next/navigation";
import { isMaster } from "@/lib/master-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicGameState, obtenerDuracionGlobal } from "@/lib/game-state";
import { MasterPanel } from "@/components/master-panel";

export default async function MasterPage() {
  if (!(await isMaster())) {
    redirect("/master/login");
  }

  const admin = createAdminClient();
  const [{ data: pruebas }, initialState, initialDuracionGlobal] = await Promise.all([
    admin
      .from("pruebas")
      .select("id, orden, tipo, dificultad, enunciado, mecanica, equipo_referido")
      .order("orden"),
    getPublicGameState(),
    obtenerDuracionGlobal(admin),
  ]);

  return (
    <MasterPanel
      pruebas={pruebas ?? []}
      initialState={initialState}
      initialDuracionGlobal={initialDuracionGlobal}
    />
  );
}
