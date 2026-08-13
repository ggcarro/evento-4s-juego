"use client";

import { useEffect, useState } from "react";
import { useGameChannel } from "@/lib/use-game-channel";
import { getTirafloneTotales, getPujasActuales, getVotosDetalle } from "@/app/juego/actions";
import type { GameStatePublico, RuletaResultado } from "@/lib/game-types";
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

        {state.prueba.mecanica === "ruleta" && (
          <RuletaPanel
            key={`${state.prueba.id}-${state.ends_at}`}
            ruleta={state.ruleta}
            revelado={state.fase === "revelada"}
            resumen={
              state.fase === "revelada"
                ? (state.solucion?.ruleta_resumen as Record<string, { mayoria: boolean }> | undefined)
                : undefined
            }
          />
        )}

        <h1 className="text-5xl font-black leading-tight">{state.prueba.enunciado}</h1>

        {state.prueba.tipo === "quiz" &&
          (state.prueba.config.video_url as string | undefined) && (
            <video
              src={state.prueba.config.video_url as string}
              autoPlay
              muted
              loop
              playsInline
              className="max-h-[40vh] rounded-2xl border border-zinc-700"
            />
          )}

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

        {state.prueba.tipo === "votacion" && (
          <VotacionPantalla
            pruebaId={state.prueba.id}
            opciones={(state.prueba.config.opciones as string[] | undefined) ?? []}
            revelado={state.fase === "revelada"}
            indiceCorrecto={
              state.fase === "revelada"
                ? (state.solucion?.indice_correcto as number | undefined)
                : undefined
            }
            mayoriaPorEquipo={
              state.fase === "revelada"
                ? (state.solucion?.mayoriaPorEquipo as Record<string, number> | undefined)
                : undefined
            }
          />
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
          : mecanica === "ruleta"
            ? "🎡 Ruleta en juego"
            : null;
  if (!texto) return null;
  return <p className="text-lg font-bold uppercase tracking-wide text-amber-400">{texto}</p>;
}

function RuletaPanel({
  ruleta,
  revelado,
  resumen,
}: {
  ruleta: GameStatePublico["ruleta"];
  revelado: boolean;
  resumen?: Record<string, { mayoria: boolean }>;
}) {
  if (!ruleta) return null;
  return (
    <div className="grid w-full max-w-5xl grid-cols-2 gap-5 sm:grid-cols-4">
      {TEAMS.map((t, i) => {
        const entrada = ruleta[t.id];
        if (!entrada) return null;
        return (
          <RuletaCard
            key={t.id}
            index={i}
            color={t.color}
            icon={t.icon}
            name={t.name}
            representante={entrada.representante.name}
            resultado={entrada.resultado}
            revelado={revelado}
            mayoria={resumen?.[t.id]?.mayoria}
          />
        );
      })}
    </div>
  );
}

function RuletaCard({
  index,
  color,
  icon,
  name,
  representante,
  resultado,
  revelado,
  mayoria,
}: {
  index: number;
  color: string;
  icon: string;
  name: string;
  representante: string;
  resultado: RuletaResultado;
  revelado: boolean;
  mayoria?: boolean;
}) {
  const [girado, setGirado] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGirado(true), 700 + index * 350);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border-2 px-4 py-5 transition-colors duration-500"
      style={{ borderColor: color, backgroundColor: girado ? `${color}1a` : "transparent" }}
    >
      <span className="text-sm font-bold uppercase tracking-wide" style={{ color }}>
        {icon} {name}
      </span>

      <span
        className="text-4xl"
        style={{
          display: "inline-block",
          transition: "transform 1200ms cubic-bezier(0.33, 1, 0.68, 1)",
          transform: girado ? "rotate(1080deg)" : "rotate(0deg)",
        }}
      >
        🎡
      </span>

      <div
        className={`flex flex-col items-center gap-1 transition-opacity duration-500 ${
          girado ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-lg font-black" style={{ color }}>
          {representante}
        </p>
        <p className="text-sm font-bold text-zinc-100">
          {resultado.tipo === "convocatoria" ? "☠️ 4ª convocatoria" : `🎯 +${resultado.valor} pts`}
        </p>
        {revelado && (
          <p
            className={`text-xs font-semibold ${
              resultado.tipo === "convocatoria"
                ? "text-red-400"
                : mayoria
                  ? "text-green-400"
                  : "text-zinc-400"
            }`}
          >
            {resultado.tipo === "convocatoria"
              ? "Marcador a 0"
              : mayoria
                ? "¡Mayoría acertó! Bote conseguido"
                : "Mayoría falló, sin bote"}
          </p>
        )}
      </div>
    </div>
  );
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

function calcularMayorias(votos: { team_id: string; indice: number }[]): Record<string, number> {
  const porEquipo = new Map<string, Map<number, number>>();
  for (const v of votos) {
    const conteo = porEquipo.get(v.team_id) ?? new Map<number, number>();
    conteo.set(v.indice, (conteo.get(v.indice) ?? 0) + 1);
    porEquipo.set(v.team_id, conteo);
  }
  const resultado: Record<string, number> = {};
  for (const [teamId, conteo] of porEquipo) {
    resultado[teamId] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return resultado;
}

function VotacionPantalla({
  pruebaId,
  opciones,
  revelado,
  indiceCorrecto,
  mayoriaPorEquipo,
}: {
  pruebaId: string;
  opciones: string[];
  revelado: boolean;
  indiceCorrecto?: number;
  mayoriaPorEquipo?: Record<string, number>;
}) {
  const [votosEnVivo, setVotosEnVivo] = useState<{ team_id: string; indice: number }[]>([]);

  useEffect(() => {
    if (revelado) return;
    let cancelado = false;
    const interval = setInterval(async () => {
      const votos = await getVotosDetalle(pruebaId);
      if (!cancelado) setVotosEnVivo(votos);
    }, 1000);
    return () => {
      cancelado = true;
      clearInterval(interval);
    };
  }, [pruebaId, revelado]);

  const mayorias = revelado ? (mayoriaPorEquipo ?? {}) : calcularMayorias(votosEnVivo);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="grid grid-cols-2 gap-6 text-2xl font-bold">
        {opciones.map((op, i) => {
          const isCorrect = revelado && indiceCorrecto === i;
          return (
            <div
              key={i}
              className={`rounded-2xl border-2 px-6 py-5 ${
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
      <div className="flex flex-wrap justify-center gap-3">
        {TEAMS.map((t) => {
          const mayoria = mayorias[t.id];
          if (mayoria === undefined) return null;
          const acerto = revelado && indiceCorrecto === mayoria;
          return (
            <span
              key={t.id}
              className={`rounded-full border px-4 py-2 text-lg font-bold ${
                acerto ? "border-green-400 text-green-300" : "border-zinc-600 text-zinc-200"
              }`}
            >
              {t.icon} {t.name}: {opciones[mayoria] ?? "?"}
            </span>
          );
        })}
      </div>
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
