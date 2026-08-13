"use client";

import { useEffect, useState } from "react";
import { useGameChannel } from "@/lib/use-game-channel";
import { getTirafloneTotales, getPujasActuales } from "@/app/juego/actions";
import type { GameStatePublico } from "@/lib/game-types";
import { TEAMS } from "@/lib/teams";

export function PantallaView({ initialState }: { initialState: GameStatePublico }) {
  const [state, setState] = useState(initialState);
  useGameChannel(setState);

  if (state.fase === "lobby") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg uppercase tracking-[0.3em] text-zinc-500">Juego del evento</p>
        <h1 className="text-6xl font-black">Esperando a que empiece...</h1>
      </div>
    );
  }

  if (state.fase === "apostando") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="text-lg uppercase tracking-[0.3em] text-amber-400">Apuesta ciega</p>
        <h1 className="text-5xl font-black">¿Cuánto arriesgáis?</h1>
        <p className="text-xl text-zinc-400">La pregunta se revela en cuanto se cierren las apuestas...</p>
      </div>
    );
  }

  if (
    (state.fase === "activa" || state.fase === "revelada" || state.fase === "subastando") &&
    state.prueba
  ) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-16 text-center">
        <MecanicaBanner mecanica={state.prueba.mecanica} />
        <h1 className="text-5xl font-black leading-tight">{state.prueba.enunciado}</h1>

        {state.prueba.tipo === "quiz" && (
          <div className="grid grid-cols-2 gap-6 text-3xl font-bold">
            {((state.prueba.config.opciones as string[] | undefined) ?? []).map((op, i) => {
              const isCorrect =
                state.fase === "revelada" && state.solucion?.indice_correcto === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border-2 px-8 py-6 ${
                    isCorrect
                      ? "border-green-400 bg-green-400/10 text-green-300"
                      : "border-zinc-700 text-zinc-100"
                  }`}
                >
                  {op}
                </div>
              );
            })}
          </div>
        )}

        {state.prueba.tipo === "true_false" && (
          <div className="flex gap-8 text-4xl font-black">
            {[true, false].map((val) => {
              const isCorrect = state.fase === "revelada" && state.solucion?.correcto === val;
              return (
                <div
                  key={String(val)}
                  className={`rounded-2xl border-2 px-12 py-8 ${
                    isCorrect
                      ? "border-green-400 bg-green-400/10 text-green-300"
                      : "border-zinc-700 text-zinc-100"
                  }`}
                >
                  {val ? "Verdadero" : "Falso"}
                </div>
              );
            })}
          </div>
        )}

        {state.prueba.tipo === "slider" && (
          <p className="text-4xl font-black text-zinc-100">
            {state.fase === "revelada"
              ? `La respuesta era: ${String(state.solucion?.objetivo)}`
              : `Entre ${String(state.prueba.config.min)} y ${String(state.prueba.config.max)}`}
          </p>
        )}

        {state.prueba.tipo === "tira_afloja" && (
          <TiraAflojaBar
            pruebaId={state.prueba.id}
            revelado={state.fase === "revelada"}
            totalesFinal={
              state.fase === "revelada"
                ? (state.solucion?.totales as Record<string, number> | undefined)
                : undefined
            }
          />
        )}

        {state.prueba.tipo === "subasta" && (
          <PujasBar
            pruebaId={state.prueba.id}
            revelado={state.fase === "revelada"}
            pujasFinal={
              state.fase === "revelada"
                ? (state.solucion?.pujas as Record<string, number> | undefined)
                : undefined
            }
          />
        )}

        {state.fase === "revelada" && state.prueba.tipo === "subasta" && (
          <SubastaResultado solucion={state.solucion} />
        )}

        {state.fase === "revelada" && state.elegidos && (
          <ElegidosBanner mecanica={state.prueba.mecanica} elegidos={state.elegidos} />
        )}
      </div>
    );
  }

  if (state.fase === "leaderboard") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-16 text-center">
        <h1 className="text-5xl font-black">Clasificación</h1>
        <ol className="flex w-full max-w-2xl flex-col gap-4">
          {state.leaderboard?.map((entry, i) => {
            const team = TEAMS.find((t) => t.id === entry.team_id);
            return (
              <li
                key={entry.team_id}
                className="flex items-center gap-4 rounded-2xl border border-zinc-700 px-8 py-5 text-left text-3xl font-bold"
              >
                <span className="text-zinc-500">{i + 1}</span>
                <span>{team?.icon}</span>
                <span className="flex-1">{team?.name}</span>
                <span className="text-zinc-300">{entry.avg_score} pts</span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return null;
}

function MecanicaBanner({ mecanica }: { mecanica: NonNullable<GameStatePublico["prueba"]>["mecanica"] }) {
  const texto =
    mecanica === "portavoz_secreto"
      ? "🎭 Portavoz secreto en juego"
      : mecanica === "doble_aleatorio"
        ? "🎲 Doble aleatorio en juego"
        : mecanica === "apuesta_ciega"
          ? "💰 Apuestas ciegas en juego"
          : null;
  if (!texto) return null;
  return <p className="text-lg font-bold uppercase tracking-wide text-amber-400">{texto}</p>;
}

function ElegidosBanner({
  mecanica,
  elegidos,
}: {
  mecanica: NonNullable<GameStatePublico["prueba"]>["mecanica"];
  elegidos: NonNullable<GameStatePublico["elegidos"]>;
}) {
  if (mecanica !== "portavoz_secreto" && mecanica !== "doble_aleatorio") return null;
  const titulo = mecanica === "portavoz_secreto" ? "Los portavoces eran..." : "Doblaron puntos...";
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-8 py-4 text-xl font-bold">
      <p className="text-amber-400">{titulo}</p>
      {Object.entries(elegidos).map(([teamId, info]) => {
        const team = TEAMS.find((t) => t.id === teamId);
        return (
          <p key={teamId} className="text-zinc-100">
            {team?.icon} {team?.name}: {info.name}
          </p>
        );
      })}
    </div>
  );
}

function SubastaResultado({ solucion }: { solucion: GameStatePublico["solucion"] }) {
  const subasta = solucion?.subasta as
    | { equipo: string; cantidad: number; premio: number; neto: number }
    | null
    | undefined;
  if (!subasta) {
    return <p className="text-2xl font-bold text-zinc-400">Nadie pujó, no hubo ganador.</p>;
  }
  const team = TEAMS.find((t) => t.id === subasta.equipo);
  return (
    <div className="rounded-2xl border-2 border-green-400 bg-green-400/10 px-10 py-6 text-3xl font-black text-green-300">
      Ganó {team?.icon} {team?.name} · pujó {subasta.cantidad} · premio {subasta.premio} · neto{" "}
      {subasta.neto >= 0 ? "+" : ""}
      {subasta.neto}
    </div>
  );
}

function PujasBar({
  pruebaId,
  revelado,
  pujasFinal,
}: {
  pruebaId: string;
  revelado: boolean;
  pujasFinal?: Record<string, number>;
}) {
  const [pujasEnVivo, setPujasEnVivo] = useState<Record<string, number>>({});

  useEffect(() => {
    if (revelado) return;
    let cancelado = false;
    const interval = setInterval(async () => {
      const actuales = await getPujasActuales(pruebaId);
      if (!cancelado) setPujasEnVivo(actuales);
    }, 1000);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, [pruebaId, revelado]);

  const pujas = revelado ? (pujasFinal ?? {}) : pujasEnVivo;
  const max = Math.max(1, ...TEAMS.map((t) => pujas[t.id] ?? 0));

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {TEAMS.map((t) => {
        const valor = pujas[t.id] ?? 0;
        return (
          <div key={t.id} className="flex items-center gap-4">
            <span className="w-40 shrink-0 text-left text-xl font-bold">
              {t.icon} {t.name}
            </span>
            <div className="h-8 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(valor / max) * 100}%`, backgroundColor: t.color }}
              />
            </div>
            <span className="w-16 text-right text-xl font-bold">{valor}</span>
          </div>
        );
      })}
    </div>
  );
}

function TiraAflojaBar({
  pruebaId,
  revelado,
  totalesFinal,
}: {
  pruebaId: string;
  revelado: boolean;
  totalesFinal?: Record<string, number>;
}) {
  const [totalesEnVivo, setTotalesEnVivo] = useState<Record<string, number>>({});

  useEffect(() => {
    if (revelado) return;
    let cancelado = false;
    const interval = setInterval(async () => {
      const actuales = await getTirafloneTotales(pruebaId);
      if (!cancelado) setTotalesEnVivo(actuales);
    }, 1000);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, [pruebaId, revelado]);

  const totales = revelado ? (totalesFinal ?? {}) : totalesEnVivo;
  const max = Math.max(1, ...TEAMS.map((t) => totales[t.id] ?? 0));

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {TEAMS.map((t) => {
        const valor = totales[t.id] ?? 0;
        return (
          <div key={t.id} className="flex items-center gap-4">
            <span className="w-40 shrink-0 text-left text-xl font-bold">
              {t.icon} {t.name}
            </span>
            <div className="h-8 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(valor / max) * 100}%`, backgroundColor: t.color }}
              />
            </div>
            <span className="w-16 text-right text-xl font-bold">{valor}</span>
          </div>
        );
      })}
    </div>
  );
}
