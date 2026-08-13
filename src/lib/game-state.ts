import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ElegidoInfo,
  GameStatePublico,
  LeaderboardEntry,
  PruebaPublica,
  RuletaEstado,
} from "@/lib/game-types";
import { TEAMS } from "@/lib/teams";

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
// pregunta. Se revela al pasar a "activa".
function paraFase(prueba: PruebaPublica, fase: string): PruebaPublica {
  if (fase !== "apostando") return prueba;
  return { ...prueba, enunciado: "", config: {} };
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
    leaderboard: null,
  };
}
