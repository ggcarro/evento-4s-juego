"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  launchPrueba,
  cerrarApuestas,
  cerrarSubasta,
  revealCurrent,
  showLeaderboardAction,
  resetToLobby,
  reiniciarPartida,
} from "@/app/master/actions";
import { useGameChannel } from "@/lib/use-game-channel";
import type { GameStatePublico } from "@/lib/game-types";
import { TEAMS } from "@/lib/teams";

type PruebaResumen = {
  id: string;
  orden: number;
  tipo: string;
  dificultad: string;
  enunciado: string;
  mecanica: string | null;
  equipo_referido: string | null;
};

const MECANICA_LABEL: Record<string, string> = {
  portavoz_secreto: "🎭 portavoz secreto",
  doble_aleatorio: "🎲 doble aleatorio",
  apuesta_ciega: "💰 apuesta ciega",
  ruleta: "🎡 ruleta",
};

export function MasterPanel({
  pruebas,
  initialState,
}: {
  pruebas: PruebaResumen[];
  initialState: GameStatePublico;
}) {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();

  useGameChannel(setState);

  const ordenadas = [...pruebas].sort((a, b) => a.orden - b.orden);
  const ordenActual = state.prueba?.orden;
  const siguiente =
    ordenadas.find((p) => ordenActual === undefined || p.orden > ordenActual) ?? null;

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Control de la partida</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/master/pruebas"
            className="text-sm font-medium text-zinc-600 underline"
          >
            Editar preguntas
          </Link>
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {state.fase}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !siguiente}
          onClick={() => siguiente && startTransition(() => launchPrueba(siguiente.id))}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
          title={siguiente ? `#${siguiente.orden} · ${siguiente.enunciado}` : "No quedan más preguntas"}
        >
          Siguiente ▶ {siguiente ? `#${siguiente.orden}` : ""}
        </button>
        {state.fase === "apostando" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => cerrarApuestas())}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
          >
            Cerrar apuestas y mostrar pregunta
          </button>
        )}
        {state.fase === "subastando" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => cerrarSubasta())}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
          >
            Cerrar subasta
          </button>
        )}
        <button
          type="button"
          disabled={pending || state.fase !== "activa"}
          onClick={() => startTransition(() => revealCurrent())}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
        >
          Revelar respuesta
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => showLeaderboardAction())}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          Mostrar leaderboard
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => resetToLobby())}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          Volver al lobby
        </button>
      </div>

      <ReiniciarPartidaBoton />

      {state.fase === "leaderboard" && state.leaderboard && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-zinc-500">Leaderboard actual</p>
          <ol className="flex flex-col gap-1.5">
            {state.leaderboard.map((entry, i) => {
              const team = TEAMS.find((t) => t.id === entry.team_id);
              return (
                <li key={entry.team_id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-zinc-400">{i + 1}.</span>
                  <span>{team?.icon}</span>
                  <span className="font-medium text-zinc-900">{team?.name}</span>
                  <span className="text-zinc-500">
                    {entry.avg_score} pts ({entry.participantes} jugadores)
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-500">Pruebas ({pruebas.length})</p>
        {pruebas.map((prueba) => {
          const isCurrent = state.prueba?.id === prueba.id;
          const equipo = TEAMS.find((t) => t.id === prueba.equipo_referido);
          return (
            <div
              key={prueba.id}
              className={`flex items-center justify-between gap-3 rounded-lg border bg-white p-3 ${
                isCurrent ? "border-zinc-900" : "border-zinc-200"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">
                  #{prueba.orden} · {prueba.tipo} · {prueba.dificultad}
                  {equipo ? ` · ${equipo.icon} ${equipo.name}` : ""}
                  {prueba.mecanica && ` · ${MECANICA_LABEL[prueba.mecanica] ?? prueba.mecanica}`}
                </p>
                <p className="truncate text-xs text-zinc-500">{prueba.enunciado}</p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => launchPrueba(prueba.id))}
                className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
              >
                Lanzar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReiniciarPartidaBoton() {
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-red-900">Reiniciar partida</p>
        <p className="text-xs text-red-700">
          Borra todos los jugadores y su progreso (útil tras una demo). Las preguntas no se tocan.
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirmando) {
            setConfirmando(true);
            setTimeout(() => setConfirmando(false), 4000);
            return;
          }
          setConfirmando(false);
          startTransition(() => reiniciarPartida());
        }}
        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-30 ${
          confirmando ? "bg-red-800" : "bg-red-600"
        }`}
      >
        {pending ? "Reiniciando..." : confirmando ? "¿Seguro? Pulsa otra vez" : "Reiniciar todo"}
      </button>
    </div>
  );
}
