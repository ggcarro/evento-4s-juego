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
  saltarTurnoRuleta,
  actualizarDuracionGlobal,
  toggleQR,
} from "@/app/master/actions";
import { useGameChannel } from "@/lib/use-game-channel";
import { Countdown } from "@/components/countdown";
import type { GameStatePublico } from "@/lib/game-types";
import { TEAMS } from "@/lib/teams";

// Coinciden con DURACION_GLOBAL_MIN/MAX en lib/game-state.ts (ese archivo es
// "server-only" y no se puede importar desde un componente cliente).
const DURACION_MIN = 5;
const DURACION_MAX = 20;

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
  initialDuracionGlobal,
}: {
  pruebas: PruebaResumen[];
  initialState: GameStatePublico;
  initialDuracionGlobal: number;
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
          {state.ends_at && (
            <Countdown key={state.ends_at} endsAt={state.ends_at} className="text-sm font-semibold text-zinc-600" />
          )}
        </div>
      </div>

      <DuracionGlobalControl initial={initialDuracionGlobal} />

      {state.fase === "ruleta" && (
        <RuletaTurnoInfo turno={state.ruleta_turno} parados={state.ruleta_parados} />
      )}

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
        <QRToggleButton />
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

function QRToggleButton() {
  const [visible, setVisible] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = !visible;
          await toggleQR(next);
          setVisible(next);
        })
      }
      className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-30 ${
        visible ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-800"
      }`}
    >
      {visible ? "Ocultar QR" : "Mostrar QR"}
    </button>
  );
}

function DuracionGlobalControl({ initial }: { initial: number }) {
  const [valor, setValor] = useState(initial);
  const [guardado, setGuardado] = useState(true);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5">
      <label className="text-sm font-medium text-zinc-600" htmlFor="duracion-global">
        Duración por pregunta
      </label>
      <input
        id="duracion-global"
        type="number"
        min={DURACION_MIN}
        max={DURACION_MAX}
        value={valor}
        onChange={(e) => {
          setValor(Number(e.target.value));
          setGuardado(false);
        }}
        className="w-16 rounded-lg border border-zinc-300 p-1.5 text-sm text-zinc-900"
      />
      <span className="text-xs text-zinc-400">s (máx. {DURACION_MAX})</span>
      <button
        type="button"
        disabled={pending || guardado}
        onClick={() =>
          startTransition(async () => {
            const clamped = await actualizarDuracionGlobal(valor);
            setValor(clamped);
            setGuardado(true);
          })
        }
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

function RuletaTurnoInfo({
  turno,
  parados,
}: {
  turno: GameStatePublico["ruleta_turno"];
  parados: GameStatePublico["ruleta_parados"];
}) {
  const [pending, startTransition] = useTransition();
  const equipo = TEAMS.find((t) => t.id === turno);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
      <p className="text-sm font-medium text-amber-900">
        🎡 Le toca a {equipo?.icon} {equipo?.name ?? "—"} · ya han parado: {(parados ?? []).length}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => saltarTurnoRuleta())}
        className="shrink-0 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-30"
        title="Por si el representante no responde"
      >
        Saltar turno
      </button>
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
