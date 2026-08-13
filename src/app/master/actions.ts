"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMaster, setMasterCookie } from "@/lib/master-session";
import { broadcastGameState } from "@/lib/realtime-server";
import { computeLeaderboard, resolverElegidos } from "@/lib/game-state";
import { getTirafloneTotales } from "@/app/juego/actions";

export type MasterLoginState = { error?: string };

export async function masterLogin(
  _prevState: MasterLoginState,
  formData: FormData
): Promise<MasterLoginState> {
  const pin = String(formData.get("pin") ?? "");
  if (!process.env.MASTER_PIN || pin !== process.env.MASTER_PIN) {
    return { error: "PIN incorrecto." };
  }
  await setMasterCookie();
  redirect("/master");
}

const VENTANA_APUESTAS_SEGUNDOS = 15;

// Elige al azar un "portavoz" por equipo (portavoz_secreto / doble_aleatorio),
// solo entre jugadores no expulsados. Un equipo sin jugadores no tiene elegido.
async function elegirPortavoces(
  admin: ReturnType<typeof createAdminClient>
): Promise<Record<string, string>> {
  const { data: players } = await admin
    .from("players")
    .select("id, team_id")
    .eq("is_kicked", false);

  const porEquipo = new Map<string, string[]>();
  for (const p of players ?? []) {
    const lista = porEquipo.get(p.team_id) ?? [];
    lista.push(p.id);
    porEquipo.set(p.team_id, lista);
  }

  const elegidos: Record<string, string> = {};
  for (const [teamId, ids] of porEquipo) {
    elegidos[teamId] = ids[Math.floor(Math.random() * ids.length)];
  }
  return elegidos;
}

