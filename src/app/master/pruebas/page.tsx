import { redirect } from "next/navigation";
import { isMaster } from "@/lib/master-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PruebasEditor } from "@/components/pruebas-editor";

export default async function PruebasPage() {
  if (!(await isMaster())) {
    redirect("/master/login");
  }

  const admin = createAdminClient();
  const { data: pruebas } = await admin
    .from("pruebas")
    .select(
      "id, orden, tipo, equipo_referido, dificultad, mecanica, enunciado, config, solucion, puntos_base, duracion_segundos"
    )
    .order("orden");

  return <PruebasEditor pruebasIniciales={pruebas ?? []} />;
}
