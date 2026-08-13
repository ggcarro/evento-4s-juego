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

// Crea una pregunta en blanco (quiz con 2 opciones vacías) al final de la
// lista, lista para rellenar en el propio editor.
export async function crearPrueba(): Promise<PruebaCampos & { id: string; orden: number }> {
  await requireMaster();
  const admin = createAdminClient();

  const { data: ultima } = await admin
    .from("pruebas")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const siguienteOrden = (ultima?.orden ?? 0) + 1;

  const campos: PruebaCampos = {
    tipo: "quiz",
    equipo_referido: null,
    dificultad: "media",
    mecanica: null,
    enunciado: "",
    config: { opciones: ["", ""] },
    solucion: { indice_correcto: 0 },
    puntos_base: 100,
    duracion_segundos: 20,
  };

  const { data, error } = await admin
    .from("pruebas")
    .insert({ ...campos, orden: siguienteOrden })
    .select("id, orden")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la pregunta");

  revalidatePath("/master/pruebas");
  revalidatePath("/master");

  return { ...campos, id: data.id, orden: data.orden };
}

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

// Devuelve una URL de subida firmada para que el navegador suba el vídeo
// DIRECTAMENTE a Supabase Storage, sin pasar por nuestro servidor (Vercel
// rechaza cuerpos de más de ~4.5MB en las funciones, así que subirlo a
// través de una Server Action no funcionaría con vídeos reales).
export async function prepararSubidaVideo(
  nombreOriginal: string
): Promise<{ path: string; token: string } | { error: string }> {
  await requireMaster();
  const admin = createAdminClient();

  const extension = nombreOriginal.split(".").pop() ?? "mp4";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { data, error } = await admin.storage.from("media").createSignedUploadUrl(path);
  if (error || !data) {
    return { error: error?.message ?? "No se pudo preparar la subida." };
  }

  return { path: data.path, token: data.token };
}

export async function urlPublicaVideo(path: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = admin.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}
