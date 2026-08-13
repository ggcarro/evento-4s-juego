import type { Dificultad, Fase, Mecanica, PruebaTipo } from "@/lib/supabase/types";

// Forma pública de una prueba: lo necesario para RENDERIZARLA, nunca la
// solución. Se manda tal cual por Realtime Broadcast y por el fetch inicial.
export type PruebaPublica = {
  id: string;
  orden: number;
  tipo: PruebaTipo;
  dificultad: Dificultad;
  enunciado: string;
  config: Record<string, unknown>;
  mecanica: Mecanica | null;
  duracion_segundos: number;
};

export type LeaderboardEntry = {
  team_id: string;
  avg_score: number;
  participantes: number;
};

// Estado que viaja por el canal "game": lo que ven jugador y pantalla.
// `solucion` y `elegidos` solo vienen rellenos cuando fase === "revelada"
// (elegidos son quién fue el portavoz secreto / doble aleatorio de cada
// equipo esta ronda; nunca se manda durante la fase activa).
export type ElegidoInfo = { id: string; name: string };

// Ruleta: a diferencia de `elegidos` (secreto hasta revelar), esto es
// público desde el momento en que se lanza la prueba: representante
// iluminado por equipo + la casilla que le tocó en el giro.
export type RuletaResultado = { tipo: "puntos"; valor: number } | { tipo: "convocatoria" };
export type RuletaEquipo = { representante: ElegidoInfo; resultado: RuletaResultado };
export type RuletaEstado = Record<string, RuletaEquipo>;

export type GameStatePublico = {
  fase: Fase;
  prueba: PruebaPublica | null;
  ends_at: string | null;
  solucion: Record<string, unknown> | null;
  elegidos: Record<string, ElegidoInfo> | null;
  ruleta: RuletaEstado | null;
  leaderboard: LeaderboardEntry[] | null;
};

export const GAME_CHANNEL = "game";
export const GAME_EVENT = "state";
