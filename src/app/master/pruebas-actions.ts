"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMaster } from "@/lib/master-session";
import type {
  Dificultad,
  Mecanica,
  PruebaTipo,
  TeamId,
} from "@/lib/supabase/types";

export type PruebaCampos = {
  tipo: PruebaTipo;
  equipo_referido: TeamId | null;
  dificultad: Dificultad;
  mecanica: Mecanica | null;
  enunciado: string;
  config: Record<string, unknown>;
  solucion: Record<string, unknown>;
  puntos_base: number;
  duracion_segundos: number;
};

export async function actualizarPrueba(id: string, campos: Partial<PruebaCampos>) {
  await requireMaster();
  const admin = createAdminClient();

  const { error } = await admin.from("pruebas").update(campos).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/master/pruebas");
  revalidatePath("/master");
}

// Recibe el orden completo de la lista tras arrastrar y persiste el índice
// (1-based) de cada prueba tal cual quedó.
export async function actualizarOrden(idsEnOrden: string[]) {
  await requireMaster();
  const admin = createAdminClient();

  await Promise.all(
    idsEnOrden.map((id, i) => admin.from("pruebas").update({ orden: i + 1 }).eq("id", id))
  );

  revalidatePath("/master/pruebas");
  revalidatePath("/master");
}

// Borra la prueba y cualquier progreso de jugadores ligado a ella (por si se
// llegó a lanzar en una demo). Pensado para depurar contenido antes del evento.
export async function borrarPrueba(id: string) {
  await requireMaster();
  const admin = createAdminClient();

  await admin.from("respuestas").delete().eq("prueba_id", id);
  await admin.from("apuestas").delete().eq("prueba_id", id);
  await admin.from("pujas").delete().eq("prueba_id", id);
  await admin.from("tira_afloja_taps").delete().eq("prueba_id", id);
  await admin.from("game_state").update({ prueba_actual_id: null }).eq("prueba_actual_id", id);

  const { error } = await admin.from("pruebas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/master/pruebas");
  revalidatePath("/master");
}
