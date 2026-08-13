"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMaster, setMasterCookie } from "@/lib/master-session";
import { broadcastGameState, broadcastQR } from "@/lib/realtime-server";
import {
  computeLeaderboard,
  resolverElegidos,
  obtenerDuracionGlobal,
  avanzarTurnoRuleta,
  paraFase,
  DURACION_GLOBAL_MIN,
  DURACION_GLOBAL_MAX,
} from "@/lib/game-state";
import { getTirafloneTotales, getVotosDetalle } from "@/app/juego/actions";
import { TEAMS } from "@/lib/teams";
import type { RuletaEstado, RuletaResultado } from "@/lib/game-types";
import type { TeamId } from "@/lib/supabase/types";

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

// Ruleta: elige un representante por equipo (mismo criterio que
// elegirPortavoces, pero aquí es público, no secreto) y gira, también por
// equipo, una casilla al azar de config.ruleta_segmentos.
function elegirResultadoRuleta(segmentos: RuletaResultado[]): RuletaResultado {
  if (segmentos.length === 0) return { tipo: "puntos", valor: 100 };
  return segmentos[Math.floor(Math.random() * segmentos.length)];
}

async function girarRuleta(
  admin: ReturnType<typeof createAdminClient>,
  segmentos: RuletaResultado[]
): Promise<RuletaEstado> {
  const representantes = await elegirPortavoces(admin);
  const ids = Object.values(representantes);
  const { data: jugadores } = await admin.from("players").select("id, name").in("id", ids);
  const nombrePorId = new Map((jugadores ?? []).map((j) => [j.id, j.name]));

  const estado: RuletaEstado = {};
  for (const [teamId, playerId] of Object.entries(representantes)) {
    estado[teamId] = {
      representante: { id: playerId, name: nombrePorId.get(playerId) ?? "?" },
      resultado: elegirResultadoRuleta(segmentos),
    };
  }
  return estado;
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
    const duracionSubasta = await obtenerDuracionGlobal(admin);
    const endsAt = new Date(Date.now() + duracionSubasta * 1000).toISOString();
    await admin
      .from("game_state")
      .update({
        prueba_actual_id: prueba.id,
        fase: "subastando",
        ends_at: endsAt,
        elegidos: null,
        ruleta: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    await broadcastGameState({
      fase: "subastando",
      prueba,
      ends_at: endsAt,
      solucion: null,
      elegidos: null,
      ruleta: null,
      ruleta_turno: null,
      ruleta_parados: null,
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
        ruleta: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    await broadcastGameState({
      fase: "apostando",
      prueba: { ...prueba, enunciado: "", config: {} },
      ends_at: endsAt,
      solucion: null,
      elegidos: null,
      ruleta: null,
      ruleta_turno: null,
      ruleta_parados: null,
      leaderboard: null,
    });
    revalidatePath("/master");
    return;
  }

  if (prueba.mecanica === "ruleta") {
    const segmentos = (prueba.config.ruleta_segmentos as RuletaResultado[] | undefined) ?? [];
    const ruleta = await girarRuleta(admin, segmentos);
    // Mismo criterio de orden que avanzarTurnoRuleta (orden de TEAMS), para
    // que la secuencia de equipos sea predecible en vez de depender del
    // orden arbitrario en que vinieron las filas de la consulta.
    const primerTurno = (TEAMS.map((t) => t.id).find((id) => id in ruleta) as TeamId | undefined) ?? null;

    if (!primerTurno) {
      // Ningún equipo tiene jugadores todavía: no hay a quién darle un
      // turno, así que ni empezamos la ceremonia.
      throw new Error("No hay jugadores en ningún equipo para girar la ruleta.");
    }

    await admin
      .from("game_state")
      .update({
        prueba_actual_id: prueba.id,
        fase: "ruleta",
        ends_at: null,
        elegidos: null,
        ruleta,
        ruleta_turno: primerTurno,
        ruleta_parados: [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    await broadcastGameState({
      fase: "ruleta",
      prueba: paraFase(prueba, "ruleta"),
      ends_at: null,
      solucion: null,
      elegidos: null,
      ruleta,
      ruleta_turno: primerTurno,
      ruleta_parados: [],
      leaderboard: null,
    });
    revalidatePath("/master");
    return;
  }

  const elegidos =
    prueba.mecanica === "portavoz_secreto" || prueba.mecanica === "doble_aleatorio"
      ? await elegirPortavoces(admin)
      : null;

  const duracion = await obtenerDuracionGlobal(admin);
  const endsAt = new Date(Date.now() + duracion * 1000).toISOString();

  await admin
    .from("game_state")
    .update({
      prueba_actual_id: prueba.id,
      fase: "activa",
      ends_at: endsAt,
      elegidos,
      ruleta: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  await broadcastGameState({
    fase: "activa",
    prueba,
    ends_at: endsAt,
    solucion: null,
    elegidos: null,
    ruleta: null,
    ruleta_turno: null,
    ruleta_parados: null,
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

  const duracion = await obtenerDuracionGlobal(admin);
  const endsAt = new Date(Date.now() + duracion * 1000).toISOString();

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
    ruleta: null,
    ruleta_turno: null,
    ruleta_parados: null,
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
    ruleta: null,
    ruleta_turno: null,
    ruleta_parados: null,
    leaderboard: null,
  });

  revalidatePath("/master");
}

export async function revealCurrent() {
  await requireMaster();
  const admin = createAdminClient();

  const { data: state } = await admin
    .from("game_state")
    .select("prueba_actual_id, elegidos, ruleta")
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

  // Votación de equipo: todo el equipo saca la misma nota, según si la
  // opción más votada por su equipo (no la de cada uno) era la correcta.
  if (prueba.tipo === "votacion") {
    const votos = await getVotosDetalle(prueba.id);

    const porEquipo = new Map<string, number[]>();
    for (const v of votos) {
      const arr = porEquipo.get(v.team_id) ?? [];
      arr.push(v.indice);
      porEquipo.set(v.team_id, arr);
    }

    const mayoriaPorEquipo: Record<string, number> = {};
    for (const [teamId, indices] of porEquipo) {
      const conteo = new Map<number, number>();
      for (const i of indices) conteo.set(i, (conteo.get(i) ?? 0) + 1);
      mayoriaPorEquipo[teamId] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }

    const indiceCorrecto = prueba.solucion.indice_correcto as number;
    solucionParaMostrar = { ...prueba.solucion, mayoriaPorEquipo };

    const filas = votos.map((v) => ({
      player_id: v.player_id,
      prueba_id: prueba.id,
      respuesta: { indice: v.indice },
      puntos: mayoriaPorEquipo[v.team_id] === indiceCorrecto ? prueba.puntos_base : 0,
    }));
    if (filas.length > 0) {
      await admin.from("respuestas").upsert(filas, { onConflict: "player_id,prueba_id" });
    }
  }

  // Ruleta: cada equipo tenía un representante público + una casilla ya
  // decidida al lanzar la prueba. Si la casilla es de puntos y la mayoría
  // del equipo (entre quienes respondieron) acertó, se suma el bote a cada
  // uno de ellos. Si es "convocatoria", el equipo entero pierde TODO su
  // marcador acumulado, acierten o no — es incondicional a la casilla, no a
  // la pregunta.
  if (prueba.mecanica === "ruleta") {
    const ruletaEstado = (state.ruleta ?? {}) as RuletaEstado;

    const { data: respuestasRonda } = await admin
      .from("respuestas")
      .select("player_id, puntos, respuesta, players!inner(team_id, is_kicked)")
      .eq("prueba_id", prueba.id);

    const porEquipo = new Map<string, { player_id: string; puntos: number; respuesta: Record<string, unknown> }[]>();
    for (const r of respuestasRonda ?? []) {
      const player = r.players as unknown as { team_id: string; is_kicked: boolean };
      if (player.is_kicked) continue;
      const arr = porEquipo.get(player.team_id) ?? [];
      arr.push({ player_id: r.player_id, puntos: r.puntos, respuesta: r.respuesta });
      porEquipo.set(player.team_id, arr);
    }

    const resumenPorEquipo: Record<string, { mayoria: boolean }> = {};

    for (const [teamId, entrada] of Object.entries(ruletaEstado)) {
      const respuestasEquipo = porEquipo.get(teamId) ?? [];
      const aciertos = respuestasEquipo.filter((r) => r.puntos > 0).length;
      const mayoria = respuestasEquipo.length > 0 && aciertos > respuestasEquipo.length / 2;
      resumenPorEquipo[teamId] = { mayoria };

      if (entrada.resultado.tipo === "convocatoria") {
        const { data: jugadoresEquipo } = await admin
          .from("players")
          .select("id")
          .eq("team_id", teamId as TeamId)
          .eq("is_kicked", false);
        const ids = (jugadoresEquipo ?? []).map((j) => j.id);

        if (ids.length > 0) {
          const { data: historico } = await admin
            .from("respuestas")
            .select("player_id, prueba_id, respuesta, puntos")
            .in("player_id", ids);

          type FilaHistorica = { prueba_id: string; respuesta: Record<string, unknown>; puntos: number };
          const porJugador = new Map<string, FilaHistorica[]>();
          for (const r of historico ?? []) {
            const arr = porJugador.get(r.player_id) ?? [];
            arr.push(r);
            porJugador.set(r.player_id, arr);
          }

          const filasWipe = ids.map((id) => {
            const filasJugador = porJugador.get(id) ?? [];
            const total = filasJugador.reduce((s, r) => s + r.puntos, 0);
            const filaActual = filasJugador.find((r) => r.prueba_id === prueba.id);
            return {
              player_id: id,
              prueba_id: prueba.id,
              respuesta: filaActual?.respuesta ?? {},
              puntos: (filaActual?.puntos ?? 0) - total,
            };
          });
          await admin.from("respuestas").upsert(filasWipe, { onConflict: "player_id,prueba_id" });
        }
      } else if (mayoria) {
        const bote = entrada.resultado.valor;
        const filasBote = respuestasEquipo.map((r) => ({
          player_id: r.player_id,
          prueba_id: prueba.id,
          respuesta: r.respuesta,
          puntos: r.puntos + bote,
        }));
        if (filasBote.length > 0) {
          await admin.from("respuestas").upsert(filasBote, { onConflict: "player_id,prueba_id" });
        }
      }
    }

    solucionParaMostrar = { ...prueba.solucion, ruleta_resumen: resumenPorEquipo };
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
    ruleta: (state.ruleta as RuletaEstado | null) ?? null,
    ruleta_turno: null,
    ruleta_parados: null,
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
      ruleta: null,
      ruleta_turno: null,
      ruleta_parados: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  await broadcastGameState({
    fase: "leaderboard",
    prueba: null,
    ends_at: null,
    solucion: null,
    elegidos: null,
    ruleta: null,
    ruleta_turno: null,
    ruleta_parados: null,
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
      ruleta: null,
      ruleta_turno: null,
      ruleta_parados: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  await broadcastGameState({
    fase: "lobby",
    prueba: null,
    ends_at: null,
    solucion: null,
    elegidos: null,
    ruleta: null,
    ruleta_turno: null,
    ruleta_parados: null,
    leaderboard: null,
  });

  revalidatePath("/master");
}

// Borra TODOS los jugadores y todo su progreso (respuestas, apuestas,
// pujas, pulsaciones de tira y afloja) y vuelve al lobby. Las pruebas
// (preguntas) y los equipos no se tocan. Pensado para limpiar una demo
// antes del evento real: cualquier jugador con la sesión abierta se
// desconecta solo la próxima vez que interactúe, porque su fila ya no existe.
export async function reiniciarPartida() {
  await requireMaster();
  const admin = createAdminClient();

  await admin.from("respuestas").delete().not("id", "is", null);
  await admin.from("apuestas").delete().not("id", "is", null);
  await admin.from("pujas").delete().not("prueba_id", "is", null);
  await admin.from("tira_afloja_taps").delete().not("player_id", "is", null);
  await admin.from("players").delete().not("id", "is", null);

  await admin
    .from("game_state")
    .update({
      fase: "lobby",
      prueba_actual_id: null,
      ends_at: null,
      elegidos: null,
      ruleta: null,
      ruleta_turno: null,
      ruleta_parados: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  await broadcastGameState({
    fase: "lobby",
    prueba: null,
    ends_at: null,
    solucion: null,
    elegidos: null,
    ruleta: null,
    ruleta_turno: null,
    ruleta_parados: null,
    leaderboard: null,
  });

  revalidatePath("/master");
}

// Por si el representante de turno no responde (móvil apagado, distraído...):
// el master fuerza el mismo avance que produciría su clic en "Parar".
export async function saltarTurnoRuleta() {
  await requireMaster();
  const admin = createAdminClient();
  await avanzarTurnoRuleta(admin);
  revalidatePath("/master");
}

// Duración (en segundos) que se usa para TODAS las preguntas al lanzarlas,
// en vez de un valor por pregunta. Máximo 20s para mantener el ritmo del
// evento.
export async function actualizarDuracionGlobal(segundos: number) {
  await requireMaster();
  const admin = createAdminClient();

  const clamped = Math.round(
    Math.min(DURACION_GLOBAL_MAX, Math.max(DURACION_GLOBAL_MIN, segundos))
  );

  await admin
    .from("game_state")
    .update({ duracion_global_segundos: clamped, updated_at: new Date().toISOString() })
    .eq("id", true);

  revalidatePath("/master");
  return clamped;
}

// Muestra/oculta en la pantalla un QR para unirse al juego. No toca
// game_state: es un aviso puramente visual, independiente de la fase actual.
export async function toggleQR(visible: boolean) {
  await requireMaster();
  await broadcastQR(visible);
}
