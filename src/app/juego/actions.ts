"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedPlayer } from "@/lib/session";

export type SubmitAnswerResult = { ok: boolean; message: string };

// Puntuación acumulada del jugador hasta ahora, para que sepa cuánto puede
// arriesgar en una apuesta ciega (puede apostar hasta lo que lleve).
export async function getMiPuntuacion(): Promise<number> {
  const player = await getAuthenticatedPlayer();
  if (!player) return 0;

  const admin = createAdminClient();
  const { data } = await admin.from("respuestas").select("puntos").eq("player_id", player.id);
  return (data ?? []).reduce((sum, r) => sum + r.puntos, 0);
}

function calcularPuntosBase(
  tipo: string,
  puntosBase: number,
  solucion: Record<string, unknown>,
  config: Record<string, unknown>,
  respuesta: Record<string, unknown>
): number {
  if (tipo === "quiz") {
    return respuesta.indice === solucion.indice_correcto ? puntosBase : 0;
  }
  if (tipo === "true_false") {
    return respuesta.valor === solucion.correcto ? puntosBase : 0;
  }
  if (tipo === "slider") {
    const objetivo = Number(solucion.objetivo);
    const min = Number(config.min ?? 0);
    const max = Number(config.max ?? 100);
    const valor = Number(respuesta.valor);
    if (Number.isNaN(valor)) return 0;
    const rango = Math.max(1, max - min);
    const distancia = Math.abs(valor - objetivo);
    const ratio = Math.max(0, 1 - distancia / rango);
    return Math.round(puntosBase * ratio);
  }
  return 0;
}

// Racha: consulta las últimas respuestas del jugador (más reciente primero)
// y cuenta cuántas seguidas fueron > 0 puntos, sin contar la actual.
async function rachaPrevia(
  admin: ReturnType<typeof createAdminClient>,
  playerId: string
): Promise<number> {
  const { data } = await admin
    .from("respuestas")
    .select("puntos, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(6);

  let racha = 0;
  for (const r of data ?? []) {
    if (r.puntos > 0) racha++;
    else break;
  }
  return racha;
}

function multiplicadorRacha(racha: number): number {
  if (racha >= 5) return 2;
  if (racha >= 3) return 1.5;
  return 1;
}

// Nunca devuelve si acertó o no: eso solo se sabe cuando el master revela,
// para que nadie pueda chivar la respuesta correcta a su equipo por otro
// canal mientras el resto todavía está respondiendo.
export async function submitAnswer(
  pruebaId: string,
  respuesta: Record<string, unknown>
): Promise<SubmitAnswerResult> {
  const player = await getAuthenticatedPlayer();
  if (!player) {
    return { ok: false, message: "Tu sesión no es válida." };
  }

  const admin = createAdminClient();

  const { data: state } = await admin
    .from("game_state")
    .select("fase, prueba_actual_id, ends_at, elegidos")
    .single();

  if (!state || state.fase !== "activa" || state.prueba_actual_id !== pruebaId) {
    return { ok: false, message: "Esta prueba ya no está activa." };
  }
  if (state.ends_at && new Date(state.ends_at).getTime() < Date.now()) {
    return { ok: false, message: "Se acabó el tiempo." };
  }

  const { data: prueba } = await admin
    .from("pruebas")
    .select("tipo, puntos_base, solucion, config, mecanica")
    .eq("id", pruebaId)
    .single();
  if (!prueba) {
    return { ok: false, message: "Prueba no encontrada." };
  }

  let puntos = calcularPuntosBase(
    prueba.tipo,
    prueba.puntos_base,
    prueba.solucion,
    prueba.config,
    respuesta
  );

  const racha = await rachaPrevia(admin, player.id);
  const rachaEfectiva = puntos > 0 ? racha + 1 : 0;
  const multiplicador = multiplicadorRacha(rachaEfectiva);
  puntos = Math.round(puntos * multiplicador);

  let mensaje = "Respuesta registrada.";
  const elegidoDelEquipo = state.elegidos?.[player.team_id];

  if (prueba.mecanica === "portavoz_secreto") {
    if (elegidoDelEquipo && elegidoDelEquipo !== player.id) {
      puntos = 0;
    }
  } else if (prueba.mecanica === "doble_aleatorio") {
    if (elegidoDelEquipo && elegidoDelEquipo === player.id) {
      puntos *= 2;
    }
  } else if (prueba.mecanica === "apuesta_ciega") {
    // Doble o nada puro sobre lo apostado: el valor de la propia prueba no
    // cuenta, solo si acertó o no. Acierta -> +cantidad, falla -> -cantidad.
    const { data: apuesta } = await admin
      .from("apuestas")
      .select("cantidad")
      .eq("prueba_id", pruebaId)
      .eq("player_id", player.id)
      .maybeSingle();
    const cantidad = apuesta?.cantidad ?? 0;
    puntos = puntos > 0 ? cantidad : -cantidad;
  } else if (multiplicador > 1) {
    mensaje = `¡Racha x${multiplicador}!`;
  }

  const { error } = await admin.from("respuestas").insert({
    player_id: player.id,
    prueba_id: pruebaId,
    respuesta,
    puntos,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, message: "Ya habías respondido a esta prueba." };
    }
    return { ok: false, message: "No se pudo guardar tu respuesta." };
  }

  return { ok: true, message: mensaje };
}

