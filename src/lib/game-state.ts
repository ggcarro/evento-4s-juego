import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastGameState } from "@/lib/realtime-server";
import type {
  ElegidoInfo,
  GameStatePublico,
  LeaderboardEntry,
  PruebaPublica,
  RuletaEstado,
} from "@/lib/game-types";
import type { TeamId } from "@/lib/supabase/types";
import { TEAMS } from "@/lib/teams";

export const DURACION_GLOBAL_MIN = 5;
export const DURACION_GLOBAL_MAX = 20;

// La duración de "cuánto dura una pregunta" es un único valor global,
// ajustable en el panel de master, en vez de un campo por pregunta.
export async function obtenerDuracionGlobal(
  admin: ReturnType<typeof createAdminClient>
): Promise<number> {
  const { data } = await admin.from("game_state").select("duracion_global_segundos").single();
  const valor = data?.duracion_global_segundos ?? DURACION_GLOBAL_MAX;
  return Math.min(DURACION_GLOBAL_MAX, Math.max(DURACION_GLOBAL_MIN, valor));
}

// Convierte { team_id: player_id } en { team_id: { id, name } } para poder
// mostrar el nombre en la revelación (el game_state solo guarda el id).
export async function resolverElegidos(
  admin: ReturnType<typeof createAdminClient>,
  elegidos: Record<string, string> | null
): Promise<Record<string, ElegidoInfo> | null> {
  if (!elegidos || Object.keys(elegidos).length === 0) return null;

  const ids = Object.values(elegidos);
  const { data: jugadores } = await admin.from("players").select("id, name").in("id", ids);
  const nombrePorId = new Map((jugadores ?? []).map((j) => [j.id, j.name]));

  return Object.fromEntries(
    Object.entries(elegidos).map(([teamId, playerId]) => [
      teamId,
      { id: playerId, name: nombrePorId.get(playerId) ?? "?" },
    ])
  );
}

export async function computeLeaderboard(): Promise<LeaderboardEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("respuestas")
    .select("puntos, player_id, players!inner(team_id, is_kicked)");

  const perPlayer = new Map<string, { team_id: string; total: number }>();
  for (const row of data ?? []) {
    const player = row.players as unknown as { team_id: string; is_kicked: boolean };
    if (player.is_kicked) continue;
    const existing = perPlayer.get(row.player_id) ?? { team_id: player.team_id, total: 0 };
    existing.total += row.puntos;
    perPlayer.set(row.player_id, existing);
  }

  const perTeam = new Map<string, { sum: number; count: number }>();
  for (const { team_id, total } of perPlayer.values()) {
    const existing = perTeam.get(team_id) ?? { sum: 0, count: 0 };
    existing.sum += total;
    existing.count += 1;
    perTeam.set(team_id, existing);
  }

  return TEAMS.map((team) => {
    const stats = perTeam.get(team.id);
    return {
      team_id: team.id,
      avg_score: stats ? Math.round(stats.sum / stats.count) : 0,
      participantes: stats?.count ?? 0,
    };
  }).sort((a, b) => b.avg_score - a.avg_score);
}

// En fase "apostando" (apuesta ciega) no se manda el enunciado ni el config:
// el jugador tiene que arriesgar puntos SIN saber todavía de qué va la
// pregunta. En fase "ruleta" solo se oculta el enunciado (el config SÍ se
// manda: ahí vive config.ruleta_segmentos, que la pantalla necesita para
// dibujar la propia rueda). Ambas se revelan del todo al pasar a "activa".
export function paraFase(prueba: PruebaPublica, fase: string): PruebaPublica {
  if (fase === "apostando") return { ...prueba, enunciado: "", config: {} };
  if (fase === "ruleta") return { ...prueba, enunciado: "" };
  return prueba;
}