export async function launchPrueba(pruebaId: string) {
  await requireMaster();
  const admin = createAdminClient();

  const { data: prueba, error } = await admin
    .from("pruebas")
    .select("id, orden, tipo, dificultad, enunciado, config, mecanica, duracion_segundos, puntos_base")
    .eq("id", pruebaId)
    .single();
  if (error || !prueba) throw new Error("Prueba no encontrada");

  if (prueba.tipo === "subasta") {
    const endsAt = new Date(Date.now() + prueba.duracion_segundos * 1000).toISOString();
    await admin
      .from("game_state")
      .update({
        prueba_actual_id: prueba.id,
        fase: "subastando",
        ends_at: endsAt,
        elegidos: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    await broadcastGameState({
      fase: "subastando",
      prueba,
      ends_at: endsAt,
      solucion: null,
      elegidos: null,
      leaderboard: null,
    });
    revalidatePath("/master");
    return;
  }

  if (prueba.mecanica === "apuesta_ciega") {
    const endsAt = new Date(Date.now() + VENTANA_APUESTAS_SEGUNDOS * 1000).toISOString();
    await admin
      .from("game_state")
      .update({
        prueba_actual_id: prueba.id,
        fase: "apostando",
        ends_at: endsAt,
        elegidos: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    await broadcastGameState({
      fase: "apostando",
      prueba: { ...prueba, enunciado: "", config: {} },
      ends_at: endsAt,
      solucion: null,
      elegidos: null,
      leaderboard: null,
    });
    revalidatePath("/master");
    return;
  }

  const elegidos =
    prueba.mecanica === "portavoz_secreto" || prueba.mecanica === "doble_aleatorio"
      ? await elegirPortavoces(admin)
      : null;

  const endsAt = new Date(Date.now() + prueba.duracion_segundos * 1000).toISOString();

  await admin
    .from("game_state")
    .update({
      prueba_actual_id: prueba.id,
      fase: "activa",
      ends_at: endsAt,
      elegidos,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  await broadcastGameState({
    fase: "activa",
    prueba,
    ends_at: endsAt,
    solucion: null,
    elegidos: null,
    leaderboard: null,
  });

  revalidatePath("/master");
}

// Cierra la ventana de apuesta ciega y muestra la pregunta real.
export async function cerrarApuestas() {
  await requireMaster();
  const admin = createAdminClient();

  const { data: state } = await admin.from("game_state").select("prueba_actual_id, fase").single();
  if (!state?.prueba_actual_id || state.fase !== "apostando") {
    throw new Error("No hay una ronda de apuestas abierta");
  }

  const { data: prueba, error } = await admin
    .from("pruebas")
    .select("id, orden, tipo, dificultad, enunciado, config, mecanica, duracion_segundos")
    .eq("id", state.prueba_actual_id)
    .single();
  if (error || !prueba) throw new Error("Prueba no encontrada");

  const endsAt = new Date(Date.now() + prueba.duracion_segundos * 1000).toISOString();

  await admin
    .from("game_state")
    .update({ fase: "activa", ends_at: endsAt, updated_at: new Date().toISOString() })
    .eq("id", true);

  await broadcastGameState({
    fase: "activa",
    prueba,
    ends_at: endsAt,
    solucion: null,
    elegidos: null,
    leaderboard: null,
  });

  revalidatePath("/master");
}

// Cierra la subasta: el equipo con la puja más alta se lleva el premio
// menos lo que pujó (puede salir en negativo si se pasa). El resto no paga
// ni gana nada. El "premio" es puntos_base de la propia prueba de subasta.
export async function cerrarSubasta() {
  await requireMaster();
  const admin = createAdminClient();

  const { data: state } = await admin.from("game_state").select("prueba_actual_id, fase").single();
  if (!state?.prueba_actual_id || state.fase !== "subastando") {
    throw new Error("No hay una subasta abierta");
  }

  const { data: prueba, error } = await admin
    .from("pruebas")
    .select("id, orden, tipo, dificultad, enunciado, config, mecanica, duracion_segundos, puntos_base")
    .eq("id", state.prueba_actual_id)
    .single();
  if (error || !prueba) throw new Error("Prueba no encontrada");

  const { data: pujas } = await admin
    .from("pujas")
    .select("team_id, cantidad")
    .eq("prueba_id", prueba.id);

  const ganadora = (pujas ?? []).sort((a, b) => b.cantidad - a.cantidad)[0] ?? null;
  const pujasPorEquipo = Object.fromEntries((pujas ?? []).map((p) => [p.team_id, p.cantidad]));

  let resultado: Record<string, unknown> | null = null;
  if (ganadora) {
    const premio = prueba.puntos_base;
    const neto = premio - ganadora.cantidad;

    const { data: jugadores } = await admin
      .from("players")
      .select("id")
      .eq("team_id", ganadora.team_id)
      .eq("is_kicked", false);

    const filas = (jugadores ?? []).map((j) => ({
      player_id: j.id,
      prueba_id: prueba.id,
      respuesta: {},
      puntos: neto,
    }));
    if (filas.length > 0) {
      await admin.from("respuestas").upsert(filas, { onConflict: "player_id,prueba_id" });
    }

    resultado = { equipo: ganadora.team_id, cantidad: ganadora.cantidad, premio, neto };
  }

  await admin
    .from("game_state")
    .update({ fase: "revelada", updated_at: new Date().toISOString() })
    .eq("id", true);

  await broadcastGameState({
    fase: "revelada",
    prueba: {
      id: prueba.id,
      orden: prueba.orden,
      tipo: prueba.tipo,
      dificultad: prueba.dificultad,
      enunciado: prueba.enunciado,
      config: prueba.config,
      mecanica: prueba.mecanica,
      duracion_segundos: prueba.duracion_segundos,
    },
    ends_at: null,
    solucion: { subasta: resultado, pujas: pujasPorEquipo },
    elegidos: null,
    leaderboard: null,
  });

  revalidatePath("/master");
}

export async function revealCurrent() {
  await requireMaster();
  const admin = createAdminClient();

  const { data: state } = await admin
    .from("game_state")
    .select("prueba_actual_id, elegidos")
    .single();
  if (!state?.prueba_actual_id) throw new Error("No hay prueba activa");

  const { data: prueba, error } = await admin
    .from("pruebas")
    .select("id, orden, tipo, dificultad, enunciado, config, mecanica, duracion_segundos, solucion, puntos_base")
    .eq("id", state.prueba_actual_id)
    .single();
  if (error || !prueba) throw new Error("Prueba no encontrada");

  let solucionParaMostrar: Record<string, unknown> = prueba.solucion;

  if (prueba.tipo === "tira_afloja") {
    const totales = await getTirafloneTotales(prueba.id);
    const equipoGanador =
      Object.entries(totales).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    solucionParaMostrar = { totales, ganador: equipoGanador };

    if (equipoGanador) {
      const { data: taps } = await admin
        .from("tira_afloja_taps")
        .select("player_id, players!inner(team_id)")
        .eq("prueba_id", prueba.id);

      const filas = (taps ?? []).map((t) => ({
        player_id: t.player_id,
        prueba_id: prueba.id,
        respuesta: {},
        puntos:
          (t.players as unknown as { team_id: string }).team_id === equipoGanador
            ? prueba.puntos_base
            : 0,
      }));
      if (filas.length > 0) {
        await admin.from("respuestas").upsert(filas, { onConflict: "player_id,prueba_id" });
      }
    }
  }

  await admin
    .from("game_state")
    .update({ fase: "revelada", updated_at: new Date().toISOString() })
    .eq("id", true);

  await broadcastGameState({
    fase: "revelada",
    prueba: {
      id: prueba.id,
      orden: prueba.orden,
      tipo: prueba.tipo,
      dificultad: prueba.dificultad,
      enunciado: prueba.enunciado,
      config: prueba.config,
      mecanica: prueba.mecanica,
      duracion_segundos: prueba.duracion_segundos,
    },
    ends_at: null,
    solucion: solucionParaMostrar,
    elegidos: await resolverElegidos(admin, state.elegidos),
    leaderboard: null,
  });

  revalidatePath("/master");
}

export async function showLeaderboardAction() {
  await requireMaster();
  const admin = createAdminClient();

  const leaderboard = await computeLeaderboard();

  await admin
    .from("game_state")
    .update({
      fase: "leaderboard",
      prueba_actual_id: null,
      ends_at: null,
      elegidos: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  await broadcastGameState({
    fase: "leaderboard",
    prueba: null,
    ends_at: null,
    solucion: null,
    elegidos: null,
    leaderboard,
  });

  revalidatePath("/master");
}

export async function resetToLobby() {
  await requireMaster();
  const admin = createAdminClient();

  await admin
    .from("game_state")
    .update({
      fase: "lobby",
      prueba_actual_id: null,
      ends_at: null,
      elegidos: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  await broadcastGameState({
    fase: "lobby",
    prueba: null,
    ends_at: null,
    solucion: null,
    elegidos: null,
    leaderboard: null,
  });

  revalidatePath("/master");
}