// Apuesta ciega: el jugador arriesga puntos ANTES de ver la pregunta real.
export async function submitWager(pruebaId: string, cantidad: number): Promise<SubmitAnswerResult> {
  const player = await getAuthenticatedPlayer();
  if (!player) {
    return { ok: false, message: "Tu sesión no es válida." };
  }
  if (!Number.isFinite(cantidad) || cantidad < 0) {
    return { ok: false, message: "Apuesta no válida." };
  }

  const admin = createAdminClient();
  const { data: state } = await admin
    .from("game_state")
    .select("fase, prueba_actual_id")
    .single();

  if (!state || state.fase !== "apostando" || state.prueba_actual_id !== pruebaId) {
    return { ok: false, message: "Ya no se puede apostar en esta ronda." };
  }

  const { error } = await admin
    .from("apuestas")
    .upsert(
      { prueba_id: pruebaId, player_id: player.id, cantidad },
      { onConflict: "prueba_id,player_id" }
    );

  if (error) {
    return { ok: false, message: "No se pudo guardar la apuesta." };
  }
  return { ok: true, message: "Apuesta registrada." };
}

// Tira y afloja: el cliente manda el TOTAL acumulado de pulsaciones (no
// incrementos), así que reintentos o mensajes duplicados no inflan el
// recuento.
export async function registrarTaps(pruebaId: string, taps: number): Promise<{ ok: boolean }> {
  const player = await getAuthenticatedPlayer();
  if (!player) return { ok: false };

  const admin = createAdminClient();
  const { data: state } = await admin
    .from("game_state")
    .select("fase, prueba_actual_id")
    .single();

  if (!state || state.fase !== "activa" || state.prueba_actual_id !== pruebaId) {
    return { ok: false };
  }

  await admin
    .from("tira_afloja_taps")
    .upsert(
      { prueba_id: pruebaId, player_id: player.id, taps, updated_at: new Date().toISOString() },
      { onConflict: "prueba_id,player_id" }
    );

  return { ok: true };
}

export async function getTirafloneTotales(pruebaId: string): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tira_afloja_taps")
    .select("taps, players!inner(team_id)")
    .eq("prueba_id", pruebaId);

  const porEquipo: Record<string, number> = {};
  for (const row of data ?? []) {
    const teamId = (row.players as unknown as { team_id: string }).team_id;
    porEquipo[teamId] = (porEquipo[teamId] ?? 0) + row.taps;
  }
  return porEquipo;
}

// Subasta: cualquier miembro del equipo puede pujar (o repujar) por el
// equipo mientras dura la subasta; se guarda la última puja enviada, no
// exige que sea mayor que la anterior. Se coordinan hablando entre ellos.
export async function submitBid(pruebaId: string, cantidad: number): Promise<SubmitAnswerResult> {
  const player = await getAuthenticatedPlayer();
  if (!player) {
    return { ok: false, message: "Tu sesión no es válida." };
  }
  if (!Number.isFinite(cantidad) || cantidad < 0) {
    return { ok: false, message: "Puja no válida." };
  }

  const admin = createAdminClient();
  const { data: state } = await admin
    .from("game_state")
    .select("fase, prueba_actual_id")
    .single();

  if (!state || state.fase !== "subastando" || state.prueba_actual_id !== pruebaId) {
    return { ok: false, message: "La subasta ya no está abierta." };
  }

  const { error } = await admin.from("pujas").upsert(
    {
      prueba_id: pruebaId,
      team_id: player.team_id,
      cantidad,
      player_id: player.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "prueba_id,team_id" }
  );

  if (error) {
    return { ok: false, message: "No se pudo registrar la puja." };
  }
  return { ok: true, message: "Puja registrada." };
}

export async function getPujasActuales(pruebaId: string): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pujas")
    .select("team_id, cantidad")
    .eq("prueba_id", pruebaId);

  return Object.fromEntries((data ?? []).map((p) => [p.team_id, p.cantidad]));
}