export async function getPublicGameState(): Promise<GameStatePublico> {
  const admin = createAdminClient();
  const { data: state } = await admin.from("game_state").select("*").single();

  const vacio: GameStatePublico = {
    fase: "lobby",
    prueba: null,
    ends_at: null,
    solucion: null,
    elegidos: null,
    ruleta: null,
    ruleta_turno: null,
    ruleta_parados: null,
    leaderboard: null,
  };

  if (!state) return vacio;

  if (state.fase === "leaderboard") {
    return { ...vacio, fase: state.fase, leaderboard: await computeLeaderboard() };
  }

  if (!state.prueba_actual_id) {
    return { ...vacio, fase: state.fase, ends_at: state.ends_at };
  }

  const { data: prueba } = await admin
    .from("pruebas")
    .select("id, orden, tipo, dificultad, enunciado, config, mecanica, duracion_segundos, solucion")
    .eq("id", state.prueba_actual_id)
    .single();

  if (!prueba) {
    return { ...vacio, fase: state.fase, ends_at: state.ends_at };
  }

  const { solucion, ...publicPrueba } = prueba;

  return {
    fase: state.fase,
    prueba: paraFase(publicPrueba, state.fase),
    ends_at: state.ends_at,
    solucion: state.fase === "revelada" ? solucion : null,
    elegidos: state.fase === "revelada" ? await resolverElegidos(admin, state.elegidos) : null,
    ruleta: (state.ruleta as RuletaEstado | null) ?? null,
    ruleta_turno: (state.ruleta_turno as TeamId | null) ?? null,
    ruleta_parados: (state.ruleta_parados as TeamId[] | null) ?? null,
    leaderboard: null,
  };
}

// Avanza la ceremonia de la ruleta un paso: marca el turno actual como
// parado y pasa al siguiente equipo pendiente. Si ya no queda ninguno,
// cierra la ceremonia y pasa a fase "activa" con la pregunta real, usando
// la duración global. La llama tanto el propio representante (al pulsar
// "Parar") como el master (botón "Saltar turno", por si un representante no
// responde).
export async function avanzarTurnoRuleta(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const { data: state } = await admin
    .from("game_state")
    .select("fase, prueba_actual_id, ruleta, ruleta_turno, ruleta_parados")
    .single();
  if (!state || state.fase !== "ruleta" || !state.prueba_actual_id || !state.ruleta) return;

  const ruletaEstado = state.ruleta as RuletaEstado;
  const parados = new Set<string>(state.ruleta_parados ?? []);
  if (state.ruleta_turno) parados.add(state.ruleta_turno);

  const ordenEquipos = TEAMS.map((t) => t.id).filter((id) => id in ruletaEstado);
  const siguiente = ordenEquipos.find((id) => !parados.has(id)) ?? null;

  const { data: prueba } = await admin
    .from("pruebas")
    .select("id, orden, tipo, dificultad, enunciado, config, mecanica, duracion_segundos")
    .eq("id", state.prueba_actual_id)
    .single();
  if (!prueba) return;

  if (siguiente) {
    await admin
      .from("game_state")
      .update({
        ruleta_turno: siguiente,
        ruleta_parados: [...parados],
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    await broadcastGameState({
      fase: "ruleta",
      prueba: paraFase(prueba, "ruleta"),
      ends_at: null,
      solucion: null,
      elegidos: null,
      ruleta: ruletaEstado,
      ruleta_turno: siguiente as TeamId,
      ruleta_parados: [...parados] as TeamId[],
      leaderboard: null,
    });
    return;
  }

  const duracion = await obtenerDuracionGlobal(admin);
  const endsAt = new Date(Date.now() + duracion * 1000).toISOString();

  await admin
    .from("game_state")
    .update({
      fase: "activa",
      ends_at: endsAt,
      ruleta_turno: null,
      ruleta_parados: [...parados],
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  await broadcastGameState({
    fase: "activa",
    prueba,
    ends_at: endsAt,
    solucion: null,
    elegidos: null,
    ruleta: ruletaEstado,
    ruleta_turno: null,
    ruleta_parados: [...parados] as TeamId[],
    leaderboard: null,
  });
}
